-- =============================================================================
-- FIX NULL is_official VALUES
-- Update any threads with NULL is_official to FALSE
-- =============================================================================

-- Fix any existing threads with NULL is_official
UPDATE help_threads
SET is_official = FALSE
WHERE is_official IS NULL;

-- Also fix any replies with NULL is_official  
UPDATE help_thread_replies
SET is_official = FALSE
WHERE is_official IS NULL;

-- Add NOT NULL constraint to prevent future issues (if not already set)
-- ALTER TABLE help_threads ALTER COLUMN is_official SET NOT NULL;
-- ALTER TABLE help_thread_replies ALTER COLUMN is_official SET NOT NULL;
