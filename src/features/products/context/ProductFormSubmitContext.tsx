'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useFormState } from 'react-hook-form';

import { useProductFormSubmit, type UseProductFormSubmitResult } from '@/features/products/hooks/useProductFormSubmit';
import type { ProductCustomFieldValue } from '@/shared/contracts/products/custom-fields';
import type { ProductFormData, ProductImageSlot } from '@/shared/contracts/products/drafts';
import type { ProductParameterValue, ProductWithImages } from '@/shared/contracts/products/product';
import { internalError } from '@/shared/errors/app-error';

import { serializeNonFormComparableState } from './ProductFormContext.dirty-tracking';
import type {
  ProductFormCoreActionsContextType,
  ProductFormCoreContextType,
} from './ProductFormCoreContext';
import {
  useProductFormCoreActions,
  useProductFormCoreState,
} from './ProductFormCoreContext';
import {
  useProductFormCustomFields,
} from './ProductFormCustomFieldContext';
import { useProductFormImages } from './ProductFormImageContext';
import {
  useProductFormMetadata,
} from './ProductFormMetadataContext';
import {
  useProductFormParameters,
} from './ProductFormParameterContext';
import { useProductFormStudio } from './ProductFormStudioContext';
import { useProductFormProviderConfigContext } from './ProductFormProviderConfigContext';

export type ProductFormSubmitContextType = {
  handleSubmit: (e?: React.BaseSyntheticEvent) => Promise<void>;
  ConfirmationModal: React.ComponentType;
};

type ProductFormSubmitControllerProps = {
  children: React.ReactNode;
};

type ProductFormSubmitControllerState = {
  methods: ProductFormCoreContextType['methods'];
  product?: ProductWithImages;
  selectedNoteIds: string[];
  selectedCatalogIds: string[];
  selectedCategoryId: string | null;
  selectedTagIds: string[];
  selectedProducerIds: string[];
  imageSlots: (ProductImageSlot | null)[];
  imageLinks: string[];
  imageBase64s: string[];
  customFieldValues: ProductCustomFieldValue[];
  parameterValues: ProductParameterValue[];
  submitResult: UseProductFormSubmitResult;
};

type ProductFormSubmitEffectsArgs = {
  submitResult: UseProductFormSubmitResult;
  actions: Pick<
    ProductFormCoreActionsContextType,
    | 'setUploading'
    | 'setUploadError'
    | 'setUploadSuccess'
    | 'setHandleSubmit'
    | 'setConfirmationModal'
  >;
};

type ProductFormDirtyTrackingArgs = Omit<ProductFormSubmitControllerState, 'submitResult'> & {
  uploadSuccess: boolean;
  setHasUnsavedChanges: ProductFormCoreActionsContextType['setHasUnsavedChanges'];
  nonFormDirtyTrackingLockedRef: { current: boolean };
};

export const ProductFormSubmitContext = createContext<ProductFormSubmitContextType | null>(null);

export const useProductFormSubmitContext = (): ProductFormSubmitContextType => {
  const context = useContext(ProductFormSubmitContext);
  if (context === null) {
    throw internalError(
      'useProductFormSubmitContext must be used within a ProductFormSubmitContext provider'
    );
  }
  return context;
};

const createEmptySubmitHandler = (): Promise<void> => Promise.resolve();

const createEmptyConfirmationModal = (): null => null;

const useProductFormSubmitControllerState = (): ProductFormSubmitControllerState => {
  const { onSuccess, onEditSave, requireHydratedEditProduct } =
    useProductFormProviderConfigContext();
  const { methods, product, selectedNoteIds } = useProductFormCoreState();
  const { selectedCatalogIds, selectedCategoryId, selectedTagIds, selectedProducerIds } =
    useProductFormMetadata();
  const { imageSlots, imageLinks, imageBase64s, refreshImagesFromProduct } = useProductFormImages();
  const { customFieldValues } = useProductFormCustomFields();
  const { parameterValues } = useProductFormParameters();
  const { studioProjectId } = useProductFormStudio();
  const submitResult = useProductFormSubmit({
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
    refreshImages: refreshImagesFromProduct,
    onSuccess,
    onEditSave,
    requireHydratedEditProduct,
  });

  return {
    methods,
    product,
    selectedNoteIds,
    selectedCatalogIds,
    selectedCategoryId,
    selectedTagIds,
    selectedProducerIds,
    imageSlots,
    imageLinks,
    imageBase64s,
    customFieldValues,
    parameterValues,
    submitResult,
  };
};

const useProductFormSubmitEffects = ({
  submitResult,
  actions,
}: ProductFormSubmitEffectsArgs): void => {
  const {
    setUploading,
    setUploadError,
    setUploadSuccess,
    setHandleSubmit,
    setConfirmationModal,
  } = actions;
  const { handleSubmit, uploading, uploadError, uploadSuccess, ConfirmationModal } = submitResult;

  useEffect((): void => {
    setUploading(uploading);
  }, [uploading, setUploading]);

  useEffect((): void => {
    setUploadError(uploadError);
  }, [uploadError, setUploadError]);

  useEffect((): void => {
    setUploadSuccess(uploadSuccess);
  }, [uploadSuccess, setUploadSuccess]);

  useEffect((): (() => void) => {
    setHandleSubmit(handleSubmit);
    return (): void => {
      setHandleSubmit(createEmptySubmitHandler);
    };
  }, [handleSubmit, setHandleSubmit]);

  useEffect((): (() => void) => {
    setConfirmationModal(ConfirmationModal);
    return (): void => {
      setConfirmationModal(createEmptyConfirmationModal);
    };
  }, [ConfirmationModal, setConfirmationModal]);
};

const useNonFormComparableKey = ({
  selectedCatalogIds,
  selectedCategoryId,
  selectedTagIds,
  selectedProducerIds,
  selectedNoteIds,
  customFieldValues,
  parameterValues,
  imageSlots,
  imageLinks,
  imageBase64s,
}: Pick<
  ProductFormDirtyTrackingArgs,
  | 'selectedCatalogIds'
  | 'selectedCategoryId'
  | 'selectedTagIds'
  | 'selectedProducerIds'
  | 'selectedNoteIds'
  | 'customFieldValues'
  | 'parameterValues'
  | 'imageSlots'
  | 'imageLinks'
  | 'imageBase64s'
>): string =>
  useMemo(
    () =>
      serializeNonFormComparableState({
        selectedCatalogIds,
        selectedCategoryId,
        selectedTagIds,
        selectedProducerIds,
        selectedNoteIds,
        customFieldValues,
        parameterValues,
        imageSlots,
        imageLinks,
        imageBase64s,
      }),
    [
      customFieldValues,
      imageBase64s,
      imageLinks,
      imageSlots,
      parameterValues,
      selectedCatalogIds,
      selectedCategoryId,
      selectedNoteIds,
      selectedProducerIds,
      selectedTagIds,
    ]
  );

const useProductFormDirtyTracking = ({
  methods,
  product,
  uploadSuccess,
  setHasUnsavedChanges,
  nonFormDirtyTrackingLockedRef,
  ...comparableInput
}: ProductFormDirtyTrackingArgs): void => {
  const dirtyTrackingLockedRef = nonFormDirtyTrackingLockedRef;
  const lastEntityIdentityRef = useRef<string>('');
  const lastUploadSuccessRef = useRef<boolean>(false);
  const nonFormComparableKey = useNonFormComparableKey(comparableInput);
  const [nonFormBaselineKey, setNonFormBaselineKey] = useState<string>(nonFormComparableKey);
  const entityIdentity = product?.id.trim() ?? '';
  const { isDirty } = useFormState<ProductFormData>({ control: methods.control });

  useEffect((): void => {
    if (lastEntityIdentityRef.current === entityIdentity) return;
    lastEntityIdentityRef.current = entityIdentity;
    dirtyTrackingLockedRef.current = false;
    setNonFormBaselineKey(nonFormComparableKey);
  }, [dirtyTrackingLockedRef, entityIdentity, nonFormComparableKey]);

  useEffect((): void => {
    if (dirtyTrackingLockedRef.current) return;
    setNonFormBaselineKey((previous: string): string =>
      previous === nonFormComparableKey ? previous : nonFormComparableKey
    );
  }, [dirtyTrackingLockedRef, nonFormComparableKey]);

  useEffect((): void => {
    const becameSuccessful = uploadSuccess && !lastUploadSuccessRef.current;
    lastUploadSuccessRef.current = uploadSuccess;
    if (!becameSuccessful) return;

    methods.reset(methods.getValues());
    dirtyTrackingLockedRef.current = false;
    setNonFormBaselineKey(nonFormComparableKey);
  }, [dirtyTrackingLockedRef, methods, nonFormComparableKey, uploadSuccess]);

  const hasNonFormUnsavedChanges = nonFormComparableKey !== nonFormBaselineKey;
  const hasUnsavedChanges = isDirty || hasNonFormUnsavedChanges;

  useEffect((): void => {
    setHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);
};

export function ProductFormSubmitController({
  children,
}: ProductFormSubmitControllerProps): React.JSX.Element {
  const controllerState = useProductFormSubmitControllerState();
  const actions = useProductFormCoreActions();
  const { nonFormDirtyTrackingLockedRef } = useProductFormProviderConfigContext();
  const { submitResult } = controllerState;

  useProductFormSubmitEffects({ submitResult, actions });
  useProductFormDirtyTracking({
    ...controllerState,
    uploadSuccess: submitResult.uploadSuccess,
    setHasUnsavedChanges: actions.setHasUnsavedChanges,
    nonFormDirtyTrackingLockedRef,
  });

  const submitContextValue = useMemo<ProductFormSubmitContextType>(
    () => ({
      handleSubmit: submitResult.handleSubmit,
      ConfirmationModal: submitResult.ConfirmationModal,
    }),
    [submitResult.ConfirmationModal, submitResult.handleSubmit]
  );

  return (
    <ProductFormSubmitContext.Provider value={submitContextValue}>
      {children}
    </ProductFormSubmitContext.Provider>
  );
}
