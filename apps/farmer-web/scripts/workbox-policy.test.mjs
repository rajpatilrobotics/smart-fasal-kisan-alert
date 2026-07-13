import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { workboxStaticPolicy } from './workbox-policy.mjs';

describe('Farmer Workbox build policy', () => {
  it('precache-selects only identity-neutral static and public files', () => {
    expect(workboxStaticPolicy.globPatterns).toEqual([
      '.next/static/**/*.{js,css,woff,woff2,png,jpg,jpeg,webp,svg,ico,avif}',
      'public/offline.html',
    ]);
    expect(workboxStaticPolicy.globPatterns.filter((pattern) => pattern.includes('html'))).toEqual([
      'public/offline.html',
    ]);
    expect(workboxStaticPolicy.globPatterns.join(' ')).not.toMatch(/api|farmer|auth|media|voice/iu);
  });

  it('excludes generated workers and source maps from their own manifest', () => {
    expect(workboxStaticPolicy.globIgnores).toEqual(
      expect.arrayContaining(['**/*.map', 'public/sw.js', 'public/workbox-*/**']),
    );
    expect(workboxStaticPolicy.modifyURLPrefix).toEqual({
      '.next/': '_next/',
      'public/': '',
    });
  });

  it('keeps the one offline document identity-neutral and non-interactive', async () => {
    const fallback = await readFile(path.join(process.cwd(), 'public', 'offline.html'), 'utf8');
    expect(fallback).toContain("default-src 'none'");
    expect(fallback).toContain('contains no personal data');
    expect(fallback).not.toMatch(/<script|<form|<input|authorization|idtoken|appcheck/iu);
  });
});
