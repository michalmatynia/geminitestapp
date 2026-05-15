'use client';

import { StarIcon } from 'lucide-react';
import { usePathname, useSearchParams } from 'next/navigation';
import * as React from 'react';

import { invalidateSettingsCache } from '@/shared/api/settings-client';
import type { DataAttributes } from '@/shared/contracts/ui/base';
import type { MutationResult } from '@/shared/contracts/ui/queries';
import { api } from '@/shared/lib/api-client';
import { useMutationV2 } from '@/shared/lib/query-factories-v2';
import {
  useAdminFavorites,
  type AdminFavoriteCandidate,
  type AdminFavoritesContextValue,
} from '@/shared/providers/AdminFavoritesProvider';
import { useSettingsStore, type SettingsStoreValue } from '@/shared/providers/SettingsStoreProvider';
import { cn } from '@/shared/utils/ui-utils';

import { Button } from './button';
import { useOptionalToast, type Toast } from './toast';

export type AdminFavoriteBreadcrumbRowProps = DataAttributes & {
  itemId?: string;
  itemLabel?: string;
  children: React.ReactNode;
  className?: string;
};

const isPresentString = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const normalizeFavoriteIds = (value: string | undefined): string[] => {
  if (value === undefined || value.length === 0) return [];
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

const normalizeItemLabel = (value: string | undefined): string => {
  const trimmed = value?.trim();
  return isPresentString(trimmed) ? trimmed : 'Page';
};

const resolveExplicitFavoriteCandidate = (
  itemId: string | undefined,
  itemLabel: string | undefined
): AdminFavoriteCandidate | null => {
  if (!isPresentString(itemId)) return null;
  return {
    id: itemId,
    label: normalizeItemLabel(itemLabel),
  };
};

type UpdateAdminFavoritesVariables = {
  favoriteIds: string[];
  key: string;
};

const updateAdminFavorites = async ({
  favoriteIds,
  key,
}: UpdateAdminFavoritesVariables): Promise<void> => {
  await api.post('/api/settings', {
    key,
    value: JSON.stringify(favoriteIds),
  });
  invalidateSettingsCache();
};

const useUpdateAdminFavoritesMutation = (): MutationResult<
  void,
  UpdateAdminFavoritesVariables
> =>
  useMutationV2<void, UpdateAdminFavoritesVariables>({
    mutationKey: ['settings', 'admin-favorites', 'update'],
    mutationFn: updateAdminFavorites,
    meta: {
      source: 'shared.ui.AdminFavoriteBreadcrumbRow.toggle',
      operation: 'update',
      resource: 'settings.admin-favorites',
      domain: 'global',
      description: 'Update admin menu favorites setting.',
      errorPresentation: 'toast',
    },
  });

const useResolvedFavoriteCandidate = ({
  itemId,
  itemLabel,
  pathname,
  resolveCandidate,
  searchParams,
}: {
  itemId: string | undefined;
  itemLabel: string | undefined;
  pathname: string | null;
  resolveCandidate: AdminFavoritesContextValue['resolveCandidate'];
  searchParams: ReturnType<typeof useSearchParams>;
}): AdminFavoriteCandidate | null =>
  React.useMemo(() => {
    const explicitCandidate = resolveExplicitFavoriteCandidate(itemId, itemLabel);
    if (explicitCandidate !== null) return explicitCandidate;
    return resolveCandidate(pathname, new URLSearchParams(searchParams.toString()));
  }, [itemId, itemLabel, pathname, resolveCandidate, searchParams]);

const useStoredFavoriteIds = ({
  favoritesKey,
  hasMounted,
  settingsStore,
}: {
  favoritesKey: string;
  hasMounted: boolean;
  settingsStore: SettingsStoreValue;
}): string[] =>
  React.useMemo(() => {
    if (!hasMounted || !isPresentString(favoritesKey)) return [];
    return normalizeFavoriteIds(settingsStore.get(favoritesKey));
  }, [favoritesKey, hasMounted, settingsStore]);

type AdminFavoriteToggleConfig = {
  favoriteIds: string[];
  favoritesKey: string;
  isFavorite: boolean;
  resolvedItemId: string | null;
  setOptimisticFavoriteIds: React.Dispatch<React.SetStateAction<string[] | null>>;
  settingsStore: SettingsStoreValue;
  targetLabel: string;
  toast: Toast;
};

type AdminFavoriteButtonProps = {
  buttonLabel: string;
  isFavorite: boolean;
  onToggle: () => Promise<void>;
};

type FavoriteButtonState = {
  buttonLabel: string;
  canToggle: boolean;
  isFavorite: boolean;
  resolvedItemId: string | null;
  targetLabel: string;
};

const getFavoriteButtonLabel = (targetLabel: string, isFavorite: boolean): string => {
  if (isFavorite) return `Remove ${targetLabel} from admin favorites`;
  return `Add ${targetLabel} to admin favorites`;
};

const getFavoriteButtonState = (
  resolvedCandidate: AdminFavoriteCandidate | null,
  favoriteIds: string[],
  favoritesKey: string
): FavoriteButtonState => {
  if (resolvedCandidate === null) {
    return {
      buttonLabel: getFavoriteButtonLabel('Page', false),
      canToggle: false,
      isFavorite: false,
      resolvedItemId: null,
      targetLabel: 'Page',
    };
  }

  const resolvedItemId = resolvedCandidate.id;
  const isFavorite = isPresentString(resolvedItemId) ? favoriteIds.includes(resolvedItemId) : false;

  return {
    buttonLabel: getFavoriteButtonLabel(resolvedCandidate.label, isFavorite),
    canToggle: isPresentString(resolvedItemId) && isPresentString(favoritesKey),
    isFavorite,
    resolvedItemId,
    targetLabel: resolvedCandidate.label,
  };
};

const useHasMounted = (): boolean => {
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  return hasMounted;
};

const useAdminFavoriteToggle = ({
  favoriteIds,
  favoritesKey,
  isFavorite,
  resolvedItemId,
  setOptimisticFavoriteIds,
  settingsStore,
  targetLabel,
  toast,
}: AdminFavoriteToggleConfig): (() => Promise<void>) => {
  const updateFavoritesMutation = useUpdateAdminFavoritesMutation();

  return React.useCallback(async (): Promise<void> => {
    if (!isPresentString(resolvedItemId) || !isPresentString(favoritesKey)) return;

    const nextFavoriteIds = isFavorite
      ? favoriteIds.filter((favoriteId: string) => favoriteId !== resolvedItemId)
      : Array.from(new Set([...favoriteIds, resolvedItemId]));

    setOptimisticFavoriteIds(nextFavoriteIds);

    try {
      await updateFavoritesMutation.mutateAsync({
        key: favoritesKey,
        favoriteIds: nextFavoriteIds,
      });
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
  }, [
    favoriteIds,
    favoritesKey,
    isFavorite,
    resolvedItemId,
    setOptimisticFavoriteIds,
    settingsStore,
    targetLabel,
    toast,
    updateFavoritesMutation,
  ]);
};

function AdminFavoriteButton({
  buttonLabel,
  isFavorite,
  onToggle,
}: AdminFavoriteButtonProps): React.JSX.Element {
  return (
    <Button
      type='button'
      variant='ghost'
      size='xs'
      className={cn(
        'h-5 w-5 rounded-full p-0 transition-colors',
        isFavorite ? 'text-amber-300 hover:text-amber-200' : 'text-gray-500 hover:text-amber-300'
      )}
      aria-label={buttonLabel}
      aria-pressed={isFavorite}
      title={buttonLabel}
      onClick={() => {
        void onToggle();
      }}
    >
      <StarIcon className={cn('size-3.5', isFavorite ? 'fill-current' : undefined)} />
    </Button>
  );
}

export function AdminFavoriteBreadcrumbRow(
  props: AdminFavoriteBreadcrumbRowProps
): React.JSX.Element {
  const { itemId, itemLabel, children, className, ...rest } = props;
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const settingsStore = useSettingsStore();
  const { toast } = useOptionalToast();
  const { favoritesKey, resolveCandidate } = useAdminFavorites();
  const hasMounted = useHasMounted();

  const resolvedCandidate = useResolvedFavoriteCandidate({
    itemId,
    itemLabel,
    pathname,
    resolveCandidate,
    searchParams,
  });

  const storedFavoriteIds = useStoredFavoriteIds({
    favoritesKey,
    hasMounted,
    settingsStore,
  });

  const [optimisticFavoriteIds, setOptimisticFavoriteIds] = React.useState<string[] | null>(null);
  const storedFavoriteIdsKey = React.useMemo(
    () => storedFavoriteIds.join('\u0000'),
    [storedFavoriteIds]
  );

  React.useEffect(() => {
    setOptimisticFavoriteIds(null);
  }, [storedFavoriteIdsKey]);

  const favoriteIds = optimisticFavoriteIds ?? storedFavoriteIds;
  const { buttonLabel, canToggle, isFavorite, resolvedItemId, targetLabel } =
    getFavoriteButtonState(resolvedCandidate, favoriteIds, favoritesKey);
  const handleToggle = useAdminFavoriteToggle({
    favoriteIds,
    favoritesKey,
    isFavorite,
    resolvedItemId,
    setOptimisticFavoriteIds,
    settingsStore,
    targetLabel,
    toast,
  });

  return (
    <div className={cn('flex items-center gap-2', className)} {...rest}>
      {canToggle ? (
        <AdminFavoriteButton
          buttonLabel={buttonLabel}
          isFavorite={isFavorite}
          onToggle={handleToggle}
        />
      ) : null}
      {children}
    </div>
  );
}
