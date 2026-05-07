import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveSocialPublishingActorMock,
  createSocialPublishingImageAddonsBatchMock,
  listSocialPublishingImageAddonsBatchJobsMock,
  startSocialPublishingImageAddonsBatchJobMock,
  captureExceptionMock,
  logSocialPublishingServerEventMock,
} = vi.hoisted(() => ({
  resolveSocialPublishingActorMock: vi.fn(),
  createSocialPublishingImageAddonsBatchMock: vi.fn(),
  listSocialPublishingImageAddonsBatchJobsMock: vi.fn(),
  startSocialPublishingImageAddonsBatchJobMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logSocialPublishingServerEventMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-image-addons-batch', () => ({
  createSocialPublishingImageAddonsBatch: (...args: unknown[]) =>
    createSocialPublishingImageAddonsBatchMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-image-addons-batch-jobs', () => ({
  listSocialPublishingImageAddonsBatchJobs: (...args: unknown[]) =>
    listSocialPublishingImageAddonsBatchJobsMock(...args),
  readSocialPublishingImageAddonsBatchJob: vi.fn(),
  startSocialPublishingImageAddonsBatchJob: (...args: unknown[]) =>
    startSocialPublishingImageAddonsBatchJobMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-observability', () => ({
  logSocialPublishingServerEvent: (...args: unknown[]) => logSocialPublishingServerEventMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

import { apiHandler } from '@/shared/lib/api/api-handler';
import { operationFailedError } from '@/shared/errors/app-error';

import {
  getSocialPublishingImageAddonsBatchHandler,
  postSocialPublishingImageAddonsBatchHandler,
} from './handler';

const wrappedPostHandler = apiHandler(postSocialPublishingImageAddonsBatchHandler, {
  source: 'social-publishing.image-addons.batch.POST',
  service: 'filemaker.social-publishing.api',
  parseJsonBody: true,
});
const wrappedGetHandler = apiHandler(getSocialPublishingImageAddonsBatchHandler, {
  source: 'social-publishing.image-addons.batch.GET',
  service: 'filemaker.social-publishing.api',
});

describe('getSocialPublishingImageAddonsBatchHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSocialPublishingActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('lists recent batch capture jobs when no job id is provided', async () => {
    listSocialPublishingImageAddonsBatchJobsMock.mockResolvedValueOnce([
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

    const url = 'http://localhost/api/filemaker/social-image-addons/batch?limit=3';
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
    expect(listSocialPublishingImageAddonsBatchJobsMock).toHaveBeenCalledWith({
      limit: 3,
    });
  });
});

describe('postSocialPublishingImageAddonsBatchHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSocialPublishingActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('surfaces a specific batch capture failure message in the API response', async () => {
    createSocialPublishingImageAddonsBatchMock.mockRejectedValueOnce(
      operationFailedError('Browser crashed.')
    );

    const url = 'http://localhost/api/filemaker/social-image-addons/batch';
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
    createSocialPublishingImageAddonsBatchMock.mockResolvedValueOnce({
      runId: 'social-batch-run-1',
      addons: [],
      failures: [],
      totals: {
        completed: 0,
        failed: 0,
        total: 0,
      },
    });

    const url = 'http://localhost/api/filemaker/social-image-addons/batch';
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
    expect(createSocialPublishingImageAddonsBatchMock).toHaveBeenCalledWith(
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
    startSocialPublishingImageAddonsBatchJobMock.mockResolvedValueOnce({
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

    const url = 'http://localhost/api/filemaker/social-image-addons/batch';
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
    expect(startSocialPublishingImageAddonsBatchJobMock).toHaveBeenCalledWith(
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
    createSocialPublishingImageAddonsBatchMock.mockResolvedValueOnce({
      runId: 'social-batch-run-local',
      addons: [],
      failures: [],
      totals: {
        completed: 0,
        failed: 0,
        total: 0,
      },
    });

    const url = 'http://127.0.0.1:3000/api/filemaker/social-image-addons/batch';
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
    expect(createSocialPublishingImageAddonsBatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trustedSelfOriginHost: 'localhost:3000',
      })
    );
  });

  it('passes a trusted self origin host for bracketed IPv6 loopback aliases', async () => {
    createSocialPublishingImageAddonsBatchMock.mockResolvedValueOnce({
      runId: 'social-batch-run-ipv6',
      addons: [],
      failures: [],
      totals: {
        completed: 0,
        failed: 0,
        total: 0,
      },
    });

    const url = 'http://localhost:3000/api/filemaker/social-image-addons/batch';
    const request = Object.assign(
      new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          baseUrl: 'http://[::1]:3000',
          presetIds: ['game'],
        }),
      }),
      {
        nextUrl: new URL(url),
      }
    ) as Parameters<typeof wrappedPostHandler>[0];

    const response = await wrappedPostHandler(request);

    expect(response.status).toBe(200);
    expect(createSocialPublishingImageAddonsBatchMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trustedSelfOriginHost: '[::1]:3000',
      })
    );
  });
});
