
'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { logClientError } from '@/features/observability';
import { getProductListQueryKey } from '@/features/products/hooks/productCache';
import { useDuplicateProduct } from '@/features/products/hooks/useProductsMutations';
import type { ProductWithImages } from '@/shared/contracts/products';
import type { ProductDraftDto } from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';
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
  isPromptOpen: boolean;
  setIsPromptOpen: React.Dispatch<React.SetStateAction<boolean>>;
  lastEditedId: string | null;
  actionError: string | null;
  setActionError: React.Dispatch<React.SetStateAction<string | null>>;
  handleOpenCreateModal: () => void;
  handleConfirmSku: (skuInput: string) => Promise<void>;
  handleOpenCreateFromDraft: (draft: ProductDraftDto) => void;
  handleCreateSuccess: (info?: { queued?: boolean }) => void;
  handleEditSuccess: (info?: { queued?: boolean }) => void;
  handleEditSave: (savedProduct: ProductWithImages) => void;
} {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutateAsync: duplicateProduct } = useDuplicateProduct();

  // UI State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [initialSku, setInitialSku] = useState<string>('');
  const [editingProduct, setEditingProduct] =
    useState<ProductWithImages | null>(null);
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleOpenCreateModal = (): void => {
    setActionError(null);
    setIsPromptOpen(true);
  };

  const handleConfirmSku = async (skuInput: string): Promise<void> => {
    const sku = skuInput.trim().toUpperCase();
    if (!sku) {
      setActionError('SKU is required.');
      return;
    }
    const skuPattern = /^[A-Z0-9-]+$/;
    if (!skuPattern.test(sku)) {
      setActionError('SKU must use uppercase letters, numbers, and dashes only.');
      return;
    }

    try {
      const products = await queryClient.fetchQuery({
        queryKey: getProductListQueryKey({ sku }),
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

    if (editingProduct) {
      // Duplication Flow
      try {
        const duplicated = await duplicateProduct({ id: editingProduct.id, sku });
        setRefreshTrigger((prev: number): number => prev + 1);
        setIsPromptOpen(false);
        setEditingProduct(null);
        toast('Product duplicated.', { variant: 'success' });
        router.push(`/admin/products/${duplicated.id}/edit`);
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to duplicate product.');
      }
    } else {
      // Creation Flow
      setInitialSku(sku);
      setIsPromptOpen(false);
      setIsCreateOpen(true);
    }
  };

  const handleOpenCreateFromDraft = (draft: ProductDraftDto): void => {
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
    isPromptOpen,
    setIsPromptOpen,
    lastEditedId,
    actionError,
    setActionError,
    handleOpenCreateModal,
    handleConfirmSku,
    handleOpenCreateFromDraft,
    handleCreateSuccess,
    handleEditSuccess,
    handleEditSave,
  };
}
