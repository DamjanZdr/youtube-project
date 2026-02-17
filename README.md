# YouTuber Studio 🎬

> The all-in-one creator operating system for YouTubers and content studios.

Built with Next.js 15, Supabase, Tailwind CSS, and Stripe.

## Features

- **Channel Branding Preview** - See your logo, banner, thumbnails in real YouTube layouts
- **Script Writing System** - Scripts with structure, notes, visual cues, and pacing
- **Project Management** - Videos grouped into projects, series, and playlists
- **Kanban Workflow** - Idea → Script → Recording → Editing → Scheduled → Published
- **Asset Storage** - Thumbnails, exports, shorts, raw files
- **Multi-Studio Support** - Creator, editor, and manager roles
- **Monetization** - Stripe subscriptions (Creator vs Studio plans)

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Database & Auth**: [Supabase](https://supabase.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Payments**: [Stripe](https://stripe.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/)
- **Data Fetching**: [TanStack Query](https://tanstack.com/query)
- **Forms**: [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/)
- **Deployment**: [Vercel](https://vercel.com/)

## Project Structure

```
├── app/
│   ├── (auth)/              # Auth routes (sign-in, sign-up)
│   ├── (dashboard)/         # Protected dashboard routes
│   │   └── dashboard/       # Main dashboard
│   ├── api/
│   │   └── webhooks/        # Stripe & Supabase webhooks
│   ├── auth/                # Auth callback routes
│   └── protected/           # Protected pages
├── components/
│   ├── forms/               # Form components
│   ├── layouts/             # Layout components (sidebar, dashboard)
│   ├── providers/           # Context providers
│   ├── shared/              # Shared components
│   └── ui/                  # shadcn/ui components
├── config/
│   ├── navigation.ts        # Dashboard navigation config
│   ├── site.ts              # Site-wide config
│   └── subscriptions.ts     # Stripe plans config
├── lib/
│   ├── actions/             # Server actions
│   ├── hooks/               # Custom React hooks
│   ├── stores/              # Zustand stores
│   ├── stripe/              # Stripe utilities
│   ├── supabase/            # Supabase clients
│   └── validators/          # Zod schemas
├── supabase/
│   ├── migrations/          # Database migrations
│   └── scripts/             # Diagnostic/fix scripts
└── types/
    ├── database.ts          # Database entity types
    ├── index.ts             # Type exports
    └── supabase.ts          # Supabase generated types
```

## Getting Started

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd youtube-project
npm install
```

### 2. Set Up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the migrations in `supabase/migrations/` in order (00001, 00002, etc.)
3. Copy your project URL and keys

### 3. Set Up Stripe

1. Create an account at [stripe.com](https://stripe.com)
2. Create products and prices for your subscription plans
3. Set up webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
4. Copy your API keys and webhook secret

### 4. Configure Environment Variables

```bash
cp .env.example .env.local
```

Fill in your values:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- etc.

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy!

### Environment Variables for Production

Make sure to set all variables from `.env.example` in your production environment.

## Database Schema

The app uses the following main tables:

- `profiles` - User profiles (extends Supabase auth)
- `organizations` - Studios/workspaces
- `organization_members` - Team members with roles
- `channels` - YouTube channels
- `channel_brandings` - Channel branding assets
- `projects` - Video projects
- `playlists` - Video playlists
- `scripts` - Video scripts
- `script_sections` - Script sections (intro, hook, CTA, etc.)
- `assets` - Media files
- `subscriptions` - Stripe subscriptions

## Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run start      # Start production server
npm run lint       # Run ESLint
```

## Documentation

For detailed documentation including:
- Complete application routes
- Database schema details
- Free tier limits & abuse prevention
- Default tasks system
- Rate limiting
- Security model
- Admin operations

See **[DOCUMENTATION.md](DOCUMENTATION.md)**

## License

MIT
