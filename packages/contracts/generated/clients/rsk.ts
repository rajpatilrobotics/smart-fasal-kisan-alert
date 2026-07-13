// Generated from rsk.openapi.json. Do not edit by hand.
import createClient from 'openapi-fetch';

import type { paths } from './rsk.types.js';

export type RskClientOptions = Parameters<typeof createClient>[0];

export function createRskClient(options: RskClientOptions) {
  return createClient<paths>(options);
}
