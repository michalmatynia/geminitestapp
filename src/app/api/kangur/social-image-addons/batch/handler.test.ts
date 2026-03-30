import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveKangurActorMock,
  createKangurSocialImageAddonsBatchMock,
  listKangurSocialImageAddonsBatchJobsMock,
  startKangurSocialImageAddonsBatchJobMock,
  captureExceptionMock,
  logKangurServerEventMock,
} = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  createKangurSocialImageAddonsBatchMock: vi.fn(),
  listKangurSocialImageAddonsBatchJobsMock: vi.fn(),
  startKangurSocialImageAddonsBatchJobMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: (...args: unknown[]) => resolveKangurActorMock(...args),
}));

vi.mock('@/features/kangur/social/server/social-image-addons-batch', () => ({
  createKangurSocialImageAddonsBatch: (...args: unknown[]) =>
    createKangurSocialImageAddonsBatchMock(...args),
}));

vi.mock('@/features/kangur/social/server/social-image-addons-batch-jobs', () => ({
  listKangurSocialImageAddonsBatchJobs: (...args: unknown[]) =>
    listKangurSocialImageAddonsBatchJobsMock(...args),
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

import {
  getKangurSocialImageAddonsBatchHandler,
  postKangurSocialImageAddonsBatchHandler,
} from './handler';

const wrappedPostHandler = apiHandler(postKangurSocialImageAddonsBatchHandler, {
  source: 'kangur.social-image-addons.batch.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});
const wrappedGetHandler = apiHandler(getKangurSocialImageAddonsBatchHandler, {
  source: 'kangur.social-image-addons.batch.GET',
  service: 'kangur.api',
});

describe('getKangurSocialImageAddonsBatchHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveKangurActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('lists recent batch capture jobs when no job id is provided', async () => {
    listKangurSocialImageAddonsBatchJobsMock.mockResolvedValueOnce([
      {
        id: 'job-1',
        runId: 'run-1',
        status: 'completed',
        request: {
          baseUrl: 'https://example.com',
          presetIds: ['home'],
          presetLimit: null,
          appearanceMode: 'default',
          playwrightPersonaId: null,
          playwrightScript: null,
          playwrightRoutes: [],
        },
        progress: {
          processedCount: 1,
          completedCount: 1,
          failureCount: 0,
          remainingCount: 0,
          totalCount: 1,
        },
        result: {
          addons: [],
          failures: [],
          runId: 'run-1',
        },
        error: null,
        createdAt: '2026-03-30T10:00:00.000Z',
        updatedAt: '2026-03-30T10:05:00.000Z',
      },
    ]);

    const url = 'http://localhost/api/kangur/social-image-addons/batch?limit=3';
    const request = Object.assign(new Request(url), {
      nextUrl: new URL(url),
    }) as Parameters<typeof wrappedGetHandler>[0];

    const response = await wrappedGetHandler(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual([
      expect.objectContaining({
        id: 'job-1',
        runId: 'run-1',
      }),
    ]);
    expect(listKangurSocialImageAddonsBatchJobsMock).toHaveBeenCalledWith({
      limit: 3,
    });
  });
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

  it('passes a trusted self origin host when the batch base URL matches the request host or loopback alias', async () => {
    createKangurSocialImageAddonsBatchMock.mockResolvedValueOnce({
      runId: 'social-batch-run-local',
      addons: [],
      failures: [],
      totals: {
        completed: 0,
        failed: 0,
        total: 0,
      },
    });

    const url = 'http://127.0.0.1:3000/api/kangur/social-image-addons/batch';
    const request = Object.assign(
      new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: 'http://localhost:3000',
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
        trustedSelfOriginHost: 'localhost:3000',
      })
    );
  });
});
