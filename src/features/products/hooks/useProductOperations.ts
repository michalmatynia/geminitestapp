'use client';
// useProductOperations: UI action orchestration for product create/duplicate/edit
// flows. Validates SKUs, triggers duplication, coordinates query prefetches,
// and surfaces toasts and navigation. Keep network calls delegated to mutation
// hooks to preserve single-responsibility and testability.

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'nextjs-toploader/app';
import { useState, type Dispatch, type SetStateAction } from 'react';

import { useDuplicateProduct } from '@/features/products/hooks/useProductsMutations';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { useToast } from '@/shared/ui/toast';

import {
  buildProductOperationsController,
  createProductOperationHandlers,
  type ProductOperationsController,
  type ProductOperationsState,
} from './useProductOperations.helpers';

const useProductOperationsState = (): ProductOperationsState => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [initialSku, setInitialSku] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<ProductWithImages | null>(null);
  const [duplicateSourceProduct, setDuplicateSourceProduct] = useState<ProductWithImages | null>(null);
  const [lastEditedId, setLastEditedId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

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
    setLastEditedId,
    actionError,
    setActionError,
    duplicateSourceProduct,
    setDuplicateSourceProduct,
  };
};

export function useProductOperations(
  setRefreshTrigger: Dispatch<SetStateAction<number>>
): ProductOperationsController {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { mutateAsync: duplicateProduct } = useDuplicateProduct();
  const state = useProductOperationsState();
  const handlers = createProductOperationHandlers({
    duplicateProduct,
    queryClient,
    router,
    setRefreshTrigger,
    state,
    toast,
  });

  return buildProductOperationsController(state, handlers);
}
