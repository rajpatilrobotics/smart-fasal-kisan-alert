export function createSecureNextConfig({
  production = process.env.NODE_ENV === 'production',
} = {}) {
  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    `script-src 'self' 'unsafe-inline'${production ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    ...(production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  const securityHeaders = [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=()' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'X-Frame-Options', value: 'DENY' },
    ...(production
      ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }]
      : []),
  ];

  return {
    output: 'standalone',
    poweredByHeader: false,
    reactStrictMode: true,
    headers() {
      return Promise.resolve([{ source: '/(.*)', headers: securityHeaders }]);
    },
  };
}
