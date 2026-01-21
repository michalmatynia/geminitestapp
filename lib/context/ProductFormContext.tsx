"use client";

import type { Language } from "@prisma/client";
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
  Resolver,
} from "react-hook-form";
import { z } from "zod";

import type {
  CatalogRecord,
  ImageFileSelection,
  ProductWithImages,
  PriceGroupWithDetails,
  ProductFormData,
} from "@/types";
import {
  ProductImageSlot,
} from "@/types/products-ui";
import {
  productCreateSchema,
  productUpdateSchema,
} from "@/lib/validations/product";
import { useToast } from "@/components/ui/toast";

interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  parentId: string | null;
  catalogId: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductTag {
  id: string;
  name: string;
  color: string | null;
  catalogId: string;
  createdAt: string;
  updatedAt: string;
}

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
  handleSlotDisconnectImage: (index: number) => void;
  handleMultiImageChange: (files: File[]) => void;
  handleMultiFileSelect: (files: ImageFileSelection[]) => void;
  swapImageSlots: (fromIndex: number, toIndex: number) => void;
  setImageLinkAt: (index: number, value: string) => void;
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

const TOTAL_IMAGE_SLOTS = 15;

const FALLBACK_LANGUAGES: Language[] = [
  {
    id: "EN",
    code: "EN",
    name: "English",
    nativeName: "English",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "PL",
    code: "PL",
    name: "Polish",
    nativeName: "Polski",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
  {
    id: "DE",
    code: "DE",
    name: "German",
    nativeName: "Deutsch",
    createdAt: new Date(0),
    updatedAt: new Date(0),
  },
];

const normalizeImageLinks = (links?: string[] | null) => {
  const next = Array(TOTAL_IMAGE_SLOTS).fill("");
  if (Array.isArray(links)) {
    links.slice(0, TOTAL_IMAGE_SLOTS).forEach((link, index) => {
      next[index] = typeof link === "string" ? link : "";
    });
  }
  return next;
};

const buildImageSlotsFromProduct = (product?: ProductWithImages) => {
  const slots: (ProductImageSlot | null)[] = Array.from(
    { length: TOTAL_IMAGE_SLOTS },
    () => null
  );
  if (!product?.images?.length) return slots;
  product.images.slice(0, TOTAL_IMAGE_SLOTS).forEach((pImg, index) => {
    if (pImg.imageFile) {
      slots[index] = {
        type: "existing",
        data: pImg.imageFile,
        previewUrl: pImg.imageFile.filepath,
      };
    }
  });
  return slots;
};

const getSelectedCatalogIds = (product?: ProductWithImages) =>
  product?.catalogs?.map((entry) => entry.catalogId) ?? [];

const getSelectedCategoryIds = (product?: ProductWithImages) =>
  product?.categories?.map((entry) => entry.categoryId) ?? [];

const getSelectedTagIds = (product?: ProductWithImages) =>
  product?.tags?.map((entry) => entry.tagId) ?? [];

// This context provides a centralized place for managing the state and logic of the product form.
// It handles form data, image uploads, and communication with the API.
export function ProductFormProvider({
  children,
  product,
  onSuccess,
  onEditSave,
  requireSku,
  initialSku,
  initialCatalogId,
}: {
  children: React.ReactNode;
  product?: ProductWithImages | undefined;
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
      name_en: product?.name_en || "",
      name_pl: product?.name_pl || "",
      name_de: product?.name_de || "",
      price: product?.price || 0,
      sku: product?.sku || initialSku || "",
      defaultPriceGroupId: product?.defaultPriceGroupId ?? undefined,
      baseProductId: product?.baseProductId ?? undefined,
      ean: product?.ean || "",
      gtin: product?.gtin || "",
      asin: product?.asin || "",
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
  const [catalogs, setCatalogs] = useState<CatalogRecord[]>([]);
  const [catalogsLoading, setCatalogsLoading] = useState(true);
  const [catalogsError, setCatalogsError] = useState<string | null>(null);
  const [selectedCatalogIds, setSelectedCatalogIds] = useState<string[]>(
    () => getSelectedCatalogIds(product)
  );
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(
    () => getSelectedCategoryIds(product)
  );
  const [tags, setTags] = useState<ProductTag[]>([]);
  const [tagsLoading, setTagsLoading] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    () => getSelectedTagIds(product)
  );
  const [languages, setLanguages] = useState<Language[]>(FALLBACK_LANGUAGES);
  const [priceGroups, setPriceGroups] = useState<PriceGroupWithDetails[]>([]);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const { toast } = useToast();

  // State for managing all 15 image slots
  const [imageSlots, setImageSlots] = useState<(ProductImageSlot | null)[]>(
    () => buildImageSlotsFromProduct(product)
  );
  const [imageLinks, setImageLinks] = useState<string[]>(
    () => normalizeImageLinks(product?.imageLinks)
  );

  // Ref to keep track of object URLs for cleanup
  const objectUrlsRef = useRef<string[]>([]);

  // Initialize catalog selection for new products
  useEffect(() => {
    if (product) return; // Only for new products
    if (!initialCatalogId) return;
    if (initialCatalogId === "unassigned") return; // Don't auto-assign if "unassigned" is selected
    setSelectedCatalogIds([initialCatalogId]);
  }, [product, initialCatalogId]);

  // Auto-set defaultPriceGroupId when catalog is selected for new products
  useEffect(() => {
    if (product) return; // Only for new products
    if (selectedCatalogIds.length === 0) return;

    // Get the first selected catalog's default price group
    const firstCatalog = catalogs.find((c) => selectedCatalogIds.includes(c.id));
    if (firstCatalog?.defaultPriceGroupId) {
      const currentDefaultPriceGroupId = getValues("defaultPriceGroupId");
      // Only set if not already set
      if (!currentDefaultPriceGroupId) {
        setValue("defaultPriceGroupId", firstCatalog.defaultPriceGroupId);
      }
    }
  }, [product, selectedCatalogIds, catalogs, getValues, setValue]);

  // Load categories when catalogs are selected
  useEffect(() => {
    if (selectedCatalogIds.length === 0) {
      setCategories([]);
      return;
    }

    let cancelled = false;
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        // Load categories from all selected catalogs
        const categoryPromises = selectedCatalogIds.map((catalogId) =>
          fetch(`/api/products/categories?catalogId=${catalogId}`).then((res) => res.json())
        );
        const categoryArrays = await Promise.all(categoryPromises);
        const allCategories = categoryArrays.flat() as ProductCategory[];

        if (!cancelled) {
          setCategories(allCategories);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
        if (!cancelled) {
          setCategories([]);
        }
      } finally {
        if (!cancelled) {
          setCategoriesLoading(false);
        }
      }
    };

    void loadCategories();
    return () => {
      cancelled = true;
    };
  }, [selectedCatalogIds]);

  // Load tags when catalogs are selected
  useEffect(() => {
    if (selectedCatalogIds.length === 0) {
      setTags([]);
      return;
    }

    let cancelled = false;
    const loadTags = async () => {
      setTagsLoading(true);
      try {
        // Load tags from all selected catalogs
        const tagPromises = selectedCatalogIds.map((catalogId) =>
          fetch(`/api/products/tags?catalogId=${catalogId}`).then((res) => res.json())
        );
        const tagArrays = await Promise.all(tagPromises);
        const allTags = tagArrays.flat() as ProductTag[];

        if (!cancelled) {
          setTags(allTags);
        }
      } catch (error) {
        console.error("Failed to load tags:", error);
        if (!cancelled) {
          setTags([]);
        }
      } finally {
        if (!cancelled) {
          setTagsLoading(false);
        }
      }
    };

    void loadTags();
    return () => {
      cancelled = true;
    };
  }, [selectedCatalogIds]);

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
        const data = (await res.json()) as CatalogRecord[];
        if (!cancelled) {
          setCatalogs(data);
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

  useEffect(() => {
    let cancelled = false;
    const loadPriceGroups = async () => {
      try {
        const res = await fetch("/api/price-groups");
        if (!res.ok) return;
        const data = (await res.json()) as PriceGroupWithDetails[];
        if (!cancelled) {
          setPriceGroups(data);
        }
      } catch (error) {
        console.error("Failed to load price groups:", error);
      }
    };
    void loadPriceGroups();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredLanguages = useMemo(() => {
    // If no catalogs selected, show all languages
    if (selectedCatalogIds.length === 0) return languages;

    // If catalogs are still loading, wait to avoid showing the wrong tabs
    if (catalogsLoading || catalogs.length === 0) return [];

    // Get language IDs from selected catalogs
    const selectedCatalogs = catalogs.filter((catalog) => selectedCatalogIds.includes(catalog.id));

    // If selected catalogs aren't found in loaded catalogs, show all languages
    // This can happen briefly during hydration or if catalog was deleted
    if (selectedCatalogs.length === 0) {
      return languages;
    }

    const allowedLanguageIds = new Set(
      selectedCatalogs.flatMap((catalog) => catalog.languageIds ?? [])
    );

    // If catalogs have no languages configured, show all languages
    if (allowedLanguageIds.size === 0) {
      return languages;
    }

    const filtered = languages.filter((language) => allowedLanguageIds.has(language.id));
    return filtered.length > 0 ? filtered : languages;
  }, [languages, catalogs, selectedCatalogIds, catalogsLoading]);

  const filteredPriceGroups = useMemo(() => {
    if (selectedCatalogIds.length === 0) return priceGroups;
    const allowedGroupIds = new Set<string>();
    const orderedGroups: PriceGroupWithDetails[] = [];

    // First, add the default price group if available
    const defaultGroup = priceGroups.find((pg) => pg.isDefault);
    if (defaultGroup) {
      orderedGroups.push(defaultGroup);
      allowedGroupIds.add(defaultGroup.id);
    }

    // Then add groups from selected catalogs in order
    selectedCatalogIds.forEach((catalogId) => {
      const catalog = catalogs.find((c) => c.id === catalogId);
      if (catalog?.priceGroupIds) {
        catalog.priceGroupIds.forEach((pgId) => {
          if (!allowedGroupIds.has(pgId)) {
            const pg = priceGroups.find((p) => p.id === pgId);
            if (pg) {
              orderedGroups.push(pg);
              allowedGroupIds.add(pgId);
            }
          }
        });
      }
    });

    return orderedGroups.length > 0 ? orderedGroups : priceGroups;
  }, [priceGroups, catalogs, selectedCatalogIds]);

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
    setImageSlots((prevSlots) => {
      const newSlots = [...prevSlots];
      if (file) {
        // Revoke existing object URL if replacing an image
        const existingSlot = newSlots[index];
        if (existingSlot?.type === "file") {
          URL.revokeObjectURL(existingSlot.previewUrl);
        }
        newSlots[index] = {
          type: "file",
          data: file,
          previewUrl: URL.createObjectURL(file),
        };
      } else {
        // Revoke object URL if clearing the slot
        const existingSlot = newSlots[index];
        if (existingSlot?.type === "file") {
          URL.revokeObjectURL(existingSlot.previewUrl);
        }
        newSlots[index] = null;
      }
      return newSlots;
    });
  }, []);

  const handleSlotFileSelect = useCallback((file: ImageFileSelection | null, index: number) => {
    setImageSlots((prevSlots) => {
      const newSlots = [...prevSlots];
      if (file) {
         // Revoke object URL if replacing a file upload with an existing file
         const existingSlot = newSlots[index];
         if (existingSlot?.type === "file") {
          URL.revokeObjectURL(existingSlot.previewUrl);
        }
        newSlots[index] = {
          type: "existing",
          data: file,
          previewUrl: file.filepath,
        };
      } else {
        // Revoke object URL if clearing the slot (unlikely for 'existing' but good practice)
        const existingSlot = newSlots[index];
        if (existingSlot?.type === "file") {
          URL.revokeObjectURL(existingSlot.previewUrl);
        }
        newSlots[index] = null;
      }
      return newSlots;
    });
    setShowFileManager(false); // Close file manager after selection
  }, [setShowFileManager]);

  const handleSlotDisconnectImage = useCallback(async (index: number) => {
    // Optimistically update the UI
    const slotToClear = imageSlots[index];
    if (!slotToClear) return;

    setImageSlots(prevSlots => {
      const newSlots = [...prevSlots];
      newSlots[index] = null;
      return newSlots;
    });

    if (slotToClear.type === 'existing' && product?.id) {
      try {
        const res = await fetch(`/api/products/${product.id}/images/${slotToClear.data.id}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          const payload = (await res.json()) as { error?: string; errorId?: string };
          console.error("Failed to disconnect image from product:", {
            error: payload?.error,
            errorId: payload?.errorId,
            productId: product.id,
            imageFileId: slotToClear.data.id,
          });
          // Note: We might want to revert the UI change here if we wanted to be strict,
          // but for now, we just log the error as the user can try saving again or refreshing.
        }
      } catch (error) {
        console.error("Failed to disconnect image from product:", error);
      }
    } else if (slotToClear.type === 'file') {
      // Revoke object URL for file uploads
      URL.revokeObjectURL(slotToClear.previewUrl);
    }
  }, [imageSlots, product]);

  const setImageLinkAt = useCallback((index: number, value: string) => {
    setImageLinks((prev) => {
      const next = [...prev];
      if (index < 0 || index >= next.length) return prev;
      next[index] = value;
      return next;
    });
  }, []);

  const handleMultiImageChange = useCallback((files: File[]) => {
    setImageSlots((prevSlots) => {
      const newSlots = [...prevSlots];
      let fileIndex = 0;
      for (let i = 0; i < TOTAL_IMAGE_SLOTS && fileIndex < files.length; i++) {
        if (newSlots[i] === null) {
          const file = files[fileIndex];
          if (file) {
            newSlots[i] = {
              type: "file",
              data: file,
              previewUrl: URL.createObjectURL(file),
            };
          }
          fileIndex++;
        }
      }
      return newSlots;
    });
  }, []);

  const handleMultiFileSelect = useCallback((files: ImageFileSelection[]) => {
    setImageSlots((prevSlots) => {
      const newSlots = [...prevSlots];
      let fileIndex = 0;
      for (let i = 0; i < TOTAL_IMAGE_SLOTS && fileIndex < files.length; i++) {
        if (newSlots[i] === null) {
          const file = files[fileIndex];
          if (file) {
            newSlots[i] = {
              type: "existing",
              data: file,
              previewUrl: file.filepath,
            };
          }
          fileIndex++;
        }
      }
      return newSlots;
    });
    setShowFileManager(false); // Close file manager after selection
  }, [setShowFileManager]);

  const swapImageSlots = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= TOTAL_IMAGE_SLOTS) return;
    if (toIndex < 0 || toIndex >= TOTAL_IMAGE_SLOTS) return;

    setImageSlots((prevSlots) => {
      const newSlots = [...prevSlots];
      const temp = newSlots[fromIndex];
      newSlots[fromIndex] = newSlots[toIndex]!;
      newSlots[toIndex] = temp!;
      return newSlots;
    });

    // Also swap the corresponding image links to keep them in sync
    setImageLinks((prevLinks) => {
      const newLinks = [...prevLinks];
      const temp = newLinks[fromIndex];
      newLinks[fromIndex] = newLinks[toIndex]!;
      newLinks[toIndex] = temp!;
      return newLinks;
    });
  }, []);

  const toggleCatalog = useCallback((catalogId: string) => {
    setSelectedCatalogIds((prev) =>
      prev.includes(catalogId)
        ? prev.filter((id) => id !== catalogId)
        : [...prev, catalogId]
    );
  }, []);

  const toggleCategory = useCallback((categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  }, []);

  const toggleTag = useCallback((tagId: string) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
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
        setImageSlots(() => {
          const newSlots: ProductImageSlot[] = Array.from(
            { length: TOTAL_IMAGE_SLOTS },
            () => null
          );
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
        setImageLinks(normalizeImageLinks(savedProduct.imageLinks));
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
