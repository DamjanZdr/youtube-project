// Cron job to handle expired plan keys
// Runs every hour to process gifted plans that have expired
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { Resend } from "resend";
import { getStripe, createCheckoutSession } from "@/lib/stripe";
import { plans } from "@/config/subscriptions";
import { stripeConfig } from "@/lib/stripe/config";

// Vercel Cron config: runs every hour
export const config = {
  schedule: "0 * * * *", // every hour
};

const resend = new Resend(process.env.RESEND_API_KEY);
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const now = new Date();

  // Find all expired, unprocessed plan keys
  const { data: expiredKeys, error } = await supabase
    .from("plan_keys")
    .select("*")
    .lt("expires_at", now.toISOString())
    .is("processed_at", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let processed = 0;
  const results: any[] = [];

  for (const key of expiredKeys || []) {
    // Get the org's subscription
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("organization_id", key.redeemed_org_id)
      .single();
    if (!sub) continue;

    // Only process if this key is currently active on the subscription
    if (sub.key_id !== key.id || sub.source !== "key") {
      // Key was already replaced by another key or Stripe, just mark as processed
      await supabase
        .from("plan_keys")
        .update({ processed_at: now.toISOString() })
        .eq("id", key.id);
      continue;
    }

    // Get organization details for email
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, slug, owner_id")
      .eq("id", key.redeemed_org_id)
      .single();
    
    // Get owner email
    let ownerEmail: string | null = null;
    if (org?.owner_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", org.owner_id)
        .single();
      ownerEmail = profile?.email || null;
    }

    let action = "downgraded_to_free";
    let newPlan = "free";
    let emailSent = false;

    try {
      // Case 1: User has a pending plan scheduled - create checkout session
      if (sub.pending_plan && sub.pending_plan !== "free") {
        const pendingPlanConfig = plans.find(p => p.id === sub.pending_plan);
        if (pendingPlanConfig) {
          const interval = sub.pending_interval || "month";
          const priceId = interval === "year" 
            ? pendingPlanConfig.stripePriceId.yearly 
            : pendingPlanConfig.stripePriceId.monthly;
          
          // We can't auto-charge - need user action
          // Set subscription to pending_activation status and send email
          await supabase
            .from("subscriptions")
            .update({
              plan: "free", // Temporarily downgrade
              source: "pending_activation",
              key_id: null,
              current_period_start: now.toISOString(),
              current_period_end: null,
              // Keep pending_plan info for the user to see
            })
            .eq("id", sub.id);

          action = "pending_plan_activation_needed";
          newPlan = sub.pending_plan;

          // Send email with checkout link
          if (ownerEmail && process.env.RESEND_API_KEY && org) {
            const planName = pendingPlanConfig.name;
            const intervalText = interval === "year" ? "Yearly" : "Monthly";
            const price = interval === "year" 
              ? pendingPlanConfig.price.yearly 
              : pendingPlanConfig.price.monthly;
            const checkoutUrl = `${appUrl}/studio/${org.slug}/settings?tab=billing&activate_plan=${sub.pending_plan}&interval=${interval}`;
            
            try {
              await resend.emails.send({
                from: "MyBlueprint <noreply@myblueprint.studio>",
                to: ownerEmail,
                subject: `Your Gifted Plan Has Expired - Activate ${planName} Now`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #fff;">
                    <div style="text-align: center; margin-bottom: 32px;">
                      <h1 style="color: #fff; margin: 0; font-size: 28px;">Your Gift Has Expired</h1>
                    </div>
                    
                    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                      Your gifted plan for <strong style="color: #fff;">${org.name}</strong> has expired.
                    </p>
                    
                    <div style="background: linear-gradient(135deg, #1e1e2e 0%, #2d1f3d 100%); border-radius: 12px; padding: 24px; margin: 24px 0;">
                      <p style="color: #a1a1aa; font-size: 14px; margin: 0 0 16px 0;">
                        You previously scheduled to continue with:
                      </p>
                      <p style="color: #fff; font-size: 24px; font-weight: bold; margin: 0;">
                        ${planName} ${intervalText}
                      </p>
                      <p style="color: #a1a1aa; font-size: 16px; margin: 8px 0 0 0;">
                        $${price}/${interval === "year" ? "year" : "month"}
                      </p>
                    </div>
                    
                    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                      Click below to complete payment and keep your ${planName} features. Until then, you'll have access to the Free tier.
                    </p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${checkoutUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        Activate ${planName} →
                      </a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
                    
                    <p style="color: #525252; font-size: 12px; text-align: center;">
                      © MyBlueprint Studio
                    </p>
                  </div>
                `,
              });
              emailSent = true;
            } catch (emailError) {
              console.error("Failed to send activation email:", emailError);
            }
          }
        }
      }
      // Case 2: User has a previous Stripe subscription - try to resume it
      else if (sub.previous_plan && sub.previous_plan !== "free" && sub.previous_stripe_subscription_id) {
        try {
          const stripe = getStripe();
          
          // Try to resume the paused subscription
          const stripeSubscription = await stripe.subscriptions.retrieve(sub.previous_stripe_subscription_id);
          
          if (stripeSubscription.status === "paused") {
            // Resume the subscription
            await stripe.subscriptions.resume(sub.previous_stripe_subscription_id, {
              billing_cycle_anchor: "now",
            });
            
            action = "resumed_stripe_subscription";
            newPlan = sub.previous_plan;
            
            await supabase
              .from("subscriptions")
              .update({
                plan: sub.previous_plan,
                source: "stripe",
                stripe_subscription_id: sub.previous_stripe_subscription_id,
                key_id: null,
                previous_plan: null,
                previous_stripe_subscription_id: null,
                pending_plan: null,
                pending_interval: null,
                current_period_start: now.toISOString(),
              })
              .eq("id", sub.id);
          } else if (stripeSubscription.status === "active") {
            // Subscription is still active, just update our records
            action = "switched_to_existing_stripe";
            newPlan = sub.previous_plan;
            
            await supabase
              .from("subscriptions")
              .update({
                plan: sub.previous_plan,
                source: "stripe",
                stripe_subscription_id: sub.previous_stripe_subscription_id,
                key_id: null,
                previous_plan: null,
                previous_stripe_subscription_id: null,
                pending_plan: null,
                pending_interval: null,
              })
              .eq("id", sub.id);
          } else {
            // Subscription is in an unexpected state, downgrade to free
            throw new Error(`Stripe subscription in unexpected state: ${stripeSubscription.status}`);
          }
          
          // Send notification email
          if (ownerEmail && process.env.RESEND_API_KEY && org) {
            const planConfig = plans.find(p => p.id === sub.previous_plan);
            try {
              await resend.emails.send({
                from: "MyBlueprint <noreply@myblueprint.studio>",
                to: ownerEmail,
                subject: `Your ${planConfig?.name || sub.previous_plan} Subscription Has Resumed`,
                html: `
                  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #fff;">
                    <div style="text-align: center; margin-bottom: 32px;">
                      <h1 style="color: #fff; margin: 0; font-size: 28px;">Welcome Back! 👋</h1>
                    </div>
                    
                    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                      Your gifted plan for <strong style="color: #fff;">${org.name}</strong> has expired, and your previous <strong style="color: #fff;">${planConfig?.name || sub.previous_plan}</strong> subscription has automatically resumed.
                    </p>
                    
                    <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                      You'll continue to have access to all your ${planConfig?.name || sub.previous_plan} features. Billing will resume on your regular schedule.
                    </p>
                    
                    <div style="text-align: center; margin: 32px 0;">
                      <a href="${appUrl}/studio/${org.slug}/settings?tab=billing" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                        View Billing →
                      </a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
                    
                    <p style="color: #525252; font-size: 12px; text-align: center;">
                      © MyBlueprint Studio
                    </p>
                  </div>
                `,
              });
              emailSent = true;
            } catch (emailError) {
              console.error("Failed to send resume email:", emailError);
            }
          }
        } catch (stripeError) {
          console.error("Failed to resume Stripe subscription:", stripeError);
          // Fall through to Case 3 (downgrade to free)
          action = "stripe_resume_failed_downgraded_to_free";
        }
      }
      
      // Case 3: No pending plan, no previous subscription - downgrade to free
      if (action === "downgraded_to_free" || action === "stripe_resume_failed_downgraded_to_free") {
        await supabase
          .from("subscriptions")
          .update({
            plan: "free",
            source: "stripe",
            key_id: null,
            previous_plan: null,
            previous_stripe_subscription_id: null,
            pending_plan: null,
            pending_interval: null,
            current_period_start: now.toISOString(),
            current_period_end: null,
          })
          .eq("id", sub.id);
        
        // Send notification email
        if (ownerEmail && process.env.RESEND_API_KEY && org) {
          try {
            await resend.emails.send({
              from: "MyBlueprint <noreply@myblueprint.studio>",
              to: ownerEmail,
              subject: `Your Gifted Plan Has Expired`,
              html: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a; color: #fff;">
                  <div style="text-align: center; margin-bottom: 32px;">
                    <h1 style="color: #fff; margin: 0; font-size: 28px;">Your Gift Has Expired</h1>
                  </div>
                  
                  <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                    Your gifted plan for <strong style="color: #fff;">${org.name}</strong> has expired. You've been moved to the Free tier.
                  </p>
                  
                  <p style="color: #a1a1aa; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
                    Want to keep your premium features? Upgrade to a paid plan today!
                  </p>
                  
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${appUrl}/studio/${org.slug}/settings?tab=billing" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      View Plans →
                    </a>
                  </div>
                  
                  <hr style="border: none; border-top: 1px solid #333; margin: 32px 0;" />
                  
                  <p style="color: #525252; font-size: 12px; text-align: center;">
                    © MyBlueprint Studio
                  </p>
                </div>
              `,
            });
            emailSent = true;
          } catch (emailError) {
            console.error("Failed to send downgrade email:", emailError);
          }
        }
      }

      // Log billing event
      await supabase.from("billing_events").insert({
        organization_id: key.redeemed_org_id,
        event_type: "key_expired",
        previous_plan: sub.plan,
        new_plan: newPlan,
        source: "key",
        key_id: key.id,
        metadata: {
          action,
          email_sent: emailSent,
          had_pending_plan: !!sub.pending_plan,
          had_previous_plan: !!sub.previous_plan,
        }
      });

      // Mark key as processed
      await supabase
        .from("plan_keys")
        .update({ processed_at: now.toISOString() })
        .eq("id", key.id);

      processed++;
      results.push({
        key_id: key.id,
        org_id: key.redeemed_org_id,
        action,
        new_plan: newPlan,
        email_sent: emailSent,
      });
      
    } catch (processingError) {
      console.error(`Error processing key ${key.id}:`, processingError);
      results.push({
        key_id: key.id,
        org_id: key.redeemed_org_id,
        error: processingError instanceof Error ? processingError.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ 
    processed, 
    total: expiredKeys?.length || 0,
    results 
  });
}
