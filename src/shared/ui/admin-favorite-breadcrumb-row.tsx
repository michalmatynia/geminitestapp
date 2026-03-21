'use client';

import { StarIcon } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { invalidateSettingsCache } from '@/shared/api/settings-client';
import { api } from '@/shared/lib/api-client';
import { useAdminFavorites } from '@/shared/providers/AdminFavoritesProvider';
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

const normalizeFavoriteIds = (value: string | undefined): string[] => {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter(
          (entry: unknown): entry is string => typeof entry === 'string' && entry.length > 0
        )
      : [];
  } catch {
    return [];
  }
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
  const { favoritesKey, resolveCandidate } = useAdminFavorites();

  const resolvedCandidate = React.useMemo(
    () =>
      itemId
        ? {
            id: itemId,
            label: itemLabel?.trim() || 'Page',
          }
        : resolveCandidate(pathname, new URLSearchParams(searchParams?.toString() ?? '')),
    [itemId, itemLabel, pathname, searchParams, resolveCandidate]
  );

  const storedFavoriteIds = React.useMemo(
    () => (favoritesKey ? normalizeFavoriteIds(settingsStore.get(favoritesKey)) : []),
    [settingsStore.map, favoritesKey]
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
    if (!resolvedItemId || !favoritesKey) return;

    const nextFavoriteIds = isFavorite
      ? favoriteIds.filter((favoriteId: string) => favoriteId !== resolvedItemId)
      : Array.from(new Set([...favoriteIds, resolvedItemId]));

    setOptimisticFavoriteIds(nextFavoriteIds);

    try {
      await api.post('/api/settings', {
        key: favoritesKey,
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
  }, [favoriteIds, isFavorite, resolvedItemId, settingsStore, targetLabel, toast, favoritesKey]);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {resolvedItemId && favoritesKey ? (
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
