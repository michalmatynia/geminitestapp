"use client";

import { ProductImage, ImageFile } from "@prisma/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  createContext,
  useContext,
  useEffect,
  useState,
  BaseSyntheticEvent,
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

interface ProductFormContextType {
  register: UseFormRegister<ProductFormData>;
  handleSubmit: (e?: BaseSyntheticEvent) => Promise<void>;
  errors: FieldErrors<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
  getValues: UseFormGetValues<ProductFormData>;
  existingImageUrls: string[];
  uploading: boolean;
  uploadError: string | null;
  previewUrls: string[];
  selectedImageUrls: string[];
  showFileManager: boolean;
  setShowFileManager: (show: boolean) => void;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleFileSelect: (files: { id: string; filepath: string }[]) => void;
  handleDisconnectImage?: (imageUrl: string) => void;
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
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
}) {
  const methods = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || "",
      price: product?.price || 0,
      sku: product?.sku || "",
      description: product?.description || "",
      supplierName: product?.supplierName || "",
      supplierLink: product?.supplierLink || "",
      priceComment: product?.priceComment || "",
      stock: product?.stock || 0,
      sizeLength: product?.sizeLength || 0,
      sizeWidth: product?.sizeWidth || 0,
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

  // State for images that are already part of the product on load
  const [existingImages, setExistingImages] = useState(product?.images || []);
  // State for new files selected for upload from the user's computer
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  // State for existing files selected from the File Manager
  const [selectedImageFiles, setSelectedImageFiles] = useState<
    { id: string; filepath: string }[]
  >([]);

  // Derived URLs for rendering previews in the UI
  const existingImageUrls = existingImages.map(
    (img: ProductImage & { imageFile: ImageFile }) => img.imageFile.filepath
  );
  const previewUrls = newImageFiles.map((file) => URL.createObjectURL(file));
  const selectedImageUrls = selectedImageFiles.map((file) => file.filepath);

  useEffect(() => {
    // This effect is responsible for creating and cleaning up blob URLs for new image previews.
    // It runs whenever the newImageFiles state changes.
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  /**
   * Handles the selection of new image files from the user's computer.
   * @param e - The change event from the file input.
   */
  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      setNewImageFiles((prev) => [...prev, ...Array.from(files)]);
    }
  };

  /**
   * Handles the selection of existing files from the File Manager.
   * @param files - The selected files.
   */
  const handleFileSelect = (files: { id: string; filepath: string }[]) => {
    setSelectedImageFiles((prev) => [...prev, ...files]);
    setShowFileManager(false);
  };

  /**
   * Handles the removal of an image, whether it's a new upload,
   * a selected existing file, or an image that was already saved with the product.
   * @param imageUrl - The URL of the image to remove.
   */
  const handleDisconnectImage = async (imageUrl: string) => {
    // Case 1: It's a newly uploaded file (preview)
    const newFileIndex = previewUrls.indexOf(imageUrl);
    if (newFileIndex > -1) {
      setNewImageFiles((prev) => {
        const newFiles = [...prev];
        newFiles.splice(newFileIndex, 1);
        return newFiles;
      });
      return;
    }

    // Case 2: It's an existing file selected from the file manager
    const selectedFileIndex = selectedImageUrls.indexOf(imageUrl);
    if (selectedFileIndex > -1) {
      setSelectedImageFiles((prev) => {
        const newFiles = [...prev];
        newFiles.splice(selectedFileIndex, 1);
        return newFiles;
      });
      return;
    }

    // Case 3: It's an image that was already saved with the product
    const image = existingImages.find(
      (img: ProductImage & { imageFile: ImageFile }) =>
        img.imageFile.filepath === imageUrl
    );
    if (image && product) {
      try {
        const res = await fetch(
          `/api/products/${product.id}/images/${image.imageFile.id}`,
          {
            method: "DELETE",
          }
        );
        if (res.ok) {
          setExistingImages((prev) =>
            prev.filter(
              (img: ProductImage & { imageFile: ImageFile }) =>
                img.imageFile.filepath !== imageUrl
            )
          );
        }
      } catch (error) {
        console.error("Failed to disconnect image:", error);
      }
    }
  };

  /**
   * Handles the form submission.
   * It constructs the FormData and sends it to the API.
   * @param data - The product form data.
   */
  const onSubmit = async (data: ProductFormData) => {
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    // Append all form data
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    // Append new image files for upload
    newImageFiles.forEach((file) => {
      formData.append("images", file);
    });

    // Append IDs of existing images selected from file manager
    selectedImageFiles.forEach((file) => {
      formData.append("imageFileIds", file.id);
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
          existingImageUrls,
          uploading,
          uploadError,
          previewUrls,
          selectedImageUrls,
          showFileManager,
          setShowFileManager,
          handleImageChange,
          handleFileSelect,
          handleDisconnectImage,
        }}
      >
        {children}
      </ProductFormContext.Provider>
    </FormProvider>
  );
}
