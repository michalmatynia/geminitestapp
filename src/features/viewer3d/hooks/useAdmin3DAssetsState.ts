'use client';


import { useState, useMemo, useCallback } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import type { Asset3dViewMode, Asset3DRecord } from '@/shared/contracts/viewer3d';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui';

import {
  useAssets3D,
  useAsset3DCategories,
  useAsset3DTags,
  useDeleteAsset3DMutation,
  useReindexAssets3DMutation,
} from '../hooks/useAsset3dQueries';

export type ViewMode = Asset3dViewMode;

export function useAdmin3DAssetsState() {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
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
      ...(selectedCategory && { categoryId: selectedCategory }),
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

  const handleUpload = useCallback(
    (_asset: Asset3DRecord) => {
      setShowUploader(false);
    },
    []
  );

  const handleEdit = useCallback(
    (_updated: Asset3DRecord) => {
    },
    []
  );

  const handleDelete = useCallback(
    async (asset: Asset3DRecord) => {
      confirm({
        title: 'Delete 3D Asset?',
        message: `Are you sure you want to delete "${asset.name || asset.filename}"? This action cannot be undone.`,
        confirmText: 'Delete',
        isDangerous: true,
        onConfirm: async () => {
          try {
            await deleteMutation.mutateAsync(asset.id);
            toast(`Asset "${asset.name || asset.filename}" deleted.`, { variant: 'success' });
          } catch (err) {
            logClientError(err, {
              context: {
                source: 'useAdmin3DAssetsState',
                action: 'deleteAsset',
                assetId: asset.id,
              },
            });
            toast(err instanceof Error ? err.message : 'Failed to delete asset', {
              variant: 'error',
            });
          }
        },
      });
    },
    [confirm, deleteMutation, toast]
  );

  const handleReindex = useCallback(async () => {
    try {
      await reindexMutation.mutateAsync();
      toast('Assets reindexed successfully.', { variant: 'success' });
    } catch (err) {
      logClientError(err, {
        context: { source: 'useAdmin3DAssetsState', action: 'reindexAssets' },
      });
      toast(err instanceof Error ? err.message : 'Failed to reindex assets', { variant: 'error' });
    }
  }, [reindexMutation, toast]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory(null);
    setSelectedTags([]);
  }, []);

  const hasActiveFilters = Boolean(searchQuery || selectedCategory || selectedTags.length > 0);

  return {
    showUploader,
    setShowUploader,
    previewAsset,
    setPreviewAsset,
    editAsset,
    setEditAsset,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    selectedTags,
    setSelectedTags,
    showFilters,
    setShowFilters,
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
    ConfirmationModal,
    isDeleting: (id: string) => deleteMutation.isPending && deleteMutation.variables === id,
    isReindexing: reindexMutation.isPending,
    refetch: () => void assetsQuery.refetch(),
    isFetching: assetsQuery.isFetching,
  };
}
