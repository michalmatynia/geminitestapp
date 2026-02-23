'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useProductFormSubmit } from '@/features/products/hooks/useProductFormSubmit';
import { decodeSimpleParameterStorageId } from '@/features/products/utils/parameter-partition';
import {
  ProductParameterValue,
} from '@/shared/contracts/products';
import type {
  ProductWithImages,
  ProductDraft,
} from '@/shared/contracts/products';

import {
  ProductFormCoreContextType,
  ProductFormCoreProvider,
  useProductFormCore,
} from './ProductFormCoreContext';
import {
  ProductFormImageContextType,
  ProductFormImageProvider,
  useProductFormImages,
} from './ProductFormImageContext';
import {
  ProductFormMetadataContextType,
  ProductFormMetadataProvider,
  useProductFormMetadata,
} from './ProductFormMetadataContext';
import {
  ProductFormParameterContextType,
  ProductFormParameterProvider,
  useProductFormParameters,
} from './ProductFormParameterContext';
import {
  ProductFormStudioContextType,
  ProductFormStudioProvider,
  useProductFormStudio,
} from './ProductFormStudioContext';

type ComparableParameterValue = {
  parameterId: string;
  value: string;
  valuesByLanguage?: Record<string, string>;
};

type NonFormComparableState = {
  selectedCatalogIds: string[];
  selectedCategoryId: string | null;
  selectedTagIds: string[];
  selectedProducerIds: string[];
  selectedNoteIds: string[];
  parameterValues: ComparableParameterValue[];
  imageSlots: string[];
  imageLinks: string[];
  imageBase64s: string[];
};

const normalizeComparableString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeComparableStringList = (values: ReadonlyArray<unknown>): string[] => {
  const unique = new Set<string>();
  values.forEach((value: unknown) => {
    const normalized = normalizeComparableString(value);
    if (!normalized) return;
    unique.add(normalized);
  });
  return Array.from(unique);
};

const normalizeComparableNullableString = (value: unknown): string | null => {
  const normalized = normalizeComparableString(value);
  return normalized || null;
};

const normalizeComparableParameterValues = (
  input: ProductParameterValue[]
): ComparableParameterValue[] => {
  return input
    .map((entry: ProductParameterValue): ComparableParameterValue => {
      const valuesByLanguage =
        entry.valuesByLanguage &&
        typeof entry.valuesByLanguage === 'object' &&
        !Array.isArray(entry.valuesByLanguage)
          ? Object.entries(entry.valuesByLanguage)
            .reduce((acc: Record<string, string>, [lang, value]: [string, unknown]) => {
              const normalizedLang = normalizeComparableString(lang).toLowerCase();
              const normalizedValue = normalizeComparableString(value);
              if (!normalizedLang || !normalizedValue) return acc;
              acc[normalizedLang] = normalizedValue;
              return acc;
            }, {} as Record<string, string>)
          : {};
      const directValue = normalizeComparableString(entry.value);
      const fallbackLocalizedValue =
        valuesByLanguage['default'] ||
        valuesByLanguage['en'] ||
        valuesByLanguage['pl'] ||
        valuesByLanguage['de'] ||
        Object.values(valuesByLanguage).find((value: string): boolean => value.length > 0) ||
        '';
      const normalizedParameterId = decodeSimpleParameterStorageId(
        normalizeComparableString(entry.parameterId)
      );
      return {
        parameterId: normalizedParameterId || '',
        value: directValue || fallbackLocalizedValue,
        ...(Object.keys(valuesByLanguage).length > 0
          ? { valuesByLanguage }
          : {}),
      };
    })
    .filter((entry: ComparableParameterValue): boolean => entry.parameterId.length > 0);
};

const toComparableImageSlot = (slot: any): string => {
  if (!slot) return '';
  if (slot.type === 'existing') {
    return `existing:${normalizeComparableString(slot.data.id)}`;
  }
  const fileRecord =
    slot.data && typeof slot.data === 'object'
      ? (slot.data as Record<string, unknown>)
      : {};
  const sizeValue = fileRecord['size'];
  const lastModifiedValue = fileRecord['lastModified'];
  return [
    'file',
    normalizeComparableString(fileRecord['name']),
    typeof sizeValue === 'number' && Number.isFinite(sizeValue)
      ? String(sizeValue)
      : '0',
    normalizeComparableString(fileRecord['type']),
    typeof lastModifiedValue === 'number' && Number.isFinite(lastModifiedValue)
      ? String(lastModifiedValue)
      : '0',
  ].join(':');
};

const serializeComparableState = (value: NonFormComparableState): string =>
  JSON.stringify(value);

export interface ProductFormContextType
  extends ProductFormCoreContextType,
    ProductFormMetadataContextType,
    ProductFormImageContextType,
    ProductFormParameterContextType,
    ProductFormStudioContextType {}

export const ProductFormContext = createContext<ProductFormContextType | null>(
  null
);

export const useProductFormContext = (): ProductFormContextType => {
  const core = useProductFormCore();
  const metadata = useProductFormMetadata();
  const images = useProductFormImages();
  const parameters = useProductFormParameters();
  const studio = useProductFormStudio();

  return useMemo(
    () => ({
      ...core,
      ...metadata,
      ...images,
      ...parameters,
      ...studio,
    }),
    [core, metadata, images, parameters, studio]
  );
};

function ProductFormSubmitController({
  onSuccess,
  onEditSave,
  children,
}: {
  onSuccess?: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
  children: React.ReactNode;
}) {
  const {
    methods,
    setHandleSubmit,
    setConfirmationModal,
    setHasUnsavedChanges,
    product,
    selectedNoteIds,
    setUploading,
    setUploadError,
    setUploadSuccess,
  } = useProductFormCore();
  const {
    selectedCatalogIds,
    selectedCategoryId,
    selectedTagIds,
    selectedProducerIds,
  } = useProductFormMetadata();
  const {
    imageSlots,
    imageLinks,
    imageBase64s,
    refreshImagesFromProduct,
  } = useProductFormImages();
  const { parameterValues } = useProductFormParameters();
  const { studioProjectId } = useProductFormStudio();

  const {
    handleSubmit,
    uploading,
    uploadError,
    uploadSuccess,
    ConfirmationModal,
  } = useProductFormSubmit({
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
    refreshImages: refreshImagesFromProduct,
    onSuccess,
    onEditSave,
  });

  useEffect(() => {
    setHandleSubmit(handleSubmit);
  }, [handleSubmit, setHandleSubmit]);

  useEffect(() => {
    setConfirmationModal(ConfirmationModal);
  }, [ConfirmationModal, setConfirmationModal]);

  useEffect(() => {
    setUploading(uploading);
  }, [uploading, setUploading]);

  useEffect(() => {
    setUploadError(uploadError);
  }, [uploadError, setUploadError]);

  useEffect(() => {
    setUploadSuccess(uploadSuccess);
  }, [uploadSuccess, setUploadSuccess]);

  // Dirty tracking
  const nonFormDirtyTrackingLockedRef = useRef<boolean>(false);
  const lastEntityIdentityRef = useRef<string>('');
  const lastUploadSuccessRef = useRef<boolean>(false);

  const markNonFormInteraction = (): void => {
    nonFormDirtyTrackingLockedRef.current = true;
  };

  const nonFormComparableKey = useMemo(() => {
    const comparableState: NonFormComparableState = {
      selectedCatalogIds: normalizeComparableStringList(selectedCatalogIds),
      selectedCategoryId: normalizeComparableNullableString(selectedCategoryId),
      selectedTagIds: normalizeComparableStringList(selectedTagIds),
      selectedProducerIds: normalizeComparableStringList(selectedProducerIds),
      selectedNoteIds: normalizeComparableStringList(selectedNoteIds),
      parameterValues: normalizeComparableParameterValues(parameterValues),
      imageSlots: imageSlots.map(toComparableImageSlot),
      imageLinks: imageLinks.map((value: string) => normalizeComparableString(value)),
      imageBase64s: imageBase64s.map((value: string) => normalizeComparableString(value)),
    };
    return serializeComparableState(comparableState);
  }, [
    imageBase64s,
    imageLinks,
    imageSlots,
    parameterValues,
    selectedCatalogIds,
    selectedCategoryId,
    selectedNoteIds,
    selectedProducerIds,
    selectedTagIds,
  ]);

  const [nonFormBaselineKey, setNonFormBaselineKey] = useState<string>(
    nonFormComparableKey
  );

  const entityIdentity = `${product?.id?.trim() ?? ''}`;

  useEffect(() => {
    if (lastEntityIdentityRef.current === entityIdentity) return;
    lastEntityIdentityRef.current = entityIdentity;
    nonFormDirtyTrackingLockedRef.current = false;
    setNonFormBaselineKey(nonFormComparableKey);
  }, [entityIdentity, nonFormComparableKey]);

  useEffect(() => {
    if (nonFormDirtyTrackingLockedRef.current) return;
    setNonFormBaselineKey((previous: string) =>
      previous === nonFormComparableKey ? previous : nonFormComparableKey
    );
  }, [nonFormComparableKey]);

  useEffect(() => {
    const becameSuccessful = uploadSuccess && !lastUploadSuccessRef.current;
    lastUploadSuccessRef.current = uploadSuccess;
    if (!becameSuccessful) return;

    methods.reset(methods.getValues());
    nonFormDirtyTrackingLockedRef.current = false;
    setNonFormBaselineKey(nonFormComparableKey);
  }, [methods, nonFormComparableKey, uploadSuccess]);

  const isDirty = methods.formState.isDirty;
  const hasNonFormUnsavedChanges = nonFormComparableKey !== nonFormBaselineKey;
  const hasUnsavedChanges = isDirty || hasNonFormUnsavedChanges;

  useEffect(() => {
    setHasUnsavedChanges(hasUnsavedChanges);
  }, [hasUnsavedChanges, setHasUnsavedChanges]);

  // Context aggregation for legacy useProductFormContext
  const coreValue = useProductFormCore();
  const metadataValue = useProductFormMetadata();
  const imagesValue = useProductFormImages();
  const parameterValue = useProductFormParameters();
  const studioValue = useProductFormStudio();

  const legacyContextValue = useMemo(
    () => ({
      ...coreValue,
      ...metadataValue,
      ...imagesValue,
      ...parameterValue,
      ...studioValue,
    }),
    [coreValue, metadataValue, imagesValue, parameterValue, studioValue]
  );

  return (
    <ProductFormContext.Provider value={legacyContextValue}>
      <ProductFormInteractionProvider onInteraction={markNonFormInteraction}>
        {children}
      </ProductFormInteractionProvider>
    </ProductFormContext.Provider>
  );
}

// Internal provider to pass markNonFormInteraction to sub-providers
const ProductFormInteractionContext = createContext<(() => void) | null>(null);

function ProductFormInteractionProvider({
  onInteraction,
  children,
}: {
  onInteraction: () => void;
  children: React.ReactNode;
}) {
  return (
    <ProductFormInteractionContext.Provider value={onInteraction}>
      {children}
    </ProductFormInteractionContext.Provider>
  );
}

function useProductFormInteraction() {
  return useContext(ProductFormInteractionContext);
}

export function ProductFormProvider({
  children,
  product,
  draft,
  onSuccess,
  onEditSave,
  requireSku = true,
  initialSku,
  initialCatalogId,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  onSuccess?: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
  requireSku?: boolean;
  initialSku?: string;
  initialCatalogId?: string;
}): React.ReactNode {
  return (
    <ProductFormCoreProvider
      product={product}
      draft={draft}
      requireSku={requireSku}
      initialSku={initialSku}
    >
      <ProductFormSubProviders
        product={product}
        draft={draft}
        initialCatalogId={initialCatalogId}
        onSuccess={onSuccess}
        onEditSave={onEditSave}
      >
        {children}
      </ProductFormSubProviders>
    </ProductFormCoreProvider>
  );
}

function ProductFormSubProviders({
  children,
  product,
  draft,
  initialCatalogId,
  onSuccess,
  onEditSave,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  initialCatalogId?: string;
  onSuccess?: (info?: { queued?: boolean }) => void;
  onEditSave?: (saved: ProductWithImages) => void;
}) {
  return (
    <ProductFormSubmitController onSuccess={onSuccess} onEditSave={onEditSave}>
      <ProductFormSubProvidersInner product={product} draft={draft} initialCatalogId={initialCatalogId}>
        {children}
      </ProductFormSubProvidersInner>
    </ProductFormSubmitController>
  );
}

function ProductFormSubProvidersInner({
  children,
  product,
  draft,
  initialCatalogId,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  initialCatalogId?: string;
}) {
  const onInteraction = useProductFormInteraction() || (() => {});
  const { uploading, uploadError, uploadSuccess } = useProductFormCore();
  
  return (
    <ProductFormMetadataProvider
      product={product}
      draft={draft}
      initialCatalogId={initialCatalogId}
      onInteraction={onInteraction}
    >
       <ProductFormParameterProviderWrapper product={product} draft={draft} onInteraction={onInteraction}>
         <ProductFormStudioProvider product={product}>
           <ProductFormImageProvider
              product={product}
              draft={draft}
              uploading={uploading}
              uploadError={uploadError}
              uploadSuccess={uploadSuccess}
              onInteraction={onInteraction}
            >
              {children}
           </ProductFormImageProvider>
         </ProductFormStudioProvider>
       </ProductFormParameterProviderWrapper>
    </ProductFormMetadataProvider>
  );
}

function ProductFormParameterProviderWrapper({ children, product, draft, onInteraction }: { children: React.ReactNode, product?: ProductWithImages, draft?: ProductDraft | null, onInteraction: () => void }) {
  const { selectedCatalogIds } = useProductFormMetadata();
  return (
    <ProductFormParameterProvider
      product={product}
      draft={draft}
      selectedCatalogIds={selectedCatalogIds}
      onInteraction={onInteraction}
    >
      {children}
    </ProductFormParameterProvider>
  );
}
