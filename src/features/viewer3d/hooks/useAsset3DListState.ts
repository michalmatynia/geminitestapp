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


export interface UseAsset3DListStateReturn {
  previewAsset: Asset3DRecord | null;
  setPreviewAsset: (asset: Asset3DRecord | null) => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  selectedCategory: string | null;
  setSelectedCategory: (category: string | null) => void;
  selectedTags: string[];
  setSelectedTags: (tags: string[] | ((prev: string[]) => string[])) => void;
  assets: Asset3DRecord[];
  loading: boolean;
  error: string | null;
  categories: string[];
  allTags: string[];
  reindexing: boolean;
  handleReindex: () => Promise<void>;
  refetch: () => void;
}

export function useAsset3DListState(): UseAsset3DListStateReturn {
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const filters = useMemo(
    () => ({
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory && { categoryId: selectedCategory }),
      ...(selectedTags.length > 0 && { tags: selectedTags }),
    }),
    [searchQuery, selectedCategory, selectedTags]
  );

  const assetsQuery = useAssets3D(filters);
  const reindexMutation = useReindexAssets3DMutation();
  const categoriesQuery = useAsset3DCategories();
  const tagsQuery = useAsset3DTags();

  const assets = assetsQuery.data ?? [];
  const loading = assetsQuery.isPending;
  const error = assetsQuery.error instanceof Error ? assetsQuery.error.message : null;
  const categories = categoriesQuery.data ?? [];
  const allTags = tagsQuery.data ?? [];

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
  };
}
