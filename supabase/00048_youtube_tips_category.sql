-- =============================================================================
-- YOUTUBE TIPS CATEGORY
-- Add a new forum category for YouTube tips and strategies
-- =============================================================================

INSERT INTO help_categories (name, slug, description, icon, position)
SELECT 'YouTube Tips', 'youtube-tips', 'Tips, strategies, and best practices for growing on YouTube', 'youtube', 11
WHERE NOT EXISTS (SELECT 1 FROM help_categories WHERE slug = 'youtube-tips');
