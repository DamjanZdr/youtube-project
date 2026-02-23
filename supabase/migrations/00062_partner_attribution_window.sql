-- Migration: Add attribution window to partners
-- Allows setting how long referral credits last after a click

ALTER TABLE partners ADD COLUMN IF NOT EXISTS attribution_days INTEGER DEFAULT NULL;
-- NULL = unlimited (forever)
-- 1 = 1 day
-- 7 = 7 days
-- 30 = 30 days
-- etc.

COMMENT ON COLUMN partners.attribution_days IS 'Number of days after click that referral is valid. NULL = unlimited.';
