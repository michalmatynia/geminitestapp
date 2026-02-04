"use client";

import type { Language } from "@/shared/types/internationalization";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useState,
  BaseSyntheticEvent,
  useRef,
  useEffect,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/shared/ui";
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormGetValues,
  FieldErrors,
  FormProvider,
  useForm,
  Resolver,
} from "react-hook-form";

import type {
  CatalogRecord,
  ProductWithImages,
  PriceGroupWithDetails,
  ProductFormData,
  ProductDraft,
} from "@/features/products/types";
import type { ImageFileSelection } from "@/shared/types/files";
import type { ProductCategory, ProductTag, ProductParameter, ProductParameterValue, Producer } from "@/features/products/types";
import {
  ProductImageSlot,
} from "@/features/products/types/products-ui";
import {
  productCreateSchema,
  productUpdateSchema,
} from "@/features/products/validations";

import { useProductImages } from "@/features/products/hooks/useProductImages";
import { useProductMetadata } from "@/features/products/hooks/useProductMetadata";
import { delay } from "@/shared/utils";
import { useCreateProductMutation, useUpdateProductMutation } from "@/features/products/hooks/useProductData";

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
      "useProductFormContext must be used within a ProductFormProvider"
    );
  }
  return context;
};

// This context provides a centralized place for managing the state and logic of the product form.
// It handles form data, image uploads, and communication with the API.
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
  onSuccess?: (() => void) | undefined;
  onEditSave?: ((saved: ProductWithImages) => void) | undefined;
  requireSku?: boolean | undefined;
  initialSku?: string | undefined;
  initialCatalogId?: string | undefined;
}): React.ReactNode {
  // product: edit mode -> update schema
  // requireSku: create mode -> create schema; draft mode can allow update schema (SKU optional)
  const formSchema = product || !requireSku ? productUpdateSchema : productCreateSchema;
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(formSchema) as Resolver<ProductFormData>,
    defaultValues: {
      name_en: product?.name_en || draft?.name_en || "",
      name_pl: product?.name_pl || draft?.name_pl || "",
      name_de: product?.name_de || draft?.name_de || "",
      price: product?.price ?? draft?.price ?? 0,
      sku: product?.sku || initialSku || draft?.sku || "",
      defaultPriceGroupId:
        product?.defaultPriceGroupId ?? draft?.defaultPriceGroupId ?? undefined,
      baseProductId: product?.baseProductId ?? draft?.baseProductId ?? undefined,
      ean: product?.ean || draft?.ean || "",
      gtin: product?.gtin || draft?.gtin || "",
      asin: product?.asin || draft?.asin || "",
      description_en: product?.description_en || draft?.description_en || "",
      description_pl: product?.description_pl || draft?.description_pl || "",
      description_de: product?.description_de || draft?.description_de || "",
      supplierName: product?.supplierName || draft?.supplierName || "",
      supplierLink: product?.supplierLink || draft?.supplierLink || "",
      priceComment: product?.priceComment || draft?.priceComment || "",
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
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);

  const createMutation = useCreateProductMutation();
  const updateMutation = useUpdateProductMutation();

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

  useEffect(() => {
    setSelectedNoteIds(Array.isArray(product?.noteIds) ? product.noteIds : []);
  }, [product?.id, product?.noteIds]);

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
      parameterId: typeof entry?.parameterId === "string" ? entry.parameterId : "",
      value: typeof entry?.value === "string" ? entry.value : "",
    }));
  };

  const [parameterValues, setParameterValues] = useState<ProductParameterValue[]>(
    () => normalizeParameterValues(product?.parameters ?? draft?.parameters ?? [])
  );

  useEffect(() => {
    setParameterValues(normalizeParameterValues(product?.parameters ?? draft?.parameters ?? []));
  }, [product?.id, draft?.id, product?.parameters, draft?.parameters]);

  useEffect((): (() => void) => {
    return (): void => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const onSubmit = async (data: ProductFormData): Promise<void> => {
    const skuValue = typeof data.sku === "string" ? data.sku.trim() : "";
    const hasTempImages = imageSlots.some((slot: ProductImageSlot | null): boolean => {
      if (!slot) return false;
      if (slot.type === "file") return true;
      return slot.previewUrl.startsWith("/uploads/products/temp/");
    });

    if (!skuValue && hasTempImages) {
      const shouldContinue = window.confirm(
        "This product has images without an SKU. They will stay in the temporary folder until you set an SKU. Continue?"
      );
      if (!shouldContinue) {
        return;
      }
    }

    setUploadError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]: [string, unknown]): void => {
      if (value !== null && value !== undefined) {
        if (typeof value === "object") {
          formData.append(key, JSON.stringify(value));
        } else if (typeof value === "string") {
          formData.append(key, value);
        } else {
          formData.append(key, String(value as number | boolean));
        }
      }
    });
    const normalizedLinks = imageLinks.map((link: string): string => link.trim());
    formData.append("imageLinks", JSON.stringify(normalizedLinks));
    const normalizedBase64s = imageBase64s.map((link: string): string => link.trim());
    formData.append("imageBase64s", JSON.stringify(normalizedBase64s));

    // Process image slots
    imageSlots.forEach((slot: ProductImageSlot | null): void => {
      if (slot?.type === 'file') {
        formData.append("images", slot.data); // Append actual File object
      } else if (slot?.type === 'existing') {
        formData.append("imageFileIds", slot.data.id); // Append existing ImageFile ID
      }
    });
    selectedCatalogIds.forEach((catalogId: string): void => {
      formData.append("catalogIds", catalogId);
    });
    if (selectedCategoryId) {
      formData.append("categoryId", selectedCategoryId);
    } else {
      // Ensure update mode can clear the category.
      formData.append("categoryId", "");
    }
    selectedTagIds.forEach((tagId: string): void => {
      formData.append("tagIds", tagId);
    });
    selectedProducerIds.forEach((producerId: string): void => {
      formData.append("producerIds", producerId);
    });
    if (selectedProducerIds.length === 0) {
      // Ensure update mode can clear previously assigned producers.
      formData.append("producerIds", "");
    }
    selectedNoteIds.forEach((noteId: string): void => {
      formData.append("noteIds", noteId);
    });
    if (selectedNoteIds.length === 0) {
      // Ensure update mode can clear previously assigned note links.
      formData.append("noteIds", "");
    }
    const normalizedParameters = parameterValues
      .map((entry: ProductParameterValue): { parameterId: string | undefined; value: string } => ({
        parameterId: entry.parameterId?.trim(),
        value: typeof entry.value === "string" ? entry.value.trim() : "",
      }))
      .filter((entry: { parameterId: string | undefined; value: string }): boolean => !!entry.parameterId);
    formData.append("parameters", JSON.stringify(normalizedParameters));

    try {
      let savedProduct: ProductWithImages;
      
      if (product) {
        // Update mode - we can't easily use FormData with our current update mutation because it expects JSON
        // Actually, the API route handles both.
        // Let's check the API route.
        
        // Wait, updateProduct in api/products.ts uses fetch with body: JSON.stringify(data)
        // If we want to support images, we might need a separate endpoint or multipart support.
        // The context code above uses fetch(url, { method: "PUT", body: formData })
        
        const response = await fetch(`/api/products/${product.id}`, {
          method: "PUT",
          body: formData,
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => ({}))) as {
            error?: string;
            details?: unknown;
          };
          let message = errorData.error || "Failed to update product";
          if (Array.isArray(errorData.details) && errorData.details.length > 0) {
            const detailMessages = errorData.details
              .slice(0, 3)
              .map((d: { field?: unknown; message?: unknown }) => {
                const field = typeof d.field === "string" && d.field ? d.field : "field";
                const msg = typeof d.message === "string" && d.message ? d.message : "invalid";
                return `${field}: ${msg}`;
              })
              .join(", ");
            if (detailMessages) message = `${message} (${detailMessages})`;
          }
          throw new Error(message);
        }
        savedProduct = (await response.json()) as ProductWithImages;
      } else {
        savedProduct = (await createMutation.mutateAsync(formData)) as ProductWithImages;
      }

      // Small delay to ensure DB consistency before refetch
      await delay(500);

      // Invalidate both products list and count queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products"] }),
        queryClient.invalidateQueries({ queryKey: ["products-count"] }),
      ]);

      if (!product) {
        onSuccess?.();
      } else {
        refreshImages(savedProduct);
        setUploadSuccess(true);
        if (successTimerRef.current) {
          clearTimeout(successTimerRef.current);
        }
        successTimerRef.current = setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);
        // Product edit modal flow passes `onSuccess` which already shows a toast and closes the modal.
        // Edit page flow doesn't pass `onSuccess`, so we show a toast here.
        if (!onSuccess) {
          toast("Product updated successfully.", { variant: "success" });
        }
        onEditSave?.(savedProduct);
        onSuccess?.();
        router.refresh();
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setUploadError(error.message);
      } else {
        setUploadError("An unknown error occurred");
      }
    }
  };

  return (
    <FormProvider {...methods}>
      <ProductFormContext.Provider
        value={{
          register,
          handleSubmit: methods.handleSubmit(onSubmit),
          errors,
          setValue,
          getValues,
          imageSlots,
          imageLinks,
          imageBase64s,
          uploading: createMutation.isPending || updateMutation.isPending,
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
            setParameterValues((prev: ProductParameterValue[]): ProductParameterValue[] => [...prev, { parameterId: "", value: "" }]),
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
