'use client';

// useProductFormSubmit: orchestrates form submission flows for product
// create/update. Handles serializing FormData, coordinating image uploads,
// showing toasts, and delegating to mutation hooks for server requests.
// Keeps the submission surface separate from form validation/formatting logic.
// useProductFormSubmit: handles form submission for product create/update.
// Builds FormData, normalizes parameters/custom fields, uploads images, and
// uses create/update mutations. Provides hydation guards and optimistic save
// behavior while exposing success/error state and a confirmation modal type.

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';

import type { ProductCustomFieldValue } from '@/shared/contracts/products/custom-fields';
import type { ProductFormData, ProductImageSlot } from '@/shared/contracts/products/drafts';
import type { ProductParameterValue, ProductWithImages } from '@/shared/contracts/products/product';
import { useConfirm } from '@/shared/hooks/ui/useConfirm';
import { useToast } from '@/shared/ui/toast';

import {
  executeProductFormSubmit,
  hasTemporaryProductImages,
  type ProductFormSubmitExecutionResult,
} from './useProductFormSubmit.execution';
import { useCreateProductMutation, useUpdateProductMutation } from './useProductDataMutations';

import type { BaseSyntheticEvent } from 'react';
import type { UseFormReturn } from 'react-hook-form';

export {
  buildProductFormData,
  normalizeProductCustomFieldsForSubmission,
  normalizeProductParametersForSubmission,
  type BuildProductFormDataInput,
} from './useProductFormSubmit.payload';

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
  onSuccess?: ((info?: {
    queued?: boolean;
    product?: ProductWithImages | undefined;
  }) => void) | undefined;
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

type CreateProductMutationRef = MutableRefObject<ReturnType<typeof useCreateProductMutation>>;
type UpdateProductMutationRef = MutableRefObject<ReturnType<typeof useUpdateProductMutation>>;

type LatestSubmitRefs = {
  createMutationRef: CreateProductMutationRef;
  updateMutationRef: UpdateProductMutationRef;
  onSuccessRef: MutableRefObject<UseProductFormSubmitProps['onSuccess']>;
  onEditSaveRef: MutableRefObject<UseProductFormSubmitProps['onEditSave']>;
  refreshImagesRef: MutableRefObject<UseProductFormSubmitProps['refreshImages']>;
};

const useLatestSubmitRefs = (props: {
  createMutation: ReturnType<typeof useCreateProductMutation>;
  updateMutation: ReturnType<typeof useUpdateProductMutation>;
  onSuccess: UseProductFormSubmitProps['onSuccess'];
  onEditSave: UseProductFormSubmitProps['onEditSave'];
  refreshImages: UseProductFormSubmitProps['refreshImages'];
}): LatestSubmitRefs => {
  const createMutationRef = useRef(props.createMutation);
  const updateMutationRef = useRef(props.updateMutation);
  const onSuccessRef = useRef(props.onSuccess);
  const onEditSaveRef = useRef(props.onEditSave);
  const refreshImagesRef = useRef(props.refreshImages);

  createMutationRef.current = props.createMutation;
  updateMutationRef.current = props.updateMutation;
  onSuccessRef.current = props.onSuccess;
  onEditSaveRef.current = props.onEditSave;
  refreshImagesRef.current = props.refreshImages;

  return { createMutationRef, updateMutationRef, onSuccessRef, onEditSaveRef, refreshImagesRef };
};

const acquireSubmitLock = (submitInFlightRef: MutableRefObject<boolean>): boolean => {
  const lockRef = submitInFlightRef;
  if (lockRef.current) return false;
  lockRef.current = true;
  return true;
};

const releaseSubmitLock = (submitInFlightRef: MutableRefObject<boolean>): void => {
  const lockRef = submitInFlightRef;
  lockRef.current = false;
};

const resolveSkuValue = (data: ProductFormData): string =>
  typeof data.sku === 'string' ? data.sku.trim() : '';

type LockedSubmitArgs = {
  submitInFlightRef: MutableRefObject<boolean>;
  setIsSubmitting: (value: boolean) => void;
  setUploadError: (message: string | null) => void;
  setUploadSuccess: (value: boolean) => void;
  operation: () => Promise<ProductFormSubmitExecutionResult | void>;
};

const releaseSubmitLockAfterBackgroundTask = (
  submitInFlightRef: MutableRefObject<boolean>,
  backgroundTask: Promise<void>,
  setIsSubmitting: (value: boolean) => void
): void => {
  void backgroundTask
    .finally((): void => {
      setIsSubmitting(false);
      releaseSubmitLock(submitInFlightRef);
    })
    .catch((): void => undefined);
};

const runSubmitWithLock = async ({
  submitInFlightRef,
  setIsSubmitting,
  setUploadError,
  setUploadSuccess,
  operation,
}: LockedSubmitArgs): Promise<void> => {
  if (!acquireSubmitLock(submitInFlightRef)) return;
  setIsSubmitting(true);
  setUploadError(null);
  setUploadSuccess(false);

  let releaseLockImmediately = true;
  try {
    const result = await operation();
    if (result?.backgroundTask !== undefined) {
      releaseLockImmediately = false;
      releaseSubmitLockAfterBackgroundTask(submitInFlightRef, result.backgroundTask, setIsSubmitting);
      return;
    }
  } finally {
    if (releaseLockImmediately) {
      setIsSubmitting(false);
      releaseSubmitLock(submitInFlightRef);
    }
  }
};

type UseSubmitCallbackArgs = Omit<
  UseProductFormSubmitProps,
  'methods' | 'refreshImages' | 'onSuccess' | 'onEditSave' | 'requireHydratedEditProduct'
> & {
  requireHydratedEditProduct: boolean;
  latestRefs: LatestSubmitRefs;
  confirm: ReturnType<typeof useConfirm>['confirm'];
  toast: ReturnType<typeof useToast>['toast'];
  setIsSubmitting: (value: boolean) => void;
  setUploadError: (message: string | null) => void;
  setUploadSuccess: (value: boolean) => void;
  submitInFlightRef: MutableRefObject<boolean>;
  successTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
};

type ProductFormSubmitState = {
  uploadError: string | null;
  uploadSuccess: boolean;
  isSubmitting: boolean;
  setIsSubmitting: (value: boolean) => void;
  setUploadError: (message: string | null) => void;
  setUploadSuccess: (value: boolean) => void;
  successTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>;
  submitInFlightRef: MutableRefObject<boolean>;
};

const useProductFormSubmitState = (): ProductFormSubmitState => {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const submitInFlightRef = useRef(false);

  return {
    uploadError,
    uploadSuccess,
    isSubmitting,
    setIsSubmitting,
    setUploadError,
    setUploadSuccess,
    successTimerRef,
    submitInFlightRef,
  };
};

const useSuccessTimerCleanup = (
  successTimerRef: MutableRefObject<ReturnType<typeof setTimeout> | null>
): void => {
  useEffect((): (() => void) => {
    return (): void => {
      if (successTimerRef.current !== null) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, [successTimerRef]);
};

const useProductFormSubmitCallback = ({
  latestRefs,
  confirm,
  toast,
  setIsSubmitting,
  setUploadError,
  setUploadSuccess,
  submitInFlightRef,
  successTimerRef,
  ...input
}: UseSubmitCallbackArgs): ((data: ProductFormData) => Promise<void>) =>
  useCallback(
    async (data: ProductFormData): Promise<void> => {
      const performSubmit = async (): Promise<void> => {
        await runSubmitWithLock({
          submitInFlightRef,
          setIsSubmitting,
          setUploadError,
          setUploadSuccess,
          operation: async (): Promise<ProductFormSubmitExecutionResult> => {
            return await executeProductFormSubmit({
              ...input,
              data,
              createProduct: latestRefs.createMutationRef.current.mutateAsync,
              updateProduct: latestRefs.updateMutationRef.current.mutateAsync,
              refreshImages: latestRefs.refreshImagesRef.current,
              onSuccess: latestRefs.onSuccessRef.current,
              onEditSave: latestRefs.onEditSaveRef.current,
              setUploadError,
              setUploadSuccess,
              successTimerRef,
              toast,
            });
          },
        });
      };

      if (resolveSkuValue(data) === '' && hasTemporaryProductImages(input.imageSlots)) {
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
      confirm,
      input,
      latestRefs,
      setIsSubmitting,
      setUploadError,
      setUploadSuccess,
      submitInFlightRef,
      successTimerRef,
      toast,
    ]
  );

export function useProductFormSubmit(
  props: UseProductFormSubmitProps
): UseProductFormSubmitResult {
  const { toast } = useToast();
  const { confirm, ConfirmationModal } = useConfirm();
  const submitState = useProductFormSubmitState();
  const latestRefs = useLatestSubmitRefs({
    createMutation: useCreateProductMutation(),
    updateMutation: useUpdateProductMutation(),
    onSuccess: props.onSuccess,
    onEditSave: props.onEditSave,
    refreshImages: props.refreshImages,
  });

  useSuccessTimerCleanup(submitState.successTimerRef);

  const onSubmit = useProductFormSubmitCallback({
    product: props.product,
    imageSlots: props.imageSlots,
    imageLinks: props.imageLinks,
    imageBase64s: props.imageBase64s,
    selectedCatalogIds: props.selectedCatalogIds,
    selectedCategoryId: props.selectedCategoryId,
    selectedTagIds: props.selectedTagIds,
    selectedProducerIds: props.selectedProducerIds,
    selectedNoteIds: props.selectedNoteIds,
    customFieldValues: props.customFieldValues,
    parameterValues: props.parameterValues,
    studioProjectId: props.studioProjectId,
    requireHydratedEditProduct: props.requireHydratedEditProduct ?? false,
    latestRefs,
    confirm,
    toast,
    setIsSubmitting: submitState.setIsSubmitting,
    setUploadError: submitState.setUploadError,
    setUploadSuccess: submitState.setUploadSuccess,
    submitInFlightRef: submitState.submitInFlightRef,
    successTimerRef: submitState.successTimerRef,
  });

  const submitHandler = useCallback(
    (e?: BaseSyntheticEvent): Promise<void> => props.methods.handleSubmit(onSubmit)(e),
    [props.methods, onSubmit]
  );

  return {
    handleSubmit: submitHandler,
    uploading: submitState.isSubmitting,
    uploadError: submitState.uploadError,
    uploadSuccess: submitState.uploadSuccess,
    ConfirmationModal,
  };
}
