'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  createContext,
  useContext,
  useState,
  BaseSyntheticEvent,
} from 'react';
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormGetValues,
  FieldErrors,
  FormProvider,
  useForm,
  Resolver,
} from 'react-hook-form';

import { useProductFormSubmit } from '@/features/products/hooks/useProductFormSubmit';
import { useProductImages } from '@/features/products/hooks/useProductImages';
import { useProductMetadata } from '@/features/products/hooks/useProductMetadata';
import type {
  CatalogRecord,
  ProductWithImages,
  PriceGroupWithDetails,
  ProductFormData,
  ProductDraft,
} from '@/features/products/types';
import type { ProductCategory, ProductTag, ProductParameter, ProductParameterValue, Producer } from '@/features/products/types';
import {
  ProductImageSlot,
} from '@/features/products/types/products-ui';
import {
  productCreateSchema,
  productUpdateSchema,
} from '@/features/products/validations';
import type { ImageFileSelection } from '@/shared/types/files';
import type { Language } from '@/shared/types/internationalization';

export interface ProductFormContextType {
  register: UseFormRegister<ProductFormData>;
  handleSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  errors: FieldErrors<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
  getValues: UseFormGetValues<ProductFormData>;
  imageSlots: (ProductImageSlot | null)[];
  imageLinks: string[];
  imageBase64s: string[];
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
  showFileManager: boolean;
  setShowFileManager: (show: boolean) => void;
  handleSlotImageChange: (file: File | null, index: number) => void;
  handleSlotFileSelect: (file: ImageFileSelection | null, index: number) => void;
  handleSlotDisconnectImage: (index: number) => Promise<void>;
  handleMultiImageChange: (files: File[]) => void;
  handleMultiFileSelect: (files: ImageFileSelection[]) => void;
  swapImageSlots: (fromIndex: number, toIndex: number) => void;
  setImageLinkAt: (index: number, value: string) => void;
  setImageBase64At: (index: number, value: string) => void;
  setImagesReordering: (reordering: boolean) => void;
  catalogs: CatalogRecord[];
  catalogsLoading: boolean;
  catalogsError: string | null;
  selectedCatalogIds: string[];
  toggleCatalog: (catalogId: string) => void;
  categories: ProductCategory[];
  categoriesLoading: boolean;
  selectedCategoryId: string | null;
  setCategoryId: (categoryId: string | null) => void;
  tags: ProductTag[];
  tagsLoading: boolean;
  selectedTagIds: string[];
  toggleTag: (tagId: string) => void;
  producers: Producer[];
  producersLoading: boolean;
  selectedProducerIds: string[];
  toggleProducer: (producerId: string) => void;
  selectedNoteIds: string[];
  toggleNote: (noteId: string) => void;
  removeNote: (noteId: string) => void;
  parameters: ProductParameter[];
  parametersLoading: boolean;
  parameterValues: ProductParameterValue[];
  addParameterValue: () => void;
  updateParameterId: (index: number, parameterId: string) => void;
  updateParameterValue: (index: number, value: string) => void;
  removeParameterValue: (index: number) => void;
  filteredLanguages: Language[];
  filteredPriceGroups: PriceGroupWithDetails[];
  generationError: string | null;
  setGenerationError: (error: string | null) => void;
  product?: ProductWithImages | undefined;
}

export const ProductFormContext = createContext<ProductFormContextType | null>(
  null
);

export const useProductFormContext = (): ProductFormContextType => {
  const context = useContext(ProductFormContext);
  if (!context) {
    throw new Error(
      'useProductFormContext must be used within a ProductFormProvider'
    );
  }
  return context;
};

export function ProductFormProvider({
  children,
  product,
  draft,
  onSuccess,
  onEditSave,
  requireSku,
  initialSku,
  initialCatalogId,
}: {
  children: React.ReactNode;
  product?: ProductWithImages | undefined;
  draft?: ProductDraft | null | undefined;
  onSuccess?: ((info?: { queued?: boolean }) => void) | undefined;
  onEditSave?: ((saved: ProductWithImages) => void) | undefined;
  requireSku?: boolean | undefined;
  initialSku?: string | undefined;
  initialCatalogId?: string | undefined;
}): React.ReactNode {
  const formSchema = product || !requireSku ? productUpdateSchema : productCreateSchema;
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
      baseProductId: product?.baseProductId ?? draft?.baseProductId ?? undefined,
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
  const {
    register,
    formState: { errors },
    setValue,
    getValues,
  } = methods;

  const [generationError, setGenerationError] = useState<string | null>(null);

  const {
    imageSlots,
    imageLinks,
    imageBase64s,
    showFileManager,
    setShowFileManager,
    handleSlotImageChange,
    handleSlotFileSelect,
    handleSlotDisconnectImage,
    handleMultiImageChange,
    handleMultiFileSelect,
    swapImageSlots,
    setImageLinkAt,
    setImageBase64At,
    refreshFromProduct: refreshImages,
    setImagesReordering,
  } = useProductImages(product, draft?.imageLinks);

  const {
    catalogs,
    catalogsLoading,
    catalogsError,
    selectedCatalogIds,
    toggleCatalog,
    categories,
    categoriesLoading,
    selectedCategoryId,
    setCategoryId,
    tags,
    tagsLoading,
    selectedTagIds,
    toggleTag,
    producers,
    producersLoading,
    selectedProducerIds,
    toggleProducer,
    parameters,
    parametersLoading,
    filteredLanguages,
    filteredPriceGroups,
  } = useProductMetadata({
    product,
    initialCatalogId,
    initialCatalogIds:
      draft?.catalogIds && draft.catalogIds.length > 0
        ? draft.catalogIds
        : initialCatalogId
          ? [initialCatalogId]
          : undefined,
    initialCategoryId: draft?.categoryId ?? null,
    initialTagIds: draft?.tagIds,
    setValue,
    getValues,
  });

  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>(
    () => (Array.isArray(product?.noteIds) ? product.noteIds : [])
  );

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

  const normalizeParameterValues = (
    input?: ProductParameterValue[] | null
  ): ProductParameterValue[] => {
    if (!Array.isArray(input)) return [];
    return input.map((entry: ProductParameterValue) => ({
      parameterId: typeof entry?.parameterId === 'string' ? entry.parameterId : '',
      value: typeof entry?.value === 'string' ? entry.value : '',
    }));
  };

  const [parameterValues, setParameterValues] = useState<ProductParameterValue[]>(
    () => normalizeParameterValues(product?.parameters ?? draft?.parameters ?? [])
  );

  const { handleSubmit: submitHandler, uploading, uploadError, uploadSuccess } = useProductFormSubmit({
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
  });

  return (
    <FormProvider {...methods}>
      <ProductFormContext.Provider
        value={{
          register,
          handleSubmit: submitHandler,
          errors,
          setValue,
          getValues,
          imageSlots,
          imageLinks,
          imageBase64s,
          uploading,
          uploadError,
          uploadSuccess,
          showFileManager,
          setShowFileManager,
          handleSlotImageChange,
          handleSlotFileSelect,
          handleSlotDisconnectImage,
          handleMultiImageChange,
          handleMultiFileSelect,
          swapImageSlots,
          setImageLinkAt,
          setImageBase64At,
          setImagesReordering,
          catalogs,
          catalogsLoading,
          catalogsError,
          selectedCatalogIds,
          toggleCatalog,
          categories,
          categoriesLoading,
          selectedCategoryId,
          setCategoryId,
          tags,
          tagsLoading,
          selectedTagIds,
          toggleTag,
          producers,
          producersLoading,
          selectedProducerIds,
          toggleProducer,
          selectedNoteIds,
          toggleNote,
          removeNote,
          parameters,
          parametersLoading,
          parameterValues,
          addParameterValue: (): void =>
            setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => [...prev, { parameterId: '', value: '' }]),
          updateParameterId: (index: number, parameterId: string): void =>
            setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
              const next = [...prev];
              if (!next[index]) return prev;
              next[index] = { ...next[index], parameterId };
              return next;
            }),
          updateParameterValue: (index: number, value: string): void =>
            setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => {
              const next = [...prev];
              if (!next[index]) return prev;
              next[index] = { ...next[index], value };
              return next;
            }),
          removeParameterValue: (index: number): void =>
            setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => prev.filter((_: ProductParameterValue, i: number): boolean => i !== index)),
          filteredLanguages,
          filteredPriceGroups,
          generationError,
          setGenerationError,
          product,
        }}
      >
        {children}
      </ProductFormContext.Provider>
    </FormProvider>
  );
}
