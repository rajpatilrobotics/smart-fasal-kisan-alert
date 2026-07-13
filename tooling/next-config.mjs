export function createSecureNextConfig({
  production = process.env.NODE_ENV === 'production',
} = {}) {
  const securityHeaders = [
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
