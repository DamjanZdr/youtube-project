/**
 * API route for creating embedded Stripe Checkout sessions
 * Returns a client_secret for the EmbeddedCheckoutProvider
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getStripe } from '@/lib/stripe';
import { stripeConfig } from '@/lib/stripe/config';

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(req: NextRequest) {
  try {
    const { organizationId, priceId } = await req.json();

    if (!organizationId || !priceId) {
      return NextResponse.json({ error: 'Missing organizationId or priceId' }, { status: 400 });
    }

    const supabase = await createClient();

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Check if subscription exists (for existing customer ID)
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('organization_id', organizationId)
      .maybeSingle();

    const stripe = getStripe();

    const sessionParams: Record<string, unknown> = {
      mode: 'subscription' as const,
      ui_mode: 'embedded' as const,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      return_url: `${baseUrl}/studio/${org.slug}/checkout/return?session_id={CHECKOUT_SESSION_ID}`,
      metadata: {
        userId: user.id,
        organizationId: org.id,
        organizationName: org.name,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          organizationId: org.id,
          organizationName: org.name,
        },
      },
    };

    // Attach customer if exists, otherwise use email
    if (subscription?.stripe_customer_id) {
      sessionParams.customer = subscription.stripe_customer_id;
    } else {
      sessionParams.customer_email = user.email;
    }

    // Set session to expire in 30 minutes (minimum allowed is 30 mins)
    // This ensures pending orgs don't linger too long if user abandons checkout
    sessionParams.expires_at = Math.floor(Date.now() / 1000) + 30 * 60;

    const session = await stripe.checkout.sessions.create(sessionParams as any);

    return NextResponse.json({ clientSecret: session.client_secret });
  } catch (error) {
    console.error('Embedded checkout error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
