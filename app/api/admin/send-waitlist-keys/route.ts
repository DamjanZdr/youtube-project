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
              <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center" style="padding: 40px 20px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #f4f4f5; border-radius: 20px; border: 1px solid #e4e4e7; overflow: hidden;">
                        <tr>
                          <td style="padding: 40px 32px;">
                            <div style="text-align: center; margin-bottom: 32px;">
                              <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 8px 0; color: #18181b;">🎁 Your Free Key is Here!</h1>
                              <p style="color: #52525b; margin: 0; font-size: 15px;">Thanks for being on the Blueprint waitlist</p>
                            </div>

                            <div style="background-color: #e4e4e7; border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                              <p style="color: #71717a; font-size: 11px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Your Key</p>
                              <p style="font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Courier New', monospace; font-size: 22px; letter-spacing: 3px; color: #18181b; margin: 0; font-weight: 700;">
                                ${key}
                              </p>
                            </div>

                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 28px;">
                              <tr>
                                <td width="48%" style="background-color: #e4e4e7; border-radius: 10px; padding: 16px; text-align: center;">
                                  <p style="color: #71717a; font-size: 11px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">Plan</p>
                                  <p style="font-size: 16px; font-weight: 600; margin: 0; color: #6366f1;">${planText}</p>
                                </td>
                                <td width="4%"></td>
                                <td width="48%" style="background-color: #e4e4e7; border-radius: 10px; padding: 16px; text-align: center;">
                                  <p style="color: #71717a; font-size: 11px; margin: 0 0 4px 0; text-transform: uppercase; letter-spacing: 1px;">Duration</p>
                                  <p style="font-size: 16px; font-weight: 600; margin: 0; color: #18181b;">${durationText}</p>
                                </td>
                              </tr>
                            </table>

                            <div style="text-align: center; margin-bottom: 28px;">
                              <a href="${redeemUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 600; font-size: 15px; box-shadow: 0 2px 8px rgba(99,102,241,0.3);">
                                Redeem Your Key →
                              </a>
                            </div>

                            <div style="border-top: 1px solid #d4d4d8; padding-top: 24px; text-align: center;">
                              <p style="color: #71717a; font-size: 12px; margin: 0;">
                                Blueprint — The operating system for YouTube creators
                              </p>
                            </div>
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
