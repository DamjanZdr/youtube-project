/**
 * Billing Server Actions
 */

'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession as createStripeCheckout, createPortalSession as createStripePortal } from '@/lib/stripe';
import { stripeConfig } from '@/lib/stripe/config';
import type { ApiResponse } from '@/types';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function createCheckoutSession(organizationId: string, priceId: string): Promise<{ url: string | null }> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Get organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('id', organizationId)
    .single();

  if (!org) {
    throw new Error('Organization not found');
  }

  // Check if subscription exists
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', organizationId)
    .maybeSingle();

  // If downgrading to free plan (empty priceId), cancel the subscription
  if (!priceId && subscription?.stripe_subscription_id && subscription.status === 'active') {
    // Set to cancel at period end in Stripe
    const stripe = (await import('@/lib/stripe')).getStripe();
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update database to reflect pending downgrade to free
    await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        pending_plan: 'free',
        pending_price_id: null,
        pending_interval: null,
      })
      .eq('organization_id', organizationId);

    return { url: `${baseUrl}/studio/${org.slug}/settings?scheduled=true` };
  }

  // If they have an active subscription, determine if upgrade or downgrade
  if (priceId && subscription?.stripe_subscription_id && subscription.status === 'active') {
    const stripe = (await import('@/lib/stripe')).getStripe();
    const plans = (await import('@/config/subscriptions')).plans;
    
    // If they had scheduled a cancellation, un-cancel it by selecting a new plan
    if (subscription.cancel_at_period_end) {
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        cancel_at_period_end: false,
      });
    }
    
    // Get current and new plan details
    const currentPlan = plans.find(p => p.id === subscription.plan);
    const currentPlanTier = plans.findIndex(p => p.id === subscription.plan);
    
    // Find which plan and interval the new price belongs to
    let newPlan: any = null;
    let newInterval: 'month' | 'year' | null = null;
    let newPlanTier = -1;
    
    for (let i = 0; i < plans.length; i++) {
      const plan = plans[i];
      if (plan.stripePriceId.monthly === priceId) {
        newPlan = plan;
        newInterval = 'month';
        newPlanTier = i;
        break;
      } else if (plan.stripePriceId.yearly === priceId) {
        newPlan = plan;
        newInterval = 'year';
        newPlanTier = i;
        break;
      }
    }

    if (!newPlan || !newInterval) {
      throw new Error('Invalid price ID');
    }

    const currentInterval = subscription.interval || 'month';
    
    // Determine if this is an upgrade or downgrade
    // Upgrade = higher tier OR same/higher tier + monthly->yearly
    // Downgrade = lower tier OR any tier + yearly->monthly
    const isUpgrade = newPlanTier > currentPlanTier || 
                      (newPlanTier >= currentPlanTier && currentInterval === 'month' && newInterval === 'year');
    
    if (isUpgrade) {
      // UPGRADE: Apply immediately with proration
      await stripe.subscriptions.update(subscription.stripe_subscription_id, {
        items: [{
          id: (await stripe.subscriptions.retrieve(subscription.stripe_subscription_id)).items.data[0].id,
          price: priceId,
        }],
        proration_behavior: 'always_invoice', // Charge the difference immediately
      });

      // Clear any pending changes
      await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: false,
          pending_plan: null,
          pending_price_id: null,
          pending_interval: null,
        })
        .eq('organization_id', organizationId);

      return { url: `${baseUrl}/studio/${org.slug}/settings?upgraded=true` };
    } else {
      // DOWNGRADE: Schedule for end of period
      // Don't touch Stripe subscription yet - just store the pending change
      await supabase
        .from('subscriptions')
        .update({
          cancel_at_period_end: false, // Cancel any pending cancellation
          pending_plan: newPlan.id,
          pending_price_id: priceId,
          pending_interval: newInterval,
        })
        .eq('organization_id', organizationId);

      return { url: `${baseUrl}/studio/${org.slug}/settings?scheduled=true` };
    }
  }

  // No active subscription - create new checkout session
  const { successUrl, cancelUrl } = stripeConfig.getCheckoutUrls(baseUrl, org.slug);
  
  const session = await createStripeCheckout({
    priceId,
    customerEmail: user.email,
    customerId: subscription?.stripe_customer_id,
    successUrl,
    cancelUrl,
    metadata: {
      userId: user.id,
      organizationId: org.id,
      organizationName: org.name,
    },
  });

  return { url: session.url };
}

export async function createPortalSession(organizationId: string): Promise<{ url: string | null }> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // Get organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id, slug')
    .eq('id', organizationId)
    .single();

  if (!org) {
    throw new Error('Organization not found');
  }

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', organizationId)
    .single();

  if (!subscription?.stripe_customer_id) {
    throw new Error('No subscription found');
  }

  const returnUrl = stripeConfig.getPortalReturnUrl(baseUrl, org.slug);
  
  const session = await createStripePortal({
    customerId: subscription.stripe_customer_id,
    returnUrl,
  });

  return { url: session.url };
}

export async function createCheckout(priceId: string): Promise<ApiResponse<{ url: string }>> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Unauthorized', success: false };
  }

  try {
    const { successUrl, cancelUrl } = stripeConfig.getCheckoutUrls(baseUrl);
    
    const session = await createStripeCheckout({
      priceId,
      customerEmail: user.email,
      successUrl,
      cancelUrl,
      metadata: {
        userId: user.id,
      },
    });

    if (!session.url) {
      return { data: null, error: 'Failed to create checkout session', success: false };
    }

    return {
      data: { url: session.url },
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Checkout error:', error);
    return {
      data: null,
      error: 'Failed to create checkout session',
      success: false,
    };
  }
}

export async function createBillingPortal(): Promise<ApiResponse<{ url: string }>> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Unauthorized', success: false };
  }

  try {
    // TODO: Get Stripe customer ID from your database
    // const { data: subscription } = await supabase
    //   .from('subscriptions')
    //   .select('stripe_customer_id')
    //   .eq('user_id', user.id)
    //   .single();

    const customerId = ''; // Replace with actual customer ID lookup
    
    if (!customerId) {
      return { data: null, error: 'No subscription found', success: false };
    }

    const returnUrl = stripeConfig.getPortalReturnUrl(baseUrl);
    
    const session = await createStripePortal({
      customerId,
      returnUrl,
    });

    return {
      data: { url: session.url },
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Portal error:', error);
    return {
      data: null,
      error: 'Failed to create portal session',
      success: false,
    };
  }
}

export async function cancelSubscription(): Promise<ApiResponse<null>> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Unauthorized', success: false };
  }

  try {
    // TODO: Get subscription ID from your database and cancel via Stripe
    // await stripe.subscriptions.update(subscriptionId, {
    //   cancel_at_period_end: true,
    // });

    return {
      data: null,
      error: null,
      success: true,
    };
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return {
      data: null,
      error: 'Failed to cancel subscription',
      success: false,
    };
  }
}
