/**
 * @vitest-environment node
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CmsRepository, Slug } from '@/shared/contracts/cms';

vi.mock('server-only', () => ({}));

vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react')>();
  return {
    ...actual,
    cache: <T extends (...args: never[]) => unknown>(fn: T): T => fn,
  };
});

const { getMongoDbMock, captureExceptionMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: captureExceptionMock,
  },
}));

describe('cms-domain', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.unmock('./cms-domain-settings');
    process.env['MONGODB_URI'] = 'mongodb://localhost:27017/test';
    delete process.env['NEXT_PUBLIC_APP_URL'];
    delete process.env['NEXTAUTH_URL'];
  });

  it('falls back to the default domain when transient mongo timeouts block zoning settings', async () => {
    const error = new Error('connection <monitor> to 40.113.121.153:27017 timed out');
    error.name = 'MongoServerSelectionError';
    getMongoDbMock.mockRejectedValue(error);

    const { resolveCmsDomainByHost } = await import('./cms-domain');

    await expect(resolveCmsDomainByHost('Example.com:3000')).resolves.toEqual(
      expect.objectContaining({
        id: 'default-domain',
        domain: 'example.com',
      })
    );
    expect(getMongoDbMock).toHaveBeenCalledTimes(1);
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it('captures unexpected zoning-setting failures and disables zoning for the request', async () => {
    const error = new Error('cms domain settings payload is invalid');
    getMongoDbMock.mockRejectedValue(error);

    const { isDomainZoningEnabled } = await import('./cms-domain');

    await expect(isDomainZoningEnabled()).resolves.toBe(false);
    expect(captureExceptionMock).toHaveBeenCalledWith(error, {
      service: 'cms.domain',
      source: 'cms.domain',
      action: 'isDomainZoningEnabled',
    });
  });

  it('does not open mongo for host resolution when zoning is disabled in settings', async () => {
    vi.doMock('./cms-domain-settings', () => ({
      getCmsDomainSettings: vi.fn().mockResolvedValue({ zoningEnabled: false }),
    }));

    const { resolveCmsDomainByHost } = await import('./cms-domain');

    await expect(resolveCmsDomainByHost('Docs.Example.com')).resolves.toEqual(
      expect.objectContaining({
        id: 'default-domain',
        domain: 'docs.example.com',
      })
    );
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('falls back to repository slugs without opening mongo when zoning is disabled', async () => {
    vi.doMock('./cms-domain-settings', () => ({
      getCmsDomainSettings: vi.fn().mockResolvedValue({ zoningEnabled: false }),
    }));

    const expectedSlugs: Slug[] = [
      {
        id: 'slug-1',
        slug: 'home',
        pageId: 'page-1',
        locale: 'pl',
        translationGroupId: null,
        createdAt: '2026-03-29T17:00:00.000Z',
        updatedAt: '2026-03-29T17:00:00.000Z',
        isDefault: true,
      },
    ];
    const repo = {
      getSlugs: vi.fn().mockResolvedValue(expectedSlugs),
      getSlugsByIds: vi.fn(),
    } as unknown as CmsRepository;

    const { getSlugsForDomain } = await import('./cms-domain');

    await expect(getSlugsForDomain('default-domain', repo)).resolves.toEqual(expectedSlugs);
    expect(repo.getSlugs).toHaveBeenCalledWith(undefined);
    expect(repo.getSlugsByIds).not.toHaveBeenCalled();
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });
});
