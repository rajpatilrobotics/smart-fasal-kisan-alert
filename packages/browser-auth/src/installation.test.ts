import { describe, expect, it } from 'vitest';

import { getOrCreateInstallationId, installationStorageKey } from './index';

const FIRST = '00000000-0000-4000-8000-000000000101';
const SECOND = '00000000-0000-4000-8000-000000000102';

function memoryStorage(initial: Readonly<Record<string, string>> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    values,
  };
}

describe('stable installation identity', () => {
  it('persists an identity-neutral UUID separately for each product surface', () => {
    const storage = memoryStorage();
    const first = getOrCreateInstallationId('farmer', storage, () => FIRST);
    const restarted = getOrCreateInstallationId('farmer', storage, () => SECOND);

    expect(first).toBe(FIRST);
    expect(restarted).toBe(FIRST);
    expect(storage.values.get(installationStorageKey('farmer'))).toBe(FIRST);
    expect(storage.values.has(installationStorageKey('rsk'))).toBe(false);
  });

  it('replaces malformed storage and still works when storage is denied', () => {
    const storage = memoryStorage({ [installationStorageKey('farmer')]: 'not-a-uuid' });
    expect(getOrCreateInstallationId('farmer', storage, () => FIRST)).toBe(FIRST);

    const denied = {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('denied');
      },
    };
    expect(getOrCreateInstallationId('farmer', denied, () => SECOND)).toBe(SECOND);
  });
});
