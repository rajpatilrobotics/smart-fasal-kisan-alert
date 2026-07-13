import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AuthMemoryProvider,
  IDENTITY_BRIDGE_READY_EVENT,
  type IdentityBridge,
  useAuthMemory,
} from './auth-memory';

const browserWindow = window as Window & { smartFasalIdentity?: unknown };

function AuthProbe({
  createReturnState,
}: {
  createReturnState: (token: string) => Promise<string>;
}) {
  const { beginSignIn, credentials, providerState } = useAuthMemory();
  return (
    <>
      <output>{providerState}</output>
      <output>{credentials?.idToken ?? 'no-credentials'}</output>
      <button onClick={() => void beginSignIn(createReturnState)} type="button">
        begin
      </button>
    </>
  );
}

afterEach(() => {
  Reflect.deleteProperty(browserWindow, 'smartFasalIdentity');
});

describe('MP in-memory identity bridge', () => {
  it('reacts to the ready event and accepts only a memory-persistent bridge', async () => {
    const createReturnState = vi.fn().mockResolvedValue('00000000-0000-4000-8000-000000000103');
    const signIn = vi.fn().mockResolvedValue({
      appCheckToken: 'app-check-test',
      idToken: 'id-token-test',
    });
    render(
      <AuthMemoryProvider>
        <AuthProbe createReturnState={createReturnState} />
      </AuthMemoryProvider>,
    );

    expect(screen.getByText('unavailable')).toBeInTheDocument();
    browserWindow.smartFasalIdentity = {
      credentialPersistence: 'local',
      getAppCheckToken: vi.fn(),
      signIn,
    };
    act(() => window.dispatchEvent(new Event(IDENTITY_BRIDGE_READY_EVENT)));
    expect(screen.getByText('unavailable')).toBeInTheDocument();

    browserWindow.smartFasalIdentity = {
      credentialPersistence: 'memory',
      getAppCheckToken: vi.fn().mockResolvedValue('app-check-test'),
      signIn,
    } satisfies IdentityBridge;
    act(() => window.dispatchEvent(new Event(IDENTITY_BRIDGE_READY_EVENT)));
    expect(await screen.findByText('available')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'begin' }));
    expect(await screen.findByText('id-token-test')).toBeInTheDocument();
    expect(createReturnState).toHaveBeenCalledWith('app-check-test');
    expect(signIn).toHaveBeenCalledWith({
      returnStateId: '00000000-0000-4000-8000-000000000103',
      surface: 'mp',
    });
  });
});
