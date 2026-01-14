/**
 * Dashboard Layout Component
 * Main layout with sidebar and header for dashboard pages
 */

import { type ReactNode } from 'react';
import { Sidebar } from './sidebar';

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
          <div className="flex h-16 items-center gap-4 px-6">
            {/* TODO: Add header content - search, notifications, user menu */}
            <div className="flex-1" />
          </div>
        </header>
        
        {/* Page content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
