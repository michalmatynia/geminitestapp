import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  resolveSocialPublishingActorMock,
  listSocialPublishingImageAddonsMock,
  findSocialPublishingImageAddonsByIdsMock,
  createSocialPublishingImageAddonFromPlaywrightMock,
  captureExceptionMock,
  logSocialPublishingServerEventMock,
} = vi.hoisted(() => ({
  resolveSocialPublishingActorMock: vi.fn(),
  listSocialPublishingImageAddonsMock: vi.fn(),
  findSocialPublishingImageAddonsByIdsMock: vi.fn(),
  createSocialPublishingImageAddonFromPlaywrightMock: vi.fn(),
  captureExceptionMock: vi.fn(),
  logSocialPublishingServerEventMock: vi.fn(),
}));

vi.mock('@/features/filemaker/social/server/social-publishing-actor', () => ({
  resolveSocialPublishingActor: (...args: unknown[]) => resolveSocialPublishingActorMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-image-addons-repository', () => ({
  listSocialPublishingImageAddons: (...args: unknown[]) => listSocialPublishingImageAddonsMock(...args),
  findSocialPublishingImageAddonsByIds: (...args: unknown[]) =>
    findSocialPublishingImageAddonsByIdsMock(...args),
}));

vi.mock('@/features/filemaker/social/server/social-image-addons-service', () => ({
  createSocialPublishingImageAddonFromPlaywright: (...args: unknown[]) =>
    createSocialPublishingImageAddonFromPlaywrightMock(...args),
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

import { getSocialPublishingImageAddonsHandler, postSocialPublishingImageAddonsHandler } from './handler';

const wrappedGetHandler = apiHandler(getSocialPublishingImageAddonsHandler, {
  source: 'social-publishing.image-addons.GET',
  service: 'filemaker.social-publishing.api',
});
const wrappedPostHandler = apiHandler(postSocialPublishingImageAddonsHandler, {
  source: 'social-publishing.image-addons.POST',
  service: 'filemaker.social-publishing.api',
  parseJsonBody: true,
});

describe('getSocialPublishingImageAddonsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSocialPublishingActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('returns the selected add-ons first even when they are older than the recent list window', async () => {
    listSocialPublishingImageAddonsMock.mockResolvedValue([
      { id: 'addon-recent-2', title: 'Recent 2' },
      { id: 'addon-recent-1', title: 'Recent 1' },
    ]);
    findSocialPublishingImageAddonsByIdsMock.mockResolvedValue([
      { id: 'addon-old', title: 'Old selected' },
      { id: 'addon-recent-2', title: 'Recent 2' },
    ]);

    const url = 'http://localhost/api/filemaker/social-image-addons?ids=addon-old,addon-recent-2&limit=2';
    const request = Object.assign(
      new Request(url, { method: 'GET' }),
      {
        nextUrl: new URL(url),
      }
    ) as Parameters<typeof wrappedGetHandler>[0];

    const response = await wrappedGetHandler(request);
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(listSocialPublishingImageAddonsMock).toHaveBeenCalledWith(2);
    expect(findSocialPublishingImageAddonsByIdsMock).toHaveBeenCalledWith([
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

describe('postSocialPublishingImageAddonsHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveSocialPublishingActorMock.mockResolvedValue({
      actorId: 'admin-1',
      role: 'admin',
    });
  });

  it('forwards the raw request cookie header to single Playwright capture', async () => {
    createSocialPublishingImageAddonFromPlaywrightMock.mockResolvedValueOnce({
      id: 'addon-1',
      title: 'Hero image',
      description: 'Captured hero image',
      image: {
        id: 'file-1',
        filename: 'hero.png',
        filepath: '/uploads/filemaker/social-addons/hero.png',
        url: '/uploads/filemaker/social-addons/hero.png',
        width: 1200,
        height: 630,
      },
      sourceUrl: 'https://kangur.app',
      sourceHost: 'kangur.app',
      createdAt: '2026-03-29T20:00:00.000Z',
      updatedAt: '2026-03-29T20:00:00.000Z',
      createdBy: 'admin-1',
    });

    const url = 'http://localhost/api/filemaker/social-image-addons';
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
    expect(createSocialPublishingImageAddonFromPlaywrightMock).toHaveBeenCalledWith(
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
    createSocialPublishingImageAddonFromPlaywrightMock.mockResolvedValueOnce({
      id: 'addon-2',
      title: 'Local hero image',
      description: '',
      image: {
        id: 'file-2',
        filename: 'hero-local.png',
        filepath: '/uploads/filemaker/social-addons/hero-local.png',
        url: '/uploads/filemaker/social-addons/hero-local.png',
        width: 1200,
        height: 630,
      },
      sourceUrl: 'http://localhost:3000/en/kangur/tests',
      sourceHost: 'localhost:3000',
      createdAt: '2026-03-30T00:00:00.000Z',
      updatedAt: '2026-03-30T00:00:00.000Z',
      createdBy: 'admin-1',
    });

    const url = 'http://127.0.0.1:3000/api/filemaker/social-image-addons';
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
    expect(createSocialPublishingImageAddonFromPlaywrightMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trustedSelfOriginHost: 'localhost:3000',
      })
    );
  });

  it('passes a trusted self origin host for bracketed IPv6 loopback aliases', async () => {
    createSocialPublishingImageAddonFromPlaywrightMock.mockResolvedValueOnce({
      id: 'addon-ipv6',
      title: 'Local hero image',
      description: '',
      image: {
        id: 'file-ipv6',
        filename: 'hero-local-ipv6.png',
        filepath: '/uploads/filemaker/social-addons/hero-local-ipv6.png',
        url: '/uploads/filemaker/social-addons/hero-local-ipv6.png',
        width: 1200,
        height: 630,
      },
      sourceUrl: 'http://[::1]:3000/en/kangur/tests',
      sourceHost: '[::1]:3000',
      createdAt: '2026-03-30T00:00:00.000Z',
      updatedAt: '2026-03-30T00:00:00.000Z',
      createdBy: 'admin-1',
    });

    const url = 'http://localhost:3000/api/filemaker/social-image-addons';
    const request = Object.assign(
      new Request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Local hero image',
          sourceUrl: 'http://[::1]:3000/en/kangur/tests',
        }),
      }),
      {
        nextUrl: new URL(url),
      }
    ) as Parameters<typeof wrappedPostHandler>[0];

    const response = await wrappedPostHandler(request);

    expect(response.status).toBe(200);
    expect(createSocialPublishingImageAddonFromPlaywrightMock).toHaveBeenCalledWith(
      expect.objectContaining({
        trustedSelfOriginHost: '[::1]:3000',
      })
    );
  });

  it('captures create failures for single Playwright add-ons', async () => {
    createSocialPublishingImageAddonFromPlaywrightMock.mockRejectedValueOnce(
      operationFailedError('Browser crashed.')
    );

    const url = 'http://localhost/api/filemaker/social-image-addons';
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
