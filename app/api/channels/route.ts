import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { organization_id, name, handle } = body;

  if (!organization_id) {
    return NextResponse.json({ error: "Missing organization_id" }, { status: 400 });
  }

  // Verify user is member of the org
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organization_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  // Use admin client to create channel (bypasses RLS)
  const adminClient = createAdminClient();

  const { data: channel, error } = await adminClient
    .from("channels")
    .insert({
      organization_id,
      name: name || "My Channel",
      handle: handle || "@mychannel",
    })
    .select()
    .single();

  if (error) {
    console.error("Failed to create channel:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(channel);
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const organization_id = searchParams.get("organization_id");

  if (!organization_id) {
    return NextResponse.json({ error: "Missing organization_id" }, { status: 400 });
  }

  // Use admin client to fetch channel (bypasses RLS)
  const adminClient = createAdminClient();

  const { data: channels, error } = await adminClient
    .from("channels")
    .select("*")
    .eq("organization_id", organization_id)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(channels?.[0] || null);
}
