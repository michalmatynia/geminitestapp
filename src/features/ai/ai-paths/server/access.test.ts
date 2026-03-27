import { beforeEach, describe, expect, it, vi } from 'vitest';

const { readOptionalServerAuthSessionMock } = vi.hoisted(() => ({
  readOptionalServerAuthSessionMock: vi.fn(),
}));

vi.mock('@/shared/lib/auth/optional-server-auth', () => ({
  readOptionalServerAuthSession: readOptionalServerAuthSessionMock,
}));

vi.mock('@/features/ai/ai-paths/services/path-run-recovery-service', () => ({
  resolveAiPathsStaleRunningMaxAgeMs: () => 300_000,
}));

vi.mock('@/shared/lib/ai-paths/services/path-run-repository', () => ({
  getPathRunRepository: vi.fn(),
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: vi.fn(),
}));

vi.mock('@/shared/lib/queue', () => ({
  getRedisConnection: vi.fn(),
}));

import { requireAiPathsAccess, requireAiPathsRunAccess } from './access';

describe('ai paths access helpers', () => {
  beforeEach(() => {
    readOptionalServerAuthSessionMock.mockReset();
  });

  it('treats missing request scope as unauthorized', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue(null);

    await expect(requireAiPathsAccess()).rejects.toThrow(/Unauthorized/);
    await expect(requireAiPathsRunAccess()).rejects.toThrow(/Unauthorized/);
  });

  it('allows elevated users through the management guard', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-1',
        isElevated: true,
        permissions: [],
      },
    });

    await expect(requireAiPathsAccess()).resolves.toMatchObject({
      userId: 'user-1',
      isElevated: true,
    });
  });

  it('allows products managers through the run guard', async () => {
    readOptionalServerAuthSessionMock.mockResolvedValue({
      user: {
        id: 'user-2',
        isElevated: false,
        permissions: ['products.manage'],
      },
    });

    await expect(requireAiPathsRunAccess()).resolves.toMatchObject({
      userId: 'user-2',
      permissions: ['products.manage'],
      isElevated: false,
    });
  });
});
