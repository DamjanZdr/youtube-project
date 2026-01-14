-- =============================================================================
-- ADD DURATION FIELD TO SCENES
-- =============================================================================

-- Add duration_seconds field (NULL = auto-calculate from word count)
ALTER TABLE scenes ADD COLUMN duration_seconds INTEGER DEFAULT NULL;

-- When NULL, duration is calculated as: word_count / 150 * 60 (150 words per minute)
