import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Look up a partner by their referral code
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const clickTimestamp = searchParams.get("clickTimestamp");

    if (!code) {
      return NextResponse.json({ error: "Missing code parameter" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: partner, error } = await adminClient
      .from("partners")
      .select("id, code, name, is_active, attribution_days")
      .eq("code", code.toLowerCase())
      .single();

    if (error || !partner) {
      return NextResponse.json({ partner: null });
    }

    if (!partner.is_active) {
      return NextResponse.json({ partner: null });
    }

    // Check attribution window if provided
    if (clickTimestamp && partner.attribution_days) {
      const clickTime = parseInt(clickTimestamp, 10);
      const now = Date.now();
      const daysSinceClick = (now - clickTime) / (1000 * 60 * 60 * 24);
      
      if (daysSinceClick > partner.attribution_days) {
        return NextResponse.json({ 
          partner: null, 
          expired: true,
          message: "Referral attribution window has expired"
        });
      }
    }

    return NextResponse.json({ 
      partner: {
        id: partner.id,
        code: partner.code,
        name: partner.name,
        attribution_days: partner.attribution_days,
      }
    });
  } catch (error) {
    console.error("Partner lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
