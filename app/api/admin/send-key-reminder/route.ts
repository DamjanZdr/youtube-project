import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

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

  const { keyId } = await req.json();

  if (!keyId) {
    return NextResponse.json({ error: "Missing keyId" }, { status: 400 });
  }

  // Get the key with assigned org info
  const { data: keyData, error: keyError } = await adminClient
    .from("plan_keys")
    .select(`
      *,
      assigned_org:organizations!plan_keys_assigned_org_id_fkey(
        id,
        name,
        owner_id
      )
    `)
    .eq("id", keyId)
    .single();

  if (keyError || !keyData) {
    return NextResponse.json({ error: "Key not found" }, { status: 404 });
  }

  // Check if key is already redeemed
  if (keyData.redeemed_at) {
    return NextResponse.json({ error: "Key has already been redeemed" }, { status: 400 });
  }

  // Determine recipient email
  let recipientEmail: string | null = null;
  let recipientName: string | null = null;
  let studioName: string | null = null;

  if (keyData.sent_to_email) {
    // Key was sent directly to an email
    recipientEmail = keyData.sent_to_email;
  } else if (keyData.assigned_org) {
    // Key is assigned to an organization - get owner's email
    studioName = keyData.assigned_org.name;
    const { data: owner } = await adminClient
      .from("profiles")
      .select("email, full_name")
      .eq("id", keyData.assigned_org.owner_id)
      .single();
    
    if (owner) {
      recipientEmail = owner.email;
      recipientName = owner.full_name;
    }
  }

  if (!recipientEmail) {
    return NextResponse.json({ 
      error: "No recipient email found for this key" 
    }, { status: 400 });
  }

  // Build redemption URL
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redeemUrl = `${appUrl}/redeem?key=${keyData.key}`;

  // Duration text
  const durationText = keyData.duration === "lifetime" ? "Lifetime" : 
                       keyData.duration === "year" ? "1 Year" : "1 Month";
  const planText = keyData.plan.charAt(0).toUpperCase() + keyData.plan.slice(1);

  // Send reminder email
  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ 
      success: false, 
      error: "Email service not configured" 
    }, { status: 500 });
  }

  try {
    const greeting = recipientName ? `Hi ${recipientName.split(' ')[0]},` : "Hi there,";
    const studioContext = studioName 
      ? `for <strong>${studioName}</strong>` 
      : "";

    await resend.emails.send({
      from: "Blueprint <noreply@myblueprint.studio>",
      to: recipientEmail,
      subject: `Reminder: Your ${planText} Plan Key is Waiting! 🔔`,
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
                          <h1 style="font-size: 24px; font-weight: 700; margin: 0 0 12px 0; color: #ffffff;">Don't Forget Your Key!</h1>
                          <p style="color: #a1a1aa; margin: 0; font-size: 15px; line-height: 1.5;">
                            ${greeting.replace('Hi', 'Hey')} You have an unused <strong style="color: #ffffff;">${planText}</strong> plan key ${studioContext} waiting to be redeemed.
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
                            Redeem Your Key Now →
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

    // Optionally update last_reminder_sent_at if the column exists
    // await adminClient.from("plan_keys").update({ last_reminder_sent_at: new Date().toISOString() }).eq("id", keyId);

    return NextResponse.json({ 
      success: true, 
      emailSent: true,
      sentTo: recipientEmail,
      message: "Reminder sent successfully" 
    });
  } catch (emailError) {
    console.error("Failed to send reminder email:", emailError);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to send email" 
    }, { status: 500 });
  }
}
