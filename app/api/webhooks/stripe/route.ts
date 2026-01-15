/**
 * Stripe Webhook Handler
 * 
 * Handles subscription lifecycle events from Stripe
 */

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe, constructWebhookEvent } from '@/lib/stripe';
import { createClient } from '@/lib/supabase/server';
import type Stripe from 'stripe';
import type { SubscriptionPlan } from '@/types';

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN_MAP: Record<string, SubscriptionPlan> = {
  [process.env.STRIPE_CREATOR_MONTHLY_PRICE_ID || 'price_creator_monthly']: 'creator',
  [process.env.STRIPE_CREATOR_YEARLY_PRICE_ID || 'price_creator_yearly']: 'creator',
  [process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || 'price_team_monthly']: 'team',
  [process.env.STRIPE_TEAM_YEARLY_PRICE_ID || 'price_team_yearly']: 'team',
  [process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID || 'price_enterprise_monthly']: 'enterprise',
  [process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID || 'price_enterprise_yearly']: 'enterprise',
};

export async function POST(request: Request) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  if (!signature) {
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = constructWebhookEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error('Webhook signature verification failed:', error);
    return NextResponse.json(
      { error: 'Invalid signature' },
      { status: 400 }
    );
  }

  const supabase = await createClient();

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        if (session.mode === 'subscription' && session.subscription) {
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
              failed_payment_count: 0,
              grace_period_end: null,
              last_payment_error: null,
            }, {
              onConflict: 'organization_id',
            });

          console.log(`Checkout completed for org ${organizationId}, plan: ${plan}`);
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        
        const organizationId = subscription.metadata?.organizationId;
        if (!organizationId) {
          console.error('No organizationId in subscription metadata');
          break;
        }

        const priceId = subscription.items.data[0]?.price.id;
        const plan = PRICE_TO_PLAN_MAP[priceId] || 'free';
        const interval = subscription.items.data[0]?.price.recurring?.interval || 'monthly';

        await supabase
          .from('subscriptions')
          .upsert({
            organization_id: organizationId,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            plan,
            status: subscription.status === 'active' || subscription.status === 'trialing' ? 'active' : 'inactive',
            current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            cancel_at_period_end: subscription.cancel_at_period_end,
            interval,
          }, {
            onConflict: 'organization_id',
          });

        console.log(`Subscription ${event.type} for org ${organizationId}, plan: ${plan}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        
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
            cancel_at_period_end: false,
            grace_period_end: null,
            failed_payment_count: 0,
            last_payment_error: null,
          })
          .eq('organization_id', organizationId);

        console.log(`Subscription canceled for org ${organizationId}`);
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
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
              failed_payment_count: 0,
              grace_period_end: null,
              last_payment_error: null,
            })
            .eq('organization_id', organizationId);

          console.log(`Invoice paid for org ${organizationId}`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        
        if (invoice.subscription) {
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

          console.log(`Payment failed for org ${organizationId}, attempt ${failedCount}`);
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
