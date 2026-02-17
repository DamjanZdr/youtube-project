/**
 * Billing Server Actions
 */

'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession as createStripeCheckout, createPortalSession as createStripePortal } from '@/lib/stripe';
import { stripeConfig } from '@/lib/stripe/config';
import { plans } from '@/config/subscriptions';
import type { ApiResponse, SubscriptionPlan } from '@/types';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

/**
 * Get member limit for a given plan (local helper, not exported as server action)
 */
function getMemberLimitForPlan(plan: SubscriptionPlan): number {
  const planConfig = plans.find(p => p.id === plan);
  return planConfig?.limits.teamMembers ?? 1;
}

/**
 * Check if downgrade is allowed based on member count
 */
export async function checkDowngradeAllowed(organizationId: string, targetPlan: SubscriptionPlan): Promise<{
  allowed: boolean;
  currentMembers: number;
  targetLimit: number;
  message?: string;
}> {
  const supabase = await createClient();
  
  // Get active member count
  const { count: memberCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active');
  
  const currentMembers = memberCount || 1;
  const targetLimit = getMemberLimitForPlan(targetPlan);
  
  // -1 means unlimited
  if (targetLimit === -1) {
    return { allowed: true, currentMembers, targetLimit };
  }
  
  if (currentMembers > targetLimit) {
    const excess = currentMembers - targetLimit;
    return {
      allowed: false,
      currentMembers,
      targetLimit,
      message: `You have ${currentMembers} members but ${targetPlan} plan allows only ${targetLimit}. Please remove ${excess} member${excess > 1 ? 's' : ''} before downgrading.`
    };
  }
  
  return { allowed: true, currentMembers, targetLimit };
}

export async function createCheckoutSession(organizationId: string, priceId: string): Promise<{ url: string | null }> {
  try {
    const supabase = await createClient();
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Auth error:', userError);
      throw new Error('Authentication failed');
    }
    if (!user) {
      throw new Error('Unauthorized');
    }

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, owner_id')
      .eq('id', organizationId)
      .single();

    if (orgError) {
      console.error('Organization fetch error:', orgError);
      throw new Error('Failed to fetch organization');
    }
    if (!org) {
      throw new Error('Organization not found');
    }

    // Only owner can manage billing
    if (org.owner_id !== user.id) {
      throw new Error('Only the studio owner can manage billing');
    }

    // Check if subscription exists
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('organization_id', organizationId)
      .maybeSingle();

    if (subError) {
      console.error('Subscription fetch error:', subError);
    }

    // If downgrading to free plan (empty priceId), cancel the subscription
    if (!priceId && subscription?.stripe_subscription_id && subscription.status === 'active') {
      // Check if member count allows downgrade to free
      const downgradeCheck = await checkDowngradeAllowed(organizationId, 'free');
      if (!downgradeCheck.allowed) {
        throw new Error(downgradeCheck.message);
      }
      
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

      return { url: `${baseUrl}/studio/${org.slug}/settings?tab=billing&scheduled=true` };
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
      
      // BILLING RULES:
      // - Monthly → Monthly (upgrade tier): Instant + proration
      // - Monthly → Monthly (downgrade tier): End of cycle
      // - Monthly → Yearly (any tier): Instant + proration (yearly commitment is always upgrade)
      // - Yearly → Monthly (any tier): End of year (yearly is a commitment)
      // - Yearly → Yearly (upgrade tier): Instant + proration
      // - Yearly → Yearly (downgrade tier): End of year
      
      const isTierUpgrade = newPlanTier > currentPlanTier;
      const isTierDowngrade = newPlanTier < currentPlanTier;
      const isMovingToYearly = currentInterval === 'month' && newInterval === 'year';
      const isMovingToMonthly = currentInterval === 'year' && newInterval === 'month';
      
      // Determine if this change should happen immediately
      const isInstantChange = 
        isMovingToYearly || // Monthly → Yearly is always instant (commitment)
        (currentInterval === 'month' && newInterval === 'month' && isTierUpgrade) || // Monthly tier upgrade
        (currentInterval === 'year' && newInterval === 'year' && isTierUpgrade); // Yearly tier upgrade
      
      if (isInstantChange) {
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

        return { url: `${baseUrl}/studio/${org.slug}/settings?tab=billing&upgraded=true` };
      } else {
        // SCHEDULED CHANGE: Monthly tier downgrade, yearly→monthly, or yearly tier downgrade
        // Check member limits before allowing
        const downgradeCheck = await checkDowngradeAllowed(organizationId, newPlan.id);
        if (!downgradeCheck.allowed) {
          throw new Error(downgradeCheck.message);
        }
        
        // Schedule for end of current billing period
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

        return { url: `${baseUrl}/studio/${org.slug}/settings?tab=billing&scheduled=true` };
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
  } catch (error) {
    console.error('createCheckoutSession error:', error);
    throw error;
  }
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
    .select('id, slug, owner_id')
    .eq('id', organizationId)
    .single();

  if (!org) {
    throw new Error('Organization not found');
  }

  // Only owner can access billing portal
  if (org.owner_id !== user.id) {
    throw new Error('Only the studio owner can manage billing');
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

export async function undoPendingChange(organizationId: string): Promise<{ success: boolean }> {
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
    .select('*')
    .eq('organization_id', organizationId)
    .single();

  if (!subscription) {
    throw new Error('No subscription found');
  }

  // If there's a scheduled cancellation, un-cancel it in Stripe
  if (subscription.cancel_at_period_end && subscription.stripe_subscription_id) {
    const stripe = (await import('@/lib/stripe')).getStripe();
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
  }

  // Clear pending changes in database
  await supabase
    .from('subscriptions')
    .update({
      cancel_at_period_end: false,
      pending_plan: null,
      pending_price_id: null,
      pending_interval: null,
    })
    .eq('organization_id', organizationId);

  return { success: true };
}
