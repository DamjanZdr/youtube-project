/**
 * Supabase Database Types
 * 
 * This file will be auto-generated when you run:
 * npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
 * 
 * Or if using local Supabase:
 * npx supabase gen types typescript --local > types/supabase.ts
 * 
 * For now, this is a placeholder that matches our database.ts schema
 */

import type {
  Profile,
  Organization,
  OrganizationMember,
  Channel,
  ChannelBranding,
  ChannelLink,
  Project,
  ProjectAssignee,
  ProjectTitle,
  ProjectThumbnail,
  ProjectTag,
  Playlist,
  ProjectPlaylist,
  Script,
  Scene,
  Asset,
  Subscription,
  WikiFolder,
  WikiDocument,
} from './database';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Profile, 'id' | 'created_at'>>;
      };
      organizations: {
        Row: Organization;
        Insert: Omit<Organization, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>;
      };
      organization_members: {
        Row: OrganizationMember;
        Insert: Omit<OrganizationMember, 'id' | 'joined_at'>;
        Update: Partial<Omit<OrganizationMember, 'id' | 'joined_at'>>;
      };
      channels: {
        Row: Channel;
        Insert: Omit<Channel, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Channel, 'id' | 'created_at'>>;
      };
      channel_brandings: {
        Row: ChannelBranding;
        Insert: Omit<ChannelBranding, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChannelBranding, 'id' | 'created_at'>>;
      };
      channel_links: {
        Row: ChannelLink;
        Insert: Omit<ChannelLink, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ChannelLink, 'id' | 'created_at'>>;
      };
      projects: {
        Row: Project;
        Insert: Omit<Project, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Project, 'id' | 'created_at'>>;
      };
      project_assignees: {
        Row: ProjectAssignee;
        Insert: Omit<ProjectAssignee, 'id' | 'assigned_at'>;
        Update: Partial<Omit<ProjectAssignee, 'id' | 'assigned_at'>>;
      };
      project_titles: {
        Row: ProjectTitle;
        Insert: Omit<ProjectTitle, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProjectTitle, 'id' | 'created_at'>>;
      };
      project_thumbnails: {
        Row: ProjectThumbnail;
        Insert: Omit<ProjectThumbnail, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<ProjectThumbnail, 'id' | 'created_at'>>;
      };
      project_tags: {
        Row: ProjectTag;
        Insert: Omit<ProjectTag, 'id' | 'created_at'>;
        Update: Partial<Omit<ProjectTag, 'id' | 'created_at'>>;
      };
      playlists: {
        Row: Playlist;
        Insert: Omit<Playlist, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Playlist, 'id' | 'created_at'>>;
      };
      project_playlists: {
        Row: ProjectPlaylist;
        Insert: ProjectPlaylist;
        Update: Partial<ProjectPlaylist>;
      };
      scripts: {
        Row: Script;
        Insert: Omit<Script, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Script, 'id' | 'created_at'>>;
      };
      scenes: {
        Row: Scene;
        Insert: Omit<Scene, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Scene, 'id' | 'created_at'>>;
      };
      assets: {
        Row: Asset;
        Insert: Omit<Asset, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Asset, 'id' | 'created_at'>>;
      };
      subscriptions: {
        Row: Subscription;
        Insert: Omit<Subscription, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<Subscription, 'id' | 'created_at'>>;
      };
      wiki_folders: {
        Row: WikiFolder;
        Insert: Omit<WikiFolder, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WikiFolder, 'id' | 'created_at'>>;
      };
      wiki_documents: {
        Row: WikiDocument;
        Insert: Omit<WikiDocument, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<WikiDocument, 'id' | 'created_at'>>;
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      user_role: 'owner' | 'admin' | 'editor' | 'viewer';
      project_status: 'idea' | 'script' | 'recording' | 'editing' | 'scheduled' | 'published';
      video_type: 'long' | 'short';
      asset_type: 'thumbnail' | 'export' | 'short' | 'raw' | 'audio' | 'graphic' | 'other';
      subscription_plan: 'free' | 'creator' | 'studio';
      subscription_status: 'active' | 'canceled' | 'past_due' | 'trialing';
    };
  };
}
