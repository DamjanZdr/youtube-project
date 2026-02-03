-- Add role column to profiles for admin access
-- Role can be 'user' (default) or 'admin'

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' NOT NULL;

-- Add index for quick admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- To make someone an admin, run:
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';
