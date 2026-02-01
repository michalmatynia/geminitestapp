import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProductWithImages, ProductImageRecord } from "@/features/products/types";
import type { ImageFileSelection } from "@/shared/types/files";
import type { ProductImageSlot } from "@/features/products/types/products-ui";

const TOTAL_IMAGE_SLOTS = 15;

const normalizeImageLinks = (links?: string[] | null): string[] => {
  const next: string[] = new Array<string>(TOTAL_IMAGE_SLOTS).fill("");
  if (Array.isArray(links)) {
    links.slice(0, TOTAL_IMAGE_SLOTS).forEach((link: string, index: number) => {
      next[index] = typeof link === "string" ? link : "";
    });
  }
  return next;
};

const buildImageSlotsFromProduct = (
  product?: ProductWithImages,
): (ProductImageSlot | null)[] => {
  const slots: (ProductImageSlot | null)[] = Array.from(
    { length: TOTAL_IMAGE_SLOTS },
    () => null,
  );
  if (!product?.images?.length) return slots;
  product.images.slice(0, TOTAL_IMAGE_SLOTS).forEach((pImg: ProductImageRecord, index: number) => {
    if (pImg.imageFile) {
      slots[index] = {
        type: "existing",
        data: pImg.imageFile as ImageFileSelection,
        previewUrl: pImg.imageFile.filepath,
        slotId: pImg.imageFile.id,
      };
    }
  });
  return slots;
};

const createSlotId = (): string =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export interface ProductImagesHookResult {
  imageSlots: (ProductImageSlot | null)[];
  imageLinks: string[];
  showFileManager: boolean;
  setShowFileManager: (show: boolean) => void;
  handleSlotImageChange: (file: File | null, index: number) => void;
  handleSlotFileSelect: (file: ImageFileSelection | null, index: number) => void;
  handleSlotDisconnectImage: (index: number) => Promise<void>;
  handleMultiImageChange: (files: File[]) => void;
  handleMultiFileSelect: (files: ImageFileSelection[]) => void;
  swapImageSlots: (fromIndex: number, toIndex: number) => void;
  setImageLinkAt: (index: number, value: string) => void;
  refreshFromProduct: (savedProduct: ProductWithImages) => void;
  setImagesReordering: (value: boolean) => void;
}

export function useProductImages(
  product?: ProductWithImages,
  initialImageLinks?: string[] | null,
): ProductImagesHookResult {
  const [imageSlots, setImageSlots] = useState<(ProductImageSlot | null)[]>(
    () => buildImageSlotsFromProduct(product),
  );
  const [imageLinks, setImageLinks] = useState<string[]>(() =>
    normalizeImageLinks(product?.imageLinks ?? initialImageLinks),
  );
  const [showFileManager, setShowFileManager] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);
  const isReorderingRef = useRef(false);
  const pendingRefreshRef = useRef<ProductWithImages | null>(null);
  
  const queryClient = useQueryClient();
  const disconnectImageMutation = useMutation({
    mutationFn: async ({ productId, imageFileId }: { productId: string; imageFileId: string }): Promise<void> => {
      const res = await fetch(`/api/products/${productId}/images/${imageFileId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect image");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["products"] });
    }
  });

  // Effect to clean up object URLs when component unmounts or imageSlots change
  useEffect(() => {
    const currentObjectUrls = imageSlots
      .map((slot: ProductImageSlot | null): string | null => (slot?.type === "file" ? slot.previewUrl : null))
      .filter((url: string | null): url is string => Boolean(url));

    // Revoke old object URLs that are no longer in use
    const oldObjectUrls = objectUrlsRef.current.filter(
      (url: string) => !currentObjectUrls.includes(url),
    );
    oldObjectUrls.forEach((url: string) => URL.revokeObjectURL(url));

    // Update ref with current object URLs
    objectUrlsRef.current = currentObjectUrls;

    return () => {
      // Clean up all object URLs on unmount
      objectUrlsRef.current.forEach((url: string) => URL.revokeObjectURL(url));
      objectUrlsRef.current = [];
    };
  }, [imageSlots]);

  const handleSlotImageChange = useCallback(
    (file: File | null, index: number): void => {
      setImageSlots((prevSlots: (ProductImageSlot | null)[]) => {
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
            slotId: createSlotId(),
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
    },
    [],
  );

  const handleSlotFileSelect = useCallback(
    (file: ImageFileSelection | null, index: number): void => {
      setImageSlots((prevSlots: (ProductImageSlot | null)[]) => {
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
            slotId: file.id,
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
      setShowFileManager(false);
    },
    [],
  );

  const handleSlotDisconnectImage = useCallback(
    async (index: number): Promise<void> => {
      const slotToClear = imageSlots[index];
      if (!slotToClear) return;

      setImageSlots((prevSlots: (ProductImageSlot | null)[]) => {
        const newSlots = [...prevSlots];
        newSlots[index] = null;
        return newSlots;
      });

      if (slotToClear.type === "existing" && product?.id) {
        try {
          await disconnectImageMutation.mutateAsync({
            productId: product.id,
            imageFileId: slotToClear.data.id,
          });
        } catch (error) {
          console.error("Failed to disconnect image from product:", error);
        }
      } else if (slotToClear.type === "file") {
        URL.revokeObjectURL(slotToClear.previewUrl);
      }
    },
    [imageSlots, product, disconnectImageMutation],
  );

  const setImageLinkAt = useCallback((index: number, value: string): void => {
    setImageLinks((prev: string[]) => {
      const next = [...prev];
      if (index < 0 || index >= next.length) return prev;
      next[index] = value;
      return next;
    });
  }, []);

  const handleMultiImageChange = useCallback((files: File[]): void => {
    setImageSlots((prevSlots: (ProductImageSlot | null)[]) => {
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
              slotId: createSlotId(),
            };
          }
          fileIndex++;
        }
      }
      return newSlots;
    });
  }, []);

  const handleMultiFileSelect = useCallback((files: ImageFileSelection[]): void => {
    setImageSlots((prevSlots: (ProductImageSlot | null)[]) => {
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
              slotId: file.id,
            };
          }
          fileIndex++;
        }
      }
      return newSlots;
    });
    setShowFileManager(false);
  }, []);

  const swapImageSlots = useCallback((fromIndex: number, toIndex: number): void => {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= TOTAL_IMAGE_SLOTS) return;
    if (toIndex < 0 || toIndex >= TOTAL_IMAGE_SLOTS) return;

    setImageSlots((prevSlots: (ProductImageSlot | null)[]) => {
      const newSlots = [...prevSlots];
      const temp = newSlots[fromIndex];
      newSlots[fromIndex] = newSlots[toIndex]!;
      newSlots[toIndex] = temp!;
      return newSlots;
    });

    setImageLinks((prevLinks: string[]) => {
      const newLinks = [...prevLinks];
      const temp = newLinks[fromIndex];
      newLinks[fromIndex] = newLinks[toIndex]!;
      newLinks[toIndex] = temp!;
      return newLinks;
    });
  }, []);

  const applyRefresh = useCallback((savedProduct: ProductWithImages): void => {
    setImageSlots((prevSlots: (ProductImageSlot | null)[]) => {
      // Instead of replacing all slots, update only what changed
      // This prevents flickering by keeping existing references when possible
      const newSlots: (ProductImageSlot | null)[] = [...prevSlots];

      // Update slots with saved images
      savedProduct.images.slice(0, TOTAL_IMAGE_SLOTS).forEach((pImg: ProductImageRecord, index: number) => {
        if (pImg.imageFile) {
          const existingSlot = newSlots[index];
          // Only update if the image ID changed or slot was empty
          if (
            !existingSlot ||
            existingSlot.type !== "existing" ||
            existingSlot.slotId !== pImg.imageFile.id
          ) {
            newSlots[index] = {
              type: "existing",
              data: pImg.imageFile,
              previewUrl: pImg.imageFile.filepath,
              slotId: pImg.imageFile.id,
            };
          }
        }
      });

      // Clear slots beyond saved images count
      for (let i = savedProduct.images.length; i < TOTAL_IMAGE_SLOTS; i++) {
        if (newSlots[i]?.type === "file") {
          // Keep temporary file uploads that haven't been saved yet
          continue;
        }
        newSlots[i] = null;
      }

      return newSlots;
    });
    setImageLinks(normalizeImageLinks(savedProduct.imageLinks));
  }, []);

  const setImagesReordering = useCallback(
    (value: boolean): void => {
      isReorderingRef.current = value;
      if (!value && pendingRefreshRef.current) {
        const pending = pendingRefreshRef.current;
        pendingRefreshRef.current = null;
        applyRefresh(pending);
      }
    },
    [applyRefresh],
  );

  // Function to refresh state from product (e.g. after save)
  const refreshFromProduct = useCallback(
    (savedProduct: ProductWithImages): void => {
      if (isReorderingRef.current) {
        pendingRefreshRef.current = savedProduct;
        if (process.env.NODE_ENV !== "production") {
          console.info("[product-images] Refresh deferred during reorder");
        }
        return;
      }
      applyRefresh(savedProduct);
    },
    [applyRefresh],
  );

  return {
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
    refreshFromProduct,
    setImagesReordering,
  };
}