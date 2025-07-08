"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  ChangeEvent,
} from "react";
import { useForm, UseFormReturn, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema } from "@/lib/validations/product";
import { useRouter } from "next/navigation";
import { Product, ProductImage, ImageFile } from "@prisma/client";

type ProductWithImages = Product & {
  images: (ProductImage & { imageFile: ImageFile })[];
};

interface ProductFormData {
  name: string;
  price: number;
  sku: string;
  description: string;
  supplierName: string;
  supplierLink: string;
  priceComment: string;
  stock: number;
  sizeLength: number;
  sizeWidth: number;
}

interface ProductFormContextType
  extends Omit<UseFormReturn<ProductFormData>, "handleSubmit"> {
  handleSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  errors: FieldErrors<ProductFormData>;
  existingImageUrl: string | null;
  uploading: boolean;
  uploadError: string | null;
  previewUrl: string | null;
  showFileManager: boolean;
  setShowFileManager: (show: boolean) => void;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  handleFileSelect: (fileId: string) => void;
  handleDisconnectImage: () => void;
}

const ProductFormContext = createContext<ProductFormContextType | undefined>(
  undefined
);

export function ProductFormProvider({
  children,
  product,
}: {
  children: ReactNode;
  product?: ProductWithImages;
}) {
  const router = useRouter();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageFileId, setImageFileId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showFileManager, setShowFileManager] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
    product?.images?.[0]?.imageFile?.filepath || null
  );

  const form = useForm<ProductFormData>({
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
    handleSubmit: rhfHandleSubmit,
    formState: { errors },
    reset,
  } = form;

  useEffect(() => {
    if (product) {
      reset({
        name: product.name || "",
        price: product.price || 0,
        sku: product.sku || "",
        description: product.description || "",
        supplierName: product.supplierName || "",
        supplierLink: product.supplierLink || "",
        priceComment: product.priceComment || "",
        stock: product.stock || 0,
        sizeLength: product.sizeLength || 0,
        sizeWidth: product.sizeWidth || 0,
      });
      setExistingImageUrl(product.images?.[0]?.imageFile?.filepath || null);
    }
  }, [product, reset]);

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      setImageFileId(null);
      setPreviewUrl(URL.createObjectURL(file));
      setExistingImageUrl(null);
    }
  };

  const handleFileSelect = (fileId: string) => {
    setImageFileId(fileId);
    setImageFile(null);
    setPreviewUrl(`/api/files/preview?fileId=${fileId}`);
    setExistingImageUrl(null);
    setShowFileManager(false);
  };

  const handleDisconnectImage = async () => {
    if (product && product.images.length > 0) {
      const imageFileIdToDisconnect = product.images[0].imageFileId;
      try {
        const res = await fetch(
          `/api/products/${product.id}/images/${imageFileIdToDisconnect}`,
          {
            method: "DELETE",
          }
        );
        if (res.ok) {
          setExistingImageUrl(null);
          setPreviewUrl(null);
          setImageFile(null);
          setImageFileId(null);
        } else {
          console.error("Failed to disconnect image");
        }
      } catch (error) {
        console.error("Error disconnecting image:", error);
      }
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        formData.append(key, String(value));
      }
    });

    if (imageFile) {
      formData.append("image", imageFile);
    } else if (imageFileId) {
      formData.append("imageFileId", imageFileId);
    }

    try {
      const url = product ? `/api/products/${product.id}` : "/api/products";
      const method = product ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to save product");
      }

      router.push("/admin");
    } catch (error: unknown) {
      setUploadError((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <ProductFormContext.Provider
      value={{
        ...form,
        handleSubmit: rhfHandleSubmit(onSubmit),
        errors,
        existingImageUrl,
        uploading,
        uploadError,
        previewUrl,
        showFileManager,
        setShowFileManager,
        handleImageChange,
        handleFileSelect,
        handleDisconnectImage,
      }}
    >
      {children}
    </ProductFormContext.Provider>
  );
}

export const useProductFormContext = () => {
  const context = useContext(ProductFormContext);
  if (!context) {
    throw new Error(
      "useProductFormContext must be used within a ProductFormProvider"
    );
  }
  return context;
};