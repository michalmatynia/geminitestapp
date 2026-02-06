'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState, useEffect } from 'react';



import type {
  ProductWithImages,
  ProductFormData,
  ProductParameterValue,
} from '@/features/products/types';
import type { ProductImageSlot } from '@/features/products/types/products-ui';
import { useToast } from '@/shared/ui';
import { delay } from '@/shared/utils';

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
  refreshImages: (savedProduct: ProductWithImages) => void;
  onSuccess?: ((info?: { queued?: boolean }) => void) | undefined;
  onEditSave?: ((saved: ProductWithImages) => void) | undefined;
}

export interface UseProductFormSubmitResult {
  handleSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
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
      formData.append('images', slot.data);
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
    .map((entry: ProductParameterValue): { parameterId: string | undefined; value: string } => ({
      parameterId: entry.parameterId?.trim(),
      value: typeof entry.value === 'string' ? entry.value.trim() : '',
    }))
    .filter((entry: { parameterId: string | undefined; value: string }): boolean => !!entry.parameterId);
  formData.append('parameters', JSON.stringify(normalizedParameters));

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
  refreshImages,
  onSuccess,
  onEditSave,
}: UseProductFormSubmitProps): UseProductFormSubmitResult {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
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

    if (!skuValue && hasTempImages) {
      const shouldContinue = window.confirm(
        'This product has images without an SKU. They will stay in the temporary folder until you set an SKU. Continue?'
      );
      if (!shouldContinue) {
        return;
      }
    }

    setUploadError(null);
    setUploadSuccess(false);

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
    );

    try {
      const savedProduct = product
        ? await updateMutation.mutateAsync({ id: product.id, data: formData })
        : await createMutation.mutateAsync(formData);

      const isQueued = savedProduct == null;

      if (isQueued) {
        onSuccess?.({ queued: true });
        return;
      }

      await delay(500);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['products'] }),
        queryClient.invalidateQueries({ queryKey: ['products-count'] }),
      ]);

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
        router.refresh();
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setUploadError(error.message);
      } else {
        setUploadError('An unknown error occurred');
      }
    }
  }, [product, imageSlots, imageLinks, imageBase64s, selectedCatalogIds, selectedCategoryId, selectedTagIds, selectedProducerIds, selectedNoteIds, parameterValues, createMutation, updateMutation, onSuccess, queryClient, refreshImages, onEditSave, toast, router]);

  const submitHandler = useCallback(
    (e?: BaseSyntheticEvent): Promise<void> => methods.handleSubmit(onSubmit)(e),
    [methods, onSubmit]
  );

  return {
    handleSubmit: submitHandler,
    uploading: createMutation.isPending || updateMutation.isPending,
    uploadError,
    uploadSuccess,
  };
}
