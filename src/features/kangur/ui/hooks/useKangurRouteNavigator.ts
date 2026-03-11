'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useMemo } from 'react';

import {
  KANGUR_BASE_PATH,
  normalizeKangurBasePath,
  resolveKangurPageKeyFromSlug,
} from '@/features/kangur/config/routing';
import { useOptionalKangurRouteTransitionActions } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';

type KangurRouteNavigationOptions = {
  pageKey?: string | null;
  scroll?: boolean;
};

const isManagedLocalHref = (href: string): boolean => href.startsWith('/') && !href.startsWith('//');

const getSlugFromPathname = (
  pathname: string | null,
  normalizedBasePath: string
): string[] => {
  const resolvedPathname = pathname?.trim() || normalizedBasePath;
  const withoutQuery = resolvedPathname.split('?')[0] ?? resolvedPathname;
  const normalizedPathname = withoutQuery.replace(/\/+$/, '') || '/';

  if (normalizedBasePath === '/') {
    return normalizedPathname
      .split('/')
      .map((segment) => segment.trim())
      .filter(Boolean);
  }

  if (
    normalizedPathname === normalizedBasePath ||
    normalizedPathname === `${normalizedBasePath}/`
  ) {
    return [];
  }

  if (!normalizedPathname.startsWith(`${normalizedBasePath}/`)) {
    return [];
  }

  return normalizedPathname
    .slice(normalizedBasePath.length + 1)
    .split('/')
    .map((segment) => segment.trim())
    .filter(Boolean);
};

const resolveManagedPageKeyFromHref = (href: string, basePath: string): string | null => {
  if (!isManagedLocalHref(href)) {
    return null;
  }

  try {
    const parsed = new URL(href, 'https://kangur.local');
    const normalizedBasePath = normalizeKangurBasePath(basePath);

    if (
      normalizedBasePath !== '/' &&
      parsed.pathname !== normalizedBasePath &&
      !parsed.pathname.startsWith(`${normalizedBasePath}/`)
    ) {
      return null;
    }

    const slug = getSlugFromPathname(parsed.pathname, normalizedBasePath);
    return resolveKangurPageKeyFromSlug(slug[0] ?? null);
  } catch {
    return null;
  }
};

export function useKangurRouteNavigator(): {
  prefetch: (href: string) => void;
  push: (href: string, options?: KangurRouteNavigationOptions) => void;
  replace: (href: string, options?: KangurRouteNavigationOptions) => void;
} {
  const router = useRouter();
  const routeTransitionActions = useOptionalKangurRouteTransitionActions();
  const routing = useOptionalKangurRouting();
  const basePath = routing?.basePath ?? KANGUR_BASE_PATH;

  const startManagedTransition = useCallback(
    (href: string, pageKey?: string | null): void => {
      if (!routeTransitionActions || !isManagedLocalHref(href)) {
        return;
      }

      routeTransitionActions.startRouteTransition({
        href,
        pageKey: pageKey ?? resolveManagedPageKeyFromHref(href, basePath),
      });
    },
    [basePath, routeTransitionActions]
  );

  const prefetch = useCallback(
    (href: string): void => {
      if (!isManagedLocalHref(href) || typeof router.prefetch !== 'function') {
        return;
      }

      router.prefetch(href);
    },
    [router]
  );

  const push = useCallback(
    (href: string, options: KangurRouteNavigationOptions = {}): void => {
      startManagedTransition(href, options.pageKey);
      router.push(href, {
        scroll: options.scroll ?? false,
      });
    },
    [router, startManagedTransition]
  );

  const replace = useCallback(
    (href: string, options: KangurRouteNavigationOptions = {}): void => {
      startManagedTransition(href, options.pageKey);
      router.replace(href, {
        scroll: options.scroll ?? false,
      });
    },
    [router, startManagedTransition]
  );

  return useMemo(
    () => ({
      prefetch,
      push,
      replace,
    }),
    [prefetch, push, replace]
  );
}
