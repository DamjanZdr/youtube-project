import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { event_type, device } = body;

    if (!event_type) {
      return Response.json({ error: "event_type is required" }, { status: 400 });
    }

    // Insert activity event
    const { error } = await adminClient
      .from("analytics_events")
      .insert({
        user_id: user.id,
        event_type,
        device_type: device?.device || null,
        user_agent: device?.userAgent || null,
        platform: device?.platform || null,
        language: device?.language || null,
        page_url: body.page_url || null,
        referrer: body.referrer || null,
      });

    if (error) {
      console.error("Activity log error:", error);
      return Response.json({ error: error.message }, { status: 500 });
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Activity log error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
