import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';
import { injectManifest } from 'workbox-build';

import { workboxStaticPolicy } from './workbox-policy.mjs';

const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workDirectory = path.join(appRoot, '.next', 'workbox');
const bundledWorker = path.join(workDirectory, 'farmer-service-worker.js');
const destination = path.join(appRoot, 'public', 'sw.js');

await mkdir(workDirectory, { recursive: true });
await mkdir(path.dirname(destination), { recursive: true });

await build({
  bundle: true,
  entryPoints: [path.join(appRoot, 'app', 'service-worker', 'worker.ts')],
  format: 'iife',
  legalComments: 'none',
  minify: true,
  outfile: bundledWorker,
  platform: 'browser',
  target: ['chrome100', 'safari16'],
});

const result = await injectManifest({
  ...workboxStaticPolicy,
  globIgnores: [...workboxStaticPolicy.globIgnores],
  globPatterns: [...workboxStaticPolicy.globPatterns],
  modifyURLPrefix: { ...workboxStaticPolicy.modifyURLPrefix },
  globDirectory: appRoot,
  swDest: destination,
  swSrc: bundledWorker,
});

if (result.warnings.length > 0) {
  throw new Error(`Workbox static-policy warnings:\n${result.warnings.join('\n')}`);
}
if (result.count === 0) {
  throw new Error('Workbox did not find any identity-neutral static Farmer assets to precache.');
}

console.log(
  `Farmer service worker generated with ${result.count} static assets (${result.size} bytes).`,
);
