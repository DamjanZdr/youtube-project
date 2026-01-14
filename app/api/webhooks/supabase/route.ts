/**
 * Supabase Webhook Handler
 * 
 * Handles database change events from Supabase
 * Configure webhooks in Supabase Dashboard > Database > Webhooks
 */

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

// Webhook payload types
interface WebhookPayload {
  type: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  schema: string;
  record: Record<string, unknown> | null;
  old_record: Record<string, unknown> | null;
}

export async function POST(request: Request) {
  const headersList = await headers();
  
  // Verify webhook secret (set this in your Supabase webhook config)
  const webhookSecret = headersList.get('x-webhook-secret');
  if (webhookSecret !== process.env.SUPABASE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const payload: WebhookPayload = await request.json();
    
    // Handle different table events
    switch (payload.table) {
      case 'profiles': {
        // Handle profile changes
        console.log('Profile event:', payload.type, payload.record);
        break;
      }

      case 'organizations': {
        // Handle organization changes
        console.log('Organization event:', payload.type, payload.record);
        break;
      }

      case 'projects': {
        // Handle project changes
        console.log('Project event:', payload.type, payload.record);
        break;
      }

      default:
        console.log(`Unhandled table: ${payload.table}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Error processing Supabase webhook:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    );
  }
}
