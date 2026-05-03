import type { QueryClient } from '@tanstack/react-query';
import type { Dispatch, SetStateAction } from 'react';
import type { useRouter } from 'nextjs-toploader/app';

import { getProductListQueryKey } from '@/features/products/hooks/productCache';
import type { useDuplicateProduct } from '@/features/products/hooks/useProductsMutations';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { api } from '@/shared/lib/api-client';
import { PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER } from '@/shared/lib/products/constants';
import { fetchQueryV2 } from '@/shared/lib/query-factories-v2';
import { normalizeQueryKey } from '@/shared/lib/query-key-utils';
import type { useToast } from '@/shared/ui/toast';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

const SKU_LOOKUP_TIMEOUT_MS = 30_000;
const PRODUCT_SKU_PATTERN = /^[A-Z0-9-]+$/;

export type ProductOperationInfo = { queued?: boolean };

export type ProductOperationsController = {
  isCreateOpen: boolean;
  setIsCreateOpen: Dispatch<SetStateAction<boolean>>;
  initialSku: string;
  setInitialSku: Dispatch<SetStateAction<string>>;
  editingProduct: ProductWithImages | null;
  setEditingProduct: Dispatch<SetStateAction<ProductWithImages | null>>;
  isPromptOpen: boolean;
  setIsPromptOpen: Dispatch<SetStateAction<boolean>>;
  lastEditedId: string | null;
  actionError: string | null;
  setActionError: Dispatch<SetStateAction<string | null>>;
  handleOpenCreateModal: () => void;
  handleOpenDuplicateModal: (product: ProductWithImages) => void;
  handleConfirmSku: (skuInput: string) => Promise<void>;
  handleOpenCreateFromDraft: (draft: ProductDraft) => void;
  handleCreateSuccess: (info?: ProductOperationInfo) => void;
  handleEditSuccess: (info?: ProductOperationInfo) => void;
  handleEditSave: (savedProduct: ProductWithImages) => void;
};

export type ProductOperationsState = {
  isCreateOpen: boolean;
  setIsCreateOpen: Dispatch<SetStateAction<boolean>>;
  initialSku: string;
  setInitialSku: Dispatch<SetStateAction<string>>;
  editingProduct: ProductWithImages | null;
  setEditingProduct: Dispatch<SetStateAction<ProductWithImages | null>>;
  isPromptOpen: boolean;
  setIsPromptOpen: Dispatch<SetStateAction<boolean>>;
  lastEditedId: string | null;
  setLastEditedId: Dispatch<SetStateAction<string | null>>;
  actionError: string | null;
  setActionError: Dispatch<SetStateAction<string | null>>;
  duplicateSourceProduct: ProductWithImages | null;
  setDuplicateSourceProduct: Dispatch<SetStateAction<ProductWithImages | null>>;
};

type ProductOperationHandlers = Pick<
  ProductOperationsController,
  | 'handleConfirmSku'
  | 'handleCreateSuccess'
  | 'handleEditSave'
  | 'handleEditSuccess'
  | 'handleOpenCreateFromDraft'
  | 'handleOpenCreateModal'
  | 'handleOpenDuplicateModal'
>;

type DuplicateProductMutation = ReturnType<typeof useDuplicateProduct>['mutateAsync'];
type ProductRouter = ReturnType<typeof useRouter>;
type ProductToast = ReturnType<typeof useToast>['toast'];

type ProductOperationHandlerDependencies = {
  duplicateProduct: DuplicateProductMutation;
  queryClient: QueryClient;
  router: ProductRouter;
  setRefreshTrigger: Dispatch<SetStateAction<number>>;
  state: ProductOperationsState;
  toast: ProductToast;
};

const resolveValidatedSku = (
  skuInput: string,
  setActionError: Dispatch<SetStateAction<string | null>>
): string | null => {
  const sku = skuInput.trim().toUpperCase();
  if (sku.length === 0) {
    setActionError('SKU is required.');
    return null;
  }
  if (!PRODUCT_SKU_PATTERN.test(sku)) {
    setActionError('SKU must use uppercase letters, numbers, and dashes only.');
    return null;
  }
  return sku;
};

const loadProductsBySku = async (
  queryClient: QueryClient,
  sku: string
): Promise<ProductWithImages[]> => {
  const queryKey = normalizeQueryKey(getProductListQueryKey({ sku }));
  return await fetchQueryV2<ProductWithImages[]>(queryClient, {
    queryKey,
    queryFn: async (): Promise<ProductWithImages[]> =>
      await api.get<ProductWithImages[]>(`/api/v2/products?sku=${encodeURIComponent(sku)}`, {
        timeout: SKU_LOOKUP_TIMEOUT_MS,
      }),
    staleTime: 0,
    meta: {
      source: 'products.hooks.useProductOperations.validateSku',
      operation: 'list',
      resource: 'products.validate-sku',
      domain: 'products',
      queryKey,
      tags: ['products', 'validate', 'sku'],
      description: 'Loads products validate sku.',
    },
  })();
};

const checkSkuAvailability = async ({
  queryClient,
  setActionError,
  sku,
  toast,
}: {
  queryClient: QueryClient;
  setActionError: Dispatch<SetStateAction<string | null>>;
  sku: string;
  toast: ProductToast;
}): Promise<boolean> => {
  try {
    const products = await loadProductsBySku(queryClient, sku);
    if (products.some((product: ProductWithImages) => product.sku === sku)) {
      setActionError('SKU already exists.');
      return false;
    }
  } catch (error) {
    logClientCatch(error, { source: 'useProductOperations', action: 'validateSku', sku });
    toast('SKU pre-check failed. You can continue; uniqueness will be validated on save.', {
      variant: 'info',
    });
  }
  return true;
};

const resetPrompt = (state: ProductOperationsState): void => {
  state.setActionError(null);
  state.setEditingProduct(null);
  state.setIsCreateOpen(false);
  state.setInitialSku('');
  state.setIsPromptOpen(true);
};

const openCreateForSku = (state: ProductOperationsState, sku: string): void => {
  state.setDuplicateSourceProduct(null);
  state.setInitialSku(sku);
  state.setIsPromptOpen(false);
  state.setIsCreateOpen(true);
};

const duplicateProductForSku = async ({
  duplicateProduct,
  duplicateSourceProduct,
  router,
  setRefreshTrigger,
  sku,
  state,
  toast,
}: {
  duplicateProduct: DuplicateProductMutation;
  duplicateSourceProduct: ProductWithImages;
  router: ProductRouter;
  setRefreshTrigger: Dispatch<SetStateAction<number>>;
  sku: string;
  state: ProductOperationsState;
  toast: ProductToast;
}): Promise<void> => {
  try {
    const duplicated = await duplicateProduct({ id: duplicateSourceProduct.id, sku });
    setRefreshTrigger((prev: number): number => prev + 1);
    state.setIsPromptOpen(false);
    state.setDuplicateSourceProduct(null);
    toast('Product duplicated.', { variant: 'success' });
    router.push(`/admin/products/${duplicated.id}/edit`);
  } catch (error) {
    logClientCatch(error, {
      source: 'useProductOperations',
      action: 'duplicateProduct',
      sourceProductId: duplicateSourceProduct.id,
      sku,
    });
    state.setActionError(error instanceof Error ? error.message : 'Failed to duplicate product.');
  }
};

const isQueuedOperation = (info?: ProductOperationInfo): boolean => info?.queued === true;

const createHandleConfirmSku = ({
  duplicateProduct,
  queryClient,
  router,
  setRefreshTrigger,
  state,
  toast,
}: ProductOperationHandlerDependencies): ProductOperationHandlers['handleConfirmSku'] =>
  async (skuInput: string): Promise<void> => {
    state.setActionError(null);
    const sku = resolveValidatedSku(skuInput, state.setActionError);
    if (sku === null) return;
    const isAvailable = await checkSkuAvailability({
      queryClient,
      setActionError: state.setActionError,
      sku,
      toast,
    });
    if (!isAvailable) return;

    if (state.duplicateSourceProduct !== null) {
      await duplicateProductForSku({
        duplicateProduct,
        duplicateSourceProduct: state.duplicateSourceProduct,
        router,
        setRefreshTrigger,
        sku,
        state,
        toast,
      });
      return;
    }

    openCreateForSku(state, sku);
  };

export const createProductOperationHandlers = (
  dependencies: ProductOperationHandlerDependencies
): ProductOperationHandlers => {
  const { setRefreshTrigger, state, toast } = dependencies;

  return {
    handleOpenCreateModal: () => {
      resetPrompt(state);
      state.setDuplicateSourceProduct(null);
    },
    handleOpenDuplicateModal: (product: ProductWithImages) => {
      resetPrompt(state);
      state.setDuplicateSourceProduct(product);
    },
    handleConfirmSku: createHandleConfirmSku(dependencies),
    handleOpenCreateFromDraft: () => {
      state.setDuplicateSourceProduct(null);
      state.setInitialSku(PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER);
      state.setIsCreateOpen(true);
    },
    handleCreateSuccess: (info?: ProductOperationInfo) => {
      state.setIsCreateOpen(false);
      state.setInitialSku('');
      if (!isQueuedOperation(info)) {
        setRefreshTrigger((prev) => prev + 1);
        toast('Product created successfully.', { variant: 'success' });
      }
    },
    handleEditSuccess: (info?: ProductOperationInfo) => {
      if (!isQueuedOperation(info) && state.editingProduct !== null) {
        state.setLastEditedId(state.editingProduct.id);
      }
      if (!isQueuedOperation(info)) {
        toast('Product updated successfully.', { variant: 'success' });
      }
    },
    handleEditSave: (savedProduct: ProductWithImages) => {
      state.setLastEditedId(savedProduct.id);
      state.setEditingProduct(savedProduct);
    },
  };
};

export const buildProductOperationsController = (
  state: ProductOperationsState,
  handlers: ProductOperationHandlers
): ProductOperationsController => ({
  isCreateOpen: state.isCreateOpen,
  setIsCreateOpen: state.setIsCreateOpen,
  initialSku: state.initialSku,
  setInitialSku: state.setInitialSku,
  editingProduct: state.editingProduct,
  setEditingProduct: state.setEditingProduct,
  isPromptOpen: state.isPromptOpen,
  setIsPromptOpen: state.setIsPromptOpen,
  lastEditedId: state.lastEditedId,
  actionError: state.actionError,
  setActionError: state.setActionError,
  ...handlers,
});
