'use client';

import { useEffect } from 'react';

export interface ServiceWorkerNavigator {
  readonly serviceWorker?: {
    register(
      scriptURL: string,
      options: { readonly scope: string; readonly updateViaCache: 'none' },
    ): Promise<unknown>;
  };
}

export async function registerFarmerServiceWorker(
  serviceWorkerNavigator: ServiceWorkerNavigator,
): Promise<boolean> {
  if (!serviceWorkerNavigator.serviceWorker) return false;
  try {
    await serviceWorkerNavigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    });
    return true;
  } catch {
    // The application remains connected-first when registration is unavailable.
    return false;
  }
}

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      void registerFarmerServiceWorker(navigator);
    }
  }, []);

  return null;
}
