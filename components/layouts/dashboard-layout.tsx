/**
 * Dashboard Layout Component
 * Main layout with sidebar and header for dashboard pages
 */

import { type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import Link from 'next/link';

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="sticky top-0 z-40 border-b bg-background">
          <div className="flex h-14 md:h-16 items-center gap-4 px-4 md:px-6">
            {/* Mobile Logo */}
            <Link href="/dashboard" className="flex items-center gap-2 font-bold md:hidden">
              <span className="text-lg">🎬</span>
              <span className="text-sm">Blueprint</span>
            </Link>
            {/* TODO: Add header content - search, notifications, user menu */}
            <div className="flex-1" />
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
