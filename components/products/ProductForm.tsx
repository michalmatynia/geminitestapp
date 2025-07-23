"use client";

import { useState } from "react";
import { useFormContext } from "react-hook-form";

import ProductImageManager from "./ProductImageManager";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProductFormContext } from "@/lib/context/ProductFormContext";
import { ProductFormData } from "@/lib/types";

interface ProductFormProps {
  submitButtonText: string;
}

// This component renders the product form fields and handles user interactions.
// It consumes the ProductFormContext to access state and functions.
export default function ProductForm({ submitButtonText }: ProductFormProps) {
  const {
    handleSubmit,
    errors,
    handleImageChange,
    setShowFileManager,
    uploading,
    uploadError,
    existingImageUrls,
    previewUrls,
    selectedImageUrls,
  } = useProductFormContext();
  const [generating, setGenerating] = useState(false);
  const { register, getValues, setValue } = useFormContext<ProductFormData>();

  // This function calls the API to generate a product description based on the product name.
  const handleGenerateDescription = async () => {
    setGenerating(true);
    const productData = getValues();
    const imageUrls = [
      ...existingImageUrls,
      ...previewUrls,
      ...selectedImageUrls,
    ];
    try {
      const res = await fetch("/api/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productData, imageUrls }),
      });
      const { description } = (await res.json()) as { description: string };
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
        <Input
          id="name"
          {...register("name")}
          aria-required="true"
          aria-invalid={errors.name ? "true" : "false"}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.name.message}
          </p>
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
          aria-required="true"
          aria-invalid={errors.price ? "true" : "false"}
        />
        {errors.price && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.price.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="sku">
          SKU <span className="text-red-500">*</span>
        </Label>
        <Input
          id="sku"
          {...register("sku")}
          aria-required="true"
          aria-invalid={errors.sku ? "true" : "false"}
        />
        {errors.sku && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.sku.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          {...register("description")}
          aria-invalid={errors.description ? "true" : "false"}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.description.message}
          </p>
        )}
        <Button
          type="button"
          onClick={() => {
            void handleGenerateDescription();
          }}
          disabled={generating}
          className="mt-2"
          aria-label="Generate product description"
          aria-disabled={generating}
        >
          {generating ? "Generating..." : "Generate Description"}
        </Button>
      </div>
      <div className="mb-4">
        <Label htmlFor="supplierName">Supplier Name</Label>
        <Input
          id="supplierName"
          {...register("supplierName")}
          aria-invalid={errors.supplierName ? "true" : "false"}
        />
        {errors.supplierName && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.supplierName.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="supplierLink">Supplier Link</Label>
        <Input
          id="supplierLink"
          {...register("supplierLink")}
          aria-invalid={errors.supplierLink ? "true" : "false"}
        />
        {errors.supplierLink && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.supplierLink.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="priceComment">Price Comment</Label>
        <Input
          id="priceComment"
          {...register("priceComment")}
          aria-invalid={errors.priceComment ? "true" : "false"}
        />
        {errors.priceComment && (
          <p className="text-red-500 text-sm mt-1" role="alert">
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
          aria-invalid={errors.stock ? "true" : "false"}
        />
        {errors.stock && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.stock.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label htmlFor="sizeLength">Size Length</Label>
        <Input
          id="sizeLength"
          type="number"
          {...register("sizeLength", { valueAsNumber: true })}
          aria-invalid={errors.sizeLength ? "true" : "false"}
        />
        {errors.sizeLength && (
          <p className="text-red-500 text-sm mt-1" role="alert">
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
          aria-invalid={errors.sizeWidth ? "true" : "false"}
        />
        {errors.sizeWidth && (
          <p className="text-red-500 text-sm mt-1" role="alert">
            {errors.sizeWidth.message}
          </p>
        )}
      </div>
      <div className="mb-4">
        <Label>Product Images</Label>
        <ProductImageManager />
        <div className="mt-2 flex space-x-4">
          <Button
            type="button"
            onClick={() => document.getElementById("image-upload")?.click()}
            aria-label="Upload new images for the product"
          >
            Upload New
          </Button>
          <Button
            type="button"
            onClick={() => setShowFileManager(true)}
            aria-label="Choose existing images for the product"
          >
            Choose Existing
          </Button>
        </div>
        <Input
          type="file"
          id="image-upload"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
          aria-label="Product image upload"
          multiple
        />
        {uploading && (
          <div
            className="mt-2 w-full bg-gray-700 rounded-full h-2.5"
            role="progressbar"
            aria-valuenow={100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Uploading image"
          >
            <div
              className="bg-white h-2.5 rounded-full"
              style={{ width: "100%" }}
            ></div>
          </div>
        )}
        {uploadError && (
          <p className="mt-2 text-sm text-red-500" role="alert">
            Error: {uploadError}
          </p>
        )}
      </div>
      <Button type="submit" disabled={uploading} aria-disabled={uploading}>
        {uploading ? "Saving..." : submitButtonText}
      </Button>
    </form>
  );
}
