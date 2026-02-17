# YouTuber Studio - System Documentation

> How this application works - architecture, features, and operational details.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Concepts](#core-concepts)
3. [How Features Work](#how-features-work)
4. [Security & Permissions](#security--permissions)
5. [Database Design](#database-design)
6. [Admin Operations](#admin-operations)
7. [API Endpoints](#api-endpoints)
8. [File Structure](#file-structure)

---

## Architecture Overview

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 15 (App Router) | Server-rendered React with file-based routing |
| Database | Supabase (PostgreSQL) | Data storage with Row Level Security |
| Auth | Supabase Auth | Session management via SSR cookies |
| Payments | Stripe | Subscriptions and billing portal |
| State | Zustand | Client-side state (sidebar, modals) |
| Data Fetching | TanStack Query | Caching, refetching, optimistic updates |
| Styling | Tailwind + shadcn/ui | Utility-first CSS with component library |
| Deployment | Vercel | Edge network, serverless functions |

### Request Flow

```
User Request
    ↓
Vercel Edge (DDoS protection)
    ↓
Next.js Middleware (auth check)
    ↓
App Router (page/api route)
    ↓
Supabase Client (with user's session)
    ↓
PostgreSQL (RLS policies filter data)
```

### Key Architectural Decisions

1. **Server-first rendering**: Pages fetch data server-side for SEO and initial load performance
2. **Database-level security**: RLS policies enforce permissions, not just application code
3. **Triggers for business logic**: Free tier limits, task copying handled by PostgreSQL triggers
4. **Stripe as source of truth**: Webhooks sync subscription state from Stripe to database

---

## Core Concepts

### Studios (Organizations)

A **studio** is the central workspace. Everything belongs to a studio.

- Each studio has one **owner** (the person who created it or received ownership)
- Studios can have multiple **members** with different roles
- Studios have one **subscription** (Free, Creator, or Studio plan)
- The `slug` is the URL-safe identifier (`/studio/my-studio/...`)

**Key columns in `organizations`:**
- `owner_id` - The user who owns this studio (for billing)
- `status` - `active`, `pending`, or `inactive`
- `project_initiations_count` - Lifetime project creates (for free tier abuse prevention)

### Projects

A **project** represents one video being produced.

- Projects move through **statuses** on the kanban board (Idea → Package → Script → etc.)
- Each project can have multiple **titles** and **thumbnails** (A/B testing)
- Projects have **tasks** (copied from board defaults + custom)
- The **storyboard** is the script editor with visual notes

### Subscriptions

Subscriptions control what a studio can do.

| Plan | Projects | Team Size | Price |
|------|----------|-----------|-------|
| Free | 1 (lifetime) | 1 | $0 |
| Creator | Unlimited | 1 | $X/mo |
| Studio | Unlimited | Unlimited | $X/mo |

**How subscriptions work:**
1. Stripe manages billing, renewals, cancellations
2. Stripe webhooks hit `/api/webhooks/stripe`
3. Webhook updates `subscriptions` table
4. Database triggers check subscription when creating projects/members

**Key columns in `subscriptions`:**
- `plan` - Current plan (`free`, `creator`, `studio`)
- `status` - Stripe status (`active`, `past_due`, `canceled`)
- `source` - How they got the plan (`stripe`, `key`)
- `current_period_end` - When subscription renews/expires

---

## How Features Work

### Kanban Board

The board at `/studio/[slug]/board` shows projects as cards in status columns.

**Data flow:**
1. `board_statuses` table defines columns (Idea, Script, etc.) per organization
2. `projects.board_status_id` links each project to a column
3. Drag-drop updates `board_status_id` and `position`
4. Moving a project triggers `copy_default_tasks_to_project()` function

**Edit mode:**
- Toggle "Edit Board" to reorder statuses and manage default tasks
- Default tasks are stored in `status_default_tasks` table
- When a project enters a status, those tasks copy to `project_tasks`

### Default Tasks Auto-Copy

When a project is created or moved to a new status, default tasks automatically copy.

**The trigger flow:**
```
Project INSERT or UPDATE (board_status_id changes)
    ↓
trigger_copy_default_tasks fires
    ↓
copy_default_tasks_to_project() function runs
    ↓
SELECT tasks from status_default_tasks WHERE status_id = NEW.board_status_id
    ↓
INSERT into project_tasks (only tasks that don't already exist)
```

**Why it works this way:**
- Tasks are templates, not foreign keys - projects own their tasks
- Moving to a status **adds** new tasks, doesn't replace existing
- Each studio can customize default tasks without affecting others

### Storyboard (Script Editor)

Two-column editor: script on left, visual notes on right.

**Data model:**
- `scripts` table - One per project, has metadata
- `scenes` table - Many per script, ordered by `position`
- Each scene has `content` (script text) and `visual_notes`

**Features:**
- Word count and estimated video duration (calculated client-side)
- Scenes reorderable via drag-drop
- Auto-saves with debounce

### Preview Tab

Shows how thumbnail/title will look in YouTube's UI.

**How it works:**
- Pulls active thumbnail and title from `project_thumbnails`/`project_titles`
- Renders mock YouTube feed with grey placeholder cards
- User can switch between different saved titles/thumbnails
- No actual YouTube API - pure visual mockup

### Wiki

Knowledge base for storing team documentation.

**Data model:**
- `wiki_folders` - Folders with optional nesting (`parent_folder_id`)
- `wiki_documents` - Documents belong to org, optionally in a folder
- Content stored as HTML (Tiptap rich text editor)

**Features:**
- Create/rename/delete folders
- Move documents between folders
- Auto-save with "Saving..." indicator

### Free Tier Limits

Prevents abuse by tracking project creations.

**The problem it solves:**
Without this, users could create/delete indefinitely on free tier.

**How it works:**
1. `organizations.project_initiations_count` tracks lifetime creates
2. `trigger_check_project_creation_limit` fires BEFORE INSERT on `projects`
3. Compares count to plan limit (Free = 1, others = unlimited)
4. Rejects with error if limit exceeded
5. If allowed, `trigger_increment_project_initiations` adds 1 to counter

**Important:** Counter never decreases when deleting projects.

### Plan Keys (Beta/Gift Access)

Admins can generate keys that grant plan access without Stripe payment.

**Key lifecycle:**
1. Admin creates key at `/admin/keys` (specifies plan + duration)
2. Key stored in `plan_keys` table with unique code
3. User redeems at `/redeem` or via waitlist email
4. `redeemed_at` timestamp set, subscription created/updated
5. `source: 'key'` on subscription marks it as gifted

**Duration options:**
- `1_month`, `3_months`, `6_months`, `1_year`, `lifetime`
- Lifetime keys have no `current_period_end`

### Waitlist Flow

Beta access management for launch.

**Flow:**
1. User signs up on landing page → row in `waitlist`
2. Admin sees pending entries at `/admin/waitlist`
3. Admin clicks "Send Key" → generates plan key, emails user
4. `key_sent_at` timestamp tracked
5. User redeems key → becomes active subscriber

---

## Security & Permissions

### Authentication Flow

```
User logs in
    ↓
Supabase Auth creates session (stored in cookies)
    ↓
middleware.ts checks cookies on every request
    ↓
If no session → redirect to /auth/login
    ↓
If session → createServerClient() has user context
    ↓
All Supabase queries run AS that user (RLS applies)
```

### Row Level Security (RLS)

Every table has RLS enabled. Users only see data they have access to.

**Common pattern:**
```sql
CREATE POLICY "Users can view org data" ON some_table
FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM organization_members
    WHERE user_id = auth.uid()
  )
);
```

**What this means:**
- Even if someone guesses a project ID, they can't access it
- Cross-organization data leaks are impossible at the database level
- Frontend doesn't need permission checks for read operations

### Role-Based Permissions

| Role | View | Edit | Manage Team | Billing | Delete Studio |
|------|------|------|-------------|---------|---------------|
| Viewer | ✅ | ❌ | ❌ | ❌ | ❌ |
| Editor | ✅ | ✅ | ❌ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ❌ | ❌ |
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ |

**How roles work:**
- `organization_members.role` stores the role
- Owner is also stored as `organizations.owner_id`
- RLS policies check role for write operations
- Billing actions (`lib/actions/billing.ts`) explicitly check `owner_id`

### Billing Security

Only the studio owner can:
- Start Stripe checkout
- Access billing portal
- Redeem plan keys for the studio

**Implementation:**
```typescript
// In billing actions
if (org.owner_id !== user.id) {
  return { error: "Only the studio owner can manage billing" };
}
```

### Rate Limiting

Protects public endpoints from abuse.

**Implementation:** `lib/rate-limit.ts` - in-memory store keyed by IP

| Endpoint | Limit | Why |
|----------|-------|-----|
| `/api/youtube-search` | 30/min | Prevents YouTube API quota abuse |
| `/api/waitlist` | 5/min | Prevents waitlist spam |
| `/api/keys/validate` | 10/min | Prevents key brute-forcing |
| `/api/keys/redeem` | 10/min | Prevents redemption spam |

### Admin Access

Admin role stored in `profiles.role = 'admin'`.

**Admin-only endpoints:**
- `/admin/*` pages check role in layout
- `/api/admin/*` routes check role before processing
- `/api/cron/*` routes require Vercel cron header

---

## Database Design

### Entity Relationships

```
profiles (users)
    │
    ├── organization_members ─── organizations (studios)
    │                                   │
    │                                   ├── channels
    │                                   ├── subscriptions
    │                                   ├── board_statuses ─── status_default_tasks
    │                                   ├── wiki_folders ─── wiki_documents
    │                                   └── projects
    │                                           │
    │                                           ├── project_tasks
    │                                           ├── project_titles
    │                                           ├── project_thumbnails
    │                                           ├── project_tags
    │                                           └── scripts ─── scenes
```

### Key Tables Explained

**`organizations`**
- Central entity, everything else belongs to an org
- `owner_id` is the billing contact
- `slug` is URL identifier (unique)
- `project_initiations_count` for free tier enforcement

**`subscriptions`**
- One per organization
- `source` distinguishes Stripe vs key grants
- `stripe_customer_id` and `stripe_subscription_id` for Stripe sync

**`board_statuses`**
- Kanban columns, customizable per org
- `position` for ordering
- Default statuses seeded on org creation

**`status_default_tasks`**
- Templates that copy to projects
- Belong to a status, not directly to org

**`project_tasks`**
- Actual tasks on a project (copied from defaults + manual)
- `is_complete` for checkbox state

### Database Triggers

| Trigger | Table | When | What it does |
|---------|-------|------|--------------|
| `trigger_check_project_creation_limit` | projects | BEFORE INSERT | Enforces plan project limits |
| `trigger_increment_project_initiations` | projects | AFTER INSERT | Increments org counter |
| `trigger_check_free_tier_limit` | organization_members | BEFORE INSERT | One free org per user |
| `trigger_copy_default_tasks` | projects | AFTER INSERT/UPDATE | Copies default tasks to project |

### Migrations

Located in `supabase/migrations/`, numbered in order (00001, 00002, etc.).

**One-off scripts** in `supabase/scripts/`:
- `diagnostic_*.sql` - Debugging queries
- `fix_*.sql` - One-time data fixes
- `sync_*.sql` - Data synchronization scripts

---

## Admin Operations

### Adding Someone to the Beta

1. Go to `/admin/waitlist`
2. Find their email (or have them sign up first)
3. Click "Send Key" → generates Creator key, emails them
4. They click link in email → redemption page → activated

### Manually Granting a Plan

1. Go to `/admin/keys`
2. Click "Generate Key"
3. Select plan and duration
4. Copy key, send to user manually
5. User redeems at `/redeem`

### Checking a User's Subscription

1. Go to `/admin/studios`
2. Search by studio name or owner email
3. See subscription status, plan, expiration

### Handling Support Tickets

1. Go to `/admin/tickets`
2. Filter by status (open, in_progress, resolved)
3. Click ticket to view conversation
4. Reply or change status

---

## API Endpoints

### Public APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/waitlist` | POST | Join waitlist |
| `/api/keys/validate` | POST | Check if key is valid |
| `/api/keys/redeem` | POST | Redeem a plan key |

### Authenticated APIs

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/youtube-search` | GET | Search YouTube videos |
| `/api/checkout` | POST | Create Stripe checkout session |
| `/api/portal` | POST | Create Stripe billing portal session |

### Webhook Endpoints

| Endpoint | Source | Purpose |
|----------|--------|---------|
| `/api/webhooks/stripe` | Stripe | Subscription lifecycle events |

### Cron Endpoints

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/expire-plan-keys` | Daily | Deactivate expired key-based subscriptions |

---

## File Structure

```
app/
├── (auth)/              # Route group for auth pages
├── admin/               # Admin panel pages
├── api/                 # API route handlers
├── auth/                # Auth callbacks (Supabase redirects here)
├── help/                # Help center & support tickets
├── hub/                 # Main dashboard (studio list)
├── studio/              # All studio pages
│   └── [studioSlug]/
│       ├── board/       # Kanban board
│       ├── channel/     # Channel branding
│       ├── project/     # Project pages (nested)
│       ├── settings/    # Studio settings
│       └── wiki/        # Knowledge base
└── page.tsx             # Landing page

components/
├── billing/             # Subscription UI, plan cards
├── forms/               # Form components
├── layouts/             # Sidebar, dashboard wrapper
├── project/             # Project-specific components
├── settings/            # Settings page tabs
├── shared/              # Reusable components
└── ui/                  # shadcn/ui primitives

lib/
├── actions/             # Server actions (mutations)
├── hooks/               # Custom React hooks
├── stores/              # Zustand stores
├── stripe/              # Stripe utilities
├── supabase/            # Supabase client factories
│   ├── client.ts        # Browser client
│   ├── server.ts        # Server component client
│   └── middleware.ts    # Middleware client
└── validators/          # Zod schemas

config/
├── navigation.ts        # Sidebar nav items
├── site.ts              # Site metadata
└── subscriptions.ts     # Plan definitions

supabase/
├── migrations/          # Numbered schema changes
└── scripts/             # One-off diagnostic/fix scripts

types/
├── database.ts          # Entity types
└── supabase.ts          # Generated Supabase types
```

---

*Last updated: February 2025*
