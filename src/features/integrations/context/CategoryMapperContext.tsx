'use client';

import React, {
  createContext,
  useContext,
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
import type { ExternalCategory, CategoryMappingWithDetails } from '@/shared/contracts/integrations';
import type {
  InternalCategoryOption,
  CategoryMapperData,
  CategoryMapperActions,
} from '@/shared/contracts/integrations';
import type { CatalogRecord, ProductCategory } from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';
import { useToast } from '@/shared/ui';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

// --- Granular Contexts ---

export interface CategoryMapperConfig {
  connectionId: string;
  connectionName: string;
}
const ConfigContext = createContext<CategoryMapperConfig | null>(null);
export const useCategoryMapperConfig = () => {
  const context = useContext(ConfigContext);
  if (!context)
    throw internalError('useCategoryMapperConfig must be used within CategoryMapperProvider');
  return context;
};

const DataContext = createContext<CategoryMapperData | null>(null);
export const useCategoryMapperData = () => {
  const context = useContext(DataContext);
  if (!context) throw internalError('useCategoryMapperData must be used within CategoryMapperProvider');
  return context;
};

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
const UIStateContext = createContext<CategoryMapperUIState | null>(null);
export const useCategoryMapperUIState = () => {
  const context = useContext(UIStateContext);
  if (!context)
    throw internalError('useCategoryMapperUIState must be used within CategoryMapperProvider');
  return context;
};

const ActionsContext = createContext<CategoryMapperActions | null>(null);
export const useCategoryMapperActions = () => {
  const context = useContext(ActionsContext);
  if (!context)
    throw internalError('useCategoryMapperActions must be used within CategoryMapperProvider');
  return context;
};

const normalizeParentExternalId = (value: string | null | undefined): string | null => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate || candidate === '0' || candidate.toLowerCase() === 'null') {
    return null;
  }
  return candidate;
};

const isMissingExternalCategoryName = (value: string | null | undefined): boolean => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return candidate.startsWith('[Missing external category:');
};

const buildInternalCategoryOptions = (categories: ProductCategory[]): InternalCategoryOption[] => {
  if (categories.length === 0) return [];

  const byId = new Map<string, ProductCategory>(
    categories.map((category: ProductCategory): [string, ProductCategory] => [
      category.id,
      category,
    ])
  );
  const childrenByParentId = new Map<string | null, ProductCategory[]>();

  const pushChild = (parentId: string | null, category: ProductCategory): void => {
    const current = childrenByParentId.get(parentId) ?? [];
    current.push(category);
    childrenByParentId.set(parentId, current);
  };

  for (const category of categories) {
    const rawParentId = typeof category.parentId === 'string' ? category.parentId.trim() : '';
    const normalizedParentId =
      rawParentId.length > 0 && rawParentId !== category.id && byId.has(rawParentId)
        ? rawParentId
        : null;
    pushChild(normalizedParentId, category);
  }

  for (const [, children] of childrenByParentId) {
    children.sort((a: ProductCategory, b: ProductCategory): number => a.name.localeCompare(b.name));
  }

  const visited = new Set<string>();
  const options: InternalCategoryOption[] = [];

  const visit = (parentId: string | null, depth: number, ancestry: string[]): void => {
    const children = childrenByParentId.get(parentId) ?? [];
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      const path = [...ancestry, child.name];
      const indent = depth > 0 ? `${'\u00A0\u00A0'.repeat(depth)}↳ ` : '';
      options.push({
        value: child.id,
        label: `${indent}${path.join(' / ')}`,
      });
      visit(child.id, depth + 1, path);
    }
  };

  visit(null, 0, []);

  const unvisited = categories
    .filter((category: ProductCategory): boolean => !visited.has(category.id))
    .sort((a: ProductCategory, b: ProductCategory): number => a.name.localeCompare(b.name));

  for (const category of unvisited) {
    if (visited.has(category.id)) continue;
    visited.add(category.id);
    options.push({ value: category.id, label: category.name });
    visit(category.id, 1, [category.name]);
  }

  return options;
};

export function CategoryMapperProvider({
  connectionId,
  connectionName,
  children,
}: {
  connectionId: string;
  connectionName: string;
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

  const isRootCategory = useCallback(
    (category: ExternalCategory): boolean => {
      const parentExternalId = normalizeParentExternalId(category.parentExternalId);
      if (!parentExternalId) return true;
      if (parentExternalId === category.externalId) return true;
      return !externalIds.has(parentExternalId);
    },
    [externalIds]
  );

  // Initialize expansion state
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (externalCategories.length > 0 && !hasInitializedExpansion.current) {
      timer = setTimeout(() => {
        setExpandedIds((prev: Set<string>) => {
          if (prev.size === 0) {
            return new Set(
              externalCategories
                .filter((c: ExternalCategory) => isRootCategory(c))
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
  }, [externalCategories, isRootCategory]);

  // Reset pending mappings when catalog changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPendingMappings(new Map());
    }, 0);
    return (): void => clearTimeout(timer);
  }, [selectedCatalogId]);

  const handleFetchExternalCategories = async (): Promise<void> => {
    try {
      const result = await fetchMutation.mutateAsync({ connectionId });
      toast(result.message, { variant: 'success' });
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'CategoryMapper',
        action: 'fetchExternalCategories',
        connectionId,
      });
      const message = error instanceof Error ? error.message : 'Failed to fetch categories';
      toast(message, { variant: 'error' });
    }
  };

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
    }),
    [connectionId, connectionName]
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
