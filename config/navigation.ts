/**
 * Navigation configuration
 */

import { type LucideIcon } from 'lucide-react';

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

// Project statuses for kanban workflow
export const projectStatuses = [
  { id: 'idea', label: 'Idea', color: 'bg-slate-500' },
  { id: 'script', label: 'Script', color: 'bg-blue-500' },
  { id: 'recording', label: 'Recording', color: 'bg-yellow-500' },
  { id: 'editing', label: 'Editing', color: 'bg-orange-500' },
  { id: 'scheduled', label: 'Scheduled', color: 'bg-purple-500' },
  { id: 'published', label: 'Published', color: 'bg-green-500' },
] as const;

