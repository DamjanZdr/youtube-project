import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Helper to verify admin
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  return profile?.is_admin ? user : null;
}

// GET: List all partners with stats
export async function GET(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Get all partners with user info
  const { data: partners, error } = await adminClient
    .from("partners")
    .select(`
      id,
      user_id,
      code,
      name,
      commission_percent,
      attribution_days,
      is_active,
      notes,
      created_at,
      updated_at
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching partners:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!partners || partners.length === 0) {
    return NextResponse.json({ partners: [] });
  }

  // Get user info for all partners
  const userIds = partners.map(p => p.user_id);
  const { data: users } = await adminClient
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .in("id", userIds);

  const userMap = new Map(users?.map(u => [u.id, u]) || []);

  // Get stats for each partner
  const partnerIds = partners.map(p => p.id);

  // Get visit counts
  const { data: visits } = await adminClient
    .from("partner_visits")
    .select("partner_id, visitor_id")
    .in("partner_id", partnerIds);

  // Get referred users
  const { data: referredUsers } = await adminClient
    .from("profiles")
    .select("id, referred_by_partner_id, created_at")
    .in("referred_by_partner_id", partnerIds);

  // Get organizations created by referred users
  const referredUserIds = referredUsers?.map(u => u.id) || [];
  const { data: orgs } = referredUserIds.length > 0 
    ? await adminClient
        .from("organizations")
        .select("id, owner_id")
        .in("owner_id", referredUserIds)
    : { data: [] };

  // Get subscriptions for those orgs
  const orgIds = orgs?.map(o => o.id) || [];
  const { data: subs } = orgIds.length > 0
    ? await adminClient
        .from("subscriptions")
        .select("organization_id, plan, status")
        .in("organization_id", orgIds)
        .eq("status", "active")
    : { data: [] };

  // Get billing events for commission calculation (paid subscriptions)
  const { data: billingEvents } = await adminClient
    .from("billing_events")
    .select("user_id, amount_cents, event_type, created_at")
    .in("user_id", referredUserIds)
    .in("event_type", ["subscription_created", "subscription_renewed", "upgrade"]);

  // Get paid payouts
  const { data: payouts } = await adminClient
    .from("partner_payouts")
    .select("partner_id, amount_cents, status")
    .in("partner_id", partnerIds);

  // Calculate stats for each partner
  const partnersWithStats = partners.map(partner => {
    const partnerVisits = visits?.filter(v => v.partner_id === partner.id) || [];
    const uniqueVisitors = new Set(partnerVisits.map(v => v.visitor_id).filter(Boolean)).size;
    
    const referred = referredUsers?.filter(u => u.referred_by_partner_id === partner.id) || [];
    const referredIds = referred.map(u => u.id);
    
    const partnerOrgs = orgs?.filter(o => referredIds.includes(o.owner_id)) || [];
    const partnerOrgIds = partnerOrgs.map(o => o.id);
    
    const partnerSubs = subs?.filter(s => partnerOrgIds.includes(s.organization_id)) || [];
    
    // Count by plan
    const studiosByPlan: Record<string, number> = {};
    partnerSubs.forEach(s => {
      studiosByPlan[s.plan] = (studiosByPlan[s.plan] || 0) + 1;
    });

    // Calculate earnings from billing events
    const partnerBilling = billingEvents?.filter(b => referredIds.includes(b.user_id)) || [];
    const totalRevenue = partnerBilling.reduce((sum, b) => sum + (b.amount_cents || 0), 0);
    const totalEarnings = Math.floor(totalRevenue * (partner.commission_percent / 100));

    // Calculate paid out amount
    const partnerPayouts = payouts?.filter(p => p.partner_id === partner.id && p.status === 'paid') || [];
    const paidOut = partnerPayouts.reduce((sum, p) => sum + p.amount_cents, 0);

    // Current month earnings for pending payout
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthBilling = partnerBilling.filter(b => new Date(b.created_at) >= monthStart);
    const currentMonthRevenue = currentMonthBilling.reduce((sum, b) => sum + (b.amount_cents || 0), 0);
    const pendingPayout = Math.floor(currentMonthRevenue * (partner.commission_percent / 100));

    return {
      ...partner,
      user: userMap.get(partner.user_id) || null,
      stats: {
        total_visits: partnerVisits.length,
        unique_visitors: uniqueVisitors || partnerVisits.length,
        total_signups: referred.length,
        total_studios: partnerOrgs.length,
        conversion_rate: partnerVisits.length > 0 
          ? Math.round((referred.length / partnerVisits.length) * 100 * 10) / 10 
          : 0,
        studios_by_plan: studiosByPlan,
        total_earnings_cents: totalEarnings,
        paid_out_cents: paidOut,
        pending_payout_cents: pendingPayout,
      }
    };
  });

  return NextResponse.json({ partners: partnersWithStats });
}

// POST: Create a new partner
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { userId, code, name, commissionPercent, attributionDays, notes } = body;

    if (!userId || !code || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Check if code already exists
    const { data: existing } = await adminClient
      .from("partners")
      .select("id")
      .eq("code", code.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json({ error: "Partner code already exists" }, { status: 400 });
    }

    // Check if user is already a partner
    const { data: existingUser } = await adminClient
      .from("partners")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: "User is already a partner" }, { status: 400 });
    }

    // Create the partner
    const { data: partner, error } = await adminClient
      .from("partners")
      .insert({
        user_id: userId,
        code: code.toLowerCase(),
        name,
        commission_percent: commissionPercent || 20,
        attribution_days: attributionDays !== undefined ? attributionDays : null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating partner:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update the user's profile to mark them as partner
    await adminClient
      .from("profiles")
      .update({ is_partner: true })
      .eq("id", userId);

    return NextResponse.json({ partner });
  } catch (error) {
    console.error("Create partner error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PATCH: Update a partner
export async function PATCH(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, code, name, commissionPercent, attributionDays, isActive, notes } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing partner id" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const updates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (code !== undefined) updates.code = code.toLowerCase();
    if (name !== undefined) updates.name = name;
    if (commissionPercent !== undefined) updates.commission_percent = commissionPercent;
    if (attributionDays !== undefined) updates.attribution_days = attributionDays;
    if (isActive !== undefined) updates.is_active = isActive;
    if (notes !== undefined) updates.notes = notes;

    const { data: partner, error } = await adminClient
      .from("partners")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("Error updating partner:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Update is_partner flag if deactivating
    if (isActive === false) {
      await adminClient
        .from("profiles")
        .update({ is_partner: false })
        .eq("id", partner.user_id);
    } else if (isActive === true) {
      await adminClient
        .from("profiles")
        .update({ is_partner: true })
        .eq("id", partner.user_id);
    }

    return NextResponse.json({ partner });
  } catch (error) {
    console.error("Update partner error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE: Remove a partner
export async function DELETE(req: NextRequest) {
  const admin = await verifyAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing partner id" }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Get the partner first to update their profile
  const { data: partner } = await adminClient
    .from("partners")
    .select("user_id")
    .eq("id", id)
    .single();

  const { error } = await adminClient
    .from("partners")
    .delete()
    .eq("id", id);

  if (error) {
    console.error("Error deleting partner:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Update profile
  if (partner) {
    await adminClient
      .from("profiles")
      .update({ is_partner: false })
      .eq("id", partner.user_id);
  }

  return NextResponse.json({ success: true });
}
