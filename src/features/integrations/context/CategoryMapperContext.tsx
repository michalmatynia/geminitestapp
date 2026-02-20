'use client';

import { UseMutationResult } from '@tanstack/react-query';
import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';

import { useFetchExternalCategoriesMutation, useSaveMappingsMutation } from '@/features/integrations/hooks/useMarketplaceMutations';
import { useExternalCategories, useCategoryMappings } from '@/features/integrations/hooks/useMarketplaceQueries';
import type { ExternalCategory, CategoryMappingWithDetails } from '@/shared/contracts/integrations';
import { logClientError } from '@/features/observability';
import { useProductCategories } from '@/features/products/hooks/useCategoryQueries';
import { useCatalogs } from '@/features/products/hooks/useProductMetadataQueries';
import type { CatalogDto as Catalog, ProductCategoryDto } from '@/shared/contracts/products';
import { useToast } from '@/shared/ui';

interface InternalCategoryOption {
  value: string;
  label: string;
}

interface CategoryMapperContextValue {
  connectionId: string;
  connectionName: string;
  
  // Queries
  catalogs: Catalog[];
  catalogsLoading: boolean;
  selectedCatalogId: string | null;
  setSelectedCatalogId: (id: string | null) => void;
  
  internalCategories: ProductCategoryDto[];
  internalCategoriesLoading: boolean;
  internalCategoryOptions: InternalCategoryOption[];
  
  externalCategories: ExternalCategory[];
  externalCategoriesLoading: boolean;
  externalIds: Set<string>;
  
  mappings: CategoryMappingWithDetails[];
  mappingsLoading: boolean;
  
  // Mutations
  fetchMutation: UseMutationResult<
    { fetched: number; message: string },
    Error,
    { connectionId: string }
  >;
  saveMutation: UseMutationResult<
    { upserted: number; message: string },
    Error,
    { connectionId: string; catalogId: string; mappings: { externalCategoryId: string; internalCategoryId: string | null }[] }
  >;
  
  // UI State
  pendingMappings: Map<string, string | null>;
  expandedIds: Set<string>;
  toggleExpand: (categoryId: string) => void;
  
  // Stats
  stats: { total: number; mapped: number; pending: number };
  categoryTree: ExternalCategory[];
  
  // Handlers
  handleFetchFromBase: () => Promise<void>;
  handleMappingChange: (externalCategoryId: string, internalCategoryId: string | null) => void;
  handleSave: () => Promise<void>;
  getMappingForExternal: (externalCategoryId: string) => string | null;
}

const CategoryMapperContext = createContext<CategoryMapperContextValue | null>(null);

export function useCategoryMapper(): CategoryMapperContextValue {
  const context = useContext(CategoryMapperContext);
  if (!context) {
    throw new Error('useCategoryMapper must be used within a CategoryMapperProvider');
  }
  return context;
}

const normalizeParentExternalId = (value: string | null | undefined): string | null => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate || candidate === '0' || candidate.toLowerCase() === 'null') {
    return null;
  }
  return candidate;
};

const buildInternalCategoryOptions = (categories: ProductCategoryDto[]): InternalCategoryOption[] => {
  if (categories.length === 0) return [];

  const byId = new Map<string, ProductCategoryDto>(
    categories.map((category: ProductCategoryDto): [string, ProductCategoryDto] => [category.id, category])
  );
  const childrenByParentId = new Map<string | null, ProductCategoryDto[]>();

  const pushChild = (parentId: string | null, category: ProductCategoryDto): void => {
    const current = childrenByParentId.get(parentId) ?? [];
    current.push(category);
    childrenByParentId.set(parentId, current);
  };

  for (const category of categories) {
    const rawParentId = typeof category.parentId === 'string' ? category.parentId.trim() : '';
    const normalizedParentId =
      rawParentId.length > 0 && rawParentId !== category.id && byId.has(rawParentId) ? rawParentId : null;
    pushChild(normalizedParentId, category);
  }

  for (const [, children] of childrenByParentId) {
    children.sort((a: ProductCategoryDto, b: ProductCategoryDto): number =>
      a.name.localeCompare(b.name)
    );
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
    .filter((category: ProductCategoryDto): boolean => !visited.has(category.id))
    .sort((a: ProductCategoryDto, b: ProductCategoryDto): number => a.name.localeCompare(b.name));

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
  children 
}: { 
  connectionId: string; 
  connectionName: string; 
  children: React.ReactNode; 
}): React.JSX.Element {
  const { toast } = useToast();
  
  // Queries
  const catalogsQuery = useCatalogs();
  const catalogs = useMemo(() => catalogsQuery.data ?? [], [catalogsQuery.data]);
  const catalogsLoading = catalogsQuery.isLoading;

  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const hasInitializedCatalog = useRef(false);

  // Auto-select default catalog
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (!selectedCatalogId && catalogs.length > 0 && !hasInitializedCatalog.current) {
      const defaultCatalog = catalogs.find((c: Catalog) => c.isDefault) ?? catalogs[0];
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

  const internalCategoriesQuery = useProductCategories(selectedCatalogId ?? undefined);
  const internalCategories = internalCategoriesQuery.data ?? [];
  const internalCategoriesLoading = internalCategoriesQuery.isLoading;
  const internalCategoryOptions = useMemo(
    (): InternalCategoryOption[] => buildInternalCategoryOptions(internalCategories),
    [internalCategories]
  );

  const externalCategoriesQuery = useExternalCategories(connectionId);
  const externalCategories = useMemo(() => externalCategoriesQuery.data ?? [], [externalCategoriesQuery.data]);
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

  const handleFetchFromBase = async (): Promise<void> => {
    try {
      const result = await fetchMutation.mutateAsync({ connectionId });
      toast(result.message, { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'BaseCategoryMapper', action: 'fetchFromBase', connectionId } });
      const message = error instanceof Error ? error.message : 'Failed to fetch categories';
      toast(message, { variant: 'error' });
    }
  };

  const getMappingForExternal = useCallback(
    (externalCategoryId: string): string | null => {
      if (pendingMappings.has(externalCategoryId)) {
        return pendingMappings.get(externalCategoryId) ?? null;
      }
      const mapping = mappings.find((m: CategoryMappingWithDetails) => m.externalCategoryId === externalCategoryId);
      if (!mapping || !mapping.isActive) return null;
      return mapping.internalCategoryId;
    },
    [mappings, pendingMappings]
  );

  const handleMappingChange = useCallback((externalCategoryId: string, internalCategoryId: string | null): void => {
    setPendingMappings((prev: Map<string, string | null>) => {
      const next = new Map(prev);
      const savedMapping = mappings.find((m: CategoryMappingWithDetails) => m.externalCategoryId === externalCategoryId);
      const savedValue = savedMapping?.isActive ? savedMapping.internalCategoryId : null;

      if (savedValue === internalCategoryId) {
        next.delete(externalCategoryId);
      } else {
        next.set(externalCategoryId, internalCategoryId);
      }
      return next;
    });
  }, [mappings]);

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
      logClientError(error, { context: { source: 'BaseCategoryMapper', action: 'saveMappings', connectionId, catalogId: selectedCatalogId } });
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

  const categoryTree = useMemo((): ExternalCategory[] => {
    return externalCategories
      .filter((category: ExternalCategory): boolean => isRootCategory(category))
      .sort((a: ExternalCategory, b: ExternalCategory): number => a.name.localeCompare(b.name));
  }, [externalCategories, isRootCategory]);

  const stats = useMemo((): { total: number; mapped: number; pending: number } => {
    const total = externalCategories.length;
    const mapped = externalCategories.filter((c: ExternalCategory) => getMappingForExternal(c.id) !== null).length;
    const pending = pendingMappings.size;
    return { total, mapped, pending };
  }, [externalCategories, getMappingForExternal, pendingMappings.size]);

  const value = useMemo(() => ({
    connectionId,
    connectionName,
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
    fetchMutation,
    saveMutation,
    pendingMappings,
    expandedIds,
    toggleExpand,
    stats,
    categoryTree,
    handleFetchFromBase,
    handleMappingChange,
    handleSave,
    getMappingForExternal
  }), [
    connectionId,
    connectionName,
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
    fetchMutation,
    saveMutation,
    pendingMappings,
    expandedIds,
    toggleExpand,
    stats,
    categoryTree,
    handleFetchFromBase,
    handleMappingChange,
    handleSave,
    getMappingForExternal
  ]);

  return (
    <CategoryMapperContext.Provider value={value}>
      {children}
    </CategoryMapperContext.Provider>
  );
}
