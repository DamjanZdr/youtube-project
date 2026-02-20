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

  const { keyId, email } = await req.json();

  if (!keyId || !email) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Get the key
  const { data: keyData, error: keyError } = await adminClient
    .from("plan_keys")
    .select("*")
    .eq("id", keyId)
    .single();

  if (keyError || !keyData) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  // Check if key is already redeemed
  if (keyData.redeemed_at) {
    return NextResponse.json({ error: "Key has already been redeemed" }, { status: 400 });
  }

  // Update key with sent info
  const { error: updateError } = await adminClient
    .from("plan_keys")
    .update({
      sent_to_email: email,
      sent_at: new Date().toISOString(),
    })
    .eq("id", keyId);

  if (updateError) {
    console.error("Failed to update key:", updateError);
    return NextResponse.json({ error: "Failed to update key" }, { status: 500 });
  }

  // Build redemption URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redeemUrl = `${appUrl}/redeem?key=${keyData.key}`;

  // Duration text
  const durationText = keyData.duration === "lifetime" ? "Lifetime" : 
                       keyData.duration === "year" ? "1 Year" : "1 Month";
  const planText = keyData.plan.charAt(0).toUpperCase() + keyData.plan.slice(1);

  // Send email
  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ 
      success: true, 
      emailSent: false,
      message: "Key marked as sent but email not configured" 
    });
  }

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
          <body style="margin: 0; padding: 0; background-color: #18181b; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #18181b;">
              <tr>
                <td align="center" style="padding: 40px 20px;">
                  <!-- Logo -->
                  <div style="margin-bottom: 24px;">
                    <span style="font-size: 24px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px;">Blueprint</span>
                  </div>
                  
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background-color: #27272a; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.3);">
                    <tr>
                      <td style="padding: 40px 32px;">
                        <div style="text-align: center; margin-bottom: 32px;">
                          <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #ffffff;">Your Plan Key is Ready!</h1>
                          <p style="color: #a1a1aa; margin: 0; font-size: 15px; line-height: 1.5;">
                            You've received a <strong style="color: #ffffff;">${planText}</strong> key (${durationText})
                          </p>
                        </div>

                        <div style="background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                          <p style="color: #a78bfa; font-size: 11px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 2px; font-weight: 600;">Your Key</p>
                          <p style="font-family: 'SF Mono', Monaco, 'Cascadia Code', 'Courier New', monospace; font-size: 22px; letter-spacing: 3px; color: #ffffff; margin: 0; font-weight: 700;">
                            ${keyData.key}
                          </p>
                        </div>

                        <div style="background-color: #3f3f46; border-radius: 10px; padding: 16px 20px; margin-bottom: 28px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="color: #a1a1aa; font-size: 14px; padding: 4px 0;"><strong style="color: #ffffff;">Plan:</strong> ${planText}</td>
                            </tr>
                            <tr>
                              <td style="color: #a1a1aa; font-size: 14px; padding: 4px 0;"><strong style="color: #ffffff;">Duration:</strong> ${durationText}</td>
                            </tr>
                          </table>
                        </div>

                        <div style="text-align: center; margin-bottom: 28px;">
                          <a href="${redeemUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 600; font-size: 15px;">
                            Redeem Your Key →
                          </a>
                        </div>
                        
                        <p style="color: #71717a; font-size: 13px; text-align: center; margin: 0; line-height: 1.5;">
                          Or go to your Studio Settings → Billing and enter the key manually.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Footer -->
                  <div style="margin-top: 24px; text-align: center;">
                    <p style="color: #52525b; font-size: 12px; margin: 0;">
                      © Blueprint Studio • If you didn't expect this email, you can safely ignore it.
                    </p>
                  </div>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    });

    return NextResponse.json({ 
      success: true, 
      emailSent: true,
      message: "Email sent successfully" 
    });
  } catch (emailError) {
    console.error("Failed to send email:", emailError);
    return NextResponse.json({ 
      success: true, 
      emailSent: false,
      message: "Key marked as sent but email failed to send" 
    });
  }
}
