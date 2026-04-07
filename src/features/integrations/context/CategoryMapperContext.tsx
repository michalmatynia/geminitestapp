'use client';

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';

import {
  useIntegrationCatalogs,
  useIntegrationProductCategories,
} from '@/features/integrations/hooks/useIntegrationProductQueries';
import {
  useFetchExternalCategoriesMutation,
  useSaveMappingsMutation,
} from '@/features/integrations/hooks/useMarketplaceMutations';
import {
  useExternalCategories,
  useCategoryMappings,
} from '@/features/integrations/hooks/useMarketplaceQueries';
import {
  autoMatchCategoryMappingsByName,
  formatAutoMatchCategoryMappingsByNameMessage,
} from '@/features/integrations/components/marketplaces/category-mapper/category-table/auto-match-by-name';
import { buildCategoryTree } from '@/features/integrations/components/marketplaces/category-mapper/category-table/utils';
import type { ExternalCategory, CategoryMappingWithDetails } from '@/shared/contracts/integrations/listings';
import type { InternalCategoryOption, CategoryMapperData, CategoryMapperActions } from '@/shared/contracts/integrations/context';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';
import { createStrictContext } from './createStrictContext';
import {
  isMissingExternalCategoryName,
  buildInternalCategoryOptions,
  isRootExternalCategory,
} from './CategoryMapperContext.utils';

// --- Granular Contexts ---

export interface CategoryMapperConfig {
  connectionId: string;
  connectionName: string;
  integrationId?: string | undefined;
  integrationSlug?: string | undefined;
}
export const { Context: ConfigContext, useValue: useCategoryMapperConfig } =
  createStrictContext<CategoryMapperConfig>({
    displayName: 'CategoryMapperConfigContext',
    errorMessage: 'useCategoryMapperConfig must be used within CategoryMapperProvider',
  });

export const { Context: DataContext, useValue: useCategoryMapperData } =
  createStrictContext<CategoryMapperData>({
    displayName: 'CategoryMapperDataContext',
    errorMessage: 'useCategoryMapperData must be used within CategoryMapperProvider',
  });

export interface CategoryMapperUIState {
  pendingMappings: Map<string, string | null>;
  expandedIds: Set<string>;
  toggleExpand: (categoryId: string) => void;
  staleMappings: Array<{
    externalCategoryId: string;
    externalCategoryName: string;
    externalCategoryPath: string | null;
    internalCategoryLabel: string | null;
  }>;
  stats: { total: number; mapped: number; unmapped: number; pending: number; stale: number };
}
export const { Context: UIStateContext, useValue: useCategoryMapperUIState } =
  createStrictContext<CategoryMapperUIState>({
    displayName: 'CategoryMapperUIStateContext',
    errorMessage: 'useCategoryMapperUIState must be used within CategoryMapperProvider',
  });

export const { Context: ActionsContext, useValue: useCategoryMapperActions } =
  createStrictContext<CategoryMapperActions>({
    displayName: 'CategoryMapperActionsContext',
    errorMessage: 'useCategoryMapperActions must be used within CategoryMapperProvider',
  });

export function CategoryMapperProvider({
  connectionId,
  connectionName,
  integrationId,
  integrationSlug,
  children,
}: {
  connectionId: string;
  connectionName: string;
  integrationId?: string;
  integrationSlug?: string;
  children: React.ReactNode;
}): React.JSX.Element {
  const { toast } = useToast();

  // Queries
  const catalogsQuery = useIntegrationCatalogs();
  const catalogs = useMemo(() => catalogsQuery.data ?? [], [catalogsQuery.data]);
  const catalogsLoading = catalogsQuery.isLoading;

  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const hasInitializedCatalog = useRef(false);

  // Auto-select default catalog
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (!selectedCatalogId && catalogs.length > 0 && !hasInitializedCatalog.current) {
      const defaultCatalog = catalogs.find((c: CatalogRecord) => c.isDefault) ?? catalogs[0];
      if (defaultCatalog) {
        timer = setTimeout(() => {
          setSelectedCatalogId(defaultCatalog.id);
          hasInitializedCatalog.current = true;
        }, 0);
      }
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [catalogs, selectedCatalogId]);

  const internalCategoriesQuery = useIntegrationProductCategories(selectedCatalogId ?? undefined);
  const internalCategories = internalCategoriesQuery.data ?? [];
  const internalCategoriesLoading = internalCategoriesQuery.isLoading;
  const internalCategoryOptions = useMemo(
    (): InternalCategoryOption[] => buildInternalCategoryOptions(internalCategories),
    [internalCategories]
  );

  const externalCategoriesQuery = useExternalCategories(connectionId);
  const externalCategories = useMemo(
    () => externalCategoriesQuery.data ?? [],
    [externalCategoriesQuery.data]
  );
  const externalCategoriesLoading = externalCategoriesQuery.isLoading;
  const externalIds = useMemo(
    () =>
      new Set(
        externalCategories
          .map((category: ExternalCategory): string => category.externalId.trim())
          .filter((id: string): boolean => id.length > 0)
      ),
    [externalCategories]
  );

  const mappingsQuery = useCategoryMappings(connectionId, selectedCatalogId);
  const mappings = useMemo(() => mappingsQuery.data ?? [], [mappingsQuery.data]);
  const mappingsLoading = mappingsQuery.isLoading;

  // Mutations
  const fetchMutation = useFetchExternalCategoriesMutation();
  const saveMutation = useSaveMappingsMutation();

  const [pendingMappings, setPendingMappings] = useState<Map<string, string | null>>(new Map());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const hasInitializedExpansion = useRef(false);

  // Initialize expansion state
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (externalCategories.length > 0 && !hasInitializedExpansion.current) {
      timer = setTimeout(() => {
        setExpandedIds((prev: Set<string>) => {
          if (prev.size === 0) {
            return new Set(
              externalCategories
                .filter((c: ExternalCategory) => isRootExternalCategory(c, externalIds))
                .map((c: ExternalCategory) => c.id)
            );
          }
          return prev;
        });
        hasInitializedExpansion.current = true;
      }, 0);
    }
    return (): void => {
      if (timer) clearTimeout(timer);
    };
  }, [externalCategories, externalIds]);

  // Reset pending mappings when catalog changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPendingMappings(new Map());
    }, 0);
    return (): void => clearTimeout(timer);
  }, [selectedCatalogId]);

  const handleFetchExternalCategories = useCallback(async (): Promise<void> => {
    try {
      const result = await fetchMutation.mutateAsync({ connectionId });
      toast(result.message, { variant: 'success' });
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'CategoryMapper',
        action: 'fetchExternalCategories',
        connectionId,
        integrationId,
      });
      const message = error instanceof Error ? error.message : 'Failed to fetch categories';
      toast(message, { variant: 'error' });
    }
  }, [connectionId, fetchMutation, integrationId, toast]);

  const getMappingForExternal = useCallback(
    (externalCategoryId: string): string | null => {
      if (pendingMappings.has(externalCategoryId)) {
        return pendingMappings.get(externalCategoryId) ?? null;
      }
      const mapping = mappings.find(
        (m: CategoryMappingWithDetails) => m.externalCategoryId === externalCategoryId
      );
      if (!mapping?.isActive) return null;
      return mapping.internalCategoryId;
    },
    [mappings, pendingMappings]
  );

  const handleMappingChange = useCallback(
    (externalCategoryId: string, internalCategoryId: string | null): void => {
      setPendingMappings((prev: Map<string, string | null>) => {
        const next = new Map(prev);
        const savedMapping = mappings.find(
          (m: CategoryMappingWithDetails) => m.externalCategoryId === externalCategoryId
        );
        const savedValue = savedMapping?.isActive ? savedMapping.internalCategoryId : null;

        if (savedValue === internalCategoryId) {
          next.delete(externalCategoryId);
        } else {
          next.set(externalCategoryId, internalCategoryId);
        }
        return next;
      });
    },
    [mappings]
  );

  const handleAutoMatchByName = useCallback((): void => {
    if (!selectedCatalogId) {
      toast('Select a catalog before auto-matching categories.', { variant: 'info' });
      return;
    }

    const result = autoMatchCategoryMappingsByName({
      externalCategories,
      internalCategories,
      pendingMappings,
      getCurrentMapping: getMappingForExternal,
    });

    if (result.matchedCount > 0) {
      setPendingMappings((prev: Map<string, string | null>) => {
        const next = new Map(prev);
        for (const match of result.matches) {
          next.set(match.externalCategoryId, match.internalCategoryId);
        }
        return next;
      });
    }

    toast(formatAutoMatchCategoryMappingsByNameMessage(result), {
      variant: result.matchedCount > 0 ? 'success' : 'info',
    });
  }, [
    externalCategories,
    getMappingForExternal,
    internalCategories,
    pendingMappings,
    selectedCatalogId,
    toast,
  ]);

  const handleSave = async (): Promise<void> => {
    if (pendingMappings.size === 0 || !selectedCatalogId) {
      toast('No changes to save', { variant: 'info' });
      return;
    }

    try {
      const mappingsToSave = Array.from(pendingMappings.entries()).map(
        ([externalCategoryId, internalCategoryId]: [string, string | null]) => ({
          externalCategoryId,
          internalCategoryId,
        })
      );

      const result = await saveMutation.mutateAsync({
        connectionId,
        catalogId: selectedCatalogId,
        mappings: mappingsToSave,
      });

      toast(result.message, { variant: 'success' });
      setPendingMappings(new Map());
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'CategoryMapper',
        action: 'saveMappings',
        connectionId,
        catalogId: selectedCatalogId,
      });
      const message = error instanceof Error ? error.message : 'Failed to save mappings';
      toast(message, { variant: 'error' });
    }
  };

  const toggleExpand = useCallback((categoryId: string): void => {
    setExpandedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  }, []);

  const categoryTree = useMemo(() => buildCategoryTree(externalCategories), [externalCategories]);

  const stats = useMemo((): { total: number; mapped: number; unmapped: number; pending: number; stale: number } => {
    const staleMappings = mappings.filter((mapping: CategoryMappingWithDetails): boolean => {
      if (!mapping.isActive) return false;
      const externalCategoryId = mapping.externalCategoryId.trim();
      if (!externalCategoryId) return false;
      return (
        !externalIds.has(externalCategoryId) ||
        isMissingExternalCategoryName(mapping.externalCategory?.name)
      );
    });
    const total = externalCategories.length;
    const mapped = externalCategories.filter(
      (c: ExternalCategory) => getMappingForExternal(c.externalId) !== null
    ).length;
    const unmapped = Math.max(0, total - mapped);
    const pending = pendingMappings.size;
    return { total, mapped, unmapped, pending, stale: staleMappings.length };
  }, [externalCategories, externalIds, getMappingForExternal, mappings, pendingMappings.size]);

  const staleMappings = useMemo(
    (): Array<{
      externalCategoryId: string;
      externalCategoryName: string;
      externalCategoryPath: string | null;
      internalCategoryLabel: string | null;
    }> =>
      mappings
        .filter((mapping: CategoryMappingWithDetails): boolean => {
          if (!mapping.isActive) return false;
          const externalCategoryId = mapping.externalCategoryId.trim();
          if (!externalCategoryId) return false;
          return (
            !externalIds.has(externalCategoryId) ||
            isMissingExternalCategoryName(mapping.externalCategory?.name)
          );
        })
        .map((mapping: CategoryMappingWithDetails) => ({
          externalCategoryId: mapping.externalCategoryId,
          externalCategoryName:
            mapping.externalCategory?.name?.trim() || mapping.externalCategoryId,
          externalCategoryPath:
            mapping.externalCategory?.path?.trim() || null,
          internalCategoryLabel:
            mapping.internalCategory?.name?.trim() || mapping.internalCategoryId || null,
        })),
    [externalIds, mappings]
  );

  const configValue = useMemo<CategoryMapperConfig>(
    () => ({
      connectionId,
      connectionName,
      integrationId,
      integrationSlug,
    }),
    [connectionId, connectionName, integrationId, integrationSlug]
  );

  const dataValue = useMemo<CategoryMapperData>(
    () => ({
      catalogs,
      catalogsLoading,
      selectedCatalogId,
      setSelectedCatalogId,
      internalCategories,
      internalCategoriesLoading,
      internalCategoryOptions,
      externalCategories,
      externalCategoriesLoading,
      externalIds,
      mappings,
      mappingsLoading,
      categoryTree,
    }),
    [
      catalogs,
      catalogsLoading,
      selectedCatalogId,
      internalCategories,
      internalCategoriesLoading,
      internalCategoryOptions,
      externalCategories,
      externalCategoriesLoading,
      externalIds,
      mappings,
      mappingsLoading,
      categoryTree,
    ]
  );

  const uiStateValue = useMemo<CategoryMapperUIState>(
    () => ({
      pendingMappings,
      expandedIds,
      toggleExpand,
      staleMappings,
      stats,
    }),
    [pendingMappings, expandedIds, toggleExpand, staleMappings, stats]
  );

  const actionsValue = useMemo<CategoryMapperActions>(
    () => ({
      handleFetchExternalCategories,
      handleAutoMatchByName,
      handleMappingChange,
      handleSave,
      getMappingForExternal,
      fetchMutation,
      saveMutation,
    }),
    [
      handleFetchExternalCategories,
      handleAutoMatchByName,
      handleMappingChange,
      handleSave,
      getMappingForExternal,
      fetchMutation,
      saveMutation,
    ]
  );

  return (
    <ConfigContext.Provider value={configValue}>
      <DataContext.Provider value={dataValue}>
        <UIStateContext.Provider value={uiStateValue}>
          <ActionsContext.Provider value={actionsValue}>{children}</ActionsContext.Provider>
        </UIStateContext.Provider>
      </DataContext.Provider>
    </ConfigContext.Provider>
  );
}
