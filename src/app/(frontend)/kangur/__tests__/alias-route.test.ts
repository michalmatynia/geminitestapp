import React, { Suspense } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  notFoundMock,
  redirectMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  permanentRedirect: redirectMock,
  redirect: redirectMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  notFound: notFoundMock,
  permanentRedirect: redirectMock,
  redirect: redirectMock,
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
  readOptionalServerAuthSession: authMock,
}));

describe('kangur alias route', () => {
  const expectSuspenseShell = (value: unknown) => {
    expect(React.isValidElement(value)).toBe(true);
    expect((value as React.ReactElement).type).toBe(Suspense);
  };

  const resolveSuspenseChild = async (value: unknown) => {
    expectSuspenseShell(value);
    const child = (value as React.ReactElement).props.children as React.ReactElement;
    expect(React.isValidElement(child)).toBe(true);
    return child.type(child.props);
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    redirectMock.mockImplementation((href: string) => {
      throw new Error(`redirect:${href}`);
    });
    notFoundMock.mockImplementation(() => {
      throw new Error('notFound');
    });
    authMock.mockResolvedValue(null);
  });

  it(
    'resolves the explicit kangur alias route without resolving launch redirects',
    async () => {
      const { default: KangurAliasPage } = await import(
        '@/app/(frontend)/kangur/(app)/[...slug]/page'
      );

      const result = KangurAliasPage({
        params: Promise.resolve({ slug: ['lessons'] }),
        searchParams: Promise.resolve({ focus: 'division' }),
      } as never);
      const guardedResult = await resolveSuspenseChild(await resolveSuspenseChild(result));

      expectSuspenseShell(result);
      expect(guardedResult).toBeNull();

      expect(redirectMock).not.toHaveBeenCalled();
    },
    60_000
  );

  it('resolves the explicit hot kangur alias pages without per-route shell markup', async () => {
    const [
      { default: KangurAliasHomePage },
      { default: KangurAliasLessonsPage },
      { default: KangurAliasDuelsPage },
      { default: KangurAliasTestsPage },
    ] = await Promise.all([
      import('@/app/(frontend)/kangur/(app)/page'),
      import('@/app/(frontend)/kangur/(app)/lessons/page'),
      import('@/app/(frontend)/kangur/(app)/duels/page'),
      import('@/app/(frontend)/kangur/(app)/tests/page'),
    ]);

    expectSuspenseShell(KangurAliasHomePage());
    expectSuspenseShell(KangurAliasLessonsPage());
    expectSuspenseShell(KangurAliasDuelsPage());
    expectSuspenseShell(KangurAliasTestsPage());
    await expect(resolveSuspenseChild(KangurAliasHomePage())).resolves.toBeNull();
    await expect(resolveSuspenseChild(KangurAliasLessonsPage())).resolves.toBeNull();
    await expect(resolveSuspenseChild(KangurAliasDuelsPage())).resolves.toBeNull();
    await expect(resolveSuspenseChild(KangurAliasTestsPage())).resolves.toBeNull();

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('does not redirect blocked games aliases to the canonical public route for non-super-admin users', async () => {
    const { default: KangurAliasPage } = await import('@/app/(frontend)/kangur/(app)/[...slug]/page');

    await expect(
      resolveSuspenseChild(
        await resolveSuspenseChild(
          KangurAliasPage({
            params: Promise.resolve({ slug: ['games'] }),
            searchParams: Promise.resolve({ tab: 'runtime' }),
          } as never)
        )
      )
    ).rejects.toThrow('notFound');

    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it('resolves games aliases for exact super admins when Kangur owns home', async () => {
    authMock.mockResolvedValue({
      user: {
        role: 'super_admin',
      },
    });

    const { default: KangurAliasPage } = await import('@/app/(frontend)/kangur/(app)/[...slug]/page');

    const result = KangurAliasPage({
      params: Promise.resolve({ slug: ['games'] }),
    } as never);
    const guardedResult = await resolveSuspenseChild(await resolveSuspenseChild(result));

    expectSuspenseShell(result);
    expect(guardedResult).toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('resolves the localized explicit kangur alias route without redirecting', async () => {
    const { default: LocalizedKangurAliasPage } = await import(
      '@/app/[locale]/(frontend)/kangur/(app)/[...slug]/page'
    );

    const result = LocalizedKangurAliasPage({
      params: Promise.resolve({ locale: 'pl', slug: ['lessons'] }),
      searchParams: Promise.resolve({ focus: 'division' }),
    } as never);
    const guardedResult = await resolveSuspenseChild(await resolveSuspenseChild(result));

    expectSuspenseShell(result);
    expect(guardedResult).toBeNull();

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('resolves the localized explicit hot kangur alias pages without per-route shell markup', async () => {
    const [
      { default: LocalizedKangurAliasHomePage },
      { default: LocalizedKangurAliasLessonsPage },
      { default: LocalizedKangurAliasDuelsPage },
      { default: LocalizedKangurAliasTestsPage },
    ] = await Promise.all([
      import('@/app/[locale]/(frontend)/kangur/(app)/page'),
      import('@/app/[locale]/(frontend)/kangur/(app)/lessons/page'),
      import('@/app/[locale]/(frontend)/kangur/(app)/duels/page'),
      import('@/app/[locale]/(frontend)/kangur/(app)/tests/page'),
    ]);

    expectSuspenseShell(LocalizedKangurAliasHomePage());
    expectSuspenseShell(LocalizedKangurAliasLessonsPage());
    expectSuspenseShell(LocalizedKangurAliasDuelsPage());
    expectSuspenseShell(LocalizedKangurAliasTestsPage());
    await expect(resolveSuspenseChild(LocalizedKangurAliasHomePage())).resolves.toBeNull();
    await expect(resolveSuspenseChild(LocalizedKangurAliasLessonsPage())).resolves.toBeNull();
    await expect(resolveSuspenseChild(LocalizedKangurAliasDuelsPage())).resolves.toBeNull();
    await expect(resolveSuspenseChild(LocalizedKangurAliasTestsPage())).resolves.toBeNull();

    expect(redirectMock).not.toHaveBeenCalled();
  });

  it('does not render localized blocked games aliases for non-super-admin users', async () => {
    authMock.mockResolvedValue({
      user: {
        role: 'admin',
      },
    });

    const { default: LocalizedKangurAliasPage } = await import(
      '@/app/[locale]/(frontend)/kangur/(app)/[...slug]/page'
    );

    await expect(
      resolveSuspenseChild(
        await resolveSuspenseChild(
          LocalizedKangurAliasPage({
            params: Promise.resolve({ locale: 'pl', slug: ['games'] }),
          } as never)
        )
      )
    ).rejects.toThrow('notFound');

    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });
});
