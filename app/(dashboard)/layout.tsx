/**
 * Dashboard Layout
 * Wraps all authenticated dashboard pages
 */

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { DashboardLayout } from '@/components/layouts/dashboard-layout';

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}



