import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { AuthMemoryProvider } from './auth/auth-memory';
import './styles.css';

export const metadata: Metadata = {
  applicationName: 'Smart Fasal MP Office',
  description: 'Privacy-released constituency intelligence for the Smart Fasal Raigad pilot.',
  manifest: '/manifest.webmanifest',
  title: {
    default: 'Smart Fasal — MP Office',
    template: '%s | Smart Fasal MP Office',
  },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#1E293B',
  width: 'device-width',
};

export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AuthMemoryProvider>{children}</AuthMemoryProvider>
      </body>
    </html>
  );
}
