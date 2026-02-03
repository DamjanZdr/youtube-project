import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { key } = await request.json();

    if (!key) {
      return NextResponse.json(
        { error: "Key is required" },
        { status: 400 }
      );
    }

    // Look up the key
    const { data: keyData, error } = await supabase
      .from("plan_keys")
      .select("id, plan, duration, assigned_org_id, redeemed_at")
      .eq("key", key.trim().toUpperCase())
      .single();

    if (error || !keyData) {
      return NextResponse.json(
        { error: "Invalid key. Please check and try again." },
        { status: 404 }
      );
    }

    if (keyData.redeemed_at) {
      return NextResponse.json(
        { error: "This key has already been redeemed." },
        { status: 400 }
      );
    }

    // If key is assigned to a specific org, verify user owns it
    if (keyData.assigned_org_id) {
      const { data: membership } = await supabase
        .from("organization_members")
        .select("role")
        .eq("organization_id", keyData.assigned_org_id)
        .eq("user_id", user.id)
        .eq("role", "owner")
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: "This key is assigned to a studio you don't own." },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      keyInfo: {
        id: keyData.id,
        plan: keyData.plan,
        duration: keyData.duration,
        assigned_org_id: keyData.assigned_org_id,
        redeemed_at: keyData.redeemed_at,
      },
    });
  } catch (error) {
    console.error("Error validating key:", error);
    return NextResponse.json(
      { error: "Failed to validate key" },
      { status: 500 }
    );
  }
}
