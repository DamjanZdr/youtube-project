/**
 * Billing Server Actions
 */

'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createCheckoutSession, createPortalSession, stripe } from '@/lib/stripe';
import { stripeConfig } from '@/lib/stripe/config';
import type { ApiResponse } from '@/types';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function createCheckout(priceId: string): Promise<ApiResponse<{ url: string }>> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { data: null, error: 'Unauthorized', success: false };
  }

  try {
    const { successUrl, cancelUrl } = stripeConfig.getCheckoutUrls(baseUrl);
    
    const session = await createCheckoutSession({
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
    
    const session = await createPortalSession({
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
