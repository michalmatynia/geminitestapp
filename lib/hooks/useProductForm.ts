"use client";

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { productSchema } from '@/lib/validations/product';

interface ProductWithImages {
  id: string;
  name: string;
  price: number;
  sku: string;
  description: string | null;
  images: {
    imageFile: {
      id: string;
      filepath: string;
    };
  }[];
}

type ProductFormData = z.infer<typeof productSchema>;

export function useProductForm(product?: ProductWithImages) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      price: product?.price || 0,
      sku: product?.sku || '',
      description: product?.description || '',
    },
  });

  const [image, setImage] = useState<File | null>(null);
  const [imageFileId, setImageFileId] = useState<string | null>(null);
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);
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
        description: product.description || '',
      });
      if (product.images && product.images.length > 0) {
        setExistingImageUrl(`/api/files/preview?fileId=${product.images[0].imageFile.id}`);
      }
    }
  }, [product, reset]);

  const onSubmit = async (data: ProductFormData) => {
    setUploading(true);
    setUploadError(null);

    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('price', data.price.toString());
    formData.append('sku', data.sku);
    if (data.description) {
      formData.append('description', data.description);
    }
    if (image) {
      formData.append('image', image);
    } else if (imageFileId) {
      formData.append('imageFileId', imageFileId);
    }

    const url = product ? `/api/products/${product.id}` : '/api/products';
    const method = product ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        body: formData,
      });

      if (res.ok) {
        const responseData: ProductWithImages = await res.json();
        if (product) {
          if (responseData.images && responseData.images.length > 0) {
            setExistingImageUrl(`/api/files/preview?fileId=${responseData.images[0].imageFile.id}`);
          }
          setImage(null);
          setImageFileId(null);
          if (previewUrl) {
            URL.revokeObjectURL(previewUrl);
            setPreviewUrl(null);
          }
        } else {
          router.push('/admin');
        }
        setUploading(false);
      } else {
        const errorData = await res.json();
        setUploadError(errorData.error || 'Failed to save product.');
        setUploading(false);
      }
    } catch {
      setUploadError('Network error or server is unreachable.');
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
      const res = await fetch(`/api/products/${product.id}/images/${imageFileId}`, {
        method: "DELETE",
      });

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

  return {
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
  };
}
