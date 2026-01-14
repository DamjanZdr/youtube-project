/**
 * Navigation configuration
 */

import {
  LayoutDashboard,
  FolderKanban,
  FileText,
  Image,
  Palette,
  Users,
  Settings,
  CreditCard,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  disabled?: boolean;
  external?: boolean;
  description?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Main dashboard navigation
export const dashboardNav: NavSection[] = [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        description: 'Overview of your channels and projects',
      },
    ],
  },
  {
    title: 'Content',
    items: [
      {
        title: 'Projects',
        href: '/dashboard/projects',
        icon: FolderKanban,
        description: 'Manage your video projects',
      },
      {
        title: 'Scripts',
        href: '/dashboard/scripts',
        icon: FileText,
        description: 'Write and organize scripts',
      },
      {
        title: 'Assets',
        href: '/dashboard/assets',
        icon: Image,
        description: 'Thumbnails, exports, and media',
      },
    ],
  },
  {
    title: 'Channel',
    items: [
      {
        title: 'Branding',
        href: '/dashboard/branding',
        icon: Palette,
        description: 'Channel branding preview',
      },
    ],
  },
  {
    title: 'Team',
    items: [
      {
        title: 'Members',
        href: '/dashboard/team',
        icon: Users,
        description: 'Manage team members',
      },
    ],
  },
  {
    title: 'Settings',
    items: [
      {
        title: 'General',
        href: '/dashboard/settings',
        icon: Settings,
        description: 'Account and app settings',
      },
      {
        title: 'Billing',
        href: '/dashboard/billing',
        icon: CreditCard,
        description: 'Subscription and billing',
      },
    ],
  },
];

// Project statuses for kanban workflow
export const projectStatuses = [
  { id: 'idea', label: 'Idea', color: 'bg-slate-500' },
  { id: 'script', label: 'Script', color: 'bg-blue-500' },
  { id: 'recording', label: 'Recording', color: 'bg-yellow-500' },
  { id: 'editing', label: 'Editing', color: 'bg-orange-500' },
  { id: 'scheduled', label: 'Scheduled', color: 'bg-purple-500' },
  { id: 'published', label: 'Published', color: 'bg-green-500' },
] as const;
