'use client';

// ProductFormCoreContext: provides the core react-hook-form context and
// helpers for product create/edit flows. Responsibilities:
// - Initialize form state, validation schema, and submission lifecycle
// - Offer helpers for normalization and draft bootstrapping used by form tabs
// Keep this module client-only since it integrates with browser APIs and form
// lifecycle hooks.

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createContext,
  useContext,
  type BaseSyntheticEvent,
  useCallback,
  useEffect,
  useState,
  useMemo,
  useRef,
} from 'react';
import {
  type UseFormRegister,
  type UseFormSetValue,
  type UseFormGetValues,
  type FieldErrors,
  useForm,
  type Resolver,
  FormProvider,
  type UseFormReturn,
} from 'react-hook-form';

import { type ProductFormData, type ProductDraft } from '@/shared/contracts/products/drafts';
import {
  type ProductWithImages,
  type ProductNotes,
  normalizeProductMarketplaceContentOverrideDrafts,
} from '@/shared/contracts/products/product';
import { internalError } from '@/shared/errors/app-error';
import { PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER } from '@/shared/lib/products/constants';
import {
  productCreateSchema,
  productUpdateSchema,
} from '@/shared/lib/products/validations/schemas';

const normalizeOptionalString = (value: string | null | undefined): string => value || '';

const normalizeProductFormNotes = (
  value: ProductNotes | null | undefined
): ProductNotes | undefined => {
  if (!value) return undefined;

  const text = typeof value.text === 'string' ? value.text : null;
  const color = typeof value.color === 'string' ? value.color : null;

  if (!text && !color) {
    return undefined;
  }

  return {
    text,
    color,
  };
};

export const resolveProductFormDefaultValues = ({
  product,
  draft,
  initialSku,
}: {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  initialSku?: string;
}): ProductFormData => ({
  name_en: product?.name_en || draft?.name_en || '',
  name_pl: product?.name_pl || draft?.name_pl || '',
  name_de: product?.name_de || draft?.name_de || '',
  price: product?.price ?? draft?.price ?? 0,
  sku: resolveProductFormDefaultSku({ product, draft, initialSku }),
  defaultPriceGroupId: product?.defaultPriceGroupId ?? draft?.defaultPriceGroupId ?? undefined,
  baseProductId: product?.baseProductId ?? draft?.baseProductId ?? undefined,
  importSource: product?.importSource ?? draft?.importSource ?? undefined,
  ean: normalizeOptionalString(product?.ean) || normalizeOptionalString(draft?.ean),
  gtin: normalizeOptionalString(product?.gtin) || normalizeOptionalString(draft?.gtin),
  asin: normalizeOptionalString(product?.asin) || normalizeOptionalString(draft?.asin),
  description_en:
    normalizeOptionalString(product?.description_en) || normalizeOptionalString(draft?.description_en),
  description_pl:
    normalizeOptionalString(product?.description_pl) || normalizeOptionalString(draft?.description_pl),
  description_de:
    normalizeOptionalString(product?.description_de) || normalizeOptionalString(draft?.description_de),
  supplierName:
    normalizeOptionalString(product?.supplierName) || normalizeOptionalString(draft?.supplierName),
  supplierLink:
    normalizeOptionalString(product?.supplierLink) || normalizeOptionalString(draft?.supplierLink),
  priceComment:
    normalizeOptionalString(product?.priceComment) || normalizeOptionalString(draft?.priceComment),
  stock: product?.stock ?? draft?.stock ?? 0,
  sizeLength: product?.sizeLength ?? draft?.sizeLength ?? 0,
  sizeWidth: product?.sizeWidth ?? draft?.sizeWidth ?? 0,
  weight: product?.weight ?? draft?.weight ?? 0,
  length: product?.length ?? draft?.length ?? 0,
  shippingGroupId: product?.shippingGroupId ?? draft?.shippingGroupId ?? '',
  marketplaceContentOverrides: normalizeProductMarketplaceContentOverrideDrafts(
    product?.marketplaceContentOverrides ?? draft?.marketplaceContentOverrides ?? []
  ).map((entry) => ({
    integrationIds: entry.integrationIds,
    title: entry.title ?? '',
    description: entry.description ?? '',
  })),
  notes: normalizeProductFormNotes(product?.notes ?? draft?.notes ?? undefined),
});

export interface ProductFormCoreContextType {
  register: UseFormRegister<ProductFormData>;
  hasUnsavedChanges: boolean;
  errors: FieldErrors<ProductFormData>;
  getValues: UseFormGetValues<ProductFormData>;
  selectedNoteIds: string[];
  generationError: string | null;
  normalizeNameError: string | null;
  product?: ProductWithImages | undefined;
  draft?: ProductDraft | null | undefined;
  ConfirmationModal: React.ComponentType;
  methods: UseFormReturn<ProductFormData>;
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
  validatorSessionKey?: string;
}

export interface ProductFormCoreActionsContextType {
  handleSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  setValue: UseFormSetValue<ProductFormData>;
  toggleNote: (noteId: string) => void;
  removeNote: (noteId: string) => void;
  setGenerationError: (error: string | null) => void;
  setNormalizeNameError: (error: string | null) => void;
  setHandleSubmit: (fn: (e?: BaseSyntheticEvent) => Promise<void>) => void;
  setConfirmationModal: (component: React.ComponentType) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  setUploading: (value: boolean) => void;
  setUploadError: (value: string | null) => void;
  setUploadSuccess: (value: boolean) => void;
}

type ProductFormCoreContextValue = ProductFormCoreContextType & ProductFormCoreActionsContextType;

export const ProductFormCoreStateContext = createContext<ProductFormCoreContextType | null>(null);
export const ProductFormCoreActionsContext = createContext<ProductFormCoreActionsContextType | null>(
  null
);

export const resolveProductFormDefaultSku = ({
  product,
  draft,
  initialSku,
}: {
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  initialSku?: string;
}): string => {
  if (product?.sku) return product.sku;
  if (initialSku) return initialSku;
  if (draft) return PRODUCT_SKU_AUTO_INCREMENT_PLACEHOLDER;
  return '';
};

export function ProductFormCoreProvider({
  children,
  product,
  draft,
  requireSku = true,
  initialSku,
  validatorSessionKey,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  requireSku?: boolean;
  initialSku?: string;
  validatorSessionKey?: string;
}) {
  const formSchema = product || !requireSku ? productUpdateSchema : productCreateSchema;
  const defaultValues = useMemo(
    () => resolveProductFormDefaultValues({ product, draft, initialSku }),
    [draft, initialSku, product]
  );
  const defaultValuesSignature = useMemo(
    () =>
      JSON.stringify({
        productId: product?.id ?? null,
        draftId: draft?.id ?? null,
        values: defaultValues,
      }),
    [defaultValues, draft?.id, product?.id]
  );
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(formSchema) as Resolver<ProductFormData>,
    defaultValues,
  });

  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(() =>
    Array.isArray(product?.noteIds) ? product.noteIds : []
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [handleSubmitFn, setHandleSubmitFn] = useState<(e?: BaseSyntheticEvent) => Promise<void>>(
    () => async () => {}
  );
  const [ConfirmationModal, setConfirmationModal] = useState<React.ComponentType>(() => () => null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [normalizeNameError, setNormalizeNameError] = useState<string | null>(null);
  const hasAppliedInitialDefaultsRef = useRef(false);
  const latestDefaultValuesRef = useRef(defaultValues);

  latestDefaultValuesRef.current = defaultValues;

  useEffect(() => {
    if (!hasAppliedInitialDefaultsRef.current) {
      hasAppliedInitialDefaultsRef.current = true;
      return;
    }

    methods.reset(latestDefaultValuesRef.current, {
      keepDirtyValues: true,
    });
  }, [defaultValuesSignature, methods]);

  const updateHandleSubmit = useCallback((fn: (e?: BaseSyntheticEvent) => Promise<void>): void => {
    setHandleSubmitFn(() => fn);
  }, []);

  const updateConfirmationModal = useCallback((component: React.ComponentType): void => {
    setConfirmationModal(() => component);
  }, []);

  const toggleNote = (noteId: string): void => {
    const id = noteId.trim();
    if (!id) return;
    setSelectedNoteIds((prev: string[]) =>
      prev.includes(id) ? prev.filter((n: string) => n !== id) : [...prev, id]
    );
  };

  const removeNote = (noteId: string): void => {
    const id = noteId.trim();
    if (!id) return;
    setSelectedNoteIds((prev: string[]) => prev.filter((n: string) => n !== id));
  };

  const stateValue = useMemo(
    (): ProductFormCoreContextType => ({
      register: methods.register,
      hasUnsavedChanges,
      errors: methods.formState.errors,
      getValues: methods.getValues,
      selectedNoteIds,
      generationError,
      normalizeNameError,
      product,
      draft,
      ConfirmationModal,
      methods,
      uploading,
      uploadError,
      uploadSuccess,
      validatorSessionKey,
    }),
    [
      methods,
      hasUnsavedChanges,
      selectedNoteIds,
      generationError,
      normalizeNameError,
      product,
      draft,
      ConfirmationModal,
      uploading,
      uploadError,
      uploadSuccess,
      validatorSessionKey,
    ]
  );
  const actionsValue = useMemo(
    (): ProductFormCoreActionsContextType => ({
      handleSubmit: handleSubmitFn,
      setValue: methods.setValue,
      toggleNote,
      removeNote,
      setGenerationError,
      setNormalizeNameError,
      setHandleSubmit: updateHandleSubmit,
      setConfirmationModal: updateConfirmationModal,
      setHasUnsavedChanges,
      setUploading,
      setUploadError,
      setUploadSuccess,
    }),
    [
      handleSubmitFn,
      methods.setValue,
      toggleNote,
      removeNote,
      setGenerationError,
      setNormalizeNameError,
      updateHandleSubmit,
      updateConfirmationModal,
      setHasUnsavedChanges,
      setUploading,
      setUploadError,
      setUploadSuccess,
    ]
  );

  return (
    <ProductFormCoreActionsContext.Provider value={actionsValue}>
      <ProductFormCoreStateContext.Provider value={stateValue}>
        <FormProvider {...methods}>{children}</FormProvider>
      </ProductFormCoreStateContext.Provider>
    </ProductFormCoreActionsContext.Provider>
  );
}

export const useProductFormCoreState = (): ProductFormCoreContextType => {
  const context = useContext(ProductFormCoreStateContext);
  if (!context) {
    throw internalError('useProductFormCoreState must be used within a ProductFormCoreProvider');
  }
  return context;
};

export const useProductFormCoreActions = (): ProductFormCoreActionsContextType => {
  const context = useContext(ProductFormCoreActionsContext);
  if (!context) {
    throw internalError(
      'useProductFormCoreActions must be used within a ProductFormCoreProvider'
    );
  }
  return context;
};

export const useProductFormCore = (): ProductFormCoreContextValue => {
  const state = useProductFormCoreState();
  const actions = useProductFormCoreActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};
