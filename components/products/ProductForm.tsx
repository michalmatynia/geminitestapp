"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Image from "next/image";
import { UseFormRegister, FieldErrors, UseFormSetValue } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// The `ProductFormData` interface defines the shape of the data for the
// product form.
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

// The `ProductFormProps` interface defines the props for the `ProductForm`
// component.
interface ProductFormProps {
  register: UseFormRegister<ProductFormData>;
  handleSubmit: (e: FormEvent<HTMLFormElement>) => void;
  errors: FieldErrors<ProductFormData>;
  setValue: UseFormSetValue<ProductFormData>;
  handleImageChange: (e: ChangeEvent<HTMLInputElement>) => void;
  setShowFileManager: (show: boolean) => void;
  handleDisconnectImage?: () => void;
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
  setValue,
  handleImageChange,
  setShowFileManager,
  handleDisconnectImage,
  previewUrl,
  existingImageUrl,
  uploading,
  uploadError,
  submitButtonText,
}: ProductFormProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerateDescription = async () => {
    setGenerating(true);
    const name = (document.getElementById("name") as HTMLInputElement).value;
    try {
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      });
      const { description } = await res.json();
      setValue("description", description);
    } catch (error) {
      console.error("Failed to generate description:", error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-4">
        <Label htmlFor="name">
          Name <span className="text-red-500">*</span>
        </Label>
        <Input id="name" {...register("name")} />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="price">
          Price <span className="text-red-500">*</span>
        </Label>
        <Input
          id="price"
          type="number"
          {...register("price", { valueAsNumber: true })}
        />
        {errors.price && (
          <p className="text-red-500 text-sm mt-1">{errors.price.message}</p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="sku">
          SKU <span className="text-red-500">*</span>
        </Label>
        <Input id="sku" {...register("sku")} />
        {errors.sku && (
          <p className="text-red-500 text-sm mt-1">{errors.sku.message}</p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" {...register("description")} />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">
            {errors.description.message}
          </p>
        )}
        <Button
          type="button"
          onClick={handleGenerateDescription}
          disabled={generating}
          className="mt-2"
        >
          {generating ? "Generating..." : "Generate Description"}
        </Button>
      </div>
      <div className="mb-4">
        <Label htmlFor="supplierName">Supplier Name</Label>
        <Input id="supplierName" {...register("supplierName")} />
        {errors.supplierName && (
          <p className="text-red-500 text-sm mt-1">
            {errors.supplierName.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="supplierLink">Supplier Link</Label>
        <Input id="supplierLink" {...register("supplierLink")} />
        {errors.supplierLink && (
          <p className="text-red-500 text-sm mt-1">
            {errors.supplierLink.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="priceComment">Price Comment</Label>
        <Input id="priceComment" {...register("priceComment")} />
        {errors.priceComment && (
          <p className="text-red-500 text-sm mt-1">
            {errors.priceComment.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="stock">Stock</Label>
        <Input
          id="stock"
          type="number"
          {...register("stock", { valueAsNumber: true })}
        />
        {errors.stock && (
          <p className="text-red-500 text-sm mt-1">{errors.stock.message}</p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="sizeLength">Size Length</Label>
        <Input
          id="sizeLength"
          type="number"
          {...register("sizeLength", { valueAsNumber: true })}
        />
        {errors.sizeLength && (
          <p className="text-red-500 text-sm mt-1">
            {errors.sizeLength.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="sizeWidth">Size Width</Label>
        <Input
          id="sizeWidth"
          type="number"
          {...register("sizeWidth", { valueAsNumber: true })}
        />
        {errors.sizeWidth && (
          <p className="text-red-500 text-sm mt-1">
            {errors.sizeWidth.message}
          </p>
        )}
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
            onClick={() => document.getElementById("image-upload")?.click()}
          >
            Upload New
          </Button>
          <Button type="button" onClick={() => setShowFileManager(true)}>
            Choose Existing
          </Button>
          {((previewUrl || existingImageUrl) && handleDisconnectImage) && (
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
              style={{ width: "100%" }}
            ></div>
          </div>
        )}
        {uploadError && (
          <p className="mt-2 text-sm text-red-500">Error: {uploadError}</p>
        )}
      </div>
      <Button type="submit" disabled={uploading}>
        {uploading ? "Saving..." : submitButtonText}
      </Button>
    </form>
  );
}


