// Generated from farmer.openapi.json. Do not edit by hand.
import createClient from 'openapi-fetch';

import type { paths } from './farmer.types.js';

export type FarmerClientOptions = Parameters<typeof createClient>[0];

export function createFarmerClient(options: FarmerClientOptions) {
  return createClient<paths>(options);
}
