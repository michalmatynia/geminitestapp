'use client';

import * as React from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  AdminFavoritesProvider,
  type AdminFavoriteCandidate,
} from '@/shared/providers/AdminFavoritesProvider';
import {
  buildAdminNav,
  flattenAdminNav,
  ADMIN_MENU_FAVORITES_KEY,
} from '../public';

const normalizePathname = (value: string | null | undefined): string => {
  if (!value) return '';
  if (value === '/') return '/';
  return value.endsWith('/') ? value.slice(0, -1) : value;
};

const buildHrefParts = (href: string): { pathname: string; searchParams: URLSearchParams } => {
  const [rawPathname, rawQuery = ''] = href.split('?');
  return {
    pathname: normalizePathname(rawPathname),
    searchParams: new URLSearchParams(rawQuery),
  };
};

const getUniqueQueryKeys = (searchParams: URLSearchParams): string[] =>
  Array.from(new Set(Array.from(searchParams.keys())));

const resolveQuerySpecificity = (
  currentSearchParams: URLSearchParams,
  candidateSearchParams: URLSearchParams
): number | null => {
  const keys = getUniqueQueryKeys(candidateSearchParams);
  for (const key of keys) {
    const candidateValues = candidateSearchParams.getAll(key);
    const currentValues = currentSearchParams.getAll(key);
    if (candidateValues.some((value: string) => !currentValues.includes(value))) {
      return null;
    }
  }
  return keys.length;
};

const resolvePathSpecificity = ({
  pathname,
  candidatePathname,
  exact,
}: {
  pathname: string;
  candidatePathname: string;
  exact?: boolean;
}): number | null => {
  if (pathname === candidatePathname) {
    return 4;
  }
  if (candidatePathname === '/admin' && pathname.startsWith('/admin/')) {
    return 1;
  }
  if (pathname.startsWith(`${candidatePathname}/`)) {
    return exact ? 2 : 3;
  }
  return null;
};

export function AdminFavoritesRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const candidates = React.useMemo(
    () =>
      flattenAdminNav(
        buildAdminNav({
          onOpenChat: (event: React.MouseEvent<HTMLAnchorElement>): void => {
            event.preventDefault();
          },
          onCreatePageClick: (): void => {
            // no-op
          },
        })
      ),
    []
  );

  const resolveCandidate = React.useCallback(
    (pathname: string | null, searchParams: URLSearchParams): AdminFavoriteCandidate | null => {
      const normalizedPathname = normalizePathname(pathname);
      if (!normalizedPathname.startsWith('/admin')) {
        return null;
      }

      let bestCandidate:
        | (AdminFavoriteCandidate & {
            pathSpecificity: number;
            querySpecificity: number;
            pathLength: number;
            hrefLength: number;
          })
        | null = null;

      for (const entry of candidates) {
        const href = entry.href?.trim();
        if (!href) continue;

        const { pathname: candidatePathname, searchParams: candidateSearchParams } =
          buildHrefParts(href);
        const pathSpecificity = resolvePathSpecificity({
          pathname: normalizedPathname,
          candidatePathname,
          exact: entry.item.exact,
        });
        if (pathSpecificity === null) continue;

        const querySpecificity = resolveQuerySpecificity(searchParams, candidateSearchParams);
        if (querySpecificity === null) continue;

        const nextCandidate = {
          id: entry.id,
          label: entry.label,
          pathSpecificity,
          querySpecificity,
          pathLength: candidatePathname.length,
          hrefLength: href.length,
        };

        if (
          !bestCandidate ||
          nextCandidate.pathSpecificity > bestCandidate.pathSpecificity ||
          (nextCandidate.pathSpecificity === bestCandidate.pathSpecificity &&
            nextCandidate.querySpecificity > bestCandidate.querySpecificity) ||
          (nextCandidate.pathSpecificity === bestCandidate.pathSpecificity &&
            nextCandidate.querySpecificity === bestCandidate.querySpecificity &&
            nextCandidate.pathLength > bestCandidate.pathLength) ||
          (nextCandidate.pathSpecificity === bestCandidate.pathSpecificity &&
            nextCandidate.querySpecificity === bestCandidate.querySpecificity &&
            nextCandidate.pathLength === bestCandidate.pathLength &&
            nextCandidate.hrefLength > bestCandidate.hrefLength)
        ) {
          bestCandidate = nextCandidate;
        }
      }

      return bestCandidate ? { id: bestCandidate.id, label: bestCandidate.label } : null;
    },
    [candidates]
  );

  const value = React.useMemo(
    () => ({
      favoritesKey: ADMIN_MENU_FAVORITES_KEY,
      candidates: candidates.map((c) => ({ id: c.id, label: c.label })),
      resolveCandidate,
    }),
    [candidates, resolveCandidate]
  );

  return <AdminFavoritesProvider value={value}>{children}</AdminFavoritesProvider>;
}
