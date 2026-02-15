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
        html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:20px;font-family:sans-serif;background:#f5f5f5;"><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table width="480" cellpadding="32" cellspacing="0" style="background:#18181b;border-radius:12px;"><tr><td align="center"><h1 style="color:#fff;margin:0 0 8px;">🎉 Your Plan Key</h1><p style="color:#a1a1aa;margin:0 0 24px;">You've received a <strong style="color:#fff;">${planText}</strong> plan key!</p><div style="background:#2d2d33;padding:20px;border-radius:8px;margin-bottom:24px;"><p style="color:#a1a1aa;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px;">Your Key</p><p style="font-family:monospace;font-size:20px;color:#fff;margin:0;letter-spacing:2px;">${key}</p></div><p style="color:#71717a;font-size:14px;margin:0 0 4px;"><strong style="color:#d4d4d8;">Plan:</strong> ${planText}</p><p style="color:#71717a;font-size:14px;margin:0 0 24px;"><strong style="color:#d4d4d8;">Duration:</strong> ${durationText}</p><a href="${redeemUrl}" style="display:inline-block;background:#6366f1;color:#fff;text-decoration:none;padding:12px 32px;border-radius:8px;font-weight:600;">Redeem Key</a><p style="color:#52525b;font-size:13px;margin:24px 0 0;">Or enter manually in Studio Settings → Billing</p></td></tr></table></td></tr></table></body></html>`,
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
