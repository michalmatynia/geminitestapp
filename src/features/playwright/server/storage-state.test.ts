import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  encryptSecretMock,
  updateConnectionMock,
} = vi.hoisted(() => ({
  encryptSecretMock: vi.fn(),
  updateConnectionMock: vi.fn(),
}));

vi.mock('@/shared/lib/security/encryption', () => ({
  encryptSecret: (...args: unknown[]) => encryptSecretMock(...args),
}));

vi.mock('@/features/integrations/services/integration-repository', () => ({
  getIntegrationRepository: async () => ({
    updateConnection: (...args: unknown[]) => updateConnectionMock(...args),
  }),
}));

import { persistPlaywrightConnectionStorageState } from './storage-state';

describe('persistPlaywrightConnectionStorageState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    encryptSecretMock.mockImplementation((value: string) => `encrypted:${value}`);
  });

  it('stores the refreshed session state on the integration connection', async () => {
    await persistPlaywrightConnectionStorageState({
      connectionId: 'connection-1',
      storageState: {
        cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
        origins: [],
      },
      updatedAt: '2026-04-10T10:00:00.000Z',
    });

    expect(encryptSecretMock).toHaveBeenCalledWith(
      JSON.stringify({
        cookies: [{ name: 'session', value: 'abc', domain: '.example.com', path: '/' }],
        origins: [],
      })
    );
    expect(updateConnectionMock).toHaveBeenCalledWith('connection-1', {
      playwrightStorageState:
        'encrypted:{"cookies":[{"name":"session","value":"abc","domain":".example.com","path":"/"}],"origins":[]}',
      playwrightStorageStateUpdatedAt: '2026-04-10T10:00:00.000Z',
    });
  });

  it('uses an injected repository when provided', async () => {
    const repoUpdateConnectionMock = vi.fn().mockResolvedValue(undefined);

    await persistPlaywrightConnectionStorageState({
      connectionId: 'connection-2',
      storageState: {
        cookies: [],
        origins: [],
      },
      updatedAt: '2026-04-10T11:00:00.000Z',
      repo: {
        updateConnection: repoUpdateConnectionMock,
      },
    });

    expect(updateConnectionMock).not.toHaveBeenCalled();
    expect(repoUpdateConnectionMock).toHaveBeenCalledWith('connection-2', {
      playwrightStorageState: 'encrypted:{"cookies":[],"origins":[]}',
      playwrightStorageStateUpdatedAt: '2026-04-10T11:00:00.000Z',
    });
  });
});
