import { beforeEach, describe, expect, it, vi } from 'vitest';

const redirectMock = vi.fn();

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

describe('kangur alias route', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the explicit kangur alias route without resolving launch redirects', async () => {
    const { default: KangurAliasPage } = await import('@/app/(frontend)/kangur/(app)/[[...slug]]/page');

    await expect(
      KangurAliasPage({
        params: Promise.resolve({ slug: ['lessons'] }),
        searchParams: Promise.resolve({ focus: 'division' }),
      } as never)
    ).resolves.toBeNull();

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('renders the localized explicit kangur alias route without redirecting', async () => {
    const { default: LocalizedKangurAliasPage } = await import(
      '@/app/[locale]/(frontend)/kangur/(app)/[[...slug]]/page'
    );

    await expect(
      LocalizedKangurAliasPage({
        params: Promise.resolve({ locale: 'pl', slug: ['lessons'] }),
        searchParams: Promise.resolve({ focus: 'division' }),
      } as never)
    ).resolves.toBeNull();

    expect(redirectMock).not.toHaveBeenCalled();
  });
});
