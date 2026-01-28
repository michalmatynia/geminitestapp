"use client";

import { Button, Input, Label } from "@/shared/ui";
import { useProductFormContext } from "@/features/products/context/ProductFormContext";



import ProductImageManager from "../ProductImageManager";

export default function ProductFormImages() {
  const { setShowFileManager, handleMultiImageChange } = useProductFormContext();

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Label htmlFor="multi-image-upload">Upload Multiple Images</Label>
        <div className="mt-2 flex space-x-4">
          <Button
            type="button"
            onClick={() => document.getElementById("multi-image-upload")?.click()}
            aria-label="Upload multiple new images for the product"
          >
            Upload from Drive
          </Button>
          <Button
            type="button"
            onClick={() => setShowFileManager(true)}
            aria-label="Choose multiple existing images for the product"
          >
            Choose from File Manager
          </Button>
        </div>
        <Input
          type="file"
          id="multi-image-upload"
          accept="image/*"
          onChange={(e) => {
            if (e.target.files) {
              // Convert FileList to an array before passing
              handleMultiImageChange(Array.from(e.target.files));
              e.target.value = ''; // Clear the input after selection
            }
          }}
          className="hidden"
          aria-label="Multiple product image upload"
          multiple
        />
      </div>
      <ProductImageManager />
    </div>
  );
}
