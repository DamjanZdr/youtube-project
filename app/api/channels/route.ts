import { createClient } from "@/lib/supabase/server";
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

  // RLS will verify membership - just create the channel
  const { data: channel, error } = await supabase
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

  // RLS will filter to only channels user has access to
  const { data: channels, error } = await supabase
    .from("channels")
    .select("*")
    .eq("organization_id", organization_id)
    .limit(1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(channels?.[0] || null);
}
