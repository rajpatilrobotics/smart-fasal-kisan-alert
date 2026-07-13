const PROTECTED_PATH_PREFIXES = ['/api', '/auth', '/farmer', '/v1', '/media', '/voice'] as const;

interface CachePolicyRequest {
  readonly method: string;
  readonly headers: Pick<Headers, 'has'>;
}

interface NavigationRequest {
  readonly method: string;
  readonly mode: string;
}

export const OFFLINE_FALLBACK_URL = '/offline.html';

export function mustUseNetworkOnly(request: CachePolicyRequest, url: URL): boolean {
  if (request.method !== 'GET') return true;
  if (request.headers.has('Authorization') || request.headers.has('X-Firebase-AppCheck')) {
    return true;
  }
  return PROTECTED_PATH_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  );
}

export function canUseIdentityNeutralOfflineFallback(request: NavigationRequest): boolean {
  return request.method === 'GET' && request.mode === 'navigate';
}
