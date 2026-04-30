'use client';

import { useRouter } from 'nextjs-toploader/app';
import {
  startTransition,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';

import { useCatalogs } from '@/features/products/hooks/useProductSettingsQueries';
import {
  useUpdateUserPreferences,
  useUserPreferences,
} from '@/features/products/hooks/useUserPreferences';
import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { Catalog } from '@/shared/contracts/products/catalogs';
import type { ProductListPreferences } from '@/shared/contracts/products/filters';
import { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  ALL_CATALOGS_OPTION,
  DEFAULT_PRODUCT_LIST_PREFERENCES,
} from './ProductPreferencesPage.constants';

type SavedPreferencesSyncArgs = {
  savedPreferences: ProductListPreferences;
  setPreferences: Dispatch<SetStateAction<ProductListPreferences>>;
};

export type ProductPreferencesPageController = {
  preferences: ProductListPreferences;
  setPreferences: Dispatch<SetStateAction<ProductListPreferences>>;
  catalogOptions: Array<LabeledOptionDto<string>>;
  isLoading: boolean;
  isSaving: boolean;
  handleSave: () => Promise<void>;
  handleResetToDefault: () => Promise<void>;
  handleCancel: () => void;
};

const arePreferencesEqual = (
  left: ProductListPreferences,
  right: ProductListPreferences
): boolean => JSON.stringify(left) === JSON.stringify(right);

const buildCatalogOptions = (catalogs: Catalog[]): Array<LabeledOptionDto<string>> => [
  ALL_CATALOGS_OPTION,
  ...catalogs.map((catalog) => ({
    value: catalog.id,
    label: catalog.name,
  })),
];

const scheduleSavedPreferencesSync = (
  args: SavedPreferencesSyncArgs
): ReturnType<typeof setTimeout> =>
  setTimeout(() => {
    args.setPreferences((current) =>
      arePreferencesEqual(current, args.savedPreferences) ? current : args.savedPreferences
    );
  }, 0);

export const useProductPreferencesPageController = (): ProductPreferencesPageController => {
  const { toast } = useToast();
  const router = useRouter();
  const { preferences: savedPreferences, loading: prefsLoading } = useUserPreferences();
  const catalogsQuery = useCatalogs();
  const catalogs = useMemo(() => catalogsQuery.data ?? [], [catalogsQuery.data]);
  const catalogOptions = useMemo(() => buildCatalogOptions(catalogs), [catalogs]);
  const [preferences, setPreferences] = useState<ProductListPreferences>(
    DEFAULT_PRODUCT_LIST_PREFERENCES
  );
  const updateMutation = useUpdateUserPreferences();

  useEffect(() => {
    const timer = scheduleSavedPreferencesSync({ savedPreferences, setPreferences });
    return (): void => clearTimeout(timer);
  }, [savedPreferences]);

  const handleCancel = (): void => {
    startTransition(() => {
      router.push('/admin/products');
    });
  };

  const handleSave = async (): Promise<void> => {
    try {
      await updateMutation.mutateAsync(preferences);
      toast('Preferences saved successfully', { variant: 'success' });
      handleCancel();
    } catch (error) {
      logClientCatch(error, { source: 'ProductPreferencesPage', action: 'handleSave' });
      toast('Failed to save preferences', { variant: 'error' });
    }
  };

  const handleResetToDefault = async (): Promise<void> => {
    try {
      await updateMutation.mutateAsync(DEFAULT_PRODUCT_LIST_PREFERENCES);
      setPreferences(DEFAULT_PRODUCT_LIST_PREFERENCES);
      toast('Preferences reset to default', { variant: 'success' });
    } catch (error) {
      logClientCatch(error, {
        source: 'ProductPreferencesPage',
        action: 'handleResetToDefault',
      });
      toast('Failed to reset preferences', { variant: 'error' });
    }
  };

  return {
    preferences,
    setPreferences,
    catalogOptions,
    isLoading: prefsLoading || catalogsQuery.isLoading,
    isSaving: updateMutation.isPending,
    handleSave,
    handleResetToDefault,
    handleCancel,
  };
};
