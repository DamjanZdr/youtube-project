"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { storeRefCode, getStoredRefCode } from "@/lib/utils/utm";

export function PartnerTracker() {
  const searchParams = useSearchParams();

  useEffect(() => {
    // Get ref from URL or stored value
    const refFromUrl = searchParams.get("ref");
    const storedRef = getStoredRefCode();
    const refCode = refFromUrl || storedRef;

    // Store the ref code if from URL
    if (refFromUrl) {
      storeRefCode(refFromUrl);
    }

    // Only track if we have a ref code
    if (!refCode) return;

    // Check if we've already tracked this session (prevents double-tracking from React StrictMode)
    const trackingKey = `partner_tracked_${refCode}`;
    if (sessionStorage.getItem(trackingKey)) return;
    sessionStorage.setItem(trackingKey, "true");

    // Track the visit
    const trackVisit = async () => {
      try {
        // Generate a simple visitor ID from localStorage
        let visitorId = localStorage.getItem("visitor_id");
        if (!visitorId) {
          visitorId = crypto.randomUUID();
          localStorage.setItem("visitor_id", visitorId);
        }

        await fetch("/api/partners/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: refCode,
            visitorId,
            pageUrl: window.location.href,
            referrerUrl: document.referrer || null,
          }),
        });
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.debug("Partner tracking failed:", error);
      }
    };

    trackVisit();
  }, [searchParams]);

  return null;
}
