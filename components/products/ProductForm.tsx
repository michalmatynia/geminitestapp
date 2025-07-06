"use client";

import { ChangeEvent, FormEvent } from 'react';
import Image from 'next/image';
import { UseFormRegister, FieldErrors } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface ProductFormData {
  name: string;
  price: number;
  sku: string;
  description: string;
}

interface ProductFormProps {
  register: UseFormRegister<ProductFormData>;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  errors: FieldErrors<ProductFormData>;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  setShowFileManager: (show: boolean) => void;
  handleDisconnectImage: () => void;
  previewUrl: string | null;
  existingImageUrl: string | null;
  uploading: boolean;
  uploadError: string | null;
  submitButtonText: string;
}

export default function ProductForm({
  register,
  handleSubmit,
  errors,
  handleImageChange,
  setShowFileManager,
  handleDisconnectImage,
  previewUrl,
  existingImageUrl,
  uploading,
  uploadError,
  submitButtonText,
}: ProductFormProps) {
  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <Label htmlFor="name">Name</Label>
        <Input id="name" {...register('name')} />
        {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message as string}</p>}
      </div>
      <div className="mb-4">
        <Label htmlFor="price">Price</Label>
        <Input id="price" type="number" {...register('price', { valueAsNumber: true })} />
        {errors.price && <p className="text-red-500 text-sm mt-1">{errors.price.message as string}</p>}
      </div>
      <div className="mb-4">
        <Label htmlFor="sku">SKU</Label>
        <Input id="sku" {...register('sku')} />
        {errors.sku && <p className="text-red-500 text-sm mt-1">{errors.sku.message as string}</p>}
      </div>
      <div className="mb-4">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register('description')} />
        {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message as string}</p>}
      </div>
      <div className="mb-4">
        <Label>Product Image</Label>
        {(previewUrl || existingImageUrl) && (
          <div className="mb-2">
            <Image
              key={previewUrl || existingImageUrl}
              src={previewUrl || existingImageUrl!}
              alt="Product Image"
              width={128}
              height={128}
              className="max-w-xs h-auto"
            />
          </div>
        )}
        <div className="mt-2 flex space-x-4">
          <Button
            type="button"
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            Upload New
          </Button>
          <Button
            type="button"
            onClick={() => setShowFileManager(true)}
          >
            Choose Existing
          </Button>
          {(previewUrl || existingImageUrl) && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDisconnectImage}
            >
              Remove Image
            </Button>
          )}
        </div>
        <Input
          type="file"
          id="image-upload"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
        {uploading && (
          <div className="mt-2 w-full bg-gray-700 rounded-full h-2.5">
            <div
              className="bg-white h-2.5 rounded-full"
              style={{ width: '100%' }}
            ></div>
          </div>
        )}
        {uploadError && (
          <p className="mt-2 text-sm text-red-500">Error: {uploadError}</p>
        )}
      </div>
      <Button type="submit" disabled={uploading}>
        {uploading ? 'Saving...' : submitButtonText}
      </Button>
    </form>
  );
}

