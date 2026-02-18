-- =============================================================================
-- ADD CHECKOUT_PLAN COLUMN TO ORGANIZATIONS
-- =============================================================================
-- Stores the selected plan for pending studios awaiting checkout completion

ALTER TABLE organizations
ADD COLUMN IF NOT EXISTS checkout_plan TEXT;

COMMENT ON COLUMN organizations.checkout_plan IS 'Selected plan for pending studios awaiting checkout';
