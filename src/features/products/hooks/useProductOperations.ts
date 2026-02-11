
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { logClientError } from '@/features/observability';
import type { ProductWithImages } from '@/features/products/types';
import type { ProductDraft } from '@/features/products/types/drafts';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { useToast } from '@/shared/ui';

export function useProductOperations(
  setRefreshTrigger: React.Dispatch<React.SetStateAction<number>>,
): {
  isCreateOpen: boolean;
  setIsCreateOpen: React.Dispatch<React.SetStateAction<boolean>>;
  initialSku: string;
  setInitialSku: React.Dispatch<React.SetStateAction<string>>;
  editingProduct: ProductWithImages | null;
  setEditingProduct: React.Dispatch<React.SetStateAction<ProductWithImages | null>>;
  lastEditedId: string | null;
  actionError: string | null;
  setActionError: React.Dispatch<React.SetStateAction<string | null>>;
  handleOpenCreateModal: () => Promise<void>;
  handleOpenCreateFromDraft: (draft: ProductDraft) => void;
  handleCreateSuccess: (info?: { queued?: boolean }) => void;
  handleEditSuccess: (info?: { queued?: boolean }) => void;
  handleEditSave: (savedProduct: ProductWithImages) => void;
} {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // UI State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [initialSku, setInitialSku] = useState<string>('');
  const [editingProduct, setEditingProduct] =
    useState<ProductWithImages | null>(null);
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOpenCreateModal = async (): Promise<void> => {
    setActionError(null);
    const skuInput = window.prompt('Enter a new unique SKU:');
    if (skuInput === null) return;
    const sku = skuInput.trim().toUpperCase();
    if (!sku) {
      setActionError('SKU is required.');
      return;
    }
    try {
      const products = await queryClient.fetchQuery({
        queryKey: QUERY_KEYS.products.list({ sku }),
        queryFn: async (): Promise<ProductWithImages[]> =>
          await api.get<ProductWithImages[]>(`/api/products?sku=${encodeURIComponent(sku)}`),
      });
      
      if (products.some((p) => p.sku === sku)) {
        setActionError('SKU already exists.');
        return;
      }
    } catch (error) {
      logClientError(error, { context: { source: 'useProductOperations', action: 'validateSku', sku } });
      toast(
        'SKU pre-check failed. You can continue; uniqueness will be validated on save.',
        { variant: 'info' }
      );
    }
    setInitialSku(sku);
    setIsCreateOpen(true);
  };

  const handleOpenCreateFromDraft = (draft: ProductDraft): void => {
    const draftSku =
      typeof draft.sku === 'string' ? draft.sku.trim().toUpperCase() : '';
    setInitialSku(draftSku);
    setIsCreateOpen(true);
  };

  const handleCreateSuccess = (info?: { queued?: boolean }): void => {
    setIsCreateOpen(false);
    setInitialSku('');
    if (!info?.queued) {
      setRefreshTrigger((prev) => prev + 1);
      toast('Product created successfully.', { variant: 'success' });
    }
  };

  const handleEditSuccess = (info?: { queued?: boolean }): void => {
    if (!info?.queued && editingProduct) {
      setLastEditedId(editingProduct.id);
    }
    if (!info?.queued) {
      toast('Product updated successfully.', { variant: 'success' });
    }
  };

  const handleEditSave = (savedProduct: ProductWithImages): void => {
    setLastEditedId(savedProduct.id);
    setEditingProduct(savedProduct);
  };

  return {
    isCreateOpen,
    setIsCreateOpen,
    initialSku,
    setInitialSku,
    editingProduct,
    setEditingProduct,
    lastEditedId,
    actionError,
    setActionError,
    handleOpenCreateModal,
    handleOpenCreateFromDraft,
    handleCreateSuccess,
    handleEditSuccess,
    handleEditSave,
  };
}
