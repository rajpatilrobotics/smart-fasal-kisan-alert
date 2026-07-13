import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthMemoryProvider } from '../../auth/auth-memory';
import type { RskShellState } from '../../lib/rsk-api';
import { RskWorkShell } from './rsk-work-shell';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const credentials = { appCheckToken: 'app-check-test', idToken: 'id-token-test' } as const;
const roleContextId = '00000000-0000-4000-8000-000000000201';

function renderState(state: RskShellState) {
  render(
    <AuthMemoryProvider initialCredentials={credentials} initialRoleContextId={roleContextId}>
      <RskWorkShell loadState={vi.fn().mockResolvedValue(state)} />
    </AuthMemoryProvider>,
  );
}

describe('RSK work authenticated shell', () => {
  it('shows staff context while protected Farmer content remains absent', async () => {
    renderState({
      authorizationVersion: 7,
      environment: 'demo',
      jurisdictionId: '00000000-0000-4000-8000-000000000222',
      kind: 'ready',
      officeId: '00000000-0000-4000-8000-000000000111',
      role: 'RSK',
      subjectId: '00000000-0000-4000-8000-123456789abc',
      workState: 'UNAVAILABLE_UNTIL_WORK_MILESTONE',
    });

    expect(await screen.findByText('UNAVAILABLE_UNTIL_WORK_MILESTONE')).toBeInTheDocument();
    expect(screen.getAllByText('RSK').length).toBeGreaterThan(0);
    expect(screen.queryByText(/farmer contact|phone number|farmer name/i)).not.toBeInTheDocument();
    expect(screen.queryByTestId('protected-rsk-content')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it.each(['denied', 'expired', 'withdrawn', 'unavailable'] as const)(
    'renders the fail-closed %s state',
    async (kind) => {
      renderState({ kind });
      expect(await screen.findByRole('heading', { level: 2 })).toBeInTheDocument();
      expect(screen.queryByTestId('protected-rsk-content')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument();
    },
  );

  it('turns an unexpected load rejection into an unavailable state', async () => {
    render(
      <AuthMemoryProvider initialCredentials={credentials} initialRoleContextId={roleContextId}>
        <RskWorkShell loadState={vi.fn().mockRejectedValue(new Error('network failed'))} />
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
        <RskWorkShell loadState={loadState} />
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
        <RskWorkShell
          loadState={vi.fn().mockResolvedValue({
            authorizationVersion: 7,
            environment: 'demo',
            jurisdictionId: '00000000-0000-4000-8000-000000000222',
            kind: 'ready',
            officeId: '00000000-0000-4000-8000-000000000111',
            role: 'RSK',
            subjectId: '00000000-0000-4000-8000-123456789abc',
            workState: 'UNAVAILABLE_UNTIL_WORK_MILESTONE',
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
