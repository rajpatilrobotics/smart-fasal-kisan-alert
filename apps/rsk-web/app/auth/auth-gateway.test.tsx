import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RskAuthGateway } from './auth-gateway';
import { AuthMemoryProvider, type IdentityBridge } from './auth-memory';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const browserWindow = window as Window & { smartFasalIdentity?: unknown };

function installMemoryBridge() {
  browserWindow.smartFasalIdentity = {
    credentialPersistence: 'memory',
    getAppCheckToken: vi.fn().mockResolvedValue('app-check-test'),
    signIn: vi.fn().mockResolvedValue({
      appCheckToken: 'app-check-test',
      idToken: 'id-token-test',
    }),
  } satisfies IdentityBridge;
}

beforeEach(() => Reflect.deleteProperty(browserWindow, 'smartFasalIdentity'));
afterEach(() => Reflect.deleteProperty(browserWindow, 'smartFasalIdentity'));

describe('RSK authentication gateway', () => {
  it('shows an unavailable state instead of a dead sign-in control', async () => {
    render(
      <AuthMemoryProvider>
        <RskAuthGateway />
      </AuthMemoryProvider>,
    );
    expect(
      await screen.findByRole('heading', { name: 'Sign in is unavailable' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Continue to secure sign in' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it.each([
    ['denied', 'Access not available'],
    ['expired', 'Session or role context expired'],
    ['withdrawn', 'Access was withdrawn'],
    ['unavailable', 'Service temporarily unavailable'],
  ] as const)('renders the truthful %s result from role establishment', async (issue, heading) => {
    installMemoryBridge();
    render(
      <AuthMemoryProvider>
        <RskAuthGateway
          createReturnState={vi.fn().mockResolvedValue('00000000-0000-4000-8000-000000000102')}
          establishRole={vi.fn().mockResolvedValue(issue)}
        />
      </AuthMemoryProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Continue to secure sign in' }));
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});
