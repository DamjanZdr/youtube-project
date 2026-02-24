import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set, email sending disabled");
    return null;
  }
  return new Resend(apiKey);
}

const categoryLabels: Record<string, string> = {
  bug_report: "Bug Report",
  feature_request: "Feature Request",
  billing_issue: "Billing Issue",
  account_help: "Account Help",
  technical_support: "Technical Support",
  general_question: "General Question",
  partnership: "Partnership",
  other: "Other",
};

// POST: Create a new support ticket
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subject, category, message, relatedStudioId } = body;

    if (!subject?.trim() || !category || !message?.trim()) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Create the ticket
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id,
        subject: subject.trim(),
        category,
        related_studio_id: relatedStudioId && relatedStudioId !== "none" ? relatedStudioId : null,
      })
      .select()
      .single();

    if (ticketError || !ticket) {
      console.error("Ticket creation error:", ticketError);
      return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
    }

    // Add the initial message
    const { error: messageError } = await supabase
      .from("support_ticket_messages")
      .insert({
        ticket_id: ticket.id,
        sender_id: user.id,
        content: message.trim(),
        is_admin: false,
      });

    if (messageError) {
      console.error("Message creation error:", messageError);
    }

    // Get user profile for email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, full_name")
      .eq("id", user.id)
      .single();

    // Get studio name if related
    let studioName = null;
    if (relatedStudioId && relatedStudioId !== "none") {
      const { data: org } = await supabase
        .from("organizations")
        .select("name")
        .eq("id", relatedStudioId)
        .single();
      studioName = org?.name;
    }

    // Get all admin emails from database
    const { data: admins } = await adminClient
      .from("profiles")
      .select("email")
      .eq("is_admin", true);

    const adminEmails = admins?.map(a => a.email).filter(Boolean) || [];

    // Send email notification to all admins
    if (adminEmails.length > 0) {
      const resend = getResend();
      if (resend) {
        try {
          await resend.emails.send({
            from: "Blueprint <noreply@myblueprint.run>",
            to: adminEmails,
            subject: `[Support] New ticket: ${subject.trim()}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333;">New Support Ticket</h2>
                
                <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0;"><strong>Subject:</strong> ${subject.trim()}</p>
                  <p style="margin: 0 0 10px 0;"><strong>Category:</strong> ${categoryLabels[category] || category}</p>
                  <p style="margin: 0 0 10px 0;"><strong>From:</strong> ${profile?.full_name || 'Unknown'} (${profile?.email || user.email})</p>
                  ${studioName ? `<p style="margin: 0 0 10px 0;"><strong>Studio:</strong> ${studioName}</p>` : ''}
                </div>

                <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                  <p style="margin: 0 0 10px 0; color: #666; font-size: 12px;">Message:</p>
                  <p style="margin: 0; white-space: pre-wrap;">${message.trim()}</p>
                </div>

                <a href="${appUrl}/admin/tickets" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 10px;">
                  View in Admin Panel
                </a>
              </div>
            `,
          });
        } catch (emailError) {
          console.error("Failed to send admin notification:", emailError);
          // Don't fail the request if email fails
        }
      }
    }

    return NextResponse.json({ ticket });
  } catch (error) {
    console.error("Create ticket error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
