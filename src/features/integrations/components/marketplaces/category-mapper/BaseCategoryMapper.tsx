import { Download, RefreshCw, Save, ChevronRight, ChevronDown, Check } from 'lucide-react';
import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';

import { useFetchExternalCategoriesMutation, useSaveMappingsMutation } from '@/features/integrations/hooks/useMarketplaceMutations';
import { useExternalCategories, useCategoryMappings } from '@/features/integrations/hooks/useMarketplaceQueries';
import type { ExternalCategory, CategoryMappingWithDetails } from '@/features/integrations/types/category-mapping';
import { logClientError } from '@/features/observability';
import type { Catalog, ProductCategoryDto } from '@/features/products';
import { useCatalogs } from '@/features/products/hooks/useCatalogQueries';
import { useProductCategories } from '@/features/products/hooks/useCategoryQueries';
import { useToast, Button, Label, UnifiedSelect, SectionHeader } from '@/shared/ui';

type BaseCategoryMapperProps = {
  connectionId: string;
  connectionName: string;
};

const normalizeParentExternalId = (value: string | null | undefined): string | null => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate || candidate === '0' || candidate.toLowerCase() === 'null') {
    return null;
  }
  return candidate;
};

type InternalCategoryOption = {
  value: string;
  label: string;
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

export function BaseCategoryMapper({ connectionId, connectionName }: BaseCategoryMapperProps): React.JSX.Element {
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
          // If we haven't initialized yet (or just reset), expand depth 0
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

  // Fetch categories from Base.com API
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

  // Get current mapping for an external category
  const getMappingForExternal = useCallback(
    (externalCategoryId: string): string | null => {
      // Check pending mappings first
      if (pendingMappings.has(externalCategoryId)) {
        return pendingMappings.get(externalCategoryId) ?? null;
      }
      // Check saved mappings
      const mapping = mappings.find((m: CategoryMappingWithDetails) => m.externalCategoryId === externalCategoryId);
      if (!mapping || !mapping.isActive) return null;
      return mapping.internalCategoryId;
    },
    [mappings, pendingMappings]
  );

  // Handle mapping change
  const handleMappingChange = (externalCategoryId: string, internalCategoryId: string | null): void => {
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
  };

  // Save all pending mappings
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

  // Toggle category expansion
  const toggleExpand = (categoryId: string): void => {
    setExpandedIds((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  // Build tree structure for display
  const categoryTree = useMemo((): ExternalCategory[] => {
    return externalCategories
      .filter((category: ExternalCategory): boolean => isRootCategory(category))
      .sort((a: ExternalCategory, b: ExternalCategory): number => a.name.localeCompare(b.name));
  }, [externalCategories, isRootCategory]);

  // Count statistics
  const stats = useMemo((): { total: number; mapped: number; pending: number } => {
    const total = externalCategories.length;
    const mapped = externalCategories.filter((c: ExternalCategory) => getMappingForExternal(c.id) !== null).length;
    const pending = pendingMappings.size;
    return { total, mapped, pending };
  }, [externalCategories, getMappingForExternal, pendingMappings.size]);

  // Render category row with children
  const renderCategory = (category: ExternalCategory, depth: number = 0): React.JSX.Element => {
    const children = externalCategories.filter(
      (candidate: ExternalCategory): boolean =>
        normalizeParentExternalId(candidate.parentExternalId) === category.externalId
    );
    const hasChildren = children.length > 0;
    const isExpanded = expandedIds.has(category.id);
    const currentMapping = getMappingForExternal(category.id);
    const hasPendingChange = pendingMappings.has(category.id);

    return (
      <React.Fragment key={category.id}>
        <tr className={`border-b border-border ${hasPendingChange ? 'bg-yellow-500/5' : ''}`}>
          <td className='px-4 py-2'>
            <div className='flex items-center' style={{ paddingLeft: `${depth * 20}px` }}>
              {hasChildren ? (
                <Button
                  onClick={(): void => toggleExpand(category.id)}
                  className='mr-2 rounded p-0.5 text-gray-400 hover:bg-muted/50 hover:text-white'
                >
                  {isExpanded ? (
                    <ChevronDown className='h-4 w-4' />
                  ) : (
                    <ChevronRight className='h-4 w-4' />
                  )}
                </Button>
              ) : (
                <span className='mr-2 w-5' />
              )}
              <span className='text-sm text-gray-200'>{category.name}</span>
              {currentMapping && (
                <Check className='ml-2 h-3 w-3 text-emerald-400' />
              )}
            </div>
          </td>
          <td className='px-4 py-2'>
            <UnifiedSelect
              value={currentMapping ?? '__unmapped__'}
              onValueChange={(v: string): void =>
                handleMappingChange(category.id, v === '__unmapped__' ? null : v)
              }
              disabled={internalCategoriesLoading || !selectedCatalogId}
              options={[
                { value: '__unmapped__', label: '— Not mapped —' },
                ...internalCategoryOptions
              ]}
              triggerClassName='w-full bg-gray-800 border-border text-white text-sm h-8'
            />
          </td>
        </tr>
        {hasChildren && isExpanded && (
          <React.Fragment>
            {children
              .sort((a: ExternalCategory, b: ExternalCategory) => a.name.localeCompare(b.name))
              .map((child: ExternalCategory) => renderCategory(child, depth + 1))}
          </React.Fragment>
        )}
      </React.Fragment>
    );
  };

  return (
    <div className='space-y-6'>
      <SectionHeader
        title='Base.com Categories'
        description={`Connection: ${connectionName}`}
        actions={
          <div className='flex items-center gap-3'>
            <Button
              onClick={(): void => { void handleFetchFromBase(); }}
              disabled={fetchMutation.isPending}
              className='flex items-center gap-2 rounded-md border bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700 disabled:opacity-50'
            >
              {fetchMutation.isPending ? (
                <RefreshCw className='h-4 w-4 animate-spin' />
              ) : (
                <Download className='h-4 w-4' />
              )}
              {fetchMutation.isPending ? 'Fetching...' : 'Fetch Categories'}
            </Button>

            <Button
              onClick={(): void => { void handleSave(); }}
              disabled={saveMutation.isPending || pendingMappings.size === 0}
              className='flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50'
            >
              {saveMutation.isPending ? (
                <RefreshCw className='h-4 w-4 animate-spin' />
              ) : (
                <Save className='h-4 w-4' />
              )}
              {saveMutation.isPending ? 'Saving...' : `Save (${pendingMappings.size})`}
            </Button>
          </div>
        }
      />

      {/* Catalog Selector */}
      <div className='flex items-center gap-4'>
        <Label className='text-sm text-gray-400'>Target Catalog:</Label>
        <div className='w-[200px]'>
          <UnifiedSelect
            value={selectedCatalogId ?? '__none__'}
            onValueChange={(v: string): void => setSelectedCatalogId(v === '__none__' ? null : v)}
            disabled={catalogsLoading}
            options={[
              ...(!catalogsLoading && catalogs.length === 0 ? [{ value: '__none__', label: 'No catalogs available' }] : []),
              ...catalogs.map((catalog: Catalog) => ({ value: catalog.id, label: catalog.name }))
            ]}
            placeholder={catalogsLoading ? 'Loading...' : 'Select catalog'}
            triggerClassName='bg-gray-800 border-border text-white text-sm h-9'
          />
        </div>

        {selectedCatalogId && (
          <span className='text-xs text-gray-500'>
            {internalCategories.length} internal categories
          </span>
        )}
      </div>

      {/* Stats */}
      <div className='flex gap-6 text-sm'>
        <div className='text-gray-400'>
          Total: <span className='text-white'>{stats.total}</span>
        </div>
        <div className='text-gray-400'>
          Mapped: <span className='text-emerald-400'>{stats.mapped}</span>
        </div>
        {stats.pending > 0 && (
          <div className='text-gray-400'>
            Unsaved changes: <span className='text-yellow-400'>{stats.pending}</span>
          </div>
        )}
      </div>

      {/* Category Table */}
      <div className='overflow-hidden rounded-md border border-border'>
        <table className='w-full'>
          <thead>
            <tr className='border-b border-border bg-card/50'>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
                External Category
              </th>
              <th className='px-4 py-3 text-left text-xs font-medium uppercase text-gray-400'>
                Internal Category
              </th>
            </tr>
          </thead>
          <tbody>
            {externalCategoriesLoading || mappingsLoading ? (
              <tr>
                <td colSpan={2} className='px-4 py-8 text-center text-gray-500'>
                  Loading categories...
                </td>
              </tr>
            ) : externalCategories.length === 0 ? (
              <tr>
                <td colSpan={2} className='px-4 py-8 text-center text-gray-500'>
                  No external categories found. Click &quot;Fetch Categories&quot; to load from Base.com.
                </td>
              </tr>
            ) : (
              categoryTree.map((category: ExternalCategory) => renderCategory(category, 0))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
