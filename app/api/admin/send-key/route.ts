import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

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
  if (email && process.env.RESEND_API_KEY) {
    try {
      await resend.emails.send({
        from: "MyBlueprint <noreply@myblueprint.studio>",
        to: email,
        subject: `Your ${planText} Plan Key is Ready! 🎉`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #fff;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #fff; margin: 0; font-size: 28px;">🎉 Your Plan Key</h1>
            </div>
            
            <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
              ${orgName 
                ? `A <strong style="color: #fff;">${planText}</strong> plan key has been generated for <strong style="color: #fff;">${orgName}</strong>.`
                : `You've received a <strong style="color: #fff;">${planText}</strong> plan subscription key!`
              }
            </p>
            
            <div style="background: linear-gradient(135deg, #1e1e2e 0%, #2d1f3d 100%); border-radius: 12px; padding: 24px; margin: 24px 0; text-align: center;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Your Key</p>
              <p style="color: #fff; font-size: 28px; font-family: monospace; letter-spacing: 4px; margin: 0; font-weight: bold;">
                ${key}
              </p>
            </div>
            
            <div style="background: #1a1a1a; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
              <p style="color: #a1a1aa; margin: 4px 0; font-size: 14px;">
                <strong style="color: #fff;">Plan:</strong> ${planText}
              </p>
              <p style="color: #a1a1aa; margin: 4px 0; font-size: 14px;">
                <strong style="color: #fff;">Duration:</strong> ${durationText}
              </p>
              ${orgName ? `
              <p style="color: #a1a1aa; margin: 4px 0; font-size: 14px;">
                <strong style="color: #fff;">For:</strong> ${orgName}
              </p>
              ` : ''}
            </div>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${redeemUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                Redeem Your Key →
              </a>
            </div>
            
            <p style="color: #71717a; font-size: 13px; text-align: center; margin-top: 32px;">
              Or go to your Studio Settings → Billing and enter the key manually.
            </p>
            
            <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
            
            <p style="color: #525252; font-size: 12px; text-align: center;">
              © MyBlueprint Studio • If you didn't expect this email, you can safely ignore it.
            </p>
          </div>
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
