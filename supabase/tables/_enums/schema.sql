-- =============================================================================
-- ENUMS
-- Shared enum types used across tables
-- =============================================================================
-- Last updated: 2026-01-04 (initial schema)
-- =============================================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User roles for organization members
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'editor', 'viewer');

-- Project workflow status (Kanban columns)
CREATE TYPE project_status AS ENUM ('idea', 'script', 'recording', 'editing', 'scheduled', 'published');

-- Script section types
CREATE TYPE script_section_type AS ENUM ('intro', 'hook', 'content', 'cta', 'outro', 'sponsor', 'custom');

-- Asset file types
CREATE TYPE asset_type AS ENUM ('thumbnail', 'export', 'short', 'raw', 'audio', 'graphic', 'other');

-- Subscription plan tiers
CREATE TYPE subscription_plan AS ENUM ('free', 'creator', 'studio');

-- Subscription status
CREATE TYPE subscription_status AS ENUM ('active', 'canceled', 'past_due', 'trialing');
