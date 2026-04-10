import { beforeEach, describe, expect, it, vi } from 'vitest';

const { persistPlaywrightConnectionStorageStateMock } = vi.hoisted(() => ({
  persistPlaywrightConnectionStorageStateMock: vi.fn(),
}));

vi.mock('./storage-state', () => ({
  persistPlaywrightConnectionStorageState: (...args: unknown[]) =>
    persistPlaywrightConnectionStorageStateMock(...args),
}));

import { persistPlaywrightConnectionTestSession } from './connection-test-persistence';

describe('persistPlaywrightConnectionTestSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-10T12:00:00.000Z'));
    persistPlaywrightConnectionStorageStateMock.mockResolvedValue(undefined);
  });

  it('captures and persists the Playwright session with logging', async () => {
    const pushStep = vi.fn();
    const storageStateMock = vi.fn().mockResolvedValue({
      cookies: [],
      origins: [],
    });

    const ok = await persistPlaywrightConnectionTestSession({
      connectionId: 'connection-1',
      page: {
        context: () => ({
          storageState: storageStateMock,
        }),
      } as never,
      pushStep,
      pendingDetail: 'Capturing cookies and local storage',
      successDetail: 'Playwright session updated',
      failureDetail: 'Failed to store session',
    });

    expect(ok).toBe(true);
    expect(pushStep).toHaveBeenNthCalledWith(
      1,
      'Saving session',
      'pending',
      'Capturing cookies and local storage'
    );
    expect(persistPlaywrightConnectionStorageStateMock).toHaveBeenCalledWith({
      connectionId: 'connection-1',
      storageState: {
        cookies: [],
        origins: [],
      },
      updatedAt: '2026-04-10T12:00:00.000Z',
    });
    expect(pushStep).toHaveBeenNthCalledWith(
      2,
      'Saving session',
      'ok',
      'Playwright session updated'
    );
  });

  it('can tolerate persistence failure and return false', async () => {
    const pushStep = vi.fn();
    persistPlaywrightConnectionStorageStateMock.mockRejectedValue(new Error('boom'));

    const ok = await persistPlaywrightConnectionTestSession({
      connectionId: 'connection-1',
      page: {
        context: () => ({
          storageState: vi.fn().mockResolvedValue({
            cookies: [],
            origins: [],
          }),
        }),
      } as never,
      pushStep,
      pendingDetail: 'Storing Vinted Playwright session',
      successDetail: 'Session stored for reuse',
      failureDetail: 'Failed to store session',
      throwOnFailure: false,
    });

    expect(ok).toBe(false);
    expect(pushStep).toHaveBeenNthCalledWith(
      2,
      'Saving session',
      'failed',
      'Failed to store session'
    );
  });
});
