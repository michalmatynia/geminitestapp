"use client";

import { Button, Label, FileUploadButton } from "@/shared/ui";
import { useProductFormContext } from "@/features/products/context/ProductFormContext";



import ProductImageManager from "../ProductImageManager";

export default function ProductFormImages(): React.JSX.Element {
  const { setShowFileManager, handleMultiImageChange } = useProductFormContext();

  return (
    <div className="space-y-4">
      <div className="mb-4">
        <Label htmlFor="multi-image-upload">Upload Multiple Images</Label>
        <div className="mt-2 flex space-x-4">
          <FileUploadButton
            onFilesSelected={(files: File[]) => handleMultiImageChange(files)}
            accept="image/*"
            multiple
            aria-label="Upload multiple new images for the product"
          >
            Upload from Drive
          </FileUploadButton>
          <Button
            type="button"
            onClick={() => setShowFileManager(true)}
            aria-label="Choose multiple existing images for the product"
          >
            Choose from File Manager
          </Button>
        </div>
      </div>
      <ProductImageManager />
    </div>
  );
}
