import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NextRequest } from "next/server";

// Max session duration to count (30 minutes of inactivity = session ended)
const MAX_SESSION_DURATION_SECONDS = 30 * 60;

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

    const deviceType = device?.device || "desktop";
    const now = new Date().toISOString();

    if (event_type === "login") {
      // Get existing stats for this user
      const { data: existingStats } = await adminClient
        .from("user_activity_stats")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (existingStats) {
        // Calculate time from previous session if it exists
        let additionalTime = 0;
        if (existingStats.current_session_start && existingStats.current_session_device) {
          const sessionStart = new Date(existingStats.current_session_start).getTime();
          const lastActivity = existingStats.last_activity_at 
            ? new Date(existingStats.last_activity_at).getTime()
            : sessionStart;
          
          // Use last activity time, capped at max session duration
          const sessionDuration = Math.min(
            Math.floor((lastActivity - sessionStart) / 1000),
            MAX_SESSION_DURATION_SECONDS
          );
          additionalTime = Math.max(0, sessionDuration);
        }

        // Update existing record
        const loginField = `${deviceType}_logins` as const;
        const timeField = `${existingStats.current_session_device || deviceType}_time_seconds` as const;
        
        const updateData: Record<string, unknown> = {
          current_session_start: now,
          current_session_device: deviceType,
          last_login_at: now,
          last_activity_at: now,
          updated_at: now,
        };
        
        // Increment login count for current device
        updateData[loginField] = (existingStats[loginField as keyof typeof existingStats] as number || 0) + 1;
        
        // Add time to previous session's device (if there was one)
        if (additionalTime > 0 && existingStats.current_session_device) {
          const prevTimeField = `${existingStats.current_session_device}_time_seconds`;
          updateData[prevTimeField] = (existingStats[prevTimeField as keyof typeof existingStats] as number || 0) + additionalTime;
        }

        await adminClient
          .from("user_activity_stats")
          .update(updateData)
          .eq("user_id", user.id);
      } else {
        // Create new record for this user
        const insertData: Record<string, unknown> = {
          user_id: user.id,
          current_session_start: now,
          current_session_device: deviceType,
          last_login_at: now,
          last_activity_at: now,
          desktop_logins: 0,
          mobile_logins: 0,
          tablet_logins: 0,
          desktop_time_seconds: 0,
          mobile_time_seconds: 0,
          tablet_time_seconds: 0,
        };
        
        // Set login count for this device to 1
        insertData[`${deviceType}_logins`] = 1;

        await adminClient
          .from("user_activity_stats")
          .insert(insertData);
      }
    } else if (event_type === "heartbeat" || event_type === "activity") {
      // Just update last_activity_at for time tracking
      await adminClient
        .from("user_activity_stats")
        .update({ 
          last_activity_at: now,
          updated_at: now,
        })
        .eq("user_id", user.id);
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error("Activity log error:", err);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
