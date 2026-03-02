/**
 * Stripe Webhook Handler
 * 
 * Handles subscription lifecycle events from Stripe
 */

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { getStripe, constructWebhookEvent } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';
import type { SubscriptionPlan } from '@/types';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// Log webhook config status on cold start (will show in Vercel logs)
if (!webhookSecret) {
  console.error('[STRIPE WEBHOOK] STRIPE_WEBHOOK_SECRET is not set!');
}

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN_MAP: Record<string, SubscriptionPlan> = {
  [process.env.NEXT_PUBLIC_STRIPE_CREATOR_MONTHLY_PRICE_ID || 'price_creator_monthly']: 'creator',
  [process.env.NEXT_PUBLIC_STRIPE_CREATOR_YEARLY_PRICE_ID || 'price_creator_yearly']: 'creator',
  [process.env.NEXT_PUBLIC_STRIPE_STUDIO_MONTHLY_PRICE_ID || 'price_studio_monthly']: 'studio',
  [process.env.NEXT_PUBLIC_STRIPE_STUDIO_YEARLY_PRICE_ID || 'price_studio_yearly']: 'studio',
  [process.env.NEXT_PUBLIC_STRIPE_TEAM_MONTHLY_PRICE_ID || 'price_team_monthly']: 'studio',
  [process.env.NEXT_PUBLIC_STRIPE_TEAM_YEARLY_PRICE_ID || 'price_team_yearly']: 'studio',
  [process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly']: 'enterprise',
  [process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly']: 'enterprise',
};

export async function POST(request: Request) {
  // Check webhook secret is configured
  if (!webhookSecret) {
    console.error('[STRIPE WEBHOOK] Missing STRIPE_WEBHOOK_SECRET env var');
    return NextResponse.json(
      { error: 'Webhook not configured' },
      { status: 500 }
    );
  }

  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    console.error('[STRIPE WEBHOOK] Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('[STRIPE WEBHOOK] Signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  console.log(`[STRIPE WEBHOOK] Received event: ${event.type} (${event.id})`);

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as any;
        
        if (session.mode === 'subscription' && session.subscription) {
          const stripe = getStripe();
          const subscriptionResponse = await stripe.subscriptions.retrieve(session.subscription as string);
          const subscription = subscriptionResponse as any;
          const organizationId = session.metadata?.organizationId;
          
          if (!organizationId) {
            console.error('No organizationId in session metadata');
            break;
          }

          const priceId = subscription.items?.data?.[0]?.price?.id;
          const plan = PRICE_TO_PLAN_MAP[priceId] || 'free';
          const interval = subscription.items?.data?.[0]?.price?.recurring?.interval || 'monthly';

          // Create or update subscription record
          // Clear pending_plan fields as the user has now completed checkout
          await supabase
            .from('subscriptions')
            .upsert({
              organization_id: organizationId,
              stripe_customer_id: subscription.customer as string,
              stripe_subscription_id: subscription.id,
              plan,
              status: subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'inactive',
              current_period_start: new Date((subscription.current_period_start || 0) * 1000).toISOString(),
              current_period_end: new Date((subscription.current_period_end || 0) * 1000).toISOString(),
              cancel_at_period_end: subscription.cancel_at_period_end || false,
              interval,
              source: 'stripe', // Reset source from 'pending_activation' to 'stripe'
              failed_payment_count: 0,
              grace_period_end: null,
              last_payment_error: null,
              pending_plan: null, // Clear pending plan
              pending_interval: null, // Clear pending interval
              pending_price_id: null, // Clear pending price ID
            }, {
              onConflict: 'organization_id',
            });

          // Activate the organization if it was pending (new studio with paid plan)
          await supabase
            .from('organizations')
            .update({ status: 'active', checkout_plan: null })
            .eq('id', organizationId)
            .eq('status', 'pending');
        }
        break;
      }

      case 'checkout.session.expired': {
        // User abandoned checkout - delete the pending organization
        const session = event.data.object as any;
        const organizationId = session.metadata?.organizationId;

        if (organizationId) {
          // Only delete if still pending (hasn't been completed somehow)
          const { error } = await supabase
            .from('organizations')
            .delete()
            .eq('id', organizationId)
            .eq('status', 'pending');

          if (error) {
            console.error('Failed to delete expired pending organization:', error);
          } else {
            console.log('Deleted pending organization due to expired checkout:', organizationId);
          }
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any;
        
        let organizationId = subscription.metadata?.organizationId;
        
        // If no organizationId in metadata, try to find it by stripe_subscription_id
        if (!organizationId) {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('organization_id, pending_plan, pending_price_id, pending_interval')
            .eq('stripe_subscription_id', subscription.id)
            .single();
          
          organizationId = existingSub?.organization_id;
          
          // Check if there's a pending change that should be applied
          if (existingSub?.pending_plan && existingSub?.pending_price_id) {
            const currentPeriodJustEnded = subscription.current_period_start * 1000 > Date.now() - 60000; // Within last minute
            
            if (currentPeriodJustEnded) {
              // Apply the pending change now
              const stripe = getStripe();
              try {
                await stripe.subscriptions.update(subscription.id, {
                  items: [{
                    id: subscription.items.data[0].id,
                    price: existingSub.pending_price_id,
                  }],
                  proration_behavior: 'none', // No proration since we're at period boundary
                });
              } catch (error) {
                console.error('Failed to apply pending subscription change:', error);
              }
            }
          }
        }
        
        if (!organizationId) {
          console.error('No organizationId found for subscription:', subscription.id);
          break;
        }

        const priceId = subscription.items?.data?.[0]?.price?.id;
        const plan = PRICE_TO_PLAN_MAP[priceId] || 'free';
        const interval = subscription.items?.data?.[0]?.price?.recurring?.interval || 'monthly';

        // Get current subscription from DB to check for pending changes
        const { data: currentSub } = await supabase
          .from('subscriptions')
          .select('pending_plan, pending_price_id, pending_interval')
          .eq('organization_id', organizationId)
          .single();

        // If the current price matches a pending change, clear the pending fields
        const clearPending = currentSub?.pending_price_id === priceId;

        await supabase
          .from('subscriptions')
          .upsert({
            organization_id: organizationId,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            plan,
            status: subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'inactive',
            current_period_start: new Date((subscription.current_period_start || 0) * 1000).toISOString(),
            current_period_end: new Date((subscription.current_period_end || 0) * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end || false,
            interval,
            source: 'stripe',
            // Clear pending if it was applied, otherwise keep it
            pending_plan: clearPending ? null : currentSub?.pending_plan,
            pending_price_id: clearPending ? null : currentSub?.pending_price_id,
            pending_interval: clearPending ? null : currentSub?.pending_interval,
          }, {
            onConflict: 'organization_id',
          });

        // Log billing event for subscription change
        if (event.type === 'customer.subscription.created') {
          const { error: eventError } = await supabase.from('billing_events').insert({
            organization_id: organizationId,
            event_type: 'subscription_created',
            new_plan: plan,
            source: 'stripe',
            period_start: new Date((subscription.current_period_start || 0) * 1000).toISOString(),
            period_end: new Date((subscription.current_period_end || 0) * 1000).toISOString(),
          });
          if (eventError) console.error('Failed to log billing event:', eventError);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any;
        
        const organizationId = subscription.metadata?.organizationId;
        if (!organizationId) {
          console.error('No organizationId in subscription metadata');
          break;
        }

        // Downgrade to free plan
        await supabase
          .from('subscriptions')
          .update({
            plan: 'free',
            status: 'canceled',
            source: 'stripe',
            cancel_at_period_end: false,
            grace_period_end: null,
            failed_payment_count: 0,
            last_payment_error: null,
          })
          .eq('organization_id', organizationId);

        // Log billing event for cancellation
        const { error: cancelEventError } = await supabase.from('billing_events').insert({
          organization_id: organizationId,
          event_type: 'subscription_cancelled',
          previous_plan: PRICE_TO_PLAN_MAP[subscription.items?.data?.[0]?.price?.id] || 'unknown',
          new_plan: 'free',
          source: 'stripe',
        });
        if (cancelEventError) console.error('Failed to log billing event:', cancelEventError);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as any;
        
        if (invoice.subscription) {
          const stripe = getStripe();
          const subscriptionResponse = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const subscription = subscriptionResponse as any;
          const organizationId = subscription.metadata?.organizationId;
          
          if (!organizationId) {
            console.error('No organizationId in subscription metadata');
            break;
          }

          // Payment successful - reset failed payment tracking
          await supabase
            .from('subscriptions')
            .update({
              status: 'active',
              source: 'stripe', // Ensure source is set to stripe
              failed_payment_count: 0,
              grace_period_end: null,
              last_payment_error: null,
            })
            .eq('organization_id', organizationId);

          // Log billing event for payment
          const priceId = subscription.items?.data?.[0]?.price?.id;
          const plan = PRICE_TO_PLAN_MAP[priceId] || 'free';
          
          const { error: paymentEventError } = await supabase.from('billing_events').insert({
            organization_id: organizationId,
            event_type: 'payment_success',
            new_plan: plan,
            amount_cents: invoice.amount_paid,
            currency: invoice.currency,
            source: 'stripe',
            stripe_invoice_id: invoice.id,
            period_start: new Date((subscription.current_period_start || 0) * 1000).toISOString(),
            period_end: new Date((subscription.current_period_end || 0) * 1000).toISOString(),
            metadata: {
              invoice_number: invoice.number,
              customer_email: invoice.customer_email,
            }
          });
          if (paymentEventError) console.error('Failed to log billing event:', paymentEventError);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        
        if (invoice.subscription) {
          const stripe = getStripe();
          const subscriptionResponse = await stripe.subscriptions.retrieve(invoice.subscription as string);
          const subscription = subscriptionResponse as any;
          const organizationId = subscription.metadata?.organizationId;
          
          if (!organizationId) {
            console.error('No organizationId in subscription metadata');
            break;
          }

          // Get current failed payment count
          const { data: currentSub } = await supabase
            .from('subscriptions')
            .select('failed_payment_count')
            .eq('organization_id', organizationId)
            .single();

          const failedCount = (currentSub?.failed_payment_count || 0) + 1;
          
          // Calculate grace period end (10 days from now)
          const gracePeriodEnd = new Date();
          gracePeriodEnd.setDate(gracePeriodEnd.getDate() + 10);

          await supabase
            .from('subscriptions')
            .update({
              status: 'past_due',
              failed_payment_count: failedCount,
              grace_period_end: gracePeriodEnd.toISOString(),
              last_payment_error: invoice.last_finalization_error?.message || 'Payment failed',
            })
            .eq('organization_id', organizationId);

          // Log billing event for failed payment
          const { error: failedEventError } = await supabase.from('billing_events').insert({
            organization_id: organizationId,
            event_type: 'payment_failed',
            amount_cents: invoice.amount_due,
            source: 'stripe',
            stripe_invoice_id: invoice.id,
            metadata: {
              attempt_count: failedCount,
              error_message: invoice.last_finalization_error?.message,
            }
          });
          if (failedEventError) console.error('Failed to log billing event:', failedEventError);
        }
        break;
      }

      default:
        // Unhandled event type - still return 200 to acknowledge receipt
        console.log(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
        break;
    }

    console.log(`[STRIPE WEBHOOK] Successfully processed: ${event.type}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`[STRIPE WEBHOOK] Error processing ${event.type}:`, error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
