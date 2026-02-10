/**
 * API route for checking Stripe Checkout session status
 * Used by the return page after embedded checkout completes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '@/lib/stripe';
import { plans } from '@/config/subscriptions';

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get('session_id');

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Find the plan name from the price ID
    let planName = '';
    if (session.line_items?.data?.[0]?.price?.id) {
      const priceId = session.line_items.data[0].price.id;
      for (const plan of plans) {
        if (plan.stripePriceId.monthly === priceId || plan.stripePriceId.yearly === priceId) {
          planName = plan.name;
          break;
        }
      }
    }

    // If we couldn't get it from line items, try from subscription metadata
    if (!planName && session.subscription) {
      try {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = sub.items.data[0]?.price?.id;
        if (priceId) {
          for (const plan of plans) {
            if (plan.stripePriceId.monthly === priceId || plan.stripePriceId.yearly === priceId) {
              planName = plan.name;
              break;
            }
          }
        }
      } catch {
        // Not critical, continue without plan name
      }
    }

    return NextResponse.json({
      status: session.status,
      planName,
    });
  } catch (error) {
    console.error('Checkout status error:', error);
    return NextResponse.json(
      { error: 'Failed to check session status' },
      { status: 500 }
    );
  }
}
