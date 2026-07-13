import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AuthMemoryProvider } from '../../auth/auth-memory';
import type { FarmerShellState } from '../../lib/farmer-api';
import { FarmerTodayShell } from './farmer-today-shell';

vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: vi.fn() }) }));

const credentials = { appCheckToken: 'app-check-test', idToken: 'id-token-test' } as const;
const roleContextId = '00000000-0000-4000-8000-000000000201';

function renderState(state: FarmerShellState) {
  const loadState = vi.fn().mockResolvedValue(state);
  render(
    <AuthMemoryProvider initialCredentials={credentials} initialRoleContextId={roleContextId}>
      <FarmerTodayShell loadState={loadState} />
    </AuthMemoryProvider>,
  );
  return loadState;
}

describe('Farmer Today authenticated shell', () => {
  it('shows verified context without inventing farm guidance', async () => {
    renderState({
      authorizationVersion: 4,
      environment: 'demo',
      farmContextState: 'UNAVAILABLE_UNTIL_SETUP',
      kind: 'ready',
      onboardingState: 'NOT_STARTED',
      role: 'FARMER',
      subjectId: '00000000-0000-4000-8000-123456789abc',
    });

    expect(await screen.findByText('••••56789abc')).toBeInTheDocument();
    expect(screen.getByText('UNAVAILABLE_UNTIL_SETUP')).toBeInTheDocument();
    expect(screen.queryByText(/weather|irrigation|yield/i)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
  });

  it.each([
    ['denied', 'प्रवेश उपलब्ध नाही'],
    ['expired', 'सत्र किंवा भूमिका संदर्भाची मुदत संपली'],
    ['withdrawn', 'प्रवेश मागे घेतला आहे'],
    ['unavailable', 'सेवा तात्पुरती उपलब्ध नाही'],
  ] as const)('renders the distinct %s state', async (kind, heading) => {
    renderState({ kind });
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'साइन आउट' })).toBeInTheDocument();
  });

  it('shows the unauthenticated state without calling the API', async () => {
    const loadState = vi.fn();
    render(
      <AuthMemoryProvider>
        <FarmerTodayShell loadState={loadState} />
      </AuthMemoryProvider>,
    );
    expect(await screen.findByRole('heading', { name: 'साइन इन आवश्यक आहे' })).toBeInTheDocument();
    expect(loadState).not.toHaveBeenCalled();
  });

  it('turns an unexpected load rejection into an unavailable state', async () => {
    render(
      <AuthMemoryProvider initialCredentials={credentials} initialRoleContextId={roleContextId}>
        <FarmerTodayShell loadState={vi.fn().mockRejectedValue(new Error('network failed'))} />
      </AuthMemoryProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'सेवा तात्पुरती उपलब्ध नाही' }),
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
        <FarmerTodayShell loadState={loadState} />
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
        <FarmerTodayShell
          loadState={vi.fn().mockResolvedValue({
            authorizationVersion: 4,
            environment: 'demo',
            farmContextState: 'UNAVAILABLE_UNTIL_SETUP',
            kind: 'ready',
            onboardingState: 'NOT_STARTED',
            role: 'FARMER',
            subjectId: '00000000-0000-4000-8000-123456789abc',
          })}
          revokeRoleContext={revokeRoleContext}
        />
      </AuthMemoryProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'साइन आउट' }));

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
    expect(await screen.findByRole('heading', { name: 'साइन इन आवश्यक आहे' })).toBeInTheDocument();
  });

  it('retries a failed revocation with the same command before clearing local credentials', async () => {
    const revokeRoleContext = vi.fn().mockResolvedValue(false);
    render(
      <AuthMemoryProvider initialCredentials={credentials} initialRoleContextId={roleContextId}>
        <FarmerTodayShell
          loadState={vi.fn().mockResolvedValue({
            authorizationVersion: 4,
            environment: 'demo',
            farmContextState: 'UNAVAILABLE_UNTIL_SETUP',
            kind: 'ready',
            onboardingState: 'NOT_STARTED',
            role: 'FARMER',
            subjectId: '00000000-0000-4000-8000-123456789abc',
          })}
          revokeRoleContext={revokeRoleContext}
        />
      </AuthMemoryProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'साइन आउट' }));

    await waitFor(() => expect(revokeRoleContext).toHaveBeenCalledTimes(2));
    expect(revokeRoleContext.mock.calls[0]?.[3].revokeCommandId).toBe(
      revokeRoleContext.mock.calls[1]?.[3].revokeCommandId,
    );
    expect(await screen.findByRole('heading', { name: 'साइन इन आवश्यक आहे' })).toBeInTheDocument();
  });
});
