/**
 * Billing Server Actions
 */

'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession as createStripeCheckout, createPortalSession as createStripePortal, stripe } from '@/lib/stripe';
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
    .select('id, name')
    .eq('id', organizationId)
    .single();

  if (!org) {
    throw new Error('Organization not found');
  }

  // Check if subscription exists
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const { successUrl, cancelUrl } = stripeConfig.getCheckoutUrls(baseUrl);
  
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

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('stripe_customer_id')
    .eq('organization_id', organizationId)
    .single();

  if (!subscription?.stripe_customer_id) {
    throw new Error('No subscription found');
  }

  const returnUrl = stripeConfig.getPortalReturnUrl(baseUrl);
  
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
