"use client";

import Image from "next/image";
import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProductFormContext } from "@/lib/context/ProductFormContext";
import { PlusIcon, XIcon } from "lucide-react";

export default function ProductImageManager() {
  const {
    imageSlots,
    handleSlotImageChange,
    handleSlotDisconnectImage,
    setShowFileManager, // For opening the file manager modal for existing images
  } = useProductFormContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentSlotIndexRef = useRef<number | null>(null);

  const triggerFileInput = (index: number) => {
    currentSlotIndexRef.current = index;
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && currentSlotIndexRef.current !== null) {
      handleSlotImageChange(file, currentSlotIndexRef.current);
    }
    // Reset file input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    currentSlotIndexRef.current = null;
  };

  const triggerFileManager = (index: number) => {
    currentSlotIndexRef.current = index;
    setShowFileManager(true);
  };

  return (
    <div>
      <div className="grid grid-cols-5 gap-2">
        {imageSlots.map((slot, index) => (
          <div
            key={index}
            className="relative flex h-24 w-24 items-center justify-center rounded-md border border-gray-700 bg-gray-800"
          >
            {slot ? (
              <>
                <Image
                  src={slot.previewUrl}
                  alt={`Product Image ${index + 1}`}
                  width={128}
                  height={128}
                  className="rounded-md object-cover"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-0 top-0 h-6 w-6 rounded-full"
                  onClick={() => handleSlotDisconnectImage(index)}
                  aria-label={`Remove image ${index + 1}`}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-500">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => triggerFileInput(index)}
                  aria-label={`Upload image to slot ${index + 1}`}
                >
                  <PlusIcon className="h-6 w-6" />
                </Button>
                <span className="text-xs">Upload</span>
                <Button
                  type="button"
                  variant="ghost"
                  className="text-xs"
                  onClick={() => triggerFileManager(index)}
                  aria-label={`Choose existing image for slot ${index + 1}`}
                >
                  Choose Existing
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Hidden file input for actual file selection */}
      <Input
        type="file"
        ref={fileInputRef}
        onChange={onFileChange}
        className="hidden"
        accept="image/*"
        multiple={false}
        aria-label="File uploader for image slot"
      />
    </div>
  );
}
