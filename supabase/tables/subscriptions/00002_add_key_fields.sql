-- Add previous_plan, previous_stripe_subscription_id, and source to subscriptions
ALTER TABLE subscriptions
  ADD COLUMN previous_plan subscription_plan,
  ADD COLUMN previous_stripe_subscription_id TEXT,
  ADD COLUMN source TEXT DEFAULT 'stripe';

-- Optionally, you can use an ENUM for source if you want stricter typing:
-- CREATE TYPE subscription_source AS ENUM ('stripe', 'key');
-- ALTER TABLE subscriptions ADD COLUMN source subscription_source DEFAULT 'stripe';
