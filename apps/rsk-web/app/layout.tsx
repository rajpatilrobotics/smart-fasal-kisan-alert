import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { AuthMemoryProvider } from './auth/auth-memory';
import './styles.css';

export const metadata: Metadata = {
  applicationName: 'Smart Fasal RSK',
  description: 'The purpose-bound operations workspace for the Raigad Rythu Seva Kendram pilot.',
  manifest: '/manifest.webmanifest',
  title: {
    default: 'Smart Fasal — RSK Operations',
    template: '%s | Smart Fasal RSK',
  },
};

export const viewport: Viewport = {
  colorScheme: 'light',
  themeColor: '#124E3B',
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
