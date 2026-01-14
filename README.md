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
│   └── migrations/          # Database migrations
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
2. Run the migration in `supabase/migrations/00001_initial_schema.sql`
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

## License

MIT


## Clone and run locally

1. You'll first need a Supabase project which can be made [via the Supabase dashboard](https://database.new)

2. Create a Next.js app using the Supabase Starter template npx command

   ```bash
   npx create-next-app --example with-supabase with-supabase-app
   ```

   ```bash
   yarn create next-app --example with-supabase with-supabase-app
   ```

   ```bash
   pnpm create next-app --example with-supabase with-supabase-app
   ```

3. Use `cd` to change into the app's directory

   ```bash
   cd with-supabase-app
   ```

4. Rename `.env.example` to `.env.local` and update the following:

  ```env
  NEXT_PUBLIC_SUPABASE_URL=[INSERT SUPABASE PROJECT URL]
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=[INSERT SUPABASE PROJECT API PUBLISHABLE OR ANON KEY]
  ```
  > [!NOTE]
  > This example uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, which refers to Supabase's new **publishable** key format.
  > Both legacy **anon** keys and new **publishable** keys can be used with this variable name during the transition period. Supabase's dashboard may show `NEXT_PUBLIC_SUPABASE_ANON_KEY`; its value can be used in this example.
  > See the [full announcement](https://github.com/orgs/supabase/discussions/29260) for more information.

  Both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` can be found in [your Supabase project's API settings](https://supabase.com/dashboard/project/_?showConnect=true)

5. You can now run the Next.js local development server:

   ```bash
   npm run dev
   ```

   The starter kit should now be running on [localhost:3000](http://localhost:3000/).

6. This template comes with the default shadcn/ui style initialized. If you instead want other ui.shadcn styles, delete `components.json` and [re-install shadcn/ui](https://ui.shadcn.com/docs/installation/next)

> Check out [the docs for Local Development](https://supabase.com/docs/guides/getting-started/local-development) to also run Supabase locally.

## Feedback and issues

Please file feedback and issues over on the [Supabase GitHub org](https://github.com/supabase/supabase/issues/new/choose).

## More Supabase examples

- [Next.js Subscription Payments Starter](https://github.com/vercel/nextjs-subscription-payments)
- [Cookie-based Auth and the Next.js 13 App Router (free course)](https://youtube.com/playlist?list=PL5S4mPUpp4OtMhpnp93EFSo42iQ40XjbF)
- [Supabase Auth and the Next.js App Router](https://github.com/supabase/supabase/tree/master/examples/auth/nextjs)
