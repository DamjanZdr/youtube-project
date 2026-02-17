
-- =============================================================================
-- STORAGE BUCKETS
-- =============================================================================

-- Create thumbnails bucket for video thumbnail uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload thumbnails
CREATE POLICY "Users can upload thumbnails"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'thumbnails');

-- Allow anyone to view thumbnails (public bucket)
CREATE POLICY "Public thumbnail access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'thumbnails');

-- Allow users to update their own thumbnails
CREATE POLICY "Users can update thumbnails"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'thumbnails');

-- Allow users to delete their own thumbnails
CREATE POLICY "Users can delete thumbnails"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'thumbnails');

-- =============================================================================
-- STUDIO ASSETS BUCKET (for logos, etc.)
-- =============================================================================

-- Create studio-assets bucket for studio logos and other assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'studio-assets',
  'studio-assets',
  true,
  2097152, -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

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
