import { type NextRequest, NextResponse } from 'next/server';

import {
  createNonceContentSecurityPolicy,
  firebaseBrowserPolicyOrigins,
} from '../../tooling/next-csp.mjs';

export function proxy(request: NextRequest) {
  const firebasePolicy = firebaseBrowserPolicyOrigins(
    process.env.NEXT_PUBLIC_FARMER_FIREBASE_AUTH_DOMAIN,
  );
  const { contentSecurityPolicy, nonce } = createNonceContentSecurityPolicy({
    connectOrigins: [process.env.NEXT_PUBLIC_DOMAIN_API_ORIGIN, ...firebasePolicy.connectOrigins],
    frameOrigins: firebasePolicy.frameOrigins,
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  return response;
}

export const config = {
  matcher: [
    {
      source:
        '/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|manifest.webmanifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
