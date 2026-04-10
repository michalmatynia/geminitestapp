'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

import type { ProductWithImages, ProductParameterValue, ResolvedProductParameterValue } from '@/shared/contracts/products/product';
import type { ProductCustomFieldValue } from '@/shared/contracts/products/custom-fields';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductImageSlot } from '@/shared/contracts/products/drafts';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { decodeSimpleParameterStorageId } from '@/shared/lib/products/utils/parameter-partition';
import { normalizeProductCustomFieldValues } from '@/shared/lib/products/utils/custom-field-values';
import {
  mergeProductParameterValue,
  normalizeParameterValuesByLanguage,
  resolveStoredParameterValue,
} from '@/shared/lib/products/utils/parameter-values';
import { useToast } from '@/shared/ui/toast';

import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { isEditingProductHydrated, markEditingProductHydrated } from './editingProductHydration';
import { useCreateProductMutation, useUpdateProductMutation } from './useProductDataMutations';

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
  customFieldValues: ProductCustomFieldValue[];
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

export const normalizeProductParametersForSubmission = (
  parameterValues: ProductParameterValue[]
): ResolvedProductParameterValue[] =>
  Array.from(
    parameterValues.reduce(
      (
        byParameterId: Map<string, ResolvedProductParameterValue>,
        entry: ProductParameterValue
      ): Map<string, ResolvedProductParameterValue> => {
        const valuesByLanguage = normalizeParameterValuesByLanguage(entry.valuesByLanguage);

        const hasLocalizedValues = Object.keys(valuesByLanguage).length > 0;
        const directValue = typeof entry.value === 'string' ? entry.value.trim() : '';
        const normalizedParameterId = decodeSimpleParameterStorageId(
          typeof entry.parameterId === 'string' ? entry.parameterId.trim() : ''
        );

        if (!normalizedParameterId) {
          return byParameterId;
        }

        const existingEntry = byParameterId.get(normalizedParameterId);
        byParameterId.set(
          normalizedParameterId,
          hasLocalizedValues
            ? mergeProductParameterValue(existingEntry, {
              parameterId: normalizedParameterId,
              value: directValue,
              valuesByLanguage,
            })
            : {
              parameterId: normalizedParameterId,
              value: resolveStoredParameterValue({}, directValue),
            }
        );
        return byParameterId;
      },
      new Map<string, ResolvedProductParameterValue>()
    ).values()
  );

export const normalizeProductCustomFieldsForSubmission = (
  customFieldValues: ProductCustomFieldValue[]
): ProductCustomFieldValue[] => normalizeProductCustomFieldValues(customFieldValues);

type BuildProductFormDataInput = {
  data: ProductFormData;
  imageSlots: (ProductImageSlot | null)[];
  imageLinks: string[];
  imageBase64s: string[];
  selectedCatalogIds: string[];
  selectedCategoryId: string | null;
  selectedTagIds: string[];
  selectedProducerIds: string[];
  selectedNoteIds: string[];
  customFieldValues: ProductCustomFieldValue[];
  parameterValues: ProductParameterValue[];
  studioProjectId: string | null;
};

const MANAGED_FORM_DATA_FIELDS = new Set<string>([
  'catalogIds',
  'categoryId',
  'customFields',
  'imageBase64s',
  'imageLinks',
  'noteIds',
  'parameters',
  'producerIds',
  'studioProjectId',
  'tagIds',
]);

function buildFormData(input: BuildProductFormDataInput): FormData {
  const {
    data,
    imageSlots,
    imageLinks,
    imageBase64s,
    selectedCatalogIds,
    selectedCategoryId,
    selectedTagIds,
    selectedProducerIds,
    selectedNoteIds,
    customFieldValues,
    parameterValues,
    studioProjectId,
  } = input;
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]: [string, unknown]): void => {
    if (MANAGED_FORM_DATA_FIELDS.has(key)) {
      return;
    }
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

  const normalizedCustomFields = normalizeProductCustomFieldsForSubmission(customFieldValues);
  formData.append('customFields', JSON.stringify(normalizedCustomFields));

  const normalizedParameters = normalizeProductParametersForSubmission(parameterValues);
  formData.append('parameters', JSON.stringify(normalizedParameters));

  formData.append('studioProjectId', studioProjectId ?? '');

  return formData;
}

export function useProductFormSubmit(
  props: UseProductFormSubmitProps
): UseProductFormSubmitResult {
  const {
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
    customFieldValues,
    parameterValues,
    studioProjectId,
    refreshImages,
    onSuccess,
    onEditSave,
    requireHydratedEditProduct = false,
  } = props;

  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  // Track submitting state explicitly instead of relying on mutation.isPending.
  // In TanStack Query v5, isPending stays true during async onSuccess callbacks
  // (invalidation, cache patching) which can delay the UI from exiting "saving" state.
  // The finally block guarantees this resets even if onSuccess hangs.
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        setIsSubmitting(true);
        setUploadError(null);
        setUploadSuccess(false);

        try {
          if (product && requireHydratedEditProduct && !isEditingProductHydrated(product)) {
            const message = 'Product details are still loading. Wait a moment and try again.';
            setUploadError(message);
            toast(message, { variant: 'warning' });
            return;
          }

          const formData = buildFormData({
            data,
            imageSlots,
            imageLinks,
            imageBase64s,
            selectedCatalogIds,
            selectedCategoryId,
            selectedTagIds,
            selectedProducerIds,
            selectedNoteIds,
            customFieldValues,
            parameterValues,
            studioProjectId,
          });

          const savedProduct = product
            ? await updateMutationRef.current.mutateAsync({
              id: product.id,
              data: formData,
              originalSku:
                typeof product.sku === 'string' && product.sku.trim().length > 0
                  ? product.sku.trim()
                  : undefined,
              originalNameEn:
                typeof product.name_en === 'string' && product.name_en.trim().length > 0
                  ? product.name_en.trim()
                  : undefined,
            })
            : await createMutationRef.current.mutateAsync(formData);

          const isQueued = savedProduct == null;

          if (isQueued) {
            onSuccessRef.current?.({ queued: true });
            return;
          }

          const resolvedProduct = savedProduct as ProductWithImages;
          // Note: Cache patching and background invalidation are now handled
          // declaratively within the mutation's invalidate callback in useProductData.ts

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
          logClientCatch(error, {
            service: 'product-form',
            action: 'submit',
            productId: product?.id,
          });
          if (error instanceof Error) {
            setUploadError(error.message);
          } else {
            setUploadError('An unknown error occurred');
          }
        } finally {
          setIsSubmitting(false);
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
      customFieldValues,
      parameterValues,
      studioProjectId,
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
    uploading: isSubmitting,
    uploadError,
    uploadSuccess,
    ConfirmationModal,
  };
}
