import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { FarmerClientProviders } from './farmer-client-providers';
import { ServiceWorkerRegistration } from './service-worker/service-worker-registration';
import './styles.css';

export const metadata: Metadata = {
  applicationName: 'Smart Fasal Farmer',
  description: 'The mobile-first Smart Fasal service for farmers in the Raigad pilot.',
  manifest: '/manifest.webmanifest',
  title: {
    default: 'Smart Fasal — Farmer',
    template: '%s | Smart Fasal Farmer',
  },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#166534',
  width: 'device-width',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="mr">
      <body>
        <FarmerClientProviders>{children}</FarmerClientProviders>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
