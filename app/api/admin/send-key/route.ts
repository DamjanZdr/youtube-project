import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

// Lazy init to avoid build errors when env var is missing
function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
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

  const { 
    email,           // Recipient email (for tracking & sending)
    plan,            // 'creator', 'studio', 'enterprise'
    duration,        // 'month', 'year', 'lifetime'
    orgId,           // Optional: lock to specific org
    orgName          // Optional: for display
  } = await req.json();

  if (!plan || !duration) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Generate the key
  const key = generateKey();

  // Insert key into database
  const { error: insertError } = await adminClient
    .from("plan_keys")
    .insert({
      key,
      plan,
      duration,
      assigned_org_id: orgId || null,
      sent_to_email: email || null,
      sent_at: new Date().toISOString(),
    });

  if (insertError) {
    console.error("Failed to create key:", insertError);
    return NextResponse.json({ error: "Failed to create key" }, { status: 500 });
  }

  // Build redemption URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redeemUrl = `${appUrl}/redeem?key=${key}`;

  // Duration text
  const durationText = duration === "lifetime" ? "Lifetime" : 
                       duration === "year" ? "1 Year" : "1 Month";
  const planText = plan.charAt(0).toUpperCase() + plan.slice(1);

  // Send email if we have an email address
  let emailSent = false;
  const resend = getResend();
  if (email && resend) {
    try {
      await resend.emails.send({
        from: "Blueprint <noreply@myblueprint.studio>",
        to: email,
        subject: `Your ${planText} Plan Key is Ready! 🎉`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #ffffff;">
                <tr>
                  <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #f4f4f5; border-radius: 16px; overflow: hidden;">
                      <tr>
                        <td style="padding: 40px 32px;">
                          <div style="text-align: center; margin-bottom: 32px;">
                            <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 8px 0; color: #18181b;">🎉 Your Plan Key</h1>
                            <p style="color: #52525b; margin: 0; font-size: 15px;">
                              ${orgName 
                                ? `A <strong style="color: #18181b;">${planText}</strong> plan key for <strong style="color: #18181b;">${orgName}</strong>`
                                : `You've received a <strong style="color: #18181b;">${planText}</strong> plan key!`
                              }
                            </p>
                          </div>

                          <div style="background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                            <p style="color: #6366f1; font-size: 11px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Your Key</p>
                            <p style="font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Courier New', monospace; font-size: 22px; letter-spacing: 3px; color: #18181b; margin: 0; font-weight: 700;">
                              ${key}
                            </p>
                          </div>

                          <div style="background-color: #e4e4e7; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                              <tr>
                                <td style="color: #52525b; font-size: 14px; padding: 4px 0;"><strong style="color: #18181b;">Plan:</strong> ${planText}</td>
                              </tr>
                              <tr>
                                <td style="color: #52525b; font-size: 14px; padding: 4px 0;"><strong style="color: #18181b;">Duration:</strong> ${durationText}</td>
                              </tr>
                              ${orgName ? `<tr><td style="color: #52525b; font-size: 14px; padding: 4px 0;"><strong style="color: #18181b;">For:</strong> ${orgName}</td></tr>` : ''}
                            </table>
                          </div>

                          <div style="text-align: center; margin-bottom: 28px;">
                            <a href="${redeemUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 600; font-size: 15px;">
                              Redeem Your Key →
                            </a>
                          </div>

                          <p style="color: #71717a; font-size: 13px; text-align: center; margin: 0 0 24px 0; line-height: 1.5;">
                            Or go to your Studio Settings → Billing and enter the key manually.
                          </p>

                          <div style="border-top: 1px solid #d4d4d8; padding-top: 24px; text-align: center;">
                            <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                              © Blueprint Studio
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
      emailSent = true;
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Key is created, just email failed
    }
  }

  return NextResponse.json({ 
    success: true, 
    key,
    redeemUrl,
    emailSent,
    message: emailSent 
      ? `Key created and emailed to ${email}!`
      : `Key created. ${email ? "Email failed - share manually." : "Share it manually."}`
  });
}
