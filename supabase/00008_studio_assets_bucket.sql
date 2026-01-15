-- =============================================================================
-- STUDIO ASSETS STORAGE BUCKET
-- =============================================================================
-- Add storage bucket for studio logos and other assets
-- Run this in Supabase SQL Editor

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'studio-assets',
  'studio-assets',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload studio assets" ON storage.objects;
DROP POLICY IF EXISTS "Public studio assets access" ON storage.objects;
DROP POLICY IF EXISTS "Users can update studio assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete studio assets" ON storage.objects;

-- Allow authenticated users to upload studio assets
CREATE POLICY "Users can upload studio assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'studio-assets');

-- Allow anyone to view studio assets (public bucket)
CREATE POLICY "Public studio assets access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'studio-assets');

-- Allow users to update studio assets
CREATE POLICY "Users can update studio assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'studio-assets');

-- Allow users to delete studio assets
CREATE POLICY "Users can delete studio assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'studio-assets');
