import { beforeEach, describe, expect, it, vi } from 'vitest';

const { redirectMock } = vi.hoisted(() => ({
  redirectMock: vi.fn(() => {
    throw new Error('REDIRECT');
  }),
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('apps/studiq-web localized root page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects localized roots to the localized Kangur entry route', async () => {
    const { default: LocalizedRootPage } = await import('./page');

    await expect(
      LocalizedRootPage({
        params: Promise.resolve({ locale: 'en' }),
      })
    ).rejects.toThrow('REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith('/en/kangur');
  });

  it('preserves the incoming locale segment during redirect', async () => {
    const { default: LocalizedRootPage } = await import('./page');

    await expect(
      LocalizedRootPage({
        params: Promise.resolve({ locale: 'pl' }),
      })
    ).rejects.toThrow('REDIRECT');

    expect(redirectMock).toHaveBeenCalledWith('/pl/kangur');
  });
});
