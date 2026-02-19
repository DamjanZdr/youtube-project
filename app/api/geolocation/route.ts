import { NextRequest, NextResponse } from "next/server";

// Free IP geolocation using ip-api.com (no API key needed, 45 requests/minute limit)
export async function GET(req: NextRequest) {
  try {
    // Get IP from headers (Vercel/Cloudflare provide these)
    const forwarded = req.headers.get("x-forwarded-for");
    const realIp = req.headers.get("x-real-ip");
    const cfConnectingIp = req.headers.get("cf-connecting-ip");
    
    // Use the first available IP, fallback to empty (which ip-api treats as caller's IP)
    const ip = cfConnectingIp || (forwarded ? forwarded.split(",")[0].trim() : null) || realIp || "";
    
    // Skip geolocation for localhost/private IPs
    if (!ip || ip === "127.0.0.1" || ip === "::1" || ip.startsWith("192.168.") || ip.startsWith("10.")) {
      return NextResponse.json({ country: null, city: null, ip: ip || "local" });
    }
    
    // Call ip-api.com (free, no key needed)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city`, {
      next: { revalidate: 0 }, // Don't cache  
    });
    
    if (!response.ok) {
      console.error("Geolocation API error:", response.status);
      return NextResponse.json({ country: null, city: null, ip });
    }
    
    const data = await response.json();
    
    if (data.status === "success") {
      return NextResponse.json({
        country: data.country || null,
        city: data.city || null,
        ip,
      });
    }
    
    return NextResponse.json({ country: null, city: null, ip });
  } catch (error) {
    console.error("Geolocation error:", error);
    return NextResponse.json({ country: null, city: null, ip: null });
  }
}
