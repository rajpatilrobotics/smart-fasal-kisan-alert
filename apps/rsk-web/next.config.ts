import type { NextConfig } from 'next';

import { createSecureNextConfig } from '../../tooling/next-config.mjs';

const nextConfig = createSecureNextConfig() satisfies NextConfig;

export default nextConfig;
