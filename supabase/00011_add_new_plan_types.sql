-- =============================================================================
-- UPDATE SUBSCRIPTION PLAN ENUM
-- =============================================================================
-- Add new plan types: team and enterprise
-- Run this in Supabase SQL Editor AFTER the enhance_subscriptions migration

-- Add new values to the subscription_plan enum
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'team';
ALTER TYPE subscription_plan ADD VALUE IF NOT EXISTS 'enterprise';
