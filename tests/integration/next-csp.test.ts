import { describe, expect, it } from 'vitest';

import {
  createNonceContentSecurityPolicy,
  firebaseBrowserPolicyOrigins,
} from '../../tooling/next-csp.mjs';

function directive(policy: string, name: string) {
  return policy
    .split('; ')
    .find((candidate) => candidate === name || candidate.startsWith(`${name} `));
}

describe('createNonceContentSecurityPolicy', () => {
  it('creates a unique nonce for every request policy', () => {
    const first = createNonceContentSecurityPolicy({ production: true });
    const second = createNonceContentSecurityPolicy({ production: true });

    expect(first.nonce).not.toBe(second.nonce);
    expect(directive(first.contentSecurityPolicy, 'script-src')).toContain(
      `'nonce-${first.nonce}'`,
    );
    expect(directive(second.contentSecurityPolicy, 'script-src')).toContain(
      `'nonce-${second.nonce}'`,
    );
  });

  it('uses a nonce and strict-dynamic without unsafe script execution in production', () => {
    const { contentSecurityPolicy } = createNonceContentSecurityPolicy({
      nonce: '01234567-89ab-cdef-0123-456789abcdef',
      production: true,
    });
    const scripts = directive(contentSecurityPolicy, 'script-src');

    expect(scripts).toContain("'nonce-01234567-89ab-cdef-0123-456789abcdef'");
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts).not.toContain("'unsafe-inline'");
    expect(scripts).not.toContain("'unsafe-eval'");
  });

  it('allows only the development evaluator and preserves every security directive', () => {
    const { contentSecurityPolicy } = createNonceContentSecurityPolicy({
      connectOrigins: ['https://domain.example', 'https://query.example'],
      frameOrigins: ['https://auth.example'],
      nonce: '01234567-89ab-cdef-0123-456789abcdef',
      production: false,
    });

    expect(directive(contentSecurityPolicy, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(contentSecurityPolicy, 'script-src')).not.toContain("'unsafe-inline'");
    expect(directive(contentSecurityPolicy, 'connect-src')).toBe(
      "connect-src 'self' https://domain.example https://query.example",
    );
    expect(directive(contentSecurityPolicy, 'frame-src')).toBe(
      "frame-src 'self' https://auth.example",
    );
    expect(contentSecurityPolicy).not.toContain('upgrade-insecure-requests');

    for (const name of [
      'default-src',
      'base-uri',
      'connect-src',
      'font-src',
      'form-action',
      'frame-src',
      'frame-ancestors',
      'img-src',
      'manifest-src',
      'media-src',
      'object-src',
      'script-src',
      'style-src',
      'worker-src',
    ]) {
      expect(directive(contentSecurityPolicy, name), `missing ${name}`).toBeDefined();
    }
  });

  it('allows only the exact Firebase browser endpoints and configured auth domain', () => {
    const firebase = firebaseBrowserPolicyOrigins('farmer-auth.example');
    const { contentSecurityPolicy } = createNonceContentSecurityPolicy({
      connectOrigins: firebase.connectOrigins,
      frameOrigins: firebase.frameOrigins,
      nonce: '01234567-89ab-cdef-0123-456789abcdef',
      production: true,
    });

    expect(directive(contentSecurityPolicy, 'connect-src')).toBe(
      "connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://content-firebaseappcheck.googleapis.com https://firebaseappcheck.googleapis.com https://www.google.com https://farmer-auth.example",
    );
    expect(directive(contentSecurityPolicy, 'frame-src')).toBe(
      "frame-src 'self' https://www.google.com https://recaptcha.google.com https://farmer-auth.example",
    );
    expect(() => firebaseBrowserPolicyOrigins('https://unsafe.example/path')).toThrow(
      'Firebase Auth domain must be an exact hostname',
    );
  });

  it('adds the production upgrade directive and rejects unsafe configuration values', () => {
    const { contentSecurityPolicy } = createNonceContentSecurityPolicy({
      nonce: '01234567-89ab-cdef-0123-456789abcdef',
      production: true,
    });

    expect(directive(contentSecurityPolicy, 'upgrade-insecure-requests')).toBe(
      'upgrade-insecure-requests',
    );
    expect(() =>
      createNonceContentSecurityPolicy({
        connectOrigins: ['https://domain.example/v1'],
        production: true,
      }),
    ).toThrow('Configured connection endpoint must be an HTTP(S) origin');
    expect(() =>
      createNonceContentSecurityPolicy({ nonce: "unsafe'; script-src *", production: true }),
    ).toThrow('Content Security Policy nonce must contain only CSP-safe characters');
  });
});
