import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  encryptSecretMock,
  updateConnectionMock,
} = vi.hoisted(() => ({
  encryptSecretMock: vi.fn(),
  updateConnectionMock: vi.fn(),
}));

vi.mock('@/features/integrations/server', () => ({
  encryptSecret: (...args: unknown[]) => encryptSecretMock(...args),
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
});
