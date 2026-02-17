-- =============================================================================
-- Add 'general_question' to support_ticket_category enum
-- =============================================================================

ALTER TYPE support_ticket_category ADD VALUE IF NOT EXISTS 'general_question';
