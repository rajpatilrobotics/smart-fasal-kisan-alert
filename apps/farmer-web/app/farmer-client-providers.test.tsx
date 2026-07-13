import { act, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  IDENTITY_BRIDGE_READY_EVENT,
  type IdentityBridge,
  useAuthMemory,
} from './auth/auth-memory';
import { FarmerClientProviders } from './farmer-client-providers';
import { registerActiveFarmerOfflineStore } from './offline/offline-exit-coordinator';

const browserWindow = window as Window & { smartFasalIdentity?: unknown };

function SignOutProbe() {
  const { beginSignIn, credentials, signOut } = useAuthMemory();
  const [failure, setFailure] = useState('none');
  return (
    <>
      <output>{credentials?.idToken ?? 'no-credentials'}</output>
      <output>{failure}</output>
      <button
        onClick={() => {
          void beginSignIn(async () => '00000000-0000-4000-8000-000000000101');
        }}
        type="button"
      >
        begin
      </button>
      <button
        onClick={() => {
          void signOut().catch((error: unknown) => {
            setFailure(error instanceof Error ? error.message : 'unknown');
          });
        }}
        type="button"
      >
        sign out
      </button>
    </>
  );
}

afterEach(() => {
  Reflect.deleteProperty(browserWindow, 'smartFasalIdentity');
});

describe('Farmer client providers', () => {
  it('keeps credentials in memory when the offline guard blocks user switching', async () => {
    const bridgeSignOut = vi.fn().mockResolvedValue(undefined);
    browserWindow.smartFasalIdentity = {
      credentialPersistence: 'memory',
      getAppCheckToken: vi.fn().mockResolvedValue('app-check-test'),
      signIn: vi.fn().mockResolvedValue({
        appCheckToken: 'app-check-test',
        idToken: 'id-token-test',
      }),
      signOut: bridgeSignOut,
    } satisfies IdentityBridge;
    const unregister = registerActiveFarmerOfflineStore({
      prepareForUserSwitch: vi.fn().mockResolvedValue({
        pendingItems: 2,
        status: 'BLOCKED_UNSYNCED',
      }),
    });

    render(
      <FarmerClientProviders>
        <SignOutProbe />
      </FarmerClientProviders>,
    );
    act(() => window.dispatchEvent(new Event(IDENTITY_BRIDGE_READY_EVENT)));
    fireEvent.click(screen.getByRole('button', { name: 'begin' }));
    expect(await screen.findByText('id-token-test')).toBeInTheDocument();

    // The provider owns the callback even when no binding is fabricated by this shell.
    fireEvent.click(screen.getByRole('button', { name: 'sign out' }));
    expect(await screen.findByText(/unsynced private work/iu)).toBeInTheDocument();
    expect(screen.getByText('id-token-test')).toBeInTheDocument();
    expect(bridgeSignOut).not.toHaveBeenCalled();

    unregister();
  });
});
