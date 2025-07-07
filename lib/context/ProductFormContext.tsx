"use client";

import {
  createContext,
  useState,
  useEffect,
  ChangeEvent,
  useContext,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { useForm, UseFormRegister, FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { productSchema } from "@/lib/validations/product";
import { Product, ProductImage, ImageFile } from "@prisma/client";

type ProductWithImages = Product & {
  images: (ProductImage & { imageFile: ImageFile })[];
};

type ProductFormData = z.infer<typeof productSchema>;

interface ProductFormContextProps {
  register: UseFormRegister<ProductFormData>;
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

const ProductFormContext = createContext<ProductFormContextProps | undefined>(
  undefined
);

export function ProductFormProvider({
  children,
  product,
}: {
  children: ReactNode;
  product?: ProductWithImages;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
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

  const [image, setImage] = useState<File | null>(null);
  const [imageFileId, setImageFileId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(
    null
  );
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showFileManager, setShowFileManager] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (product) {
      reset({
        name: product.name,
        price: product.price,
        sku: product.sku,
        description: product.description || "",
        supplierName: product.supplierName || "",
        supplierLink: product.supplierLink || "",
        priceComment: product.priceComment || "",
        stock: product.stock || 0,
        sizeLength: product.sizeLength || 0,
        sizeWidth: product.sizeWidth || 0,
      });
      if (product.images && product.images.length > 0) {
        setExistingImageUrl(
          `/api/files/preview?fileId=${product.images[0].imageFile.id}`
        );
      }
    }
  }, [product, reset]);

  const onSubmit = async (data: ProductFormData) => {
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("price", data.price.toString());
    formData.append("sku", data.sku);
    if (data.description) {
      formData.append("description", data.description);
    }
    if (data.supplierName) {
      formData.append("supplierName", data.supplierName);
    }
    if (data.supplierLink) {
      formData.append("supplierLink", data.supplierLink);
    }
    if (data.priceComment) {
      formData.append("priceComment", data.priceComment);
    }
    if (data.stock) {
      formData.append("stock", data.stock.toString());
    }
    if (data.sizeLength) {
      formData.append("sizeLength", data.sizeLength.toString());
    }
    if (data.sizeWidth) {
      formData.append("sizeWidth", data.sizeWidth.toString());
    }
    if (image) {
      formData.append("image", image);
    } else if (imageFileId) {
      formData.append("imageFileId", imageFileId);
    }

    const url = product ? `/api/products/${product.id}` : "/api/products";
    const method = product ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        body: formData,
      });

      if (res.ok) {
        const responseData: ProductWithImages = await res.json();
        if (product) {
          if (responseData.images && responseData.images.length > 0) {
            setExistingImageUrl(
              `/api/files/preview?fileId=${responseData.images[0].imageFile.id}`
            );
          }
          setImage(null);
          setImageFileId(null);
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
        } else {
          router.push("/admin");
        }
        setUploading(false);
      } else {
        const errorData = await res.json();
        setUploadError(errorData.error || "Failed to save product.");
        setUploading(false);
      }
    } catch {
      setUploadError("Network error or server is unreachable.");
      setUploading(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setImageFileId(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl(URL.createObjectURL(file));
      setUploadError(null);
    }
  };

  const handleFileSelect = (fileId: string) => {
    setImage(null);
    setImageFileId(fileId);
    setExistingImageUrl(`/api/files/preview?fileId=${fileId}`);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setShowFileManager(false);
  };

  const handleDisconnectImage = async () => {
    if (!product || !product.images || product.images.length === 0) return;
    const imageFileId = product.images[0].imageFile.id;

    try {
      const res = await fetch(
        `/api/products/${product.id}/images/${imageFileId}`,
        {
          method: "DELETE",
        }
      );

      if (res.ok) {
        setExistingImageUrl(null);
        setImage(null);
        setImageFileId(null);
      } else {
        console.error("Failed to disconnect image:", await res.json());
      }
    } catch (error) {
      console.error("Error disconnecting image:", error);
    }
  };

  return (
    <ProductFormContext.Provider
      value={{
        register,
        handleSubmit: handleSubmit(onSubmit),
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

export function useProductFormContext() {
  const context = useContext(ProductFormContext);
  if (!context) {
    throw new Error(
      "useProductFormContext must be used within a ProductFormProvider"
    );
  }
  return context;
}
