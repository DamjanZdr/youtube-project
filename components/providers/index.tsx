/**
 * App Providers
 * Combines all providers in one component
 */

'use client';

import { type ReactNode } from 'react';
import { QueryProvider } from './query-provider';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      {children}
    </QueryProvider>
  );
}
