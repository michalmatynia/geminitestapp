"use client";

import NextImage from "next/image";
import React, { useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { useProductFormContext } from "@/features/products/context/ProductFormContext";
import { PlusIcon, XIcon, GripVertical } from "lucide-react";
import { DebugInfo } from "@/features/products/types/products-ui";

export default function ProductImageManager() {
  const {
    imageSlots,
    imageLinks,
    setImageLinkAt,
    handleSlotImageChange,
    handleSlotDisconnectImage,
    setShowFileManager,
    swapImageSlots,
    uploadError,
    setImagesReordering,
  } = useProductFormContext();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentSlotIndexRef = useRef<number | null>(null);

  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [slotViewModes, setSlotViewModes] = useState<Array<"upload" | "link">>(
    Array(imageSlots.length).fill("upload")
  );
  const [prevSlots, setPrevSlots] = useState(imageSlots);
  const [prevLinks, setPrevLinks] = useState(imageLinks);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  // Sync slotViewModes when imageSlots or imageLinks change - adjusting state during render
  if (!isReordering && (imageSlots !== prevSlots || imageLinks !== prevLinks)) {
    setPrevSlots(imageSlots);
    setPrevLinks(imageLinks);

    const next = Array(imageSlots.length).fill("upload") as Array<
      "upload" | "link"
    >;
    let changed = next.length !== slotViewModes.length;

    for (let i = 0; i < imageSlots.length; i += 1) {
      const hasUpload = Boolean(imageSlots[i]);
      const hasLink = Boolean(imageLinks[i]?.trim());
      const current = slotViewModes[i];
      if (hasUpload && hasLink) {
        next[i] = current ?? "upload";
      } else if (hasLink && !hasUpload) {
        next[i] = "link";
      } else {
        next[i] = "upload";
      }
      if (next[i] !== current) {
        changed = true;
      }
    }

    if (changed) {
      setSlotViewModes(next);
    }
  }

  const pushDebug = (info: Omit<DebugInfo, "timestamp">) => {
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

    const slotIndex = currentSlotIndexRef.current;
    if (slotIndex === null) {
      pushDebug({
        action: "file-change",
        message: "Slot index was not set",
        filename: file.name,
      });
    } else {
      try {
        handleSlotImageChange(file, slotIndex);
      } catch (error) {
        pushDebug({
          action: "file-change",
          message:
            error instanceof Error
              ? error.message
              : "Failed to assign image to slot",
          slotIndex,
          filename: file.name,
        });
      }
    }

    // Reset file input to allow re-uploading the same file
    if (fileInputRef.current) fileInputRef.current.value = "";
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    const slot = imageSlots[index];
    if (!slot) return; // Don't allow dragging empty slots

    setDraggedIndex(index);
    setIsReordering(true);
    setImagesReordering(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(index));
  };

  const handleDragEnd = (_e: React.DragEvent<HTMLDivElement>) => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsReordering(false);
    setImagesReordering(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    // Only update state if the index actually changed to prevent flickering
    if (draggedIndex !== null && draggedIndex !== index && dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Only clear drag over if we're actually leaving the element
    const rect = e.currentTarget.getBoundingClientRect();
    const { clientX: x, clientY: y } = e;

    // Check if the mouse is actually outside the element's bounds
    // This is more reliable than relatedTarget for drag events
    if (
      x < rect.left ||
      x >= rect.right ||
      y < rect.top ||
      y >= rect.bottom
    ) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    const fromIndex = parseInt(e.dataTransfer.getData("text/plain"), 10);
    if (isNaN(fromIndex)) return;

    if (fromIndex !== toIndex) {
      swapImageSlots(fromIndex, toIndex);

      // Swap the view modes to follow the content
      setSlotViewModes((prev) => {
        const next = [...prev];
        const tempMode = next[fromIndex];
        const toMode = next[toIndex];
        if (tempMode !== undefined && toMode !== undefined) {
          next[fromIndex] = toMode;
          next[toIndex] = tempMode;
        }
        return next;
      });
    }

    setDraggedIndex(null);
    setIsReordering(false);
    setImagesReordering(false);
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Image slots</span>
          <span className="text-xs text-gray-500">(drag to reorder)</span>
        </div>
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
        {imageSlots.map((slot, index) => {
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          const hasUpload = slot !== null;
          const linkValue = imageLinks[index] ?? "";
          const hasLink = Boolean(linkValue.trim());
          const prefersLink = slotViewModes[index] === "link";
          const showLink = (prefersLink && hasLink) || (!hasUpload && hasLink);
          const displayUrl = showLink ? linkValue : slot?.previewUrl;

          // Use index as key to prevent re-mounting during drag/drop and updates
          // This eliminates flickering when reordering or updating slots
          const slotKey = `slot-${index}`;

          return (
            <div key={slotKey} className="flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <span
                    className={`h-2 w-2 rounded-full border ${
                      hasUpload
                        ? "border-emerald-400 bg-emerald-400"
                        : "border-gray-500 bg-transparent"
                    }`}
                    title="Uploaded image"
                  />
                  <span
                    className={`h-2 w-2 rounded-full border ${
                      hasLink
                        ? "border-sky-400 bg-sky-400"
                        : "border-gray-500 bg-transparent"
                    }`}
                    title="Image link"
                  />
                </div>
                <Switch
                  checked={prefersLink}
                  onCheckedChange={(checked) => {
                    setSlotViewModes((prev) => {
                      const next = [...prev];
                      next[index] = checked ? "link" : "upload";
                      return next;
                    });
                  }}
                  disabled={!hasLink || !hasUpload}
                  aria-label={`Toggle image source for slot ${index + 1}`}
                  className="h-5 w-9 data-[state=checked]:bg-sky-500"
                />
              </div>
              <div
                draggable={hasUpload}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                className={`
                  relative flex h-24 w-24 items-center justify-center rounded-md border-2 bg-gray-800
                  ${!isReordering ? "transition-all" : ""}
                  ${hasUpload ? "cursor-grab active:cursor-grabbing" : ""}
                  ${isDragging ? "opacity-70 ring-2 ring-emerald-400/60 scale-[0.98] border-emerald-400/40" : "border-gray-700"}
                  ${isDragOver ? "border-emerald-500 bg-emerald-500/10" : ""}
                `}
              >
                <div className={`flex h-full w-full items-center justify-center ${isReordering ? "pointer-events-none" : ""}`}>
                  {displayUrl ? (
                    <>
                      {hasUpload ? (
                        <div className="absolute left-0 top-0 z-10 flex h-6 w-6 items-center justify-center rounded-br-md bg-gray-900/80 text-gray-400">
                          <GripVertical className="h-3 w-3" />
                        </div>
                      ) : null}
                      <NextImage
                        src={displayUrl}
                        alt={`Product Image ${index + 1}`}
                        width={128}
                        height={128}
                        unoptimized
                        className="rounded-md object-cover pointer-events-none"
                        onError={() =>
                          pushDebug({
                            action: "image-load",
                            message: "Failed to load preview",
                            slotIndex: index,
                          })
                        }
                      />
                      {hasUpload ? (
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute right-0 top-0 h-6 w-6 rounded-full"
                          onClick={() => {
                            handleSlotDisconnectImage(index).catch((error) => {
                              pushDebug({
                                action: "remove-image",
                                message:
                                  error instanceof Error
                                    ? error.message
                                    : "Failed to remove image",
                                slotIndex: index,
                              });
                            });
                          }}
                          aria-label={`Remove image ${index + 1}`}
                        >
                          <XIcon className="h-4 w-4" />
                        </Button>
                      ) : null}
                      <div className="absolute bottom-0 left-0 rounded-tr-md bg-gray-900/80 px-1.5 py-0.5 text-[10px] text-gray-400">
                        {index + 1}
                      </div>
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
              </div>
              <Input
                type="url"
                value={linkValue}
                onChange={(event) => setImageLinkAt(index, event.target.value)}
                placeholder="Image link"
                className="h-7 w-24 px-2 text-[10px]"
                aria-label={`Image link for slot ${index + 1}`}
              />
            </div>
          );
        })}
      </div>

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