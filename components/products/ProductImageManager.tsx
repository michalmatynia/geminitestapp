"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useProductFormContext } from "@/lib/context/ProductFormContext";

export default function ProductImageManager() {
  const {
    handleDisconnectImage,
    previewUrls,
    existingImageUrls,
    selectedImageUrls,
  } = useProductFormContext();

  const allImageUrls = [
    ...existingImageUrls,
    ...previewUrls,
    ...selectedImageUrls,
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {allImageUrls.map((url) => (
        <div key={url} className="relative">
          <Image
            src={url}
            alt="Product Image"
            width={128}
            height={128}
            className="max-w-xs h-auto"
          />
          {handleDisconnectImage && (
            <Button
              type="button"
              variant="destructive"
              className="absolute top-0 right-0"
              onClick={() => handleDisconnectImage(url)}
              aria-label="Remove image"
            >
              X
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
