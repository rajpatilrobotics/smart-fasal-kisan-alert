import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { AuthMemoryProvider } from './auth/auth-memory';
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
        <AuthMemoryProvider>{children}</AuthMemoryProvider>
      </body>
    </html>
  );
}
