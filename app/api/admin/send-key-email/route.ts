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
      from: "MyBlueprint <noreply@myblueprint.studio>",
      to: email,
      subject: `Your ${planText} Plan Key is Ready! 🎉`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0a0a0a; color: #ffffff; padding: 40px 20px; margin: 0;">
            <div style="max-width: 480px; margin: 0 auto; background: linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 32px;">
              
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">🎁 Your Plan Key</h1>
                <p style="color: #888; margin: 0; font-size: 14px;">You've received a subscription key</p>
              </div>

              <div style="background: rgba(255,255,255,0.05); border-radius: 12px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <p style="color: #888; font-size: 12px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Your Key</p>
                <div style="font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace; font-size: 20px; letter-spacing: 2px; color: #fff; background: rgba(0,0,0,0.3); padding: 16px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1);">
                  ${keyData.key}
                </div>
              </div>

              <div style="display: flex; gap: 16px; margin-bottom: 24px;">
                <div style="flex: 1; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 16px; text-align: center;">
                  <p style="color: #888; font-size: 12px; margin: 0 0 4px 0;">Plan</p>
                  <p style="font-size: 16px; font-weight: 600; margin: 0; color: #818cf8;">${planText}</p>
                </div>
                <div style="flex: 1; background: rgba(255,255,255,0.03); border-radius: 8px; padding: 16px; text-align: center;">
                  <p style="color: #888; font-size: 12px; margin: 0 0 4px 0;">Duration</p>
                  <p style="font-size: 16px; font-weight: 600; margin: 0;">${durationText}</p>
                </div>
              </div>

              <a href="${redeemUrl}" style="display: block; background: linear-gradient(135deg, #818cf8 0%, #6366f1 100%); color: white; text-decoration: none; padding: 14px 24px; border-radius: 10px; font-weight: 600; text-align: center; margin-bottom: 24px;">
                Redeem Your Key →
              </a>

              <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px;">
                <p style="color: #666; font-size: 12px; margin: 0 0 8px 0;">How to redeem:</p>
                <ol style="color: #888; font-size: 13px; margin: 0; padding-left: 20px; line-height: 1.8;">
                  <li>Click the button above or go to your studio settings</li>
                  <li>Navigate to the Billing tab</li>
                  <li>Enter your key in the "Have a plan key?" section</li>
                </ol>
              </div>

              <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.05);">
                <p style="color: #444; font-size: 11px; margin: 0;">
                  MyBlueprint • Making video planning simple
                </p>
              </div>
            </div>
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
