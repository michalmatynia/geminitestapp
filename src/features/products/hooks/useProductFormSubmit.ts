'use client';

import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState, useEffect } from 'react';

import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import type {
  ProductWithImages,
  ProductFormData,
  ProductParameterValue,
} from '@/shared/contracts/products';
import type { ProductImageSlot } from '@/shared/contracts/products';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui';

import {
  isEditingProductHydrated,
  markEditingProductHydrated,
} from './editingProductHydration';
import { getProductDetailQueryKey } from './productCache';
import { useCreateProductMutation, useUpdateProductMutation } from './useProductData';

import type { BaseSyntheticEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';

export interface UseProductFormSubmitProps {
  product?: ProductWithImages | undefined;
  methods: UseFormReturn<ProductFormData>;
  imageSlots: (ProductImageSlot | null)[];
  imageLinks: string[];
  imageBase64s: string[];
  selectedCatalogIds: string[];
  selectedCategoryId: string | null;
  selectedTagIds: string[];
  selectedProducerIds: string[];
  selectedNoteIds: string[];
  parameterValues: ProductParameterValue[];
  studioProjectId: string | null;
  refreshImages: (savedProduct: ProductWithImages) => void;
  onSuccess?: ((info?: { queued?: boolean }) => void) | undefined;
  onEditSave?: ((saved: ProductWithImages) => void) | undefined;
  requireHydratedEditProduct?: boolean;
}

export interface UseProductFormSubmitResult {
  handleSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
  ConfirmationModal: React.ComponentType;
}

function buildFormData(
  data: ProductFormData,
  imageSlots: (ProductImageSlot | null)[],
  imageLinks: string[],
  imageBase64s: string[],
  selectedCatalogIds: string[],
  selectedCategoryId: string | null,
  selectedTagIds: string[],
  selectedProducerIds: string[],
  selectedNoteIds: string[],
  parameterValues: ProductParameterValue[],
  studioProjectId: string | null
): FormData {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]: [string, unknown]): void => {
    if (value !== null && value !== undefined) {
      if (typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else if (typeof value === 'string') {
        formData.append(key, value);
      } else {
        formData.append(key, String(value as number | boolean));
      }
    }
  });

  formData.append(
    'imageLinks',
    JSON.stringify(imageLinks.map((link: string): string => link.trim()))
  );
  formData.append(
    'imageBase64s',
    JSON.stringify(imageBase64s.map((link: string): string => link.trim()))
  );

  imageSlots.forEach((slot: ProductImageSlot | null): void => {
    if (slot?.type === 'file') {
      formData.append('images', slot.data as Blob);
    } else if (slot?.type === 'existing') {
      formData.append('imageFileIds', slot.data.id);
    }
  });

  selectedCatalogIds.forEach((catalogId: string): void => {
    formData.append('catalogIds', catalogId);
  });

  if (selectedCategoryId) {
    formData.append('categoryId', selectedCategoryId);
  } else {
    formData.append('categoryId', '');
  }

  selectedTagIds.forEach((tagId: string): void => {
    formData.append('tagIds', tagId);
  });

  selectedProducerIds.forEach((producerId: string): void => {
    formData.append('producerIds', producerId);
  });
  if (selectedProducerIds.length === 0) {
    formData.append('producerIds', '');
  }

  selectedNoteIds.forEach((noteId: string): void => {
    formData.append('noteIds', noteId);
  });
  if (selectedNoteIds.length === 0) {
    formData.append('noteIds', '');
  }

  const normalizedParameters = parameterValues
    .map(
      (
        entry: ProductParameterValue
      ): {
        parameterId: string | undefined;
        value: string;
        valuesByLanguage?: Record<string, string>;
      } => {
        const valuesByLanguage =
          entry.valuesByLanguage &&
          typeof entry.valuesByLanguage === 'object' &&
          !Array.isArray(entry.valuesByLanguage)
            ? Object.entries(entry.valuesByLanguage).reduce(
              (acc: Record<string, string>, [lang, value]: [string, unknown]) => {
                const normalizedLang = lang.trim().toLowerCase();
                const normalizedValue = typeof value === 'string' ? value.trim() : '';
                if (!normalizedLang || !normalizedValue) return acc;
                acc[normalizedLang] = normalizedValue;
                return acc;
              },
              {}
            )
            : {};
        const directValue = typeof entry.value === 'string' ? entry.value.trim() : '';
        const fallbackLocalizedValue =
          valuesByLanguage['default'] ||
          valuesByLanguage['en'] ||
          valuesByLanguage['pl'] ||
          valuesByLanguage['de'] ||
          Object.values(valuesByLanguage).find(
            (value: string): boolean => typeof value === 'string' && value.length > 0
          ) ||
          '';
        return {
          parameterId: decodeSimpleParameterStorageId(entry.parameterId ?? ''),
          value: directValue || fallbackLocalizedValue,
          ...(Object.keys(valuesByLanguage).length > 0 ? { valuesByLanguage } : {}),
        };
      }
    )
    .filter(
      (entry: {
        parameterId: string | undefined;
        value: string;
        valuesByLanguage?: Record<string, string>;
      }): boolean => !!entry.parameterId
    );
  formData.append('parameters', JSON.stringify(normalizedParameters));

  formData.append('studioProjectId', studioProjectId ?? '');

  return formData;
}

type ProductListWithCountShape = {
  products: ProductWithImages[];
  total: number;
};

const patchProductInArray = (
  products: ProductWithImages[],
  savedProduct: ProductWithImages
): ProductWithImages[] => {
  let changed = false;
  const next = products.map((item: ProductWithImages) => {
    if (item.id !== savedProduct.id) return item;
    changed = true;
    return { ...item, ...savedProduct };
  });
  return changed ? next : products;
};

const patchProductInQueryCache = (
  cacheValue: unknown,
  savedProduct: ProductWithImages
): unknown => {
  if (Array.isArray(cacheValue)) {
    return patchProductInArray(cacheValue as ProductWithImages[], savedProduct);
  }
  if (!cacheValue || typeof cacheValue !== 'object') return cacheValue;
  if (!('products' in cacheValue)) return cacheValue;

  const typed = cacheValue as ProductListWithCountShape;
  if (!Array.isArray(typed.products)) return cacheValue;

  const nextProducts = patchProductInArray(typed.products, savedProduct);
  if (nextProducts === typed.products) return cacheValue;
  return {
    ...typed,
    products: nextProducts,
  };
};

const patchProductCaches = (queryClient: QueryClient, savedProduct: ProductWithImages): void => {
  // Update detail caches synchronously — these are small and needed immediately.
  queryClient.setQueryData(
    getProductDetailQueryKey(savedProduct.id),
    (old: ProductWithImages | undefined) => (old ? { ...old, ...savedProduct } : savedProduct)
  );
  queryClient.setQueryData(QUERY_KEYS.products.detailEdit(savedProduct.id), savedProduct);
  // Defer the list patch to the next event-loop tick so the main thread isn't
  // blocked by iterating every cached product-list page synchronously.
  // invalidateProductCachesInBackground will refetch the lists anyway.
  setTimeout(() => {
    queryClient.setQueriesData(
      { queryKey: QUERY_KEYS.products.lists() },
      (old: unknown) => patchProductInQueryCache(old, savedProduct)
    );
  }, 0);
};

const invalidateProductCachesInBackground = (
  queryClient: QueryClient,
  productId: string
): void => {
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.lists() });
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.counts() });
  void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products.detail(productId) });
};

export function useProductFormSubmit({
  product,
  methods,
  imageSlots,
  imageLinks,
  imageBase64s,
  selectedCatalogIds,
  selectedCategoryId,
  selectedTagIds,
  selectedProducerIds,
  selectedNoteIds,
  parameterValues,
  studioProjectId,
  refreshImages,
  onSuccess,
  onEditSave,
  requireHydratedEditProduct = false,
}: UseProductFormSubmitProps): UseProductFormSubmitResult {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { confirm, ConfirmationModal } = useConfirm();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();

  const createMutationRef = useRef(createMutation);
  createMutationRef.current = createMutation;
  const updateMutationRef = useRef(updateMutation);
  updateMutationRef.current = updateMutation;

  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;
  const onEditSaveRef = useRef(onEditSave);
  onEditSaveRef.current = onEditSave;
  const refreshImagesRef = useRef(refreshImages);
  refreshImagesRef.current = refreshImages;

  useEffect((): (() => void) => {
    return (): void => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const onSubmit = useCallback(
    async (data: ProductFormData): Promise<void> => {
      const skuValue = typeof data.sku === 'string' ? data.sku.trim() : '';
      const hasTempImages = imageSlots.some((slot: ProductImageSlot | null): boolean => {
        if (!slot) return false;
        if (slot.type === 'file') return true;
        return slot.previewUrl.startsWith('/uploads/products/temp/');
      });

      const performSubmit = async () => {
        setUploadError(null);
        setUploadSuccess(false);

        if (product && requireHydratedEditProduct && !isEditingProductHydrated(product)) {
          const message = 'Product details are still loading. Wait a moment and try again.';
          setUploadError(message);
          toast(message, { variant: 'warning' });
          return;
        }

        try {
          const formData = buildFormData(
            data,
            imageSlots,
            imageLinks,
            imageBase64s,
            selectedCatalogIds,
            selectedCategoryId,
            selectedTagIds,
            selectedProducerIds,
            selectedNoteIds,
            parameterValues,
            studioProjectId
          );

          const savedProduct = product
            ? await updateMutationRef.current.mutateAsync({ id: product.id, data: formData })
            : await createMutationRef.current.mutateAsync(formData);

          const isQueued = savedProduct == null;

          if (isQueued) {
            onSuccessRef.current?.({ queued: true });
            return;
          }

          const resolvedProduct = savedProduct as ProductWithImages;
          patchProductCaches(queryClient, resolvedProduct);
          invalidateProductCachesInBackground(queryClient, resolvedProduct.id);

          if (!product) {
            onSuccessRef.current?.();
          } else {
            refreshImagesRef.current(resolvedProduct);
            setUploadSuccess(true);
            if (successTimerRef.current) {
              clearTimeout(successTimerRef.current);
            }
            successTimerRef.current = setTimeout(() => {
              setUploadSuccess(false);
            }, 3000);
            if (!onSuccessRef.current) {
              toast('Product updated successfully.', { variant: 'success' });
            }
            onEditSaveRef.current?.(markEditingProductHydrated(resolvedProduct));
            onSuccessRef.current?.();
          }
        } catch (error: unknown) {
          logClientError(error, {
            context: {
              service: 'product-form',
              action: 'submit',
              productId: product?.id,
            },
          });
          if (error instanceof Error) {
            setUploadError(error.message);
          } else {
            setUploadError('An unknown error occurred');
          }
        }
      };

      if (!skuValue && hasTempImages) {
        confirm({
          title: 'Submit without SKU?',
          message:
            'This product has images without an SKU. They will stay in the temporary folder until you set an SKU. Continue anyway?',
          confirmText: 'Continue',
          onConfirm: performSubmit,
        });
        return;
      }

      await performSubmit();
    },
    [
      product,
      imageSlots,
      imageLinks,
      imageBase64s,
      selectedCatalogIds,
      selectedCategoryId,
      selectedTagIds,
      selectedProducerIds,
      selectedNoteIds,
      parameterValues,
      studioProjectId,
      queryClient,
      toast,
      confirm,
    ]
  );

  const submitHandler = useCallback(
    (e?: BaseSyntheticEvent): Promise<void> => methods.handleSubmit(onSubmit)(e),
    [methods, onSubmit]
  );

  return {
    handleSubmit: submitHandler,
    uploading: createMutation.isPending || updateMutation.isPending,
    uploadError,
    uploadSuccess,
    ConfirmationModal,
  };
}
