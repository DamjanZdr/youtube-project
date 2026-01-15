/**
 * Database types for YouTuber Studio
 * These types represent the core entities in the system
 * 
 * Run `npx supabase gen types typescript` to generate types from your Supabase schema
 */

// ============================================================================
// User & Organization Types
// ============================================================================

export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: UserRole;
  invited_by: string | null;
  joined_at: string;
}

// ============================================================================
// Channel & Branding Types
// ============================================================================

export interface Channel {
  id: string;
  organization_id: string;
  name: string;
  handle: string | null;              // YouTube @handle (e.g., @mkbhd)
  youtube_channel_id: string | null;
  description: string | null;
  avatar_url: string | null;          // Channel profile picture
  banner_url: string | null;          // Channel banner image
  created_at: string;
  updated_at: string;
}

export interface ChannelLink {
  id: string;
  channel_id: string;
  platform: string;                   // e.g., 'twitter', 'instagram', 'website'
  url: string;
  label: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ChannelBranding {
  id: string;
  channel_id: string;
  logo_url: string | null;
  banner_url: string | null;
  watermark_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Project & Video Types
// ============================================================================

export type ProjectStatus = 'idea' | 'script' | 'recording' | 'editing' | 'scheduled' | 'published';
export type VideoType = 'long' | 'short';

export interface Project {
  id: string;
  organization_id: string;
  channel_id: string;
  title: string;                      // Default/working title
  description: string | null;
  status: ProjectStatus;
  video_type: VideoType;              // Long-form vs YouTube Shorts
  due_date: string | null;            // Project deadline
  thumbnail_url: string | null;       // Default thumbnail
  youtube_video_id: string | null;
  scheduled_for: string | null;
  published_at: string | null;
  position: number;                   // Order within Kanban column
  created_at: string;
  updated_at: string;
}

export interface ProjectAssignee {
  id: string;
  project_id: string;
  user_id: string;
  assigned_at: string;
  assigned_by: string | null;
}

export interface ProjectTitle {
  id: string;
  project_id: string;
  title: string;
  is_selected: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectThumbnail {
  id: string;
  project_id: string;
  asset_id: string | null;
  url: string | null;
  is_selected: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectTag {
  id: string;
  project_id: string;
  tag: string;
  position: number;
  created_at: string;
}

export interface Playlist {
  id: string;
  organization_id: string;
  channel_id: string;
  name: string;
  description: string | null;
  youtube_playlist_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectPlaylist {
  project_id: string;
  playlist_id: string;
  position: number;
}

// ============================================================================
// Script & Storyboard Types
// ============================================================================

export interface Script {
  id: string;
  project_id: string;
  title: string;
  content: string | null; // JSON content for rich text
  word_count: number;
  estimated_duration: number; // in seconds
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  script_id: string;
  script_text: string;                // Left column: the script/dialogue
  visual_notes: string;               // Right column: visuals, B-roll, sound effects
  position: number;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Asset Types
// ============================================================================

export type AssetType = 'thumbnail' | 'export' | 'short' | 'raw' | 'audio' | 'graphic' | 'other';

export interface Asset {
  id: string;
  organization_id: string;
  project_id: string | null;
  type: AssetType;
  name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Subscription & Billing Types
// ============================================================================

export type SubscriptionPlan = 'free' | 'creator' | 'team' | 'enterprise';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  organization_id: string;
  stripe_customer_id: string;
  stripe_subscription_id: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  interval?: string;
  pending_plan?: string | null;
  pending_price_id?: string | null;
  pending_interval?: string | null;
  created_at: string;
  updated_at: string;
}


// ============================================================================
// Wiki Types
// ============================================================================

export interface WikiFolder {
  id: string;
  organization_id: string;
  name: string;
  parent_folder_id: string | null;    // For nested folders
  position: number;
  created_at: string;
  updated_at: string;
}

export interface WikiDocument {
  id: string;
  folder_id: string | null;
  organization_id: string;
  title: string;
  content: string;                    // Rich text content (HTML from Tiptap)
  position: number;
  created_by: string | null;
  font_family: string;                // User-selected font family
  font_size: string;                  // User-selected font size
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Board & Task Types
// ============================================================================

export interface BoardStatus {
  id: string;
  organization_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface StatusDefaultTask {
  id: string;
  status_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface ProjectTask {
  id: string;
  project_id: string;
  status_id: string | null;
  name: string;
  is_completed: boolean;
  position: number;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectStatusDetail {
  id: string;
  project_id: string;
  status_id: string;
  assignee_id: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}
