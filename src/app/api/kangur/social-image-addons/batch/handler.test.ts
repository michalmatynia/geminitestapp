import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveKangurActorMock,
  createKangurSocialImageAddonsBatchMock,
  startKangurSocialImageAddonsBatchJobMock,
  captureExceptionMock,
  logKangurServerEventMock,
} = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  createKangurSocialImageAddonsBatchMock: vi.fn(),
  startKangurSocialImageAddonsBatchJobMock: vi.fn(),
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
  startKangurSocialImageAddonsBatchJob: (...args: unknown[]) =>
    startKangurSocialImageAddonsBatchJobMock(...args),
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

  it('forwards the raw request cookie header to sync batch capture', async () => {
    createKangurSocialImageAddonsBatchMock.mockResolvedValueOnce({
      runId: 'social-batch-run-1',
      addons: [],
      failures: [],
      totals: {
        completed: 0,
        failed: 0,
        total: 0,
      },
    });

    const url = 'http://localhost/api/kangur/social-image-addons/batch';
    const request = Object.assign(
      new Request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie:
            '__Host-next-auth.csrf-token=csrf123; __Secure-next-auth.session-token=session456',
        },
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

    expect(response.status).toBe(200);
    expect(createKangurSocialImageAddonsBatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://kangur.app',
        createdBy: 'admin-1',
        forwardCookies:
          '__Host-next-auth.csrf-token=csrf123; __Secure-next-auth.session-token=session456',
        presetIds: ['game'],
      })
    );
  });

  it('forwards the raw request cookie header to queued batch capture jobs', async () => {
    startKangurSocialImageAddonsBatchJobMock.mockResolvedValueOnce({
      id: 'social-batch-job-1',
      runId: 'social-batch-run-1',
      status: 'queued',
      createdAt: '2026-03-29T20:00:00.000Z',
      updatedAt: '2026-03-29T20:00:00.000Z',
      progress: {
        completedCount: 0,
        failedCount: 0,
        totalCount: 1,
      },
      requestedBy: 'admin-1',
      input: {
        baseUrl: 'https://kangur.app',
        appearanceMode: 'light',
        createdBy: 'admin-1',
        forwardCookies:
          '__Host-next-auth.csrf-token=csrf123; __Secure-next-auth.session-token=session456',
        presetIds: ['game'],
        presetLimit: null,
      },
      result: null,
      error: null,
    });

    const url = 'http://localhost/api/kangur/social-image-addons/batch';
    const request = Object.assign(
      new Request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie:
            '__Host-next-auth.csrf-token=csrf123; __Secure-next-auth.session-token=session456',
        },
        body: JSON.stringify({
          async: true,
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

    expect(response.status).toBe(202);
    expect(payload).toEqual(
      expect.objectContaining({
        id: 'social-batch-job-1',
        status: 'queued',
      })
    );
    expect(startKangurSocialImageAddonsBatchJobMock).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: 'https://kangur.app',
        createdBy: 'admin-1',
        forwardCookies:
          '__Host-next-auth.csrf-token=csrf123; __Secure-next-auth.session-token=session456',
        presetIds: ['game'],
      })
    );
  });
});
