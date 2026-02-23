/**
 * App Providers
 * Combines all providers in one component
 */

'use client';

import { type ReactNode, Suspense } from 'react';
import { QueryProvider } from './query-provider';
import { useActivityTracking } from '@/lib/hooks/use-activity-tracking';
import { PartnerTracker } from './partner-tracker';

interface ProvidersProps {
  children: ReactNode;
}

function ActivityTracker() {
  useActivityTracking();
  return null;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <ActivityTracker />
      <Suspense fallback={null}>
        <PartnerTracker />
      </Suspense>
      {children}
    </QueryProvider>
  );
}
