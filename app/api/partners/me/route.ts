import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: Get partner's own stats and info
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createAdminClient();

  // Get partner record for this user
  const { data: partner, error: partnerError } = await adminClient
    .from("partners")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (partnerError || !partner) {
    return NextResponse.json({ error: "Not a partner" }, { status: 403 });
  }

  // Get visit stats
  const { data: visits } = await adminClient
    .from("partner_visits")
    .select("id, visitor_id, created_at, ip_country")
    .eq("partner_id", partner.id);

  // Get referred users (no personal details)
  const { data: referredUsers } = await adminClient
    .from("profiles")
    .select("id, created_at, referred_by_partner_id")
    .eq("referred_by_partner_id", partner.id);

  // Get organizations from referred users
  const referredUserIds = referredUsers?.map(u => u.id) || [];
  const { data: orgs } = referredUserIds.length > 0
    ? await adminClient
        .from("organizations")
        .select("id, owner_id, created_at")
        .in("owner_id", referredUserIds)
    : { data: [] };

  // Get subscriptions
  const orgIds = orgs?.map(o => o.id) || [];
  const { data: subs } = orgIds.length > 0
    ? await adminClient
        .from("subscriptions")
        .select("organization_id, plan, status")
        .in("organization_id", orgIds)
        .eq("status", "active")
    : { data: [] };

  // Get billing events for earnings
  const { data: billingEvents } = referredUserIds.length > 0
    ? await adminClient
        .from("billing_events")
        .select("user_id, amount_cents, event_type, created_at")
        .in("user_id", referredUserIds)
        .in("event_type", ["subscription_created", "subscription_renewed", "upgrade"])
    : { data: [] };

  // Get payouts
  const { data: payouts } = await adminClient
    .from("partner_payouts")
    .select("*")
    .eq("partner_id", partner.id)
    .order("created_at", { ascending: false });

  // Calculate stats
  const uniqueVisitors = new Set(visits?.map(v => v.visitor_id).filter(Boolean)).size;
  
  // Studios by plan
  const studiosByPlan: Record<string, number> = {};
  subs?.forEach(s => {
    studiosByPlan[s.plan] = (studiosByPlan[s.plan] || 0) + 1;
  });

  // Calculate earnings
  const totalRevenue = billingEvents?.reduce((sum, b) => sum + (b.amount_cents || 0), 0) || 0;
  const totalEarnings = Math.floor(totalRevenue * (partner.commission_percent / 100));

  // Paid out
  const paidPayouts = payouts?.filter(p => p.status === 'paid') || [];
  const paidOut = paidPayouts.reduce((sum, p) => sum + p.amount_cents, 0);

  // Current month pending
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentMonthBilling = billingEvents?.filter(b => new Date(b.created_at) >= monthStart) || [];
  const currentMonthRevenue = currentMonthBilling.reduce((sum, b) => sum + (b.amount_cents || 0), 0);
  const pendingPayout = Math.floor(currentMonthRevenue * (partner.commission_percent / 100));

  // Visits by country (for a simple chart)
  const visitsByCountry: Record<string, number> = {};
  visits?.forEach(v => {
    const country = v.ip_country || 'Unknown';
    visitsByCountry[country] = (visitsByCountry[country] || 0) + 1;
  });

  // Visits over time (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const visitsByDay: Record<string, number> = {};
  visits?.filter(v => new Date(v.created_at) >= thirtyDaysAgo).forEach(v => {
    const day = new Date(v.created_at).toISOString().split('T')[0];
    visitsByDay[day] = (visitsByDay[day] || 0) + 1;
  });

  // Signups over time (last 30 days)
  const signupsByDay: Record<string, number> = {};
  referredUsers?.filter(u => new Date(u.created_at) >= thirtyDaysAgo).forEach(u => {
    const day = new Date(u.created_at).toISOString().split('T')[0];
    signupsByDay[day] = (signupsByDay[day] || 0) + 1;
  });

  return NextResponse.json({
    partner: {
      id: partner.id,
      code: partner.code,
      name: partner.name,
      commission_percent: partner.commission_percent,
      is_active: partner.is_active,
      created_at: partner.created_at,
    },
    stats: {
      total_visits: visits?.length || 0,
      unique_visitors: uniqueVisitors || visits?.length || 0,
      total_signups: referredUsers?.length || 0,
      total_studios: orgs?.length || 0,
      conversion_rate: visits && visits.length > 0 
        ? Math.round(((referredUsers?.length || 0) / visits.length) * 100 * 10) / 10 
        : 0,
      studios_by_plan: studiosByPlan,
      total_earnings_cents: totalEarnings,
      paid_out_cents: paidOut,
      pending_payout_cents: pendingPayout,
    },
    charts: {
      visits_by_country: visitsByCountry,
      visits_by_day: visitsByDay,
      signups_by_day: signupsByDay,
    },
    payouts: payouts || [],
  });
}
