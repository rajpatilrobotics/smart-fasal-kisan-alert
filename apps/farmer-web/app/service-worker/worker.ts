import { clientsClaim } from 'workbox-core';
import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching';
import { registerRoute, setCatchHandler, setDefaultHandler } from 'workbox-routing';
import { NetworkOnly } from 'workbox-strategies';

import {
  canUseIdentityNeutralOfflineFallback,
  mustUseNetworkOnly,
  OFFLINE_FALLBACK_URL,
} from './cache-policy';

declare const self: {
  readonly __WB_MANIFEST: readonly { readonly revision?: string; readonly url: string }[];
};

// Protected, authenticated, media and voice responses never enter Cache Storage.
registerRoute(
  ({ request, url }: { request: Request; url: URL }) => mustUseNetworkOnly(request, url),
  new NetworkOnly(),
);
precacheAndRoute([...self.__WB_MANIFEST]);
cleanupOutdatedCaches();
// There is deliberately no runtime cache: only the injected static manifest is cached.
setDefaultHandler(new NetworkOnly());
setCatchHandler(async ({ request }) => {
  if (!canUseIdentityNeutralOfflineFallback(request)) return Response.error();
  return (await matchPrecache(OFFLINE_FALLBACK_URL)) ?? Response.error();
});

clientsClaim();
