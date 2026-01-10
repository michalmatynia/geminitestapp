"use client";

import { ImageFile, ProductImage } from "@prisma/client";
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
import { productSchema } from "@/lib/validations/product";

export type ProductFormData = z.infer<typeof productSchema>;

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
  showFileManager: boolean;
  setShowFileManager: (show: boolean) => void;
  handleSlotImageChange: (file: File | null, index: number) => void;
  handleSlotFileSelect: (file: { id: string; filepath: string } | null, index: number) => void;
  handleSlotDisconnectImage: (index: number) => void;
  handleMultiImageChange: (files: File[]) => void;
  handleMultiFileSelect: (files: { id: string; filepath: string }[]) => void;
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
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
}) {
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name_en: product?.name_en || "",
      name_pl: product?.name_pl || "",
      name_de: product?.name_de || "",
      price: product?.price || 0,
      sku: product?.sku || "",
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
  const [showFileManager, setShowFileManager] = useState(false);

  // State for managing all 15 image slots
  const [imageSlots, setImageSlots] = useState<(ProductImageSlot | null)[]>(
    Array(TOTAL_IMAGE_SLOTS).fill(null)
  );

  // Ref to keep track of object URLs for cleanup
  const objectUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    // Populate image slots with existing product images
    if (product?.images && product.images.length > 0) {
      setImageSlots((currentSlots) => {
        const newSlots = [...currentSlots];
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
        }).catch(error => console.error("Failed to disconnect image from product:", error));
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

  const onSubmit = async (data: ProductFormData) => {
    setUploading(true);
    setUploadError(null);

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

    try {
      const response = await fetch(
        product ? `/api/products/${product.id}` : "/api/products",
        {
          method: product ? "PUT" : "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string };
        throw new Error(errorData.error || "Failed to save product");
      }

      router.refresh();
      router.push("/admin/products");
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
          showFileManager,
          setShowFileManager,
          handleSlotImageChange,
          handleSlotFileSelect,
          handleSlotDisconnectImage,
          handleMultiImageChange,
          handleMultiFileSelect,
        }}
      >
        {children}
      </ProductFormContext.Provider>
    </FormProvider>
  );
}
