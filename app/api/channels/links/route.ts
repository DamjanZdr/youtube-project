import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { channel_id, links } = body;

  if (!channel_id) {
    return NextResponse.json({ error: "Missing channel_id" }, { status: 400 });
  }

  // Use admin client to get channel and verify org membership
  const adminClient = createAdminClient();
  
  const { data: channel } = await adminClient
    .from("channels")
    .select("organization_id")
    .eq("id", channel_id)
    .single();

  if (!channel) {
    return NextResponse.json({ error: "Channel not found" }, { status: 404 });
  }

  // Verify user is member of the org
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", channel.organization_id)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  // Delete all existing links
  const { error: deleteError } = await adminClient
    .from("channel_links")
    .delete()
    .eq("channel_id", channel_id);

  if (deleteError) {
    console.error("Failed to delete existing links:", deleteError);
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  // Insert new links if any
  if (links && links.length > 0) {
    const linksToInsert = links.map((link: any, index: number) => ({
      channel_id,
      title: link.label || link.title,
      url: link.url,
      platform: "custom",
      position: index,
    }));

    const { error: insertError } = await adminClient
      .from("channel_links")
      .insert(linksToInsert);

    if (insertError) {
      console.error("Failed to insert links:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const channel_id = searchParams.get("channel_id");

  if (!channel_id) {
    return NextResponse.json({ error: "Missing channel_id" }, { status: 400 });
  }

  // Use admin client to fetch links (bypasses RLS)
  const adminClient = createAdminClient();

  const { data: links, error } = await adminClient
    .from("channel_links")
    .select("*")
    .eq("channel_id", channel_id)
    .order("position");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(links || []);
}
