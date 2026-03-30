import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveKangurActorMock,
  listKangurSocialImageAddonsMock,
  findKangurSocialImageAddonsByIdsMock,
  createKangurSocialImageAddonFromPlaywrightMock,
  captureExceptionMock,
  logKangurServerEventMock,
} = vi.hoisted(() => ({
  resolveKangurActorMock: vi.fn(),
  listKangurSocialImageAddonsMock: vi.fn(),
  findKangurSocialImageAddonsByIdsMock: vi.fn(),
  createKangurSocialImageAddonFromPlaywrightMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logKangurServerEventMock: vi.fn(),
}));

vi.mock('@/features/kangur/services/kangur-actor', () => ({
  resolveKangurActor: (...args: unknown[]) => resolveKangurActorMock(...args),
}));

vi.mock('@/features/kangur/social/server/social-image-addons-repository', () => ({
  listKangurSocialImageAddons: (...args: unknown[]) => listKangurSocialImageAddonsMock(...args),
  findKangurSocialImageAddonsByIds: (...args: unknown[]) =>
    findKangurSocialImageAddonsByIdsMock(...args),
}));

vi.mock('@/features/kangur/social/server/social-image-addons-service', () => ({
  createKangurSocialImageAddonFromPlaywright: (...args: unknown[]) =>
    createKangurSocialImageAddonFromPlaywrightMock(...args),
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

import { getKangurSocialImageAddonsHandler, postKangurSocialImageAddonsHandler } from './handler';

const wrappedGetHandler = apiHandler(getKangurSocialImageAddonsHandler, {
  source: 'kangur.social-image-addons.GET',
  service: 'kangur.api',
});
const wrappedPostHandler = apiHandler(postKangurSocialImageAddonsHandler, {
  source: 'kangur.social-image-addons.POST',
  service: 'kangur.api',
  parseJsonBody: true,
});

describe('getKangurSocialImageAddonsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveKangurActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('returns the selected add-ons first even when they are older than the recent list window', async () => {
    listKangurSocialImageAddonsMock.mockResolvedValue([
      { id: 'addon-recent-2', title: 'Recent 2' },
      { id: 'addon-recent-1', title: 'Recent 1' },
    ]);
    findKangurSocialImageAddonsByIdsMock.mockResolvedValue([
      { id: 'addon-old', title: 'Old selected' },
      { id: 'addon-recent-2', title: 'Recent 2' },
    ]);

    const url = 'http://localhost/api/kangur/social-image-addons?ids=addon-old,addon-recent-2&limit=2';
    const request = Object.assign(
      new Request(url, { method: 'GET' }),
      {
        nextUrl: new URL(url),
      }
    ) as Parameters<typeof wrappedGetHandler>[0];

    const response = await wrappedGetHandler(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listKangurSocialImageAddonsMock).toHaveBeenCalledWith(2);
    expect(findKangurSocialImageAddonsByIdsMock).toHaveBeenCalledWith([
      'addon-old',
      'addon-recent-2',
    ]);
    expect(payload.map((addon: { id: string }) => addon.id)).toEqual([
      'addon-old',
      'addon-recent-2',
      'addon-recent-1',
    ]);
  });
});

describe('postKangurSocialImageAddonsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveKangurActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('forwards the raw request cookie header to single Playwright capture', async () => {
    createKangurSocialImageAddonFromPlaywrightMock.mockResolvedValueOnce({
      id: 'addon-1',
      title: 'Hero image',
      description: 'Captured hero image',
      image: {
        id: 'file-1',
        filename: 'hero.png',
        filepath: '/uploads/kangur/social-addons/hero.png',
        url: '/uploads/kangur/social-addons/hero.png',
        width: 1200,
        height: 630,
      },
      sourceUrl: 'https://kangur.app',
      sourceHost: 'kangur.app',
      createdAt: '2026-03-29T20:00:00.000Z',
      updatedAt: '2026-03-29T20:00:00.000Z',
      createdBy: 'admin-1',
    });

    const url = 'http://localhost/api/kangur/social-image-addons';
    const request = Object.assign(
      new Request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          cookie:
            '__Host-next-auth.csrf-token=csrf123; __Secure-next-auth.session-token=session456',
        },
        body: JSON.stringify({
          title: 'Hero image',
          sourceUrl: 'https://kangur.app',
        }),
      }),
      {
        nextUrl: new URL(url),
      }
    ) as Parameters<typeof wrappedPostHandler>[0];

    const response = await wrappedPostHandler(request);

    expect(response.status).toBe(200);
    expect(createKangurSocialImageAddonFromPlaywrightMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Hero image',
        sourceUrl: 'https://kangur.app',
        createdBy: 'admin-1',
        forwardCookies:
          '__Host-next-auth.csrf-token=csrf123; __Secure-next-auth.session-token=session456',
      })
    );
  });

  it('passes a trusted self origin host when the source URL matches the request host or loopback alias', async () => {
    createKangurSocialImageAddonFromPlaywrightMock.mockResolvedValueOnce({
      id: 'addon-2',
      title: 'Local hero image',
      description: '',
      image: {
        id: 'file-2',
        filename: 'hero-local.png',
        filepath: '/uploads/kangur/social-addons/hero-local.png',
        url: '/uploads/kangur/social-addons/hero-local.png',
        width: 1200,
        height: 630,
      },
      sourceUrl: 'http://localhost:3000/en/kangur/tests',
      sourceHost: 'localhost:3000',
      createdAt: '2026-03-30T00:00:00.000Z',
      updatedAt: '2026-03-30T00:00:00.000Z',
      createdBy: 'admin-1',
    });

    const url = 'http://127.0.0.1:3000/api/kangur/social-image-addons';
    const request = Object.assign(
      new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Local hero image',
          sourceUrl: 'http://localhost:3000/en/kangur/tests',
        }),
      }),
      {
        nextUrl: new URL(url),
      }
    ) as Parameters<typeof wrappedPostHandler>[0];

    const response = await wrappedPostHandler(request);

    expect(response.status).toBe(200);
    expect(createKangurSocialImageAddonFromPlaywrightMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trustedSelfOriginHost: 'localhost:3000',
      })
    );
  });

  it('captures create failures for single Playwright add-ons', async () => {
    createKangurSocialImageAddonFromPlaywrightMock.mockRejectedValueOnce(
      operationFailedError('Browser crashed.')
    );

    const url = 'http://localhost/api/kangur/social-image-addons';
    const request = Object.assign(
      new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Hero image',
          sourceUrl: 'https://kangur.app',
          selector: '[data-testid="hero"]',
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
        action: 'apiCreate',
        hasSelector: true,
        sourceHost: 'kangur.app',
      })
    );
  });
});
