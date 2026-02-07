# Mobile Responsive Progress Tracker

This file tracks the progress of making all pages mobile-friendly.

## How We're Making Pages Mobile-Friendly

- **Adding responsive Tailwind classes** (e.g., `md:flex-row`, `lg:px-8`)
- **Adjusting layouts** (stacking columns on mobile)
- **Hiding/showing elements** (e.g., `hidden md:block`)
- **Adjusting text sizes** (e.g., `text-sm md:text-base`)
- **Adjusting padding/margins** (e.g., `px-4 md:px-8`)

**NO existing code is being deleted - only additive changes.**

---

## Pages Checklist

### Public / Landing
- [ ] `app/page.tsx` - Landing page (homepage)
- [ ] `app/privacy/page.tsx` - Privacy policy
- [ ] `app/terms/page.tsx` - Terms of service

### Authentication
- [ ] `app/auth/login/page.tsx` - Login page
- [ ] `app/auth/sign-up/page.tsx` - Sign up page
- [ ] `app/auth/sign-up-success/page.tsx` - Sign up success
- [ ] `app/auth/forgot-password/page.tsx` - Forgot password
- [ ] `app/auth/update-password/page.tsx` - Update password
- [ ] `app/auth/error/page.tsx` - Auth error page

### Hub / Dashboard
- [ ] `app/hub/page.tsx` - User hub (studio list)
- [ ] `app/account/page.tsx` - Account settings
- [ ] `app/redeem/page.tsx` - Redeem codes
- [ ] `app/(dashboard)/dashboard/page.tsx` - Dashboard (if used)
- [ ] `app/protected/page.tsx` - Protected page

### Help Center
- [ ] `app/help/page.tsx` - Help center main
- [ ] `app/help/tickets/page.tsx` - My tickets list
- [ ] `app/help/tickets/new/page.tsx` - Create new ticket
- [ ] `app/help/tickets/[ticketId]/page.tsx` - Ticket detail/chat
- [ ] `app/help/[categorySlug]/page.tsx` - Help category
- [ ] `app/help/[categorySlug]/new/page.tsx` - New thread in category
- [ ] `app/help/[categorySlug]/[threadSlug]/page.tsx` - Thread detail

### Studio
- [ ] `app/studio/[studioSlug]/page.tsx` - Studio overview/redirect
- [ ] `app/studio/[studioSlug]/board/page.tsx` - Kanban board
- [ ] `app/studio/[studioSlug]/channel/page.tsx` - Channel settings
- [ ] `app/studio/[studioSlug]/projects/page.tsx` - Projects list
- [ ] `app/studio/[studioSlug]/settings/page.tsx` - Studio settings
- [ ] `app/studio/[studioSlug]/wiki/page.tsx` - Wiki main
- [ ] `app/studio/[studioSlug]/wiki/doc/[docId]/page.tsx` - Wiki document
- [ ] `app/studio/[studioSlug]/wiki/folder/[folderId]/page.tsx` - Wiki folder

### Project (inside Studio)
- [ ] `app/studio/[studioSlug]/project/[projectId]/page.tsx` - Project overview
- [ ] `app/studio/[studioSlug]/project/[projectId]/idea/page.tsx` - Idea/notes
- [ ] `app/studio/[studioSlug]/project/[projectId]/storyboard/page.tsx` - Storyboard
- [ ] `app/studio/[studioSlug]/project/[projectId]/tasks/page.tsx` - Project tasks
- [ ] `app/studio/[studioSlug]/project/[projectId]/packaging/page.tsx` - Packaging
- [ ] `app/studio/[studioSlug]/project/[projectId]/preview/page.tsx` - Preview
- [ ] `app/studio/[studioSlug]/project/[projectId]/settings/page.tsx` - Project settings

### Admin (Lower Priority)
- [ ] `app/admin/page.tsx` - Admin dashboard
- [ ] `app/admin/keys/page.tsx` - Redeem keys management
- [ ] `app/admin/studios/page.tsx` - Studios management
- [ ] `app/admin/subscriptions/page.tsx` - Subscriptions management
- [ ] `app/admin/tickets/page.tsx` - Support tickets management
- [ ] `app/admin/users/page.tsx` - Users management

---

## Shared Components to Update

These components are used across multiple pages:

- [ ] `components/layouts/studio-layout.tsx` - Studio sidebar/layout
- [ ] `components/layouts/project-layout.tsx` - Project tabs/layout
- [ ] `components/shared/user-profile-dropdown.tsx` - User dropdown
- [ ] `components/shared/rich-text-editor.tsx` - Text editor
- [ ] `components/ui/*` - UI components (likely already responsive)

---

## Notes

- Priority: User-facing pages first (Hub, Studio, Project), Admin last
- Test on both portrait and landscape mobile orientations
- Consider touch targets (min 44px for buttons)
- Test sidebars - may need to convert to slide-out drawer on mobile

---

## Progress

**Completed:** 0 / 43 pages
**In Progress:** 0
