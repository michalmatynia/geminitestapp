"use client";

import type {
  Catalog,
  CatalogLanguage,
  Language,
  ImageFile,
  ProductImage,
} from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  BaseSyntheticEvent,
  useRef,
  useCallback,
  useMemo,
} from "react";
import {
  UseFormRegister,
  UseFormSetValue,
  UseFormGetValues,
  FieldErrors,
  FormProvider,
  useForm,
} from "react-hook-form";
import { z } from "zod";

import { ProductWithImages } from "@/lib/types";
import {
  productCreateSchema,
  productUpdateSchema,
} from "@/lib/validations/product";

export type ProductFormData = z.infer<typeof productCreateSchema>;

// Represents a single image slot, which can be empty, a new File, or an existing ImageFile
type ProductImageSlot =
  | {
      type: "file"; // A new File object
      data: File;
      previewUrl: string;
      originalIndex?: number; // Optional: original index if moved
    }
  | {
      type: "existing"; // An existing ImageFile from the DB
      data: ImageFile; // Prisma ImageFile with id
      previewUrl: string; // The filepath of the existing image
      originalIndex?: number; // Optional: original index if moved
    }
  | null; // Empty slot

interface ProductFormContextType {
  register: UseFormRegister<ProductFormData>;
  handleSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  errors: FieldErrors<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
  getValues: UseFormGetValues<ProductFormData>;
  imageSlots: (ProductImageSlot | null)[];
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
  showFileManager: boolean;
  setShowFileManager: (show: boolean) => void;
  handleSlotImageChange: (file: File | null, index: number) => void;
  handleSlotFileSelect: (file: { id: string; filepath: string } | null, index: number) => void;
  handleSlotDisconnectImage: (index: number) => void;
  handleMultiImageChange: (files: File[]) => void;
  handleMultiFileSelect: (files: { id: string; filepath: string }[]) => void;
  catalogs: Catalog[];
  catalogsLoading: boolean;
  catalogsError: string | null;
  selectedCatalogIds: string[];
  toggleCatalog: (catalogId: string) => void;
  filteredLanguages: Language[];
  generationError: string | null;
  setGenerationError: (error: string | null) => void;
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

const TOTAL_IMAGE_SLOTS = 15;

// This context provides a centralized place for managing the state and logic of the product form.
// It handles form data, image uploads, and communication with the API.
export function ProductFormProvider({
  children,
  product,
  onSuccess,
  requireSku,
  initialSku,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
  onSuccess?: () => void;
  requireSku?: boolean;
  initialSku?: string;
}) {
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(product || requireSku ? productUpdateSchema : productCreateSchema),
    defaultValues: {
      name_en: product?.name_en || "",
      name_pl: product?.name_pl || "",
      name_de: product?.name_de || "",
      price: product?.price || 0,
      sku: product?.sku || initialSku || "",
      description_en: product?.description_en || "",
      description_pl: product?.description_pl || "",
      description_de: product?.description_de || "",
      supplierName: product?.supplierName || "",
      supplierLink: product?.supplierLink || "",
      priceComment: product?.priceComment || "",
      stock: product?.stock || 0,
      sizeLength: product?.sizeLength || 0,
      sizeWidth: product?.sizeWidth || 0,
      weight: product?.weight || 0,
      length: product?.length || 0,
    },
  });
  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    getValues,
  } = methods;
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [showFileManager, setShowFileManager] = useState(false);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [catalogsError, setCatalogsError] = useState<string | null>(null);
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [catalogLanguages, setCatalogLanguages] = useState<CatalogLanguage[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // State for managing all 15 image slots
  const [imageSlots, setImageSlots] = useState<(ProductImageSlot | null)[]>(
    Array(TOTAL_IMAGE_SLOTS).fill(null)
  );

  // Ref to keep track of object URLs for cleanup
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    // Populate image slots with existing product images
    if (product?.images && product.images.length > 0) {
      setImageSlots(() => {
        const newSlots = Array(TOTAL_IMAGE_SLOTS).fill(null);
        product.images.slice(0, TOTAL_IMAGE_SLOTS).forEach((pImg, index) => {
          if (pImg.imageFile) {
            newSlots[index] = {
              type: "existing",
              data: pImg.imageFile,
              previewUrl: pImg.imageFile.filepath,
            };
          }
        });
        return newSlots;
      });
    }
  }, [product]);

  useEffect(() => {
    if (!product?.catalogs) return;
    setSelectedCatalogIds(product.catalogs.map((entry) => entry.catalogId));
  }, [product]);

  useEffect(() => {
    let cancelled = false;
    const loadCatalogs = async () => {
      try {
        setCatalogsLoading(true);
        const res = await fetch("/api/catalogs");
        if (!res.ok) {
          const payload = (await res.json()) as { error?: string; errorId?: string };
          const message = payload?.error || "Failed to load catalogs";
          const suffix = payload?.errorId ? ` (Error ID: ${payload.errorId})` : "";
          throw new Error(`${message}${suffix}`);
        }
        const data = (await res.json()) as (Catalog & {
          languages?: (CatalogLanguage & { language: Language })[];
        })[];
        if (!cancelled) {
          setCatalogs(data);
          setCatalogLanguages(
            data.flatMap((catalog) =>
              catalog.languages?.map((entry) => ({
                catalogId: entry.catalogId,
                languageId: entry.languageId,
                assignedAt: entry.assignedAt,
              })) ?? []
            )
          );
        }
      } catch (error) {
        console.error("Failed to load catalogs:", error);
        if (!cancelled) {
          setCatalogsError(
            error instanceof Error ? error.message : "Failed to load catalogs"
          );
        }
      } finally {
        if (!cancelled) {
          setCatalogsLoading(false);
        }
      }
    };
    void loadCatalogs();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadLanguages = async () => {
      try {
        const res = await fetch("/api/languages");
        if (!res.ok) return;
        const data = (await res.json()) as Language[];
        if (!cancelled) {
          setLanguages(data);
        }
      } catch (error) {
        console.error("Failed to load languages:", error);
      }
    };
    void loadLanguages();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLanguages = useMemo(() => {
    if (selectedCatalogIds.length === 0) return languages;
    const allowedLanguageIds = new Set(
      catalogLanguages
        .filter((entry) => selectedCatalogIds.includes(entry.catalogId))
        .map((entry) => entry.languageId)
    );
    if (allowedLanguageIds.size === 0) {
      return languages;
    }
    return languages.filter((language) => allowedLanguageIds.has(language.id));
  }, [languages, catalogLanguages, selectedCatalogIds]);

  // Effect to clean up object URLs when component unmounts or imageSlots change
  useEffect(() => {
    const currentObjectUrls = imageSlots.map(slot =>
      slot?.type === 'file' ? slot.previewUrl : null
    ).filter(Boolean) as string[];

    // Revoke old object URLs that are no longer in use
    const oldObjectUrls = objectUrlsRef.current.filter(url => !currentObjectUrls.includes(url));
    oldObjectUrls.forEach(url => URL.revokeObjectURL(url));

    // Update ref with current object URLs
    objectUrlsRef.current = currentObjectUrls;

    return () => {
      // Clean up all object URLs on unmount
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, [imageSlots]);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const handleSlotImageChange = useCallback((file: File | null, index: number) => {
    setImageSlots(prevSlots => {
      const newSlots = [...prevSlots];
      if (file) {
        // Revoke existing object URL if replacing an image
        if (newSlots[index]?.type === 'file') {
          URL.revokeObjectURL(newSlots[index]!.previewUrl);
        }
        newSlots[index] = {
          type: 'file',
          data: file,
          previewUrl: URL.createObjectURL(file),
        };
      } else {
        // Revoke object URL if clearing the slot
        if (newSlots[index]?.type === 'file') {
          URL.revokeObjectURL(newSlots[index]!.previewUrl);
        }
        newSlots[index] = null;
      }
      return newSlots;
    });
  }, [imageSlots]);

  const handleSlotFileSelect = useCallback((file: { id: string; filepath: string } | null, index: number) => {
    setImageSlots(prevSlots => {
      const newSlots = [...prevSlots];
      if (file) {
         // Revoke object URL if replacing a file upload with an existing file
         if (newSlots[index]?.type === 'file') {
          URL.revokeObjectURL(newSlots[index]!.previewUrl);
        }
        newSlots[index] = {
          type: 'existing',
          data: file as ImageFile, // Cast as ImageFile for simplicity, assuming {id, filepath} is enough
          previewUrl: file.filepath,
        };
      } else {
        // Revoke object URL if clearing the slot (unlikely for 'existing' but good practice)
        if (newSlots[index]?.type === 'file') {
          URL.revokeObjectURL(newSlots[index]!.previewUrl);
        }
        newSlots[index] = null;
      }
      return newSlots;
    });
    setShowFileManager(false); // Close file manager after selection
  }, [imageSlots, setShowFileManager]);

  const handleSlotDisconnectImage = useCallback(async (index: number) => {
    setImageSlots(prevSlots => {
      const newSlots = [...prevSlots];
      const slotToClear = newSlots[index];

      if (slotToClear?.type === 'existing' && product?.id) {
        // Attempt to disconnect from backend if it's an existing image
        fetch(`/api/products/${product.id}/images/${slotToClear.data.id}`, {
          method: "DELETE",
        })
          .then(async (res) => {
            if (!res.ok) {
              let payload: { error?: string; errorId?: string } | null = null;
              try {
                payload = (await res.json()) as {
                  error?: string;
                  errorId?: string;
                };
              } catch {
                payload = null;
              }
              console.error("Failed to disconnect image from product:", {
                error: payload?.error,
                errorId: payload?.errorId,
                productId: product.id,
                imageFileId: slotToClear.data.id,
              });
            }
          })
          .catch((error) =>
            console.error("Failed to disconnect image from product:", error)
          );
      } else if (slotToClear?.type === 'file') {
        // Revoke object URL for file uploads
        URL.revokeObjectURL(slotToClear.previewUrl);
      }

      newSlots[index] = null;
      return newSlots;
    });
  }, [imageSlots, product]);

  const handleMultiImageChange = useCallback((files: File[]) => {
    setImageSlots(prevSlots => {
      const newSlots = [...prevSlots];
      let fileIndex = 0;
      for (let i = 0; i < TOTAL_IMAGE_SLOTS && fileIndex < files.length; i++) {
        if (newSlots[i] === null) {
          const file = files[fileIndex];
          newSlots[i] = {
            type: 'file',
            data: file,
            previewUrl: URL.createObjectURL(file),
          };
          fileIndex++;
        }
      }
      return newSlots;
    });
  }, [imageSlots]);

  const handleMultiFileSelect = useCallback((files: { id: string; filepath: string }[]) => {
    setImageSlots(prevSlots => {
      const newSlots = [...prevSlots];
      let fileIndex = 0;
      for (let i = 0; i < TOTAL_IMAGE_SLOTS && fileIndex < files.length; i++) {
        if (newSlots[i] === null) {
          const file = files[fileIndex];
          newSlots[i] = {
            type: 'existing',
            data: file as ImageFile, // Cast as ImageFile for simplicity
            previewUrl: file.filepath,
          };
          fileIndex++;
        }
      }
      return newSlots;
    });
    setShowFileManager(false); // Close file manager after selection
  }, [imageSlots, setShowFileManager]);

  const toggleCatalog = useCallback((catalogId: string) => {
    setSelectedCatalogIds((prev) =>
      prev.includes(catalogId)
        ? prev.filter((id) => id !== catalogId)
        : [...prev, catalogId]
    );
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
        formData.append(key, String(value));
      }
    });

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
      setImageSlots(() => {
        const newSlots = Array(TOTAL_IMAGE_SLOTS).fill(null);
        savedProduct.images
          .slice(0, TOTAL_IMAGE_SLOTS)
          .forEach((pImg, index) => {
            if (pImg.imageFile) {
              newSlots[index] = {
                type: "existing",
                data: pImg.imageFile,
                previewUrl: pImg.imageFile.filepath,
              };
            }
          });
        return newSlots;
      });
      setUploadSuccess(true);
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);

      onSuccess?.();
      router.refresh();
      if (!product) {
        router.push("/admin/products");
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
          catalogs,
          catalogsLoading,
          catalogsError,
          selectedCatalogIds,
          toggleCatalog,
          filteredLanguages,
          generationError,
          setGenerationError,
        }}
      >
        {children}
      </ProductFormContext.Provider>
    </FormProvider>
  );
}
