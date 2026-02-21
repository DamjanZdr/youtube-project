"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { getDeviceInfo } from "@/lib/utils/utm";

// Heartbeat interval in milliseconds (every 2 minutes)
const HEARTBEAT_INTERVAL = 2 * 60 * 1000;

// Session key to track if we've already logged this session
const SESSION_KEY = "bp_session_logged";

export function useActivityTracking() {
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const supabase = createClient();

    async function initTracking() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if we've already logged this session
      const sessionLogged = sessionStorage.getItem(SESSION_KEY);
      
      if (!sessionLogged) {
        // Log login event for this session
        try {
          await fetch("/api/activity/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_type: "login",
              device: getDeviceInfo(),
            }),
          });
          sessionStorage.setItem(SESSION_KEY, "true");
        } catch {
          // Silent fail
        }
      }

      // Start heartbeat for time tracking
      heartbeatRef.current = setInterval(async () => {
        try {
          await fetch("/api/activity/log", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              event_type: "heartbeat",
              device: getDeviceInfo(),
            }),
          });
        } catch {
          // Silent fail
        }
      }, HEARTBEAT_INTERVAL);
    }

    initTracking();

    // Cleanup on unmount
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
      }
    };
  }, []);
}
