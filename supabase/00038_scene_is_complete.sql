-- Add is_complete column to scenes for marking scenes as done during editing
-- This helps editors track which scenes they've finished working on

ALTER TABLE scenes ADD COLUMN IF NOT EXISTS is_complete BOOLEAN DEFAULT false;
