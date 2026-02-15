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
  const discordInvite = "https://discord.gg/tJ6pcNezC8";

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
            <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
              <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 20px;">
                <tr>
                  <td align="center">
                    <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 500px; background-color: #f4f4f5; border-radius: 20px; border: 1px solid #e4e4e7; overflow: hidden;">
                      <!-- Header -->
                      <tr>
                        <td style="padding: 32px 32px 24px; text-align: center;">
                          <img src="${appUrl}/bplogo.png" alt="Blueprint" style="height: 40px; width: auto;" />
                        </td>
                      </tr>
                      
                      <!-- Content -->
                      <tr>
                        <td style="padding: 0 32px 32px;">
                          <h1 style="color: #18181b; font-size: 24px; font-weight: 700; margin: 0 0 16px; text-align: center;">
                            You're on the list! 🎉
                          </h1>
                          
                          <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px; text-align: center;">
                            Thanks for joining the Blueprint waitlist. We're launching on <strong style="color: #18181b;">February 20, 2026</strong> and you'll receive your free Creator key via email on launch day.
                          </p>

                          <div style="background-color: #e4e4e7; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                            <p style="color: #6366f1; font-size: 14px; font-weight: 600; margin: 0 0 8px; text-align: center;">
                              📣 Follow Our Progress
                            </p>
                            <p style="color: #52525b; font-size: 14px; line-height: 1.5; margin: 0; text-align: center;">
                              While you wait, join our Discord community to follow development updates, share feedback, and connect with other creators!
                            </p>
                          </div>

                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td align="center">
                                <a href="${discordInvite}" style="display: inline-block; background-color: #5865F2; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 14px 32px; border-radius: 10px;">
                                  Join Discord Community
                                </a>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="padding: 24px 32px; border-top: 1px solid #d4d4d8; text-align: center;">
                          <p style="color: #71717a; font-size: 12px; margin: 0;">
                            Blueprint — The operating system for YouTube creators
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
