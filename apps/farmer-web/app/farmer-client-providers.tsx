'use client';

import type { ReactNode } from 'react';

import { AuthMemoryProvider } from './auth/auth-memory';
import { prepareFarmerOfflineForSignOut } from './offline/offline-exit-coordinator';

export function FarmerClientProviders({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <AuthMemoryProvider beforeSignOut={prepareFarmerOfflineForSignOut}>
      {children}
    </AuthMemoryProvider>
  );
}
