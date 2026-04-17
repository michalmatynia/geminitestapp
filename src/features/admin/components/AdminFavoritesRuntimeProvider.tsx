'use client';

import * as React from 'react';
import {
  AdminFavoritesProvider,
  type AdminFavoriteCandidate,
} from '@/shared/providers/AdminFavoritesProvider';
import { ADMIN_MENU_FAVORITES_KEY } from '../constants/admin-menu-settings';
import { buildAdminNav } from './admin-menu-nav';
import { flattenAdminNav } from './menu/admin-menu-utils';

const normalizePathname = (value: string | null | undefined): string => {
  if (value === null || value === undefined || value === '') return '';
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
    return exact === true ? 2 : 3;
  }
  return null;
};

interface CandidateMatch {
  id: string;
  label: string;
  pathSpecificity: number;
  querySpecificity: number;
  pathLength: number;
  hrefLength: number;
}

const compareCandidates = (a: CandidateMatch, b: CandidateMatch): number => {
  if (a.pathSpecificity !== b.pathSpecificity) return a.pathSpecificity - b.pathSpecificity;
  if (a.querySpecificity !== b.querySpecificity) return a.querySpecificity - b.querySpecificity;
  if (a.pathLength !== b.pathLength) return a.pathLength - b.pathLength;
  return a.hrefLength - b.hrefLength;
};

const resolveMatch = (
  entry: ReturnType<typeof flattenAdminNav>[number],
  normalizedPathname: string,
  searchParams: URLSearchParams
): CandidateMatch | null => {
  const href = entry.href?.trim();
  if (href === undefined || href === '') return null;

  const { pathname: candidatePathname, searchParams: candidateSearchParams } =
    buildHrefParts(href);
  const pathSpecificity = resolvePathSpecificity({
    pathname: normalizedPathname,
    candidatePathname,
    exact: entry.item.exact,
  });
  if (pathSpecificity === null) return null;

  const querySpecificity = resolveQuerySpecificity(searchParams, candidateSearchParams);
  if (querySpecificity === null) return null;

  return {
    id: entry.id,
    label: entry.label,
    pathSpecificity,
    querySpecificity,
    pathLength: candidatePathname.length,
    hrefLength: href.length,
  };
};

const findBestCandidate = (
  candidates: ReturnType<typeof flattenAdminNav>,
  normalizedPathname: string,
  searchParams: URLSearchParams
): AdminFavoriteCandidate | null => {
  let best: CandidateMatch | null = null;

  for (const entry of candidates) {
    const match = resolveMatch(entry, normalizedPathname, searchParams);
    if (match !== null && (best === null || compareCandidates(match, best) > 0)) {
      best = match;
    }
  }

  return best !== null ? { id: best.id, label: best.label } : null;
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

      return findBestCandidate(candidates, normalizedPathname, searchParams);
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
