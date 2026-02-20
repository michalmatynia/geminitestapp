'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useRef, useState, useEffect } from 'react';



import { logClientError } from '@/features/observability/utils/client-error-logger';
import type {
  ProductWithImages,
  ProductFormData,
  ProductParameterValue,
} from '@/shared/contracts/products';
import type { ProductImageSlot } from '@/shared/contracts/products';
import { decodeSimpleParameterStorageId } from '@/features/products/utils/parameter-partition';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui';
import { delay } from '@/shared/utils';

import { invalidateProductsAndCounts } from './productCache';
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
  studioProjectId: string | null,
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

  formData.append('imageLinks', JSON.stringify(imageLinks.map((link: string): string => link.trim())));
  formData.append('imageBase64s', JSON.stringify(imageBase64s.map((link: string): string => link.trim())));

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
    .map((entry: ProductParameterValue): {
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
              const normalizedValue =
                typeof value === 'string' ? value.trim() : '';
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
        ...(Object.keys(valuesByLanguage).length > 0
          ? { valuesByLanguage }
          : {}),
      };
    })
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
}: UseProductFormSubmitProps): UseProductFormSubmitResult {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { confirm, ConfirmationModal } = useConfirm();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();

  useEffect((): (() => void) => {
    return (): void => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const onSubmit = useCallback(async (data: ProductFormData): Promise<void> => {
    const skuValue = typeof data.sku === 'string' ? data.sku.trim() : '';
    const hasTempImages = imageSlots.some((slot: ProductImageSlot | null): boolean => {
      if (!slot) return false;
      if (slot.type === 'file') return true;
      return slot.previewUrl.startsWith('/uploads/products/temp/');
    });

    const performSubmit = async () => {
      setUploadError(null);
      setUploadSuccess(false);

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
          studioProjectId,
        );

        const savedProduct = product
          ? await updateMutation.mutateAsync({ id: product.id, data: formData })
          : await createMutation.mutateAsync(formData);

        const isQueued = savedProduct == null;

        if (isQueued) {
          onSuccess?.({ queued: true });
          return;
        }

        await delay(500);

        await invalidateProductsAndCounts(queryClient);

        if (!product) {
          onSuccess?.();
        } else {
          refreshImages(savedProduct as ProductWithImages);
          setUploadSuccess(true);
          if (successTimerRef.current) {
            clearTimeout(successTimerRef.current);
          }
          successTimerRef.current = setTimeout(() => {
            setUploadSuccess(false);
          }, 3000);
          if (!onSuccess) {
            toast('Product updated successfully.', { variant: 'success' });
          }
          onEditSave?.(savedProduct as ProductWithImages);
          onSuccess?.();
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
        message: 'This product has images without an SKU. They will stay in the temporary folder until you set an SKU. Continue anyway?',
        confirmText: 'Continue',
        onConfirm: performSubmit
      });
      return;
    }

    await performSubmit();
  }, [product, imageSlots, imageLinks, imageBase64s, selectedCatalogIds, selectedCategoryId, selectedTagIds, selectedProducerIds, selectedNoteIds, parameterValues, studioProjectId, createMutation, updateMutation, onSuccess, queryClient, refreshImages, onEditSave, toast, confirm]);

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
