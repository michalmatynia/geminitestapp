'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createContext,
  useContext,
  BaseSyntheticEvent,
  useState,
  useMemo,
} from 'react';
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormGetValues,
  FieldErrors,
  useForm,
  Resolver,
  FormProvider,
  UseFormReturn,
} from 'react-hook-form';

import {
  productCreateSchema,
  productUpdateSchema,
} from '@/features/products/validations/schemas';
import {
  ProductFormData,
  ProductWithImages,
  ProductDraft,
} from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';

export interface ProductFormCoreContextType {
  register: UseFormRegister<ProductFormData>;
  handleSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  hasUnsavedChanges: boolean;
  errors: FieldErrors<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
  getValues: UseFormGetValues<ProductFormData>;
  selectedNoteIds: string[];
  toggleNote: (noteId: string) => void;
  removeNote: (noteId: string) => void;
  generationError: string | null;
  setGenerationError: (error: string | null) => void;
  product?: ProductWithImages | undefined;
  draft?: ProductDraft | null | undefined;
  ConfirmationModal: React.ComponentType;
  methods: UseFormReturn<ProductFormData>;
  setHandleSubmit: (
    fn: (e?: BaseSyntheticEvent) => Promise<void>
  ) => void;
  setConfirmationModal: (component: React.ComponentType) => void;
  setHasUnsavedChanges: (value: boolean) => void;
  uploading: boolean;
  setUploading: (value: boolean) => void;
  uploadError: string | null;
  setUploadError: (value: string | null) => void;
  uploadSuccess: boolean;
  setUploadSuccess: (value: boolean) => void;
}

export const ProductFormCoreContext =
  createContext<ProductFormCoreContextType | null>(null);

export function ProductFormCoreProvider({
  children,
  product,
  draft,
  requireSku = true,
  initialSku,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  draft?: ProductDraft | null;
  requireSku?: boolean;
  initialSku?: string;
}) {
  const formSchema =
    product || !requireSku ? productUpdateSchema : productCreateSchema;
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(formSchema) as Resolver<ProductFormData>,
    defaultValues: {
      name_en: product?.name_en || draft?.name_en || '',
      name_pl: product?.name_pl || draft?.name_pl || '',
      name_de: product?.name_de || draft?.name_de || '',
      price: product?.price ?? draft?.price ?? 0,
      sku: product?.sku || initialSku || draft?.sku || '',
      defaultPriceGroupId:
        product?.defaultPriceGroupId ?? draft?.defaultPriceGroupId ?? undefined,
      baseProductId:
        product?.baseProductId ?? draft?.baseProductId ?? undefined,
      ean: product?.ean || draft?.ean || '',
      gtin: product?.gtin || draft?.gtin || '',
      asin: product?.asin || draft?.asin || '',
      description_en: product?.description_en || draft?.description_en || '',
      description_pl: product?.description_pl || draft?.description_pl || '',
      description_de: product?.description_de || draft?.description_de || '',
      supplierName: product?.supplierName || draft?.supplierName || '',
      supplierLink: product?.supplierLink || draft?.supplierLink || '',
      priceComment: product?.priceComment || draft?.priceComment || '',
      stock: product?.stock ?? draft?.stock ?? 0,
      sizeLength: product?.sizeLength ?? draft?.sizeLength ?? 0,
      sizeWidth: product?.sizeWidth ?? draft?.sizeWidth ?? 0,
      weight: product?.weight ?? draft?.weight ?? 0,
      length: product?.length ?? draft?.length ?? 0,
    },
  });

  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(() =>
    Array.isArray(product?.noteIds) ? product.noteIds : []
  );
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [handleSubmitFn, setHandleSubmitFn] = useState<
    (e?: BaseSyntheticEvent) => Promise<void>
  >(() => async () => {});
  const [ConfirmationModal, setConfirmationModal] = useState<
    React.ComponentType
  >(() => () => null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

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
    setSelectedNoteIds((prev: string[]) =>
      prev.filter((n: string) => n !== id)
    );
  };

  const value = useMemo(
    () => ({
      register: methods.register,
      handleSubmit: handleSubmitFn,
      hasUnsavedChanges,
      errors: methods.formState.errors,
      setValue: methods.setValue,
      getValues: methods.getValues,
      selectedNoteIds,
      toggleNote,
      removeNote,
      generationError,
      setGenerationError,
      product,
      draft,
      ConfirmationModal,
      methods,
      setHandleSubmit: setHandleSubmitFn,
      setConfirmationModal,
      setHasUnsavedChanges,
      uploading,
      setUploading,
      uploadError,
      setUploadError,
      uploadSuccess,
      setUploadSuccess,
    }),
    [
      methods,
      handleSubmitFn,
      hasUnsavedChanges,
      selectedNoteIds,
      generationError,
      product,
      draft,
      ConfirmationModal,
      uploading,
      uploadError,
      uploadSuccess,
    ]
  );

  return (
    <ProductFormCoreContext.Provider value={value}>
      <FormProvider {...methods}>{children}</FormProvider>
    </ProductFormCoreContext.Provider>
  );
}

export const useProductFormCore = (): ProductFormCoreContextType => {
  const context = useContext(ProductFormCoreContext);
  if (!context) {
    throw internalError(
      'useProductFormCore must be used within a ProductFormCoreProvider'
    );
  }
  return context;
};
