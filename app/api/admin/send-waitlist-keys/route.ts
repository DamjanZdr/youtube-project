import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function generateKey(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const segments = 4;
  const segmentLength = 4;
  const parts: string[] = [];
  
  for (let s = 0; s < segments; s++) {
    let segment = "";
    for (let i = 0; i < segmentLength; i++) {
      segment += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    parts.push(segment);
  }
  
  return parts.join("-");
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const adminClient = createAdminClient();
  
  // Verify admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
    
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { emails, plan, duration } = await req.json();

  if (!emails || !Array.isArray(emails) || emails.length === 0) {
    return NextResponse.json({ error: "No emails provided" }, { status: 400 });
  }

  if (!plan || !["creator", "studio", "enterprise"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  if (!duration || !["month", "year", "lifetime"].includes(duration)) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const resend = getResend();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const durationText = duration === "lifetime" ? "Lifetime" : duration === "year" ? "1 Year" : "1 Month";
  const planText = plan.charAt(0).toUpperCase() + plan.slice(1);

  const results: { email: string; success: boolean; error?: string }[] = [];

  for (const email of emails) {
    try {
      // Generate a unique key
      let key = generateKey();
      let attempts = 0;
      
      // Ensure key is unique
      while (attempts < 10) {
        const { data: existing } = await adminClient
          .from("plan_keys")
          .select("id")
          .eq("key", key)
          .single();
        
        if (!existing) break;
        key = generateKey();
        attempts++;
      }

      // Insert the key
      const { data: keyData, error: insertError } = await adminClient
        .from("plan_keys")
        .insert({
          key,
          plan,
          duration,
          sent_to_email: email,
          sent_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        results.push({ email, success: false, error: insertError.message });
        continue;
      }

      // Send email
      if (resend) {
        const redeemUrl = `${appUrl}/redeem?key=${key}`;
        
        await resend.emails.send({
          from: "Blueprint <noreply@myblueprint.studio>",
          to: email,
          subject: `Your Free ${planText} Key is Here! 🎉`,
          html: `
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="margin: 0; padding: 0; background-color: #1a1a1a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #1a1a1a; padding: 40px 20px;">
                  <tr>
                    <td align="center">
                      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #222222; border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
                        <!-- Header -->
                        <tr>
                          <td style="padding: 32px 32px 24px; text-align: center;">
                            <img src="${appUrl}/bplogo.png" alt="Blueprint" style="height: 40px; width: auto;" />
                          </td>
                        </tr>
                        
                        <!-- Content -->
                        <tr>
                          <td style="padding: 0 32px 32px;">
                            <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 16px; text-align: center;">
                              Your Free Key is Here! 🎉
                            </h1>
                            
                            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                              Thanks for being on the Blueprint waitlist! As promised, here's your free ${planText} key.
                            </p>

                            <div style="background-color: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 12px; padding: 24px; margin-bottom: 24px; text-align: center;">
                              <p style="color: #a1a1aa; font-size: 11px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Your Key</p>
                              <p style="font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Courier New', monospace; font-size: 22px; letter-spacing: 3px; color: #ffffff; margin: 0; font-weight: 700;">
                                ${key}
                              </p>
                            </div>

                            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                              <tr>
                                <td width="48%" style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 16px; text-align: center;">
                                  <p style="color: #71717a; font-size: 11px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">Plan</p>
                                  <p style="font-size: 16px; font-weight: 600; margin: 0; color: #818cf8;">${planText}</p>
                                </td>
                                <td width="4%"></td>
                                <td width="48%" style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 16px; text-align: center;">
                                  <p style="color: #71717a; font-size: 11px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">Duration</p>
                                  <p style="font-size: 16px; font-weight: 600; margin: 0; color: #ffffff;">${durationText}</p>
                                </td>
                              </tr>
                            </table>

                            <table width="100%" cellpadding="0" cellspacing="0">
                              <tr>
                                <td align="center">
                                  <a href="${redeemUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 8px;">
                                    Redeem Your Key →
                                  </a>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                          <td style="padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.1); text-align: center;">
                            <p style="color: #71717a; font-size: 12px; margin: 0;">
                              Blueprint - The operating system for YouTube creators
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </body>
            </html>
          `,
        });
      }

      results.push({ email, success: true });
    } catch (error: any) {
      results.push({ email, success: false, error: error.message });
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  return NextResponse.json({
    success: true,
    results,
    summary: {
      total: emails.length,
      sent: successCount,
      failed: failCount,
    },
  });
}
