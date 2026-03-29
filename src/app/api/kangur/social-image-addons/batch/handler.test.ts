import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveKangurActorMock,
  createKangurSocialImageAddonsBatchMock,
  captureExceptionMock,
  logKangurServerEventMock,
} = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  createKangurSocialImageAddonsBatchMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: (...args: unknown[]) => resolveKangurActorMock(...args),
}));

vi.mock('@/features/kangur/server/social-image-addons-batch', () => ({
  createKangurSocialImageAddonsBatch: (...args: unknown[]) =>
    createKangurSocialImageAddonsBatchMock(...args),
}));

vi.mock('@/features/kangur/server/social-image-addons-batch-jobs', () => ({
  readKangurSocialImageAddonsBatchJob: vi.fn(),
  startKangurSocialImageAddonsBatchJob: vi.fn(),
}));

vi.mock('@/features/kangur/observability/server', () => ({
  logKangurServerEvent: (...args: unknown[]) => logKangurServerEventMock(...args),
}));

vi.mock('@/features/kangur/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

import { apiHandler } from '@/shared/lib/api/api-handler';
import { operationFailedError } from '@/shared/errors/app-error';

import { postKangurSocialImageAddonsBatchHandler } from './handler';

const wrappedPostHandler = apiHandler(postKangurSocialImageAddonsBatchHandler, {
  source: 'kangur.social-image-addons.batch.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});

describe('postKangurSocialImageAddonsBatchHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveKangurActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('surfaces a specific batch capture failure message in the API response', async () => {
    createKangurSocialImageAddonsBatchMock.mockRejectedValueOnce(
      operationFailedError('Browser crashed.')
    );

    const url = 'http://localhost/api/kangur/social-image-addons/batch';
    const request = Object.assign(
      new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: 'https://kangur.app',
          presetIds: ['game'],
        }),
      }),
      {
        nextUrl: new URL(url),
      }
    ) as Parameters<typeof wrappedPostHandler>[0];

    const response = await wrappedPostHandler(request);
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload).toEqual(
      expect.objectContaining({
        error: 'Browser crashed.',
        code: 'OPERATION_FAILED',
      })
    );
    expect(captureExceptionMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        action: 'apiBatch',
        baseUrl: 'https://kangur.app',
      })
    );
  });
});
