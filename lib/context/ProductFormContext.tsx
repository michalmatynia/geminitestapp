"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Product } from "@prisma/client";
import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  createContext,
  FormEvent,
  useContext,
  useState,
} from "react";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { productSchema } from "@/lib/validations/product";

export type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormContextType {
  register: any;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  errors: any;
  setValue: any;
  getValues: any;
  existingImageUrls: string[];
  uploading: boolean;
  uploadError: string | null;
  previewUrls: string[];
  showFileManager: boolean;
  setShowFileManager: (show: boolean) => void;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleFileSelect: (files: { id: string; filepath: string }[]) => void;
  handleDisconnectImage?: (imageUrl: string) => void;
}

const ProductFormContext = createContext<ProductFormContextType | null>(null);

export const useProductFormContext = () => {
  const context = useContext(ProductFormContext);
  if (!context) {
    throw new Error(
      "useProductFormContext must be used within a ProductFormProvider"
    );
  }
  return context;
};

export function ProductFormProvider({
  children,
  product,
}: {
  children: React.ReactNode;
  product?: any;
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
  const { register, handleSubmit, formState: { errors }, setValue, getValues } = methods;
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [showFileManager, setShowFileManager] = useState(false);
  const [imageFileIds, setImageFileIds] = useState<string[]>([]);
  const existingImageUrls =
    product?.images?.map((img: any) => img.imageFile.filepath) || [];

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newPreviewUrls = Array.from(files).map((file) =>
        URL.createObjectURL(file)
      );
      setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    }
  };

  const handleFileSelect = (files: { id: string; filepath: string }[]) => {
    const newImageFileIds = files.map((file) => file.id);
    const newPreviewUrls = files.map((file) => file.filepath);
    setImageFileIds((prev) => [...prev, ...newImageFileIds]);
    setPreviewUrls((prev) => [...prev, ...newPreviewUrls]);
    setShowFileManager(false);
  };

  const handleDisconnectImage = async (imageUrl: string) => {
    if (!product) return;
    const image = product.images.find(
      (img: any) => img.imageFile.filepath === imageUrl
    );
    if (!image) return;

    try {
      await fetch(`/api/products/${product.id}/images/${image.imageFile.id}`, {
        method: "DELETE",
      });
      router.refresh();
    } catch (error) {
      console.error("Failed to disconnect image:", error);
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    Object.keys(data).forEach((key) => {
      const value = data[key as keyof ProductFormData];
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    const imageInput = document.getElementById(
      "image-upload"
    ) as HTMLInputElement;
    if (imageInput.files) {
      for (const file of Array.from(imageInput.files)) {
        formData.append("images", file);
      }
    }
    if (imageFileIds.length > 0) {
      for (const id of imageFileIds) {
        formData.append("imageFileIds", id);
      }
    }

    try {
      const response = await fetch(
        product ? `/api/products/${product.id}` : "/api/products",
        {
          method: product ? "PUT" : "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error("Failed to save product");
      }

      router.refresh();
      router.push("/admin/products");
    } catch (error) {
      setUploadError("Failed to save product");
    } finally {
      setUploading(false);
    }
  };

  return (
    <FormProvider {...methods}>
      <ProductFormContext.Provider
        value={{
          register,
          handleSubmit: handleSubmit(onSubmit),
          errors,
          setValue,
          getValues,
          existingImageUrls,
          uploading,
          uploadError,
          previewUrls,
          showFileManager,
          setShowFileManager,
          handleImageChange,
          handleFileSelect,
          handleDisconnectImage: product ? handleDisconnectImage : undefined,
        }}
      >
        {children}
      </ProductFormContext.Provider>
    </FormProvider>
  );
}