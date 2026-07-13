// Generated from mp.openapi.json. Do not edit by hand.
import createClient from 'openapi-fetch';

import type { paths } from './mp.types.js';

export type MpClientOptions = Parameters<typeof createClient>[0];

export function createMpClient(options: MpClientOptions) {
  return createClient<paths>(options);
}
