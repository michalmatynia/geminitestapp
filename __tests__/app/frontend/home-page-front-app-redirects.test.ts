import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  flushMock,
  frontPageAllowed,
  getCmsRepositoryMock,
  getFrontPageSettingMock,
  headersMock,
  homeContentMock,
  redirectMock,
  shouldUseFrontPageAppRedirectMock,
} = vi.hoisted(() => ({
  flushMock: vi.fn(),
  frontPageAllowed: new Set(['cms', 'products', 'kangur', 'chatbot', 'notes']),
  getCmsRepositoryMock: vi.fn(),
  getFrontPageSettingMock: vi.fn(),
  headersMock: vi.fn(),
  homeContentMock: vi.fn(),
  redirectMock: vi.fn(),
  shouldUseFrontPageAppRedirectMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

vi.mock('@/features/cms/server', () => ({
  getCmsRepository: getCmsRepositoryMock,
  getSlugsForDomain: vi.fn(),
  resolveCmsDomainFromHeaders: vi.fn(),
}));

vi.mock('@/app/(frontend)/HomeContent', () => ({
  HomeContent: homeContentMock,
}));

vi.mock('@/app/(frontend)/home-timing', () => ({
  createHomeTimingRecorder: () => ({
    withTiming: async (_label: string, fn: () => Promise<unknown>) => fn(),
    flush: flushMock,
  }),
}));

vi.mock('@/app/(frontend)/home-helpers', () => {
  return {
    FRONT_PAGE_ALLOWED: frontPageAllowed,
    getFrontPageSetting: getFrontPageSettingMock,
    shouldUseFrontPageAppRedirect: shouldUseFrontPageAppRedirectMock,
  };
});

import Home from '@/app/(frontend)/page';
import { KANGUR_BASE_PATH } from '@/features/kangur/config/routing';

describe('front page app redirects', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    getCmsRepositoryMock.mockResolvedValue({});
    getFrontPageSettingMock.mockResolvedValue('kangur');
    headersMock.mockResolvedValue(new Headers());
    flushMock.mockResolvedValue(undefined);
    homeContentMock.mockResolvedValue(null);
    shouldUseFrontPageAppRedirectMock.mockReturnValue(true);
    redirectMock.mockImplementation((target: string) => {
      throw new Error(`redirect:${target}`);
    });
  });

  it('redirects HOME to Kangur when configured', async () => {
    await expect(Home()).rejects.toThrow(`redirect:${KANGUR_BASE_PATH}`);

    expect(redirectMock).toHaveBeenCalledWith(KANGUR_BASE_PATH);
    expect(getCmsRepositoryMock).not.toHaveBeenCalled();
    expect(headersMock).not.toHaveBeenCalled();
    expect(homeContentMock).not.toHaveBeenCalled();
  });
});
