/**
 * Admin 3D Assets State Management Hook
 * 
 * Comprehensive state management for admin 3D asset interfaces.
 * Provides:
 * - Asset listing with filtering and search
 * - Modal state management (upload, preview, edit)
 * - View mode switching (grid/list)
 * - Asset deletion with confirmation dialogs
 * - Reindexing operations with progress feedback
 * - Filter state and UI controls
 * - Error handling and user notifications
 */

'use client';

import { useState, useMemo, useCallback, type Dispatch, type SetStateAction } from 'react';

import type { Asset3DListFilters, Asset3DRecord } from '@/shared/contracts/viewer3d';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  useAssets3D,
  useAsset3DCategories,
  useAsset3DTags,
  useDeleteAsset3DMutation,
  useReindexAssets3DMutation,
} from '../hooks/useAsset3dQueries';

import type { ViewMode } from './view-mode';

interface UseAdmin3DAssetsStateReturn {
  showUploader: boolean;
  setShowUploader: Dispatch<SetStateAction<boolean>>;
  previewAsset: Asset3DRecord | null;
  setPreviewAsset: Dispatch<SetStateAction<Asset3DRecord | null>>;
  editAsset: Asset3DRecord | null;
  setEditAsset: Dispatch<SetStateAction<Asset3DRecord | null>>;
  viewMode: ViewMode;
  setViewMode: Dispatch<SetStateAction<ViewMode>>;
  searchQuery: string;
  setSearchQuery: Dispatch<SetStateAction<string>>;
  selectedCategory: string | null;
  setSelectedCategory: Dispatch<SetStateAction<string | null>>;
  selectedTags: string[];
  setSelectedTags: Dispatch<SetStateAction<string[]>>;
  showFilters: boolean;
  setShowFilters: Dispatch<SetStateAction<boolean>>;
  assets: Asset3DRecord[];
  loading: boolean;
  error: string | null;
  categories: string[];
  allTags: string[];
  handleUpload: (_asset: Asset3DRecord) => void;
  handleEdit: (_updated: Asset3DRecord) => void;
  handleDelete: (asset: Asset3DRecord) => void;
  handleReindex: () => Promise<void>;
  clearFilters: () => void;
  hasActiveFilters: boolean;
  ConfirmationModal: () => React.JSX.Element | null;
  isDeleting: (id: string) => boolean;
  isReindexing: boolean;
  refetch: () => void;
  isFetching: boolean;
}

const getAssetDisplayName = (asset: Asset3DRecord): string => {
  const filename = asset.filename ?? 'asset';
  return asset.name !== '' ? asset.name : filename;
};

function useAdmin3DAssetFilters(
  searchQuery: string,
  selectedCategory: string | null,
  selectedTags: string[]
): Asset3DListFilters {
  return useMemo(
    () => ({
      ...(searchQuery !== '' ? { search: searchQuery } : {}),
      ...(selectedCategory !== null && selectedCategory !== '' ? { categoryId: selectedCategory } : {}),
      ...(selectedTags.length > 0 ? { tags: selectedTags } : {}),
    }),
    [searchQuery, selectedCategory, selectedTags]
  );
}

const useAdmin3DLocalState = (): Pick<
  UseAdmin3DAssetsStateReturn,
  | 'showUploader'
  | 'setShowUploader'
  | 'previewAsset'
  | 'setPreviewAsset'
  | 'editAsset'
  | 'setEditAsset'
  | 'viewMode'
  | 'setViewMode'
  | 'searchQuery'
  | 'setSearchQuery'
  | 'selectedCategory'
  | 'setSelectedCategory'
  | 'selectedTags'
  | 'setSelectedTags'
  | 'showFilters'
  | 'setShowFilters'
> => {
  const [showUploader, setShowUploader] = useState(false);
  const [previewAsset, setPreviewAsset] = useState<Asset3DRecord | null>(null);
  const [editAsset, setEditAsset] = useState<Asset3DRecord | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  return { showUploader, setShowUploader, previewAsset, setPreviewAsset, editAsset, setEditAsset, viewMode, setViewMode, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, selectedTags, setSelectedTags, showFilters, setShowFilters };
};

const useAdmin3DDeleteHandler = ({
  confirm,
  deleteMutation,
  toast,
}: {
  confirm: ReturnType<typeof useConfirm>['confirm'];
  deleteMutation: ReturnType<typeof useDeleteAsset3DMutation>;
  toast: ReturnType<typeof useToast>['toast'];
}): ((asset: Asset3DRecord) => void) =>
  useCallback(
    (asset: Asset3DRecord) => {
      const assetName = getAssetDisplayName(asset);
      confirm({
        title: 'Delete 3D Asset?',
        message: `Are you sure you want to delete "${assetName}"? This action cannot be undone.`,
        confirmText: 'Delete',
        isDangerous: true,
        onConfirm: async () => {
          try {
            await deleteMutation.mutateAsync(asset.id);
            toast(`Asset "${assetName}" deleted.`, { variant: 'success' });
          } catch (err) {
            logClientCatch(err, { source: 'useAdmin3DAssetsState', action: 'deleteAsset', assetId: asset.id });
            toast(err instanceof Error ? err.message : 'Failed to delete asset', { variant: 'error' });
          }
        },
      });
    },
    [confirm, deleteMutation, toast]
  );

const useAdmin3DReindexHandler = (
  reindexMutation: ReturnType<typeof useReindexAssets3DMutation>,
  toast: ReturnType<typeof useToast>['toast']
): (() => Promise<void>) =>
  useCallback(async (): Promise<void> => {
    try {
      await reindexMutation.mutateAsync();
      toast('Assets reindexed successfully.', { variant: 'success' });
    } catch (err) {
      logClientCatch(err, { source: 'useAdmin3DAssetsState', action: 'reindexAssets' });
      toast(err instanceof Error ? err.message : 'Failed to reindex assets', { variant: 'error' });
    }
  }, [reindexMutation, toast]);

/**
 * Hook providing complete state management for admin 3D assets interface
 * @returns Object containing all state, handlers, and UI components needed for admin interface
 */
export function useAdmin3DAssetsState(): UseAdmin3DAssetsStateReturn {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const local = useAdmin3DLocalState();

  const filters = useAdmin3DAssetFilters(local.searchQuery, local.selectedCategory, local.selectedTags);

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

  const handleUpload = useCallback((_asset: Asset3DRecord) => local.setShowUploader(false), [local]);
  const handleEdit = useCallback((_updated: Asset3DRecord) => {}, []);
  const handleDelete = useAdmin3DDeleteHandler({ confirm, deleteMutation, toast });
  const handleReindex = useAdmin3DReindexHandler(reindexMutation, toast);

  const clearFilters = useCallback(() => {
    local.setSearchQuery('');
    local.setSelectedCategory(null);
    local.setSelectedTags([]);
  }, [local]);

  const hasActiveFilters =
    local.searchQuery !== '' ||
    (local.selectedCategory !== null && local.selectedCategory !== '') ||
    local.selectedTags.length > 0;

  const refetch = useCallback((): void => {
    assetsQuery.refetch().catch((err: unknown) => {
      logClientCatch(err, { source: 'useAdmin3DAssetsState', action: 'refetchAssets' });
    });
  }, [assetsQuery]);

  return { ...local, assets, loading, error, categories, allTags, handleUpload, handleEdit, handleDelete, handleReindex, clearFilters, hasActiveFilters, ConfirmationModal, isDeleting: (id: string) => deleteMutation.isPending && deleteMutation.variables === id, isReindexing: reindexMutation.isPending, refetch, isFetching: assetsQuery.isFetching };
}
