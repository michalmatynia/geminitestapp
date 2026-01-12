"use client";

import Image from "next/image";
import { useRef, useState } from "react";
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
    uploadError,
  } = useProductFormContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentSlotIndexRef = useRef<number | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    action: string;
    message: string;
    slotIndex?: number;
    filename?: string;
    timestamp: string;
  } | null>(null);
  const [showDebug, setShowDebug] = useState(false);

  const pushDebug = (info: Omit<typeof debugInfo, "timestamp">) => {
    setDebugInfo({
      ...info,
      timestamp: new Date().toISOString(),
    });
  };

  const triggerFileInput = (index: number) => {
    if (index < 0 || index >= imageSlots.length) {
      pushDebug({
        action: "trigger-file-input",
        message: "Invalid slot index",
        slotIndex: index,
      });
      return;
    }
    currentSlotIndexRef.current = index;
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      pushDebug({
        action: "file-change",
        message: "No file selected",
        slotIndex: currentSlotIndexRef.current ?? undefined,
      });
      return;
    }
    if (file && currentSlotIndexRef.current !== null) {
      try {
        handleSlotImageChange(file, currentSlotIndexRef.current);
      } catch (error) {
        pushDebug({
          action: "file-change",
          message:
            error instanceof Error
              ? error.message
              : "Failed to assign image to slot",
          slotIndex: currentSlotIndexRef.current,
          filename: file.name,
        });
      }
    }
    // Reset file input value to allow re-uploading the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    currentSlotIndexRef.current = null;
  };

  const triggerFileManager = (index: number) => {
    if (index < 0 || index >= imageSlots.length) {
      pushDebug({
        action: "trigger-file-manager",
        message: "Invalid slot index",
        slotIndex: index,
      });
      return;
    }
    currentSlotIndexRef.current = index;
    setShowFileManager(true);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">Image slots</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowDebug((prev) => !prev)}
          className="h-7 px-2 text-xs"
        >
          {showDebug ? "Hide debug" : "Show debug"}
        </Button>
      </div>
      {showDebug && (uploadError || debugInfo) && (
        <div className="mb-3 space-y-2 rounded-md border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {uploadError ? <div>Upload error: {uploadError}</div> : null}
          {debugInfo ? (
            <div className="space-y-1">
              <div>
                Debug: {debugInfo.action} — {debugInfo.message}
              </div>
              <div className="text-[11px] text-red-300/80">
                {debugInfo.timestamp}
                {debugInfo.slotIndex !== undefined
                  ? ` · slot ${debugInfo.slotIndex + 1}`
                  : ""}
                {debugInfo.filename ? ` · ${debugInfo.filename}` : ""}
              </div>
            </div>
          ) : null}
        </div>
      )}
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
                  onError={() =>
                    pushDebug({
                      action: "image-load",
                      message: "Failed to load preview",
                      slotIndex: index,
                    })
                  }
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute right-0 top-0 h-6 w-6 rounded-full"
                  onClick={() => {
                    try {
                      handleSlotDisconnectImage(index);
                    } catch (error) {
                      pushDebug({
                        action: "remove-image",
                        message:
                          error instanceof Error
                            ? error.message
                            : "Failed to remove image",
                        slotIndex: index,
                      });
                    }
                  }}
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
