import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Track a visit from a partner referral link
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code, visitorId, pageUrl, referrerUrl, userAgent } = body;

    if (!code) {
      return NextResponse.json({ error: "Missing ref code" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    // Look up the partner by code
    const { data: partner, error: partnerError } = await adminClient
      .from("partners")
      .select("id, is_active")
      .eq("code", code.toLowerCase())
      .single();

    if (partnerError || !partner) {
      return NextResponse.json({ error: "Invalid partner code" }, { status: 404 });
    }

    if (!partner.is_active) {
      return NextResponse.json({ error: "Partner is inactive" }, { status: 400 });
    }

    // Get location from headers (set by Vercel/Cloudflare)
    const country = req.headers.get("x-vercel-ip-country") || 
                    req.headers.get("cf-ipcountry") || null;
    const city = req.headers.get("x-vercel-ip-city") || 
                 req.headers.get("cf-ipcity") || null;

    // Record the visit
    const { error: insertError } = await adminClient.from("partner_visits").insert({
      partner_id: partner.id,
      visitor_id: visitorId || null,
      page_url: pageUrl || null,
      referrer_url: referrerUrl || null,
      user_agent: userAgent || null,
      ip_country: country,
      ip_city: city,
    });

    if (insertError) {
      console.error("Error tracking partner visit:", insertError);
      return NextResponse.json({ error: "Failed to track visit" }, { status: 500 });
    }

    return NextResponse.json({ success: true, partnerId: partner.id });
  } catch (error) {
    console.error("Partner track error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
