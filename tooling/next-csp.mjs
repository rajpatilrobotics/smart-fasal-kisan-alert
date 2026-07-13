import { randomUUID } from 'node:crypto';

export function createNonceContentSecurityPolicy({
  connectOrigins = [],
  frameOrigins = [],
  nonce = randomUUID(),
  production = process.env.NODE_ENV === 'production',
} = {}) {
  const safeNonce = parseNonce(nonce);
  const allowedConnectOrigins = [
    ...new Set(connectOrigins.filter((origin) => origin !== undefined).map(parseOrigin)),
  ];
  const allowedFrameOrigins = [
    ...new Set(frameOrigins.filter((origin) => origin !== undefined).map(parseOrigin)),
  ];

  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    `connect-src 'self'${allowedConnectOrigins.map((origin) => ` ${origin}`).join('')}`,
    "font-src 'self' data:",
    "form-action 'self'",
    `frame-src 'self'${allowedFrameOrigins.map((origin) => ` ${origin}`).join('')}`,
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "manifest-src 'self'",
    "media-src 'self' blob:",
    "object-src 'none'",
    `script-src 'self' 'nonce-${safeNonce}' 'strict-dynamic'${production ? '' : " 'unsafe-eval'"}`,
    "style-src 'self' 'unsafe-inline'",
    "worker-src 'self' blob:",
    ...(production ? ['upgrade-insecure-requests'] : []),
  ].join('; ');

  return { contentSecurityPolicy, nonce: safeNonce };
}

const FIREBASE_CONNECT_ORIGINS = Object.freeze([
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://content-firebaseappcheck.googleapis.com',
  'https://firebaseappcheck.googleapis.com',
  'https://www.google.com',
]);

const RECAPTCHA_FRAME_ORIGINS = Object.freeze([
  'https://www.google.com',
  'https://recaptcha.google.com',
]);

export function firebaseBrowserPolicyOrigins(authDomain) {
  const authOrigin = parseFirebaseAuthOrigin(authDomain);
  return Object.freeze({
    connectOrigins: Object.freeze([
      ...FIREBASE_CONNECT_ORIGINS,
      ...(authOrigin === undefined ? [] : [authOrigin]),
    ]),
    frameOrigins: Object.freeze([
      ...RECAPTCHA_FRAME_ORIGINS,
      ...(authOrigin === undefined ? [] : [authOrigin]),
    ]),
  });
}

function parseNonce(value) {
  if (typeof value !== 'string' || !/^[A-Za-z0-9+/_=-]{16,128}$/.test(value)) {
    throw new Error('Content Security Policy nonce must contain only CSP-safe characters');
  }
  return value;
}

function parseOrigin(value) {
  if (typeof value !== 'string' || value !== value.trim()) {
    throw new Error('Configured connection endpoint must be an HTTP(S) origin');
  }

  const parsed = new URL(value);
  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    parsed.username ||
    parsed.password ||
    parsed.pathname !== '/' ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('Configured connection endpoint must be an HTTP(S) origin');
  }
  return parsed.origin;
}

function parseFirebaseAuthOrigin(value) {
  if (value === undefined || value === '') return undefined;
  if (typeof value !== 'string' || value !== value.trim() || value.includes(':')) {
    throw new Error('Firebase Auth domain must be an exact hostname');
  }
  const parsed = new URL(`https://${value}`);
  if (
    parsed.hostname !== value ||
    parsed.pathname !== '/' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('Firebase Auth domain must be an exact hostname');
  }
  return parsed.origin;
}
