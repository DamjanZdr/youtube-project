import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Look up a partner by their referral code
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "Missing code parameter" }, { status: 400 });
    }

    const adminClient = createAdminClient();

    const { data: partner, error } = await adminClient
      .from("partners")
      .select("id, code, name, is_active")
      .eq("code", code.toLowerCase())
      .single();

    if (error || !partner) {
      return NextResponse.json({ partner: null });
    }

    if (!partner.is_active) {
      return NextResponse.json({ partner: null });
    }

    return NextResponse.json({ 
      partner: {
        id: partner.id,
        code: partner.code,
        name: partner.name,
      }
    });
  } catch (error) {
    console.error("Partner lookup error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
