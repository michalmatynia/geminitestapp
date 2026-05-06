import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getCmsRepositoryMock,
  resolveFrontPageSelectionMock,
  getSlugsForDomainMock,
  redirectMock,
  permanentRedirectMock,
  resolveCmsDomainFromHeadersMock,
} = vi.hoisted(() => ({
  getCmsRepositoryMock: vi.fn(),
  resolveFrontPageSelectionMock: vi.fn(),
  getSlugsForDomainMock: vi.fn(),
  redirectMock: vi.fn(),
  permanentRedirectMock: vi.fn(),
  resolveCmsDomainFromHeadersMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
  permanentRedirect: permanentRedirectMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  redirect: redirectMock,
  permanentRedirect: permanentRedirectMock,
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('next/server', () => ({
  connection: vi.fn(async () => undefined),
}));

vi.mock('@/features/cms/server', () => ({
  getCmsRepository: getCmsRepositoryMock,
  getSlugsForDomain: getSlugsForDomainMock,
  resolveCmsDomainFromHeaders: resolveCmsDomainFromHeadersMock,
}));

vi.mock('@/app/(frontend)/home/home-helpers', () => ({
  resolveFrontPageSelection: resolveFrontPageSelectionMock,
}));

describe('frontend home launch route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`redirect:${href}`);
    });
    resolveFrontPageSelectionMock.mockResolvedValue({
      enabled: true,
      setting: 'kangur',
      publicOwner: 'kangur',
      redirectPath: null,
      source: 'mongo',
      fallbackReason: null,
    });
  });

  it('mounts the StudiQ shell directly on the root home route when StudiQ owns home', async () => {
    const { default: Home } = await import('@/app/(frontend)/page');

    await expect(Home()).resolves.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(getCmsRepositoryMock).not.toHaveBeenCalled();
  });

  it('mounts the StudiQ shell directly on localized home routes when StudiQ owns home', async () => {
    const { default: LocalizedHome } = await import('@/app/[locale]/(frontend)/page');

    await expect(
      LocalizedHome({
        params: Promise.resolve({ locale: 'pl' }),
      })
    ).resolves.toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(getCmsRepositoryMock).not.toHaveBeenCalled();
  });
});
