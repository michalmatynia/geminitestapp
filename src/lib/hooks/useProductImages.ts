import { useState, useCallback, useRef, useEffect } from "react";
import type { ImageFileSelection, ProductWithImages } from "@/types";
import type { ProductImageSlot } from "@/features/products/types-ui";

const TOTAL_IMAGE_SLOTS = 15;

const normalizeImageLinks = (links?: string[] | null): string[] => {
  const next: string[] = new Array<string>(TOTAL_IMAGE_SLOTS).fill("");
  if (Array.isArray(links)) {
    links.slice(0, TOTAL_IMAGE_SLOTS).forEach((link, index) => {
      next[index] = typeof link === "string" ? link : "";
    });
  }
  return next;
};

const buildImageSlotsFromProduct = (product?: ProductWithImages): (ProductImageSlot | null)[] => {
  const slots: (ProductImageSlot | null)[] = Array.from(
    { length: TOTAL_IMAGE_SLOTS },
    () => null
  );
  if (!product?.images?.length) return slots;
  product.images.slice(0, TOTAL_IMAGE_SLOTS).forEach((pImg, index) => {
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

const createSlotId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function useProductImages(
  product?: ProductWithImages,
  initialImageLinks?: string[] | null
) {
  const [imageSlots, setImageSlots] = useState<(ProductImageSlot | null)[]>(
    () => buildImageSlotsFromProduct(product)
  );
  const [imageLinks, setImageLinks] = useState<string[]>(
    () => normalizeImageLinks(product?.imageLinks ?? initialImageLinks)
  );
  const [showFileManager, setShowFileManager] = useState(false);
  const objectUrlsRef = useRef<string[]>([]);
  const isReorderingRef = useRef(false);
  const pendingRefreshRef = useRef<ProductWithImages | null>(null);

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
  }, []);

  const handleSlotDisconnectImage = useCallback(async (index: number) => {
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
        }
      } catch (error) {
        console.error("Failed to disconnect image from product:", error);
      }
    } else if (slotToClear.type === 'file') {
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
              slotId: createSlotId(),
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

    setImageLinks((prevLinks) => {
      const newLinks = [...prevLinks];
      const temp = newLinks[fromIndex];
      newLinks[fromIndex] = newLinks[toIndex]!;
      newLinks[toIndex] = temp!;
      return newLinks;
    });
  }, []);

  const applyRefresh = useCallback((savedProduct: ProductWithImages) => {
    setImageSlots((prevSlots) => {
      // Instead of replacing all slots, update only what changed
      // This prevents flickering by keeping existing references when possible
      const newSlots: (ProductImageSlot | null)[] = [...prevSlots];

      // Update slots with saved images
      savedProduct.images
        .slice(0, TOTAL_IMAGE_SLOTS)
        .forEach((pImg, index) => {
          if (pImg.imageFile) {
            const existingSlot = newSlots[index];
            // Only update if the image ID changed or slot was empty
            if (!existingSlot || existingSlot.type !== "existing" || existingSlot.slotId !== pImg.imageFile.id) {
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

  const setImagesReordering = useCallback((value: boolean) => {
    isReorderingRef.current = value;
    if (!value && pendingRefreshRef.current) {
      const pending = pendingRefreshRef.current;
      pendingRefreshRef.current = null;
      applyRefresh(pending);
    }
  }, [applyRefresh]);

  // Function to refresh state from product (e.g. after save)
  const refreshFromProduct = useCallback((savedProduct: ProductWithImages) => {
    if (isReorderingRef.current) {
      pendingRefreshRef.current = savedProduct;
      if (process.env.NODE_ENV !== "production") {
        console.info("[product-images] Refresh deferred during reorder");
      }
      return;
    }
    applyRefresh(savedProduct);
  }, [applyRefresh]);

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
