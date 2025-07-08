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
  existingImageUrl: string | null;
  uploading: boolean;
  uploadError: string | null;
  previewUrl: string | null;
  showFileManager: boolean;
  setShowFileManager: (show: boolean) => void;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleFileSelect: (file: { id: string; filepath: string }) => void;
  handleDisconnectImage?: () => void;
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
  product?: Product;
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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showFileManager, setShowFileManager] = useState(false);
  const [imageFileId, setImageFileId] = useState<string | null>(null);
  const existingImageUrl =
    (product as any)?.images?.[0]?.imageFile?.filepath || null;

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileSelect = (file: { id: string; filepath: string }) => {
    setImageFileId(file.id);
    setPreviewUrl(file.filepath);
    setShowFileManager(false);
  };

  const handleDisconnectImage = async () => {
    if (!product) return;
    const imageId = (product as any).images[0].imageFile.id;
    try {
      await fetch(`/api/products/${product.id}/images/${imageId}`, {
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
    if (imageInput.files?.[0]) {
      formData.append("image", imageInput.files[0]);
    } else if (imageFileId) {
      formData.append("imageFileId", imageFileId);
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
          existingImageUrl,
          uploading,
          uploadError,
          previewUrl,
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