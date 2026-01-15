-- =============================================================================
-- ENHANCE SUBSCRIPTIONS TABLE FOR BILLING MANAGEMENT
-- =============================================================================
-- Add fields for grace period and payment failure tracking
-- Run this in Supabase SQL Editor

-- Add grace period and payment tracking columns
DO $$ 
BEGIN
  -- Grace period end timestamp
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'grace_period_end'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN grace_period_end TIMESTAMPTZ;
  END IF;
  
  -- Track number of failed payment attempts
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'failed_payment_count'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN failed_payment_count INTEGER DEFAULT 0;
  END IF;
  
  -- Store last payment error message
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'last_payment_error'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN last_payment_error TEXT;
  END IF;
  
  -- Billing interval (monthly or yearly)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'subscriptions' AND column_name = 'interval'
  ) THEN
    ALTER TABLE subscriptions ADD COLUMN interval TEXT DEFAULT 'monthly';
  END IF;
END $$;
