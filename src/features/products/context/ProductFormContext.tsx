"use client";

import type { Language } from "@prisma/client";
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
import type { ProductCategory, ProductTag, ProductParameter, ProductParameterValue } from "@/features/products/types";
import {
  ProductImageSlot,
} from "@/features/products/types/products-ui";
import {
  productCreateSchema,
  productUpdateSchema,
} from "@/features/products/validations";
import { useToast } from "@/shared/ui/toast";
import { useProductImages } from "@/features/products/hooks/useProductImages";
import { useProductMetadata } from "@/features/products/hooks/useProductMetadata";

interface ProductFormContextType {
  register: UseFormRegister<ProductFormData>;
  handleSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  errors: FieldErrors<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
  getValues: UseFormGetValues<ProductFormData>;
  imageSlots: (ProductImageSlot | null)[];
  imageLinks: string[];
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
  setImagesReordering: (reordering: boolean) => void;
  catalogs: CatalogRecord[];
  catalogsLoading: boolean;
  catalogsError: string | null;
  selectedCatalogIds: string[];
  toggleCatalog: (catalogId: string) => void;
  categories: ProductCategory[];
  categoriesLoading: boolean;
  selectedCategoryIds: string[];
  toggleCategory: (categoryId: string) => void;
  tags: ProductTag[];
  tagsLoading: boolean;
  selectedTagIds: string[];
  toggleTag: (tagId: string) => void;
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

export const useProductFormContext = () => {
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
}) {
  const formSchema = product || requireSku ? productUpdateSchema : productCreateSchema;
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
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const { toast } = useToast();

  const {
    imageSlots,
    imageLinks,
    showFileManager,
    setShowFileManager,
    handleSlotImageChange,
    handleSlotFileSelect,
    handleSlotDisconnectImage,
    handleMultiImageChange,
    handleMultiFileSelect,
    swapImageSlots,
    setImageLinkAt,
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
    selectedCategoryIds,
    toggleCategory,
    tags,
    tagsLoading,
    selectedTagIds,
    toggleTag,
    parameters,
    parametersLoading,
    filteredLanguages,
    filteredPriceGroups,
  } = useProductMetadata({
    product,
    initialCatalogId,
    initialCatalogIds: draft?.catalogIds,
    initialCategoryIds: draft?.categoryIds,
    initialTagIds: draft?.tagIds,
    setValue,
    getValues,
  });

  const normalizeParameterValues = (
    input?: ProductParameterValue[] | null
  ): ProductParameterValue[] => {
    if (!Array.isArray(input)) return [];
    return input.map((entry) => ({
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

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const onSubmit = async (data: ProductFormData) => {
    const skuValue = typeof data.sku === "string" ? data.sku.trim() : "";
    const hasTempImages = imageSlots.some((slot) => {
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

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(false);

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
      }
    });
    const normalizedLinks = imageLinks.map((link) => link.trim());
    formData.append("imageLinks", JSON.stringify(normalizedLinks));

    // Process image slots
    imageSlots.forEach(slot => {
      if (slot?.type === 'file') {
        formData.append("images", slot.data); // Append actual File object
      } else if (slot?.type === 'existing') {
        formData.append("imageFileIds", slot.data.id); // Append existing ImageFile ID
      }
    });
    selectedCatalogIds.forEach((catalogId) => {
      formData.append("catalogIds", catalogId);
    });
    selectedCategoryIds.forEach((categoryId) => {
      formData.append("categoryIds", categoryId);
    });
    selectedTagIds.forEach((tagId) => {
      formData.append("tagIds", tagId);
    });
    const normalizedParameters = parameterValues
      .map((entry) => ({
        parameterId: entry.parameterId?.trim(),
        value: typeof entry.value === "string" ? entry.value.trim() : "",
      }))
      .filter((entry) => entry.parameterId);
    formData.append("parameters", JSON.stringify(normalizedParameters));

    try {
      const response = await fetch(
        product ? `/api/products/${product.id}` : "/api/products",
        {
          method: product ? "PUT" : "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        let errorData: { error?: string; errorId?: string } | null = null;
        try {
          errorData = (await response.json()) as {
            error?: string;
            errorId?: string;
          };
        } catch {
          errorData = null;
        }
        const message = errorData?.error || "Failed to save product";
        const errorIdSuffix = errorData?.errorId
          ? ` (Error ID: ${errorData.errorId})`
          : "";
        throw new Error(`${message}${errorIdSuffix}`);
      }

      const savedProduct = (await response.json()) as ProductWithImages;

      toast(product ? "Product updated." : "Product created.", {
        variant: "success",
      });

      // Only close modal for Create mode, not Edit mode
      if (!product) {
        // For Create mode, close modal immediately without updating image state
        // This prevents the flickering caused by image slots re-rendering before modal closes
        onSuccess?.();
        router.push("/admin/products");
      } else {
        // For Edit mode, update image slots to reflect saved state
        refreshImages(savedProduct);
        setUploadSuccess(true);
        if (successTimerRef.current) {
          clearTimeout(successTimerRef.current);
        }
        successTimerRef.current = setTimeout(() => {
          setUploadSuccess(false);
        }, 3000);
        onEditSave?.(savedProduct);
        // Refresh to show updated data
        router.refresh();
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        setUploadError(error.message);
      } else {
        setUploadError("An unknown error occurred");
      }
    } finally {
      setUploading(false);
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
          setImagesReordering,
          catalogs,
          catalogsLoading,
          catalogsError,
          selectedCatalogIds,
          toggleCatalog,
          categories,
          categoriesLoading,
          selectedCategoryIds,
          toggleCategory,
          tags,
          tagsLoading,
          selectedTagIds,
          toggleTag,
          parameters,
          parametersLoading,
          parameterValues,
          addParameterValue: () =>
            setParameterValues((prev) => [...prev, { parameterId: "", value: "" }]),
          updateParameterId: (index, parameterId) =>
            setParameterValues((prev) => {
              const next = [...prev];
              if (!next[index]) return prev;
              next[index] = { ...next[index], parameterId };
              return next;
            }),
          updateParameterValue: (index, value) =>
            setParameterValues((prev) => {
              const next = [...prev];
              if (!next[index]) return prev;
              next[index] = { ...next[index], value };
              return next;
            }),
          removeParameterValue: (index) =>
            setParameterValues((prev) => prev.filter((_, i) => i !== index)),
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
