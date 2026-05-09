/**
 * 3D Asset List State Management Hook
 * 
 * State management for public 3D asset listing and browsing interfaces.
 * Provides:
 * - Asset listing with filtering and search capabilities
 * - View mode switching (grid/list) and preview modal state
 * - Category and tag filtering with multi-select support
 * - Asset reindexing operations with loading states
 * - Grid item transformation for picker components
 * - Filter state tracking and reset capabilities
 */

'use client';

import { useMemo, useState } from 'react';

import type { Asset3DRecord } from '@/shared/contracts/viewer3d';

import {
  useAssets3D,
  useAsset3DCategories,
  useAsset3DTags,
  useReindexAssets3DMutation,
} from '../hooks/useAsset3dQueries';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import type { ViewMode } from './view-mode';
import type { Asset3DGridItem } from '../components/Asset3DListSubcomponents';

/** Return type interface for the asset list state hook */
export interface UseAsset3DListStateReturn {
  /** Currently previewed asset in modal */
  previewAsset: Asset3DRecord | null;
  /** Setter for preview asset state */
  setPreviewAsset: (asset: Asset3DRecord | null) => void;
  /** Current view mode (grid or list) */
  viewMode: ViewMode;
  /** Setter for view mode */
  setViewMode: (mode: ViewMode) => void;
  /** Current search query string */
  searchQuery: string;
  /** Setter for search query */
  setSearchQuery: (query: string) => void;
  /** Currently selected category filter */
  selectedCategory: string | null;
  /** Setter for category filter */
  setSelectedCategory: (category: string | null) => void;
  /** Currently selected tag filters */
  selectedTags: string[];
  /** Setter for tag filters */
  setSelectedTags: (tags: string[] | ((prev: string[]) => string[])) => void;
  /** Filtered asset list */
  assets: Asset3DRecord[];
  /** Loading state for asset queries */
  loading: boolean;
  /** Error message if queries fail */
  error: string | null;
  /** Available categories for filtering */
  categories: string[];
  /** Available tags for filtering */
  allTags: string[];
  /** Reindexing operation in progress */
  reindexing: boolean;
  /** Function to trigger asset reindexing */
  handleReindex: () => Promise<void>;
  /** Function to refetch asset data */
  refetch: () => void;
  /** Transformed assets for picker components */
  pickerItems: Asset3DGridItem[];
  /** Whether any filters are currently active */
  isFiltered: boolean;
}

/**
 * Hook providing complete state management for 3D asset listing interfaces
 * @returns Object containing all state, handlers, and computed values for asset lists
 */
export function useAsset3DListState(): UseAsset3DListStateReturn {
  /** Modal and UI state */
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  /** Filter state */
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  /** Memoized filter object for API queries */
  const filters = useMemo(
    () => ({
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory && { categoryId: selectedCategory }),
      ...(selectedTags.length > 0 && { tags: selectedTags }),
    }),
    [searchQuery, selectedCategory, selectedTags]
  );

  /** Query hooks for data fetching */
  const assetsQuery = useAssets3D(filters);
  const reindexMutation = useReindexAssets3DMutation();
  const categoriesQuery = useAsset3DCategories();
  const tagsQuery = useAsset3DTags();

  /** Extract data from queries with fallbacks */
  const assets = assetsQuery.data ?? [];
  const loading = assetsQuery.isPending;
  const error = assetsQuery.error instanceof Error ? assetsQuery.error.message : null;
  const categories = categoriesQuery.data ?? [];
  const allTags = tagsQuery.data ?? [];

  /** Handle asset reindexing with error logging */
  const handleReindex = async () => {
    try {
      await reindexMutation.mutateAsync();
    } catch (error) {
      logClientCatch(error, {
        service: 'viewer3d',
        action: 'reindexAssets',
      });
    }
  };

  /** Transform assets into picker component format */
  const pickerItems = useMemo<Asset3DGridItem[]>(
    () =>
      assets.map((asset) => {
        const name = asset.name;
        const filename = asset.filename ?? '';
        
        /** Determine display label priority: name > filename > id */
        let label = asset.id;
        if (name !== '') {
          label = name;
        } else if (filename !== '') {
          label = filename;
        }
        
        return {
          id: asset.id,
          label,
          value: asset,
        };
      }),
    [assets]
  );

  /** Check if any filters are currently active */
  const isFiltered = searchQuery !== '' || (selectedCategory ?? '') !== '' || selectedTags.length > 0;

  return {
    previewAsset,
    setPreviewAsset,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedTags,
    setSelectedTags,
    assets,
    loading,
    error,
    categories,
    allTags,
    reindexing: reindexMutation.isPending,
    handleReindex,
    refetch: () => void assetsQuery.refetch(),
    pickerItems,
    isFiltered,
  };
}
