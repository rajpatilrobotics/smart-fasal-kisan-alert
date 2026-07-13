import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthMemoryProvider } from '../../auth/auth-memory';
import type { MpShellState } from '../../lib/mp-api';
import { MpOverviewShell } from './mp-overview-shell';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const credentials = { appCheckToken: 'app-check-test', idToken: 'id-token-test' } as const;
const roleContextId = '00000000-0000-4000-8000-000000000201';

function renderState(state: MpShellState) {
  render(
    <AuthMemoryProvider initialCredentials={credentials} initialRoleContextId={roleContextId}>
      <MpOverviewShell loadState={vi.fn().mockResolvedValue(state)} />
    </AuthMemoryProvider>,
  );
}

describe('MP overview authenticated shell', () => {
  it('shows identity context and an honest unavailable release without metrics', async () => {
    renderState({
      authorizationVersion: 9,
      environment: 'demo',
      jurisdictionId: '00000000-0000-4000-8000-000000000333',
      kind: 'ready',
      releaseState: 'DEPENDENCY_UNAVAILABLE',
      role: 'MP',
      subjectId: '00000000-0000-4000-8000-123456789abc',
    });

    expect(await screen.findByText('DEPENDENCY_UNAVAILABLE')).toBeInTheDocument();
    expect(screen.getByText(/no current privacy release/i)).toBeInTheDocument();
    expect(screen.queryByText(/%|yield forecast/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it.each(['denied', 'expired', 'withdrawn', 'unavailable'] as const)(
    'renders the isolated %s state',
    async (kind) => {
      renderState({ kind });
      expect(await screen.findByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.queryByText('DEPENDENCY_UNAVAILABLE')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    },
  );

  it('turns an unexpected load rejection into an unavailable state', async () => {
    render(
      <AuthMemoryProvider initialCredentials={credentials} initialRoleContextId={roleContextId}>
        <MpOverviewShell loadState={vi.fn().mockRejectedValue(new Error('network failed'))} />
      </AuthMemoryProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'Service temporarily unavailable' }),
    ).toBeInTheDocument();
  });

  it('aborts and consumes an in-flight load rejection during teardown', async () => {
    let signal: AbortSignal | undefined;
    const loadState = vi.fn(
      (_credentials: unknown, _installationId: string, options?: { signal?: AbortSignal }) =>
        new Promise<never>((_resolve, reject) => {
          signal = options?.signal;
          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true },
          );
        }),
    );
    const view = render(
      <AuthMemoryProvider initialCredentials={credentials} initialRoleContextId={roleContextId}>
        <MpOverviewShell loadState={loadState} />
      </AuthMemoryProvider>,
    );

    view.unmount();
    await Promise.resolve();
    expect(signal?.aborted).toBe(true);
  });

  it('revokes the server role context before clearing the in-memory session', async () => {
    const revokeRoleContext = vi.fn().mockResolvedValue(true);
    render(
      <AuthMemoryProvider initialCredentials={credentials} initialRoleContextId={roleContextId}>
        <MpOverviewShell
          loadState={vi.fn().mockResolvedValue({
            authorizationVersion: 9,
            environment: 'demo',
            jurisdictionId: '00000000-0000-4000-8000-000000000333',
            kind: 'ready',
            releaseState: 'DEPENDENCY_UNAVAILABLE',
            role: 'MP',
            subjectId: '00000000-0000-4000-8000-123456789abc',
          })}
          revokeRoleContext={revokeRoleContext}
        />
      </AuthMemoryProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Sign out' }));

    await waitFor(() =>
      expect(revokeRoleContext).toHaveBeenCalledWith(
        credentials,
        expect.any(String),
        roleContextId,
        expect.objectContaining({
          revokeCommandId: expect.stringMatching(/^[0-9a-f-]{36}$/iu),
          signal: expect.anything(),
        }),
      ),
    );
    expect(await screen.findByRole('heading', { name: 'Sign in required' })).toBeInTheDocument();
  });
});
