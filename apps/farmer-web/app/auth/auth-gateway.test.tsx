import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FarmerAuthGateway } from './auth-gateway';
import { AuthMemoryProvider, type IdentityBridge, useAuthMemory } from './auth-memory';

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

function RoleContextProbe() {
  const { roleContextId } = useAuthMemory();
  return <output>{roleContextId ?? 'no-role-context'}</output>;
}

beforeEach(() => Reflect.deleteProperty(browserWindow, 'smartFasalIdentity'));
afterEach(() => Reflect.deleteProperty(browserWindow, 'smartFasalIdentity'));

describe('Farmer authentication gateway', () => {
  it('defaults to Marathi and fails closed when the origin identity adapter is absent', async () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    render(
      <AuthMemoryProvider>
        <FarmerAuthGateway />
      </AuthMemoryProvider>,
    );

    expect(
      await screen.findByRole('heading', { name: 'साइन इन सध्या उपलब्ध नाही' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /सुरक्षित साइन इनकडे/ })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveFocus();
    expect(storageWrite).toHaveBeenCalledWith(
      'smart-fasal:farmer:installation:v1',
      expect.stringMatching(/^[0-9a-f-]{36}$/iu),
    );
    expect(storageWrite.mock.calls.map(([key]) => key)).toEqual([
      'smart-fasal:farmer:installation:v1',
    ]);
    storageWrite.mockRestore();
  });

  it.each([
    ['denied', 'प्रवेश उपलब्ध नाही'],
    ['expired', 'सत्र किंवा भूमिका संदर्भाची मुदत संपली'],
    ['withdrawn', 'प्रवेश मागे घेतला आहे'],
    ['unavailable', 'सेवा तात्पुरती उपलब्ध नाही'],
  ] as const)('renders the truthful %s result from role establishment', async (issue, heading) => {
    installMemoryBridge();
    render(
      <AuthMemoryProvider>
        <FarmerAuthGateway
          createReturnState={vi.fn().mockResolvedValue('00000000-0000-4000-8000-000000000101')}
          establishRole={vi.fn().mockResolvedValue(issue)}
        />
      </AuthMemoryProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'सुरक्षित साइन इनकडे पुढे जा' }));
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'पुन्हा प्रयत्न करा' })).toBeInTheDocument();
  });

  it('keeps the selected role context only in the in-memory provider', async () => {
    installMemoryBridge();
    render(
      <AuthMemoryProvider>
        <FarmerAuthGateway
          createReturnState={vi.fn().mockResolvedValue('00000000-0000-4000-8000-000000000101')}
          establishRole={vi.fn().mockResolvedValue({
            kind: 'ready',
            roleContextId: '00000000-0000-4000-8000-000000000201',
          })}
        />
        <RoleContextProbe />
      </AuthMemoryProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: 'सुरक्षित साइन इनकडे पुढे जा' }));
    expect(await screen.findByText('00000000-0000-4000-8000-000000000201')).toBeInTheDocument();
  });
});
