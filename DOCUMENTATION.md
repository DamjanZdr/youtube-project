# YouTuber Studio - Complete Documentation

> The all-in-one creator operating system for YouTubers and content studios.

---

## Table of Contents

1. [Overview](#overview)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Application Routes](#application-routes)
5. [Database Schema](#database-schema)
6. [Key Features](#key-features)
   - [Free Tier Limits](#free-tier-limits)
   - [Default Tasks System](#default-tasks-system)
   - [Rate Limiting](#rate-limiting)
   - [Security Model](#security-model)
7. [Admin Operations](#admin-operations)
8. [Mobile Responsiveness](#mobile-responsiveness)

---

## Overview

YouTuber Studio is a SaaS application for YouTube creators and content studios. It provides:

- **Channel Branding Preview** - See your logo, banner, thumbnails in real YouTube layouts
- **Script Writing System** - Scripts with structure, notes, visual cues, and pacing
- **Project Management** - Videos grouped into projects with kanban workflow
- **Kanban Board** - Idea → Script → Recording → Editing → Scheduled → Published
- **Asset Storage** - Thumbnails, exports, shorts, raw files
- **Wiki/Knowledge Base** - Documentation organized in folders
- **Multi-Studio Support** - Creator, editor, and manager roles per studio
- **Monetization** - Stripe subscriptions (Free, Creator, Studio plans)

---

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router) |
| Database & Auth | [Supabase](https://supabase.com/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| UI Components | [shadcn/ui](https://ui.shadcn.com/) |
| Payments | [Stripe](https://stripe.com/) |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/) |
| Data Fetching | [TanStack Query](https://tanstack.com/query) |
| Forms | [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) |
| Deployment | [Vercel](https://vercel.com/) |

---

## Getting Started

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd youtube-project
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run migrations from `supabase/migrations/` folder in order (00001, 00002, etc.)
3. Copy your project URL and keys

### 3. Set Up Stripe

1. Create products for your subscription plans (Free, Creator, Studio)
2. Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Copy your API keys and webhook secret

### 4. Configure Environment Variables

Required environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_SITE_URL`

### 5. Run Development Server

```bash
npm run dev
```

---

## Application Routes

### Public Routes
| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/privacy` | Privacy policy |
| `/terms` | Terms of service |
| `/auth/login` | Login page |
| `/auth/sign-up` | Registration page |
| `/auth/forgot-password` | Password reset request |
| `/auth/update-password` | Set new password |

### Authenticated Routes
| Route | Description |
|-------|-------------|
| `/hub` | User's studios list (main dashboard) |
| `/account` | User account settings |
| `/redeem` | Redeem plan keys |
| `/help` | Help center |
| `/help/tickets` | User's support tickets |

### Studio Routes (`/studio/[studioSlug]/*`)
| Route | Description |
|-------|-------------|
| `/studio/[slug]/board` | Kanban board view |
| `/studio/[slug]/projects` | Projects list view |
| `/studio/[slug]/channel` | Channel branding |
| `/studio/[slug]/wiki` | Knowledge base |
| `/studio/[slug]/settings` | Studio settings, team, billing |

### Project Routes (`/studio/[slug]/project/[id]/*`)
| Route | Description |
|-------|-------------|
| `.../project/[id]` | Project packaging (titles, thumbnails, description, tags) |
| `.../project/[id]/preview` | YouTube preview mockup |
| `.../project/[id]/storyboard` | Script editor with visual notes |
| `.../project/[id]/idea` | Project idea/notes |
| `.../project/[id]/tasks` | Project task checklist |
| `.../project/[id]/settings` | Project settings |

### Admin Routes (`/admin/*`)
| Route | Description |
|-------|-------------|
| `/admin` | Admin dashboard |
| `/admin/users` | User management |
| `/admin/studios` | Studios management |
| `/admin/subscriptions` | Subscription management |
| `/admin/keys` | Plan key management |
| `/admin/tickets` | Support ticket management |
| `/admin/waitlist` | Waitlist management |

---

## Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `profiles` | User profiles (extends Supabase auth) |
| `organizations` | Studios/workspaces |
| `organization_members` | Team members with roles |
| `subscriptions` | Stripe subscriptions per organization |

### Channel & Projects

| Table | Description |
|-------|-------------|
| `channels` | YouTube channels |
| `channel_brandings` | Channel branding assets (logo, banner) |
| `channel_links` | Social links for channels |
| `projects` | Video projects |
| `project_titles` | Multiple title options (up to 5) |
| `project_thumbnails` | Multiple thumbnail options (up to 5) |
| `project_tags` | Video tags |
| `playlists` | Video playlists |

### Kanban & Tasks

| Table | Description |
|-------|-------------|
| `board_statuses` | Kanban columns (Idea, Script, etc.) |
| `status_default_tasks` | Default tasks per status |
| `project_tasks` | Tasks copied to individual projects |

### Scripts & Wiki

| Table | Description |
|-------|-------------|
| `scripts` | Video scripts |
| `scenes` | Individual scenes in scripts |
| `wiki_folders` | Knowledge base folders |
| `wiki_documents` | Documents in wiki |

### Admin & Support

| Table | Description |
|-------|-------------|
| `plan_keys` | Redemption keys for plans |
| `waitlist` | Beta waitlist entries |
| `support_tickets` | Support tickets |
| `support_ticket_messages` | Messages in tickets |

---

## Key Features

### Free Tier Limits

The system prevents abuse of the free tier through database triggers.

**How it works:**

1. **Project Initiation Counter**: The `project_initiations_count` column on `organizations` tracks lifetime project creations (never decrements when deleted).

2. **Plan Limits**:
   - Free: 1 project (lifetime)
   - Creator: Unlimited
   - Studio: Unlimited

3. **One Free Org Per User**: Users can only be a member of one free organization at a time.

**Database Triggers:**
- `trigger_check_project_creation_limit` - Validates project limits before INSERT
- `trigger_check_free_tier_limit` - Validates free tier membership before member INSERT
- `trigger_increment_project_initiations` - Increments counter after project INSERT

**Error Messages:**
- "Project creation limit reached for free plan (1 projects). Upgrade to create more projects."
- "You can only be a member of one free tier organization."

### Default Tasks System

Each kanban status has configurable default tasks that auto-copy to projects.

**Default Tasks by Status:**

| Status | Default Tasks |
|--------|---------------|
| **Idea** | One sentence description, Intro hook, Loop, Call to action target, Call to action implementation, Video length and reason |
| **Package** | Make 1-5 thumbnails, Compare and choose best, SEO description, SEO tags, Select playlist |
| **Script** | Write script scene by scene, Write editing visualization |
| **Record** | Record video/voiceovers, Record/download materials |
| **Edit** | Follow visualization to match script |
| **Review** | Watch video entirely, Confirm no mistakes |
| **Complete** | Make new upload, Set packaging data, Publish/schedule |

**How to Manage Default Tasks:**
1. Go to `/studio/[slug]/board`
2. Click "Edit Board" (top right)
3. Click chevron (>) next to any status
4. Add/remove tasks as needed

**Automatic Copying:**
- When projects are created, they get default tasks from their status
- When projects move to a new status, they get that status's default tasks
- Existing tasks are preserved; only new ones are added

### Rate Limiting

API endpoints are protected by in-memory rate limiting (`lib/rate-limit.ts`).

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/youtube-search` | 30 requests | 1 minute |
| `/api/waitlist` | 5 requests | 1 minute |
| `/api/keys/validate` | 10 requests | 1 minute |
| `/api/keys/redeem` | 10 requests | 1 minute |

Rate limits are per-IP address. Returns 429 "Too Many Requests" when exceeded.

### Security Model

**Authentication:**
- Supabase Auth with SSR sessions
- Middleware validates auth on protected routes

**Row Level Security (RLS):**
- All tables have RLS enabled
- Policies ensure users only access their own organization's data
- Cross-organization access is prevented at the database level

**Billing Security:**
- Only studio owners can access billing operations
- Team members (editors, viewers) cannot upgrade/downgrade plans

**Endpoint Security:**
- Cron endpoints require Vercel cron header
- Admin endpoints require admin role check
- API routes check user permissions

**DDoS Protection:**
- Vercel edge network handles L3/L4 attacks
- Rate limiting handles application-level abuse

---

## Admin Operations

### Managing Waitlist

1. Go to `/admin/waitlist`
2. Filter by status: All, Pending, Key Sent
3. Click "Send Key" to generate and email a plan key
4. Track when keys were sent with `key_sent_at` column

### Managing Plan Keys

1. Go to `/admin/keys`
2. Generate keys with specific plan and duration
3. Keys can be:
   - Redeemed by users at `/redeem`
   - Assigned to specific studios
   - Sent via waitlist emails

### User Roles

| Role | Permissions |
|------|-------------|
| **Viewer** | View-only access |
| **Editor** | Create/edit projects, move cards |
| **Admin** | Team management, studio settings |
| **Owner** | Full access including billing, deletion |

---

## Mobile Responsiveness

All pages are mobile-responsive. Key patterns used:

- Responsive Tailwind classes (`md:flex-row`, `lg:px-8`)
- Column stacking on mobile
- Conditional visibility (`hidden md:block`)
- Responsive text sizes (`text-sm md:text-base`)
- Mobile slide-out sidebar navigation
- Touch-friendly targets (min 44px)

---

## Project Structure

```
├── app/
│   ├── (auth)/              # Auth routes
│   ├── admin/               # Admin panel
│   ├── api/                 # API routes
│   ├── auth/                # Auth callback routes
│   ├── help/                # Help center
│   ├── hub/                 # Studio hub
│   ├── studio/              # Studio pages
│   └── page.tsx             # Landing page
├── components/
│   ├── billing/             # Billing components
│   ├── forms/               # Form components
│   ├── layouts/             # Layout components
│   ├── providers/           # Context providers
│   ├── shared/              # Shared components
│   └── ui/                  # shadcn/ui components
├── config/
│   ├── navigation.ts        # Navigation config
│   ├── site.ts              # Site config
│   └── subscriptions.ts     # Plan definitions
├── lib/
│   ├── actions/             # Server actions
│   ├── hooks/               # Custom hooks
│   ├── stores/              # Zustand stores
│   ├── stripe/              # Stripe utilities
│   ├── supabase/            # Supabase clients
│   └── validators/          # Zod schemas
├── supabase/
│   ├── migrations/          # Database migrations (run in order)
│   └── scripts/             # One-off diagnostic/fix scripts
└── types/                   # TypeScript types
```

---

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

---

## Environment Variables Reference

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# App
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# YouTube API (optional)
YOUTUBE_API_KEY=...

# Email (optional)
RESEND_API_KEY=re_...
```

---

*Last updated: February 2025*
