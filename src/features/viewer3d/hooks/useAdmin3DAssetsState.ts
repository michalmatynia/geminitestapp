'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useMemo, useCallback } from 'react';

import { logClientError } from '@/features/observability/utils/client-error-logger';
import { useToast } from '@/shared/ui';

import { 
  useAssets3D, 
  useAsset3DCategories, 
  useAsset3DTags,
  useDeleteAsset3DMutation,
  useReindexAssets3DMutation,
  asset3dKeys
} from '../hooks/useAsset3dQueries';

import type { Asset3DRecord } from '../types';

export type ViewMode = 'grid' | 'list';

export function useAdmin3DAssetsState() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showUploader, setShowUploader] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [editAsset, setEditAsset] = useState<Asset3DRecord | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const filters = useMemo(
    () => ({
      ...(searchQuery && { search: searchQuery }),
      ...(selectedCategory && { category: selectedCategory }),
      ...(selectedTags.length > 0 && { tags: selectedTags }),
    }),
    [searchQuery, selectedCategory, selectedTags]
  );

  const assetsQuery = useAssets3D(filters);
  const categoriesQuery = useAsset3DCategories();
  const tagsQuery = useAsset3DTags();
  const deleteMutation = useDeleteAsset3DMutation();
  const reindexMutation = useReindexAssets3DMutation();

  const assets = assetsQuery.data ?? [];
  const loading = assetsQuery.isPending;
  const error = assetsQuery.error instanceof Error ? assetsQuery.error.message : null;
  const categories = categoriesQuery.data ?? [];
  const allTags = tagsQuery.data ?? [];

  const handleUpload = useCallback((_asset: Asset3DRecord) => {
    setShowUploader(false);
    void queryClient.invalidateQueries({ queryKey: asset3dKeys.all });
  }, [queryClient]);

  const handleEdit = useCallback((_updated: Asset3DRecord) => {
    void queryClient.invalidateQueries({ queryKey: asset3dKeys.all });
  }, [queryClient]);

  const handleDelete = useCallback(async (asset: Asset3DRecord) => {
    if (!confirm(`Are you sure you want to delete "${asset.name || asset.filename}"?`)) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(asset.id);
      toast(`Asset "${asset.name || asset.filename}" deleted.`, { variant: 'success' });
    } catch (err) {
      logClientError(err, { context: { source: 'useAdmin3DAssetsState', action: 'deleteAsset', assetId: asset.id } });
      toast(err instanceof Error ? err.message : 'Failed to delete asset', { variant: 'error' });
    }
  }, [deleteMutation, toast]);

  const handleReindex = useCallback(async () => {
    try {
      await reindexMutation.mutateAsync();
      toast('Assets reindexed successfully.', { variant: 'success' });
      void assetsQuery.refetch();
    } catch (err) {
      logClientError(err, { context: { source: 'useAdmin3DAssetsState', action: 'reindexAssets' } });
      toast(err instanceof Error ? err.message : 'Failed to reindex assets', { variant: 'error' });
    }
  }, [reindexMutation, toast, assetsQuery]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedTags([]);
  }, []);

  const hasActiveFilters = Boolean(searchQuery || selectedCategory || selectedTags.length > 0);

  return {
    showUploader, setShowUploader,
    previewAsset, setPreviewAsset,
    editAsset, setEditAsset,
    viewMode, setViewMode,
    searchQuery, setSearchQuery,
    selectedCategory, setSelectedCategory,
    selectedTags, setSelectedTags,
    showFilters, setShowFilters,
    assets,
    loading,
    error,
    categories,
    allTags,
    handleUpload,
    handleEdit,
    handleDelete,
    handleReindex,
    clearFilters,
    hasActiveFilters,
    isDeleting: (id: string) => deleteMutation.isPending && deleteMutation.variables === id,
    isReindexing: reindexMutation.isPending,
    refetch: () => void assetsQuery.refetch(),
    isFetching: assetsQuery.isFetching,
  };
}
