'use client';

import { StarIcon } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { buildAdminNav } from '@/features/admin/components/admin-menu-nav';
import { flattenAdminNav } from '@/features/admin/components/menu/admin-menu-utils';
import {
  ADMIN_MENU_FAVORITES_KEY,
  parseAdminMenuJson,
} from '@/features/admin/constants/admin-menu-settings';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import { api } from '@/shared/lib/api-client';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { cn } from '@/shared/utils';

import { Button } from './button';
import { useOptionalToast } from './toast';

export type AdminFavoriteBreadcrumbRowProps = {
  itemId?: string;
  itemLabel?: string;
  children: React.ReactNode;
  className?: string;
};

type AdminFavoriteCandidate = {
  id: string;
  label: string;
};

const normalizeFavoriteIds = (value: string | undefined): string[] => {
  const parsed = parseAdminMenuJson<unknown[]>(value, []);
  return parsed.filter(
    (entry: unknown): entry is string => typeof entry === 'string' && entry.length > 0
  );
};

const ADMIN_MENU_FAVORITE_CANDIDATES = flattenAdminNav(
  buildAdminNav({
    onOpenChat: (event: React.MouseEvent<HTMLAnchorElement>): void => {
      event.preventDefault();
    },
    onCreatePageClick: (): void => {
      // no-op
    },
  })
);

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

const resolveAdminFavoriteCandidate = ({
  pathname,
  searchParams,
}: {
  pathname: string | null;
  searchParams: URLSearchParams;
}): AdminFavoriteCandidate | null => {
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

  for (const entry of ADMIN_MENU_FAVORITE_CANDIDATES) {
    const href = entry.href?.trim();
    if (!href) continue;

    const { pathname: candidatePathname, searchParams: candidateSearchParams } = buildHrefParts(href);
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
};

export function AdminFavoriteBreadcrumbRow({
  itemId,
  itemLabel,
  children,
  className,
}: AdminFavoriteBreadcrumbRowProps): React.JSX.Element {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settingsStore = useSettingsStore();
  const { toast } = useOptionalToast();
  const resolvedCandidate = React.useMemo(
    () =>
      itemId
        ? {
            id: itemId,
            label: itemLabel?.trim() || 'Page',
          }
        : resolveAdminFavoriteCandidate({
            pathname,
            searchParams: new URLSearchParams(searchParams?.toString() ?? ''),
          }),
    [itemId, itemLabel, pathname, searchParams]
  );
  const storedFavoriteIds = React.useMemo(
    () => normalizeFavoriteIds(settingsStore.get(ADMIN_MENU_FAVORITES_KEY)),
    [settingsStore.map]
  );
  const [optimisticFavoriteIds, setOptimisticFavoriteIds] = React.useState<string[] | null>(null);
  const storedFavoriteIdsKey = React.useMemo(
    () => storedFavoriteIds.join('\u0000'),
    [storedFavoriteIds]
  );

  React.useEffect(() => {
    setOptimisticFavoriteIds(null);
  }, [storedFavoriteIdsKey]);

  const favoriteIds = optimisticFavoriteIds ?? storedFavoriteIds;
  const resolvedItemId = resolvedCandidate?.id ?? null;
  const targetLabel = resolvedCandidate?.label ?? 'Page';
  const isFavorite = resolvedItemId ? favoriteIds.includes(resolvedItemId) : false;
  const buttonLabel = isFavorite
    ? `Remove ${targetLabel} from admin favorites`
    : `Add ${targetLabel} to admin favorites`;

  const handleToggle = React.useCallback(async (): Promise<void> => {
    if (!resolvedItemId) return;

    const nextFavoriteIds = isFavorite
      ? favoriteIds.filter((favoriteId: string) => favoriteId !== resolvedItemId)
      : Array.from(new Set([...favoriteIds, resolvedItemId]));

    setOptimisticFavoriteIds(nextFavoriteIds);

    try {
      await api.post('/api/settings', {
        key: ADMIN_MENU_FAVORITES_KEY,
        value: JSON.stringify(nextFavoriteIds),
      });
      invalidateSettingsCache();
      settingsStore.refetch();
      toast(`${targetLabel} ${isFavorite ? 'removed from' : 'added to'} admin favorites.`, {
        variant: 'success',
      });
    } catch (error) {
      setOptimisticFavoriteIds(null);
      toast(error instanceof Error ? error.message : 'Failed to update admin favorites.', {
        variant: 'error',
      });
    }
  }, [favoriteIds, isFavorite, resolvedItemId, settingsStore, targetLabel, toast]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {resolvedItemId ? (
        <Button
          type='button'
          variant='ghost'
          size='xs'
          className={cn(
            'h-5 w-5 rounded-full p-0 transition-colors',
            isFavorite
              ? 'text-amber-300 hover:text-amber-200'
              : 'text-gray-500 hover:text-amber-300'
          )}
          aria-label={buttonLabel}
          aria-pressed={isFavorite}
          title={buttonLabel}
          onClick={() => {
            void handleToggle();
          }}
        >
          <StarIcon className={cn('size-3.5', isFavorite ? 'fill-current' : undefined)} />
        </Button>
      ) : null}
      {children}
    </div>
  );
}
