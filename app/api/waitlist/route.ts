import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
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
  const adminClient = createAdminClient();

  const { email } = await req.json();

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  // Check if email already exists
  const { data: existing } = await adminClient
    .from("waitlist")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .single();

  if (existing) {
    return NextResponse.json({ error: "You're already on the waitlist!" }, { status: 400 });
  }

  // Insert into waitlist
  const { error: insertError } = await adminClient
    .from("waitlist")
    .insert({
      email: email.toLowerCase().trim(),
    });

  if (insertError) {
    console.error("Failed to add to waitlist:", insertError);
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }

  // Send Discord invite email
  const resend = getResend();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const discordInvite = "https://discord.gg/jtcvNM4Asw";

  if (resend) {
    try {
      await resend.emails.send({
        from: "Blueprint <noreply@myblueprint.studio>",
        to: email,
        subject: "You're on the Blueprint waitlist! 🎉",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f4f5;">
                <tr>
                  <td align="center" style="padding: 40px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: linear-gradient(145deg, #18181b 0%, #1f1f23 100%); border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.15);">
                      <tr>
                        <td style="padding: 40px 32px;">
                          <div style="text-align: center; margin-bottom: 32px;">
                            <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 8px 0; color: #ffffff;">🎉 You're on the list!</h1>
                            <p style="color: #a1a1aa; margin: 0; font-size: 15px;">
                              Thanks for joining the Blueprint waitlist
                            </p>
                          </div>

                          <div style="background: rgba(255,255,255,0.05); border-radius: 10px; padding: 20px; margin-bottom: 24px;">
                            <p style="color: #d4d4d8; font-size: 15px; line-height: 1.6; margin: 0; text-align: center;">
                              We're launching on <strong style="color: #fff;">February 20, 2026</strong> and you'll receive your free Creator key via email on launch day.
                            </p>
                          </div>

                          <div style="background: linear-gradient(135deg, rgba(99,102,241,0.15) 0%, rgba(139,92,246,0.15) 100%); border: 1px solid rgba(99,102,241,0.3); border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                            <p style="color: #a78bfa; font-size: 14px; font-weight: 600; margin: 0 0 8px; text-align: center;">
                              📣 Follow Our Progress
                            </p>
                            <p style="color: #a1a1aa; font-size: 14px; line-height: 1.5; margin: 0; text-align: center;">
                              Join our Discord community to follow development updates, share feedback, and connect with other creators!
                            </p>
                          </div>

                          <div style="text-align: center; margin-bottom: 28px;">
                            <a href="${discordInvite}" style="display: inline-block; background: #5865F2; color: #ffffff; text-decoration: none; padding: 14px 36px; border-radius: 10px; font-weight: 600; font-size: 15px;">
                              Join Discord Community
                            </a>
                          </div>

                          <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 24px; text-align: center;">
                            <p style="color: #3f3f46; font-size: 12px; margin: 0;">
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

      // Mark as discord invite sent
      await adminClient
        .from("waitlist")
        .update({ discord_invite_sent: true })
        .eq("email", email.toLowerCase().trim());
    } catch (emailError) {
      console.error("Failed to send waitlist email:", emailError);
      // Don't fail the request if email fails - they're still on the list
    }
  }

  return NextResponse.json({ success: true });
}
