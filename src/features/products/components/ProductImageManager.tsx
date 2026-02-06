'use client';

import { PlusIcon, XIcon, GripVertical, MoreVertical } from 'lucide-react';
import NextImage from 'next/image';
import React, { useEffect, useState } from 'react';



import { useProductFormContext } from '@/features/products/context/ProductFormContext';
import { DebugInfo, ProductImageSlot } from '@/features/products/types/products-ui';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Input,
  Alert,
} from '@/shared/ui';
import { DRAG_KEYS, getFirstDragValue, parseDragIndex, setDragData } from '@/shared/utils/drag-drop';

const EXTERNAL_IMAGE_BASE_URL_KEY = 'product_images_external_base_url';
type SlotViewMode = 'upload' | 'link' | 'base64' | 'external';

export default function ProductImageManager(): React.JSX.Element {
  const {
    imageSlots,
    imageLinks,
    imageBase64s,
    setImageLinkAt,
    setImageBase64At,
    handleSlotImageChange,
    handleSlotDisconnectImage,
    setShowFileManager,
    swapImageSlots,
    uploadError,
    setImagesReordering,
  } = useProductFormContext();

  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const externalBaseSetting = settingsStore.get(EXTERNAL_IMAGE_BASE_URL_KEY) ?? '';

  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [slotViewModes, setSlotViewModes] = useState<SlotViewMode[]>(
    Array(imageSlots.length).fill('upload')
  );
  const [base64LoadingSlots, setBase64LoadingSlots] = useState<Record<number, boolean>>({});
  const [externalBaseInput, setExternalBaseInput] = useState(externalBaseSetting);
  const currentSlotIndexRef = React.useRef<number | null>(null);
  const fileInputRefs = React.useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    setExternalBaseInput(externalBaseSetting);
  }, [externalBaseSetting]);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isReordering, setIsReordering] = useState(false);

  useEffect(() => {
    if (isReordering) return;
    setSlotViewModes((prev: SlotViewMode[]) => {
      const next = Array(imageSlots.length).fill('upload') as SlotViewMode[];
      let changed = next.length !== prev.length;

      for (let i = 0; i < imageSlots.length; i += 1) {
        const hasUpload = Boolean(imageSlots[i]);
        const hasLink = Boolean(imageLinks[i]?.trim());
        const hasBase64 = Boolean(imageBase64s[i]?.trim());
        const slot = imageSlots[i];
        const hasExternal = Boolean(
          externalBaseSetting.trim() &&
            slot?.type === 'existing' &&
            slot.data &&
            'filepath' in slot.data &&
            slot.data.filepath
        );
        const current = prev[i];
        const currentValid =
          (current === 'upload' && hasUpload) ||
          (current === 'link' && hasLink) ||
          (current === 'base64' && hasBase64) ||
          (current === 'external' && hasExternal);
        if (hasUpload && (hasLink || hasBase64 || hasExternal)) {
          if (currentValid) {
            next[i] = current;
          } else if (hasBase64) {
            next[i] = 'base64';
          } else if (hasLink) {
            next[i] = 'link';
          } else if (hasExternal) {
            next[i] = 'external';
          } else {
            next[i] = 'upload';
          }
        } else if (hasBase64 && !hasUpload) {
          next[i] = 'base64';
        } else if (hasLink && !hasUpload) {
          next[i] = 'link';
        } else if (hasExternal && !hasUpload) {
          next[i] = 'external';
        } else {
          next[i] = 'upload';
        }
        if (next[i] !== current) {
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [imageSlots, imageLinks, imageBase64s, externalBaseSetting, isReordering]);

  const pushDebug = (info: Omit<DebugInfo, 'timestamp'>): void => {
    setDebugInfo({
      ...info,
      timestamp: new Date().toISOString(),
    });
  };

  const handleSlotFileUpload = (slotIndex: number, files: File[]): void => {
    const file = files[0];
    if (!file) {
      pushDebug({
        action: 'file-change',
        message: 'No file selected',
        slotIndex,
      });
      return;
    }

    try {
      handleSlotImageChange(file, slotIndex);
    } catch (error: unknown) {
      pushDebug({
        action: 'file-change',
        message:
          error instanceof Error
            ? error.message
            : 'Failed to assign image to slot',
        slotIndex,
        filename: file.name,
      });
    }
  };

  const openSlotFilePicker = (slotIndex: number): void => {
    fileInputRefs.current[slotIndex]?.click();
  };

  const triggerFileManager = (index: number): void => {
    if (index < 0 || index >= imageSlots.length) {
      pushDebug({
        action: 'trigger-file-manager',
        message: 'Invalid slot index',
        slotIndex: index,
      });
      return;
    }
    currentSlotIndexRef.current = index;
    setShowFileManager(true);
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve: (value: string) => void, reject: (reason?: unknown) => void) => {
      const reader = new FileReader();
      reader.onload = (): void => resolve(reader.result as string);
      reader.onerror = (): void => reject(new Error('Failed to read image'));
      reader.readAsDataURL(blob);
    });

  const fileToDataUrl = (file: File): Promise<string> =>
    new Promise((resolve: (value: string) => void, reject: (reason?: unknown) => void) => {
      const reader = new FileReader();
      reader.onload = (): void => resolve(reader.result as string);
      reader.onerror = (): void => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });

  const convertSlotToBase64 = async (index: number): Promise<void> => {
    const slot = imageSlots[index];
    const linkValue = imageLinks[index] ?? '';
    const base64Value = imageBase64s[index] ?? '';
    const hasLink = Boolean(linkValue.trim());
    const hasBase64 = Boolean(base64Value.trim());
    const displayUrl = slot?.previewUrl || (hasLink ? linkValue : '');

    if (!slot && !displayUrl && !hasBase64) {
      pushDebug({
        action: 'base64-convert',
        message: 'No image available to convert',
        slotIndex: index,
      });
      return;
    }

    try {
      setBase64LoadingSlots((prev: Record<number, boolean>) => ({ ...prev, [index]: true }));
      let dataUrl = base64Value.trim();

      if (!dataUrl && linkValue.trim().startsWith('data:')) {
        dataUrl = linkValue.trim();
      } else if (!dataUrl && slot?.type === 'file') {
        dataUrl = await fileToDataUrl(slot.data);
      } else if (!dataUrl && displayUrl) {
        const res = await fetch(displayUrl);
        if (!res.ok) throw new Error('Failed to fetch image');
        const blob = await res.blob();
        dataUrl = await blobToDataUrl(blob);
      }

      if (!dataUrl) throw new Error('Failed to generate base64 data');

      setImageBase64At(index, dataUrl);
      setSlotViewModes((prev: SlotViewMode[]) => {
        const next = [...prev];
        next[index] = 'base64';
        return next;
      });
    } catch (error: unknown) {
      pushDebug({
        action: 'base64-convert',
        message: error instanceof Error ? error.message : 'Failed to convert image',
        slotIndex: index,
      });
    } finally {
      setBase64LoadingSlots((prev: Record<number, boolean>) => {
        const next = { ...prev };
        delete next[index];
        return next;
      });
    }
  };

  const convertAllSlotsToBase64 = async (): Promise<void> => {
    for (let i = 0; i < imageSlots.length; i += 1) {
      const slot = imageSlots[i];
      const linkValue = imageLinks[i] ?? '';
      if (slot || linkValue.trim()) {
        await convertSlotToBase64(i);
      }
    }
  };

  const normalizeExternalBaseUrl = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return '';
    return trimmed.replace(/\/+$/, '');
  };

  const buildExternalUrl = (filepath: string): string => {
    const base = normalizeExternalBaseUrl(externalBaseSetting);
    if (!base) return filepath;
    if (/^[a-z][a-z0-9+.-]*:/i.test(filepath)) {
      try {
        const url = new URL(filepath);
        const cleanPath = url.pathname.replace(/^\/+/, '');
        return `${base}/${cleanPath}`;
      } catch {
        return filepath;
      }
    }
    const cleanPath = filepath.replace(/^\/+/, '');
    return `${base}/${cleanPath}`;
  };

  const saveExternalBaseUrl = (): void => {
    const next = normalizeExternalBaseUrl(externalBaseInput);
    updateSetting.mutate({
      key: EXTERNAL_IMAGE_BASE_URL_KEY,
      value: next,
    });
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number): void => {
    const slot = imageSlots[index];
    if (!slot) return; // Don't allow dragging empty slots

    setDraggedIndex(index);
    setIsReordering(true);
    setImagesReordering(true);
    setDragData(e.dataTransfer, {}, { text: String(index), effectAllowed: 'move' });
  };

  const handleDragEnd = (_e: React.DragEvent<HTMLDivElement>): void => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    setIsReordering(false);
    setImagesReordering(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number): void => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Only update state if the index actually changed to prevent flickering
    if (draggedIndex !== null && draggedIndex !== index && dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, toIndex: number): void => {
    e.preventDefault();
    setDragOverIndex(null);

    const rawIndex = getFirstDragValue(e.dataTransfer, [DRAG_KEYS.TEXT]);
    const fromIndex = parseDragIndex(rawIndex);
    if (fromIndex === null) return;

    if (fromIndex !== toIndex) {
      swapImageSlots(fromIndex, toIndex);

      // Swap the view modes to follow the content
      setSlotViewModes((prev: SlotViewMode[]) => {
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
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void convertAllSlotsToBase64()}
            className="h-7 px-2 text-xs"
          >
            Convert All to Base64
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowDebug((prev: boolean) => !prev)}
            className="h-7 px-2 text-xs"
          >
            {showDebug ? 'Hide debug' : 'Show debug'}
          </Button>
        </div>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-gray-400">External host</span>
        <Input
          value={externalBaseInput}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
            setExternalBaseInput(event.target.value)
          }
          onBlur={saveExternalBaseUrl}
          placeholder="https://cdn.example.com"
          className="h-7 w-64 px-2 text-[11px]"
          aria-label="External image host"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 px-2 text-xs"
          onClick={saveExternalBaseUrl}
          disabled={updateSetting.isPending}
        >
          {updateSetting.isPending ? 'Saving...' : 'Save'}
        </Button>
        {externalBaseSetting.trim() ? (
          <span className="text-[10px] text-emerald-300/80">Active</span>
        ) : (
          <span className="text-[10px] text-gray-500">Not set</span>
        )}
      </div>

      {showDebug && (uploadError || debugInfo) && (
        <Alert variant="error" className="mb-3 p-3 text-xs">
          {uploadError ? <div>Upload error: {uploadError}</div> : null}
          {debugInfo ? (
            <div className="space-y-1 mt-2">
              <div>
                Debug: {debugInfo.action} — {debugInfo.message}
              </div>
              <div className="text-[11px] text-red-300/80">
                {debugInfo.timestamp}
                {debugInfo.slotIndex !== undefined
                  ? ` · slot ${debugInfo.slotIndex + 1}`
                  : ''}
                {debugInfo.filename ? ` · ${debugInfo.filename}` : ''}
              </div>
            </div>
          ) : null}
        </Alert>
      )}

      <div className="grid grid-cols-5 gap-2">
        {imageSlots.map((slot: ProductImageSlot | null, index: number) => {
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;
          const hasUpload = slot !== null;
          const linkValue = imageLinks[index] ?? '';
          const base64Value = imageBase64s[index] ?? '';
          const hasLink = Boolean(linkValue.trim());
          const hasBase64 = Boolean(base64Value.trim());
          const hasExternal =
            Boolean(externalBaseSetting.trim()) &&
            slot?.type === 'existing' &&
            Boolean(slot.data?.filepath);
          const mode = slotViewModes[index];
          const prefersLink = mode === 'link';
          const prefersBase64 = mode === 'base64';
          const prefersExternal = mode === 'external';
          const showBase64 =
            (prefersBase64 && hasBase64) ||
            (!hasUpload && !hasLink && hasBase64);
          const showLink =
            (prefersLink && hasLink) ||
            (!hasUpload && hasLink && !prefersBase64);
          const externalUrl =
            hasExternal && slot?.data?.filepath
              ? buildExternalUrl(slot.data.filepath)
              : '';
          const showExternal = prefersExternal && hasExternal;
          const displayUrl = showBase64
            ? base64Value
            : showLink
              ? linkValue
              : showExternal
                ? externalUrl
                : slot?.previewUrl;
          const modeLabel =
            mode === 'upload'
              ? 'Upload'
              : mode === 'link'
                ? 'Link'
                : mode === 'base64'
                  ? 'Base64'
                  : 'External';
          const canConvertToBase64 = Boolean(slot || linkValue.trim());

          // Use index as key to prevent re-mounting during drag/drop and updates
          // This eliminates flickering when reordering or updating slots
          const slotKey = `slot-${index}`;

          return (
            <div key={slotKey} className="flex flex-col items-center gap-1">
              <input
                ref={(node: HTMLInputElement | null) => {
                  fileInputRefs.current[index] = node;
                }}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  const files = Array.from(event.target.files ?? []);
                  handleSlotFileUpload(index, files);
                  event.currentTarget.value = '';
                }}
                aria-hidden="true"
                tabIndex={-1}
              />
              <div className="flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-1 text-[10px] text-gray-400">
                  <span
                    className={`rounded-full border px-1 ${
                      hasUpload
                        ? 'border-emerald-400 text-emerald-300'
                        : 'border-gray-600 text-gray-500'
                    }`}
                    title="Uploaded image"
                  >
                    U
                  </span>
                  <span
                    className={`rounded-full border px-1 ${
                      hasLink
                        ? 'border-sky-400 text-sky-300'
                        : 'border-gray-600 text-gray-500'
                    }`}
                    title="Image link"
                  >
                    L
                  </span>
                  <span
                    className={`rounded-full border px-1 ${
                      hasBase64
                        ? 'border-purple-400 text-purple-300'
                        : 'border-gray-600 text-gray-500'
                    }`}
                    title="Base64 image"
                  >
                    B
                  </span>
                  <span
                    className={`rounded-full border px-1 ${
                      hasExternal
                        ? 'border-amber-400 text-amber-300'
                        : 'border-gray-600 text-gray-500'
                    }`}
                    title="External host"
                  >
                    E
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                      >
                        View: {modeLabel}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        disabled={!hasUpload}
                        onClick={() =>
                          setSlotViewModes((prev: SlotViewMode[]) => {
                            const next = [...prev];
                            next[index] = 'upload';
                            return next;
                          })
                        }
                      >
                        Upload
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!hasLink}
                        onClick={() =>
                          setSlotViewModes((prev: SlotViewMode[]) => {
                            const next = [...prev];
                            next[index] = 'link';
                            return next;
                          })
                        }
                      >
                        Link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!hasBase64}
                        onClick={() =>
                          setSlotViewModes((prev: SlotViewMode[]) => {
                            const next = [...prev];
                            next[index] = 'base64';
                            return next;
                          })
                        }
                      >
                        Base64
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!hasExternal}
                        onClick={() =>
                          setSlotViewModes((prev: SlotViewMode[]) => {
                            const next = [...prev];
                            next[index] = 'external';
                            return next;
                          })
                        }
                      >
                        External
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6">
                        <MoreVertical className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openSlotFilePicker(index)}>
                        Upload image
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => triggerFileManager(index)}>
                        Choose existing
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={Boolean(!canConvertToBase64 || !!base64LoadingSlots[index])}
                        onClick={() => void convertSlotToBase64(index)}
                      >
                        {base64LoadingSlots[index] ? 'Converting...' : 'Convert to Base64'}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!hasBase64}
                        onClick={() => {
                          setImageBase64At(index, '');
                          setSlotViewModes((prev: SlotViewMode[]) => {
                            const next = [...prev];
                            if (linkValue.trim()) {
                              next[index] = 'link';
                            } else {
                              next[index] = 'upload';
                            }
                            return next;
                          });
                        }}
                      >
                        Clear Base64
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!hasLink}
                        onClick={() => setImageLinkAt(index, '')}
                      >
                        Clear link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={!hasUpload}
                        onClick={() => {
                          handleSlotDisconnectImage(index).catch((error: unknown) => {
                            pushDebug({
                              action: 'remove-image',
                              message:
                                error instanceof Error
                                  ? error.message
                                  : 'Failed to remove image',
                              slotIndex: index,
                            });
                          });
                        }}
                      >
                        Clear upload
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div
                draggable={hasUpload}
                onDragStart={(e: React.DragEvent<HTMLDivElement>) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e: React.DragEvent<HTMLDivElement>) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e: React.DragEvent<HTMLDivElement>) => handleDrop(e, index)}
                className={`
                  relative flex h-24 w-24 items-center justify-center rounded-md border-2 bg-gray-800
                  ${!isReordering ? 'transition-all' : ''}
                  ${hasUpload ? 'cursor-grab active:cursor-grabbing' : ''}
                  ${isDragging ? 'opacity-70 ring-2 ring-emerald-400/60 scale-[0.98] border-emerald-400/40' : 'border'}
                  ${isDragOver ? 'border-emerald-500 bg-emerald-500/10' : ''}
                `}
              >
                <div className={`flex h-full w-full items-center justify-center ${isReordering ? 'pointer-events-none' : ''}`}>
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
                        draggable={false}
                        onDragStart={(event: React.DragEvent<HTMLImageElement>) => event.preventDefault()}
                        onError={() =>
                          pushDebug({
                            action: 'image-load',
                            message: 'Failed to load preview',
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
                            handleSlotDisconnectImage(index).catch((error: unknown) => {
                              pushDebug({
                                action: 'remove-image',
                                message:
                                  error instanceof Error
                                    ? error.message
                                    : 'Failed to remove image',
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
                        aria-label={`Upload image to slot ${index + 1}`}
                        onClick={() => openSlotFilePicker(index)}
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
              {(mode === 'link' || (hasLink && !hasUpload)) ? (
                <Input
                  type="url"
                  value={linkValue}
                  onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                    setImageLinkAt(index, event.target.value)
                  }
                  placeholder="Paste image link"
                  className="h-7 w-full px-2 text-[10px]"
                  aria-label={`Image link for slot ${index + 1}`}
                />
              ) : null}
              {hasBase64 ? (
                <div className="w-full text-[10px] text-purple-300/80">
                  Base64 stored
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

    </div>
  );
}
