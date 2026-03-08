'use client';

import { PlusIcon, XIcon, GripVertical, MoreVertical, Eye } from 'lucide-react';
import NextImage from 'next/image';

import { resolveProductImageUrl } from '@/shared/utils/image-routing';
import { DOCUMENTATION_MODULE_IDS } from '@/shared/contracts/documentation';
import { getDocumentationTooltip } from '@/shared/lib/documentation';
import {
  Button,
  ActionMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  Input,
  FileUploadTrigger,
  Tooltip,
} from '@/shared/ui';

import {
  useProductImageManagerUIActions,
  useProductImageManagerUIState,
} from './ProductImageManagerUIContext';

interface ProductImageSlotProps {
  index: number;
}

export function ProductImageSlot(props: ProductImageSlotProps) {
  const { index } = props;

  const {
    slotViewModes,
    base64LoadingSlots,
    linkToFileLoadingSlots,
    draggedIndex,
    dragOverIndex,
    isReordering,
    externalBaseUrl,
    minimalUi,
    showDragHandle,
    minimalSingleSlotAlign,
    controller,
  } = useProductImageManagerUIState();
  const {
    setSlotViewMode,
    convertSlotToBase64,
    convertLinkToFile,
    triggerFileManager,
    handleSlotFileUpload,
    clearVisibleImage,
    handleDragStart,
    handleDragEnd,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  } = useProductImageManagerUIActions();

  const { imageSlots, imageLinks, imageBase64s, setImageLinkAt, setImageBase64At } = controller;

  const slot = imageSlots[index];
  const isDragging = draggedIndex === index;
  const isDragOver = dragOverIndex === index;
  const hasUpload = slot !== null;
  const imageLocked = Boolean(controller.isSlotImageLocked?.(index));
  const linkValue = imageLinks[index] ?? '';
  const base64Value = imageBase64s[index] ?? '';

  const uploadUrl = slot
    ? slot.type === 'existing'
      ? (resolveProductImageUrl(slot.data.filepath, externalBaseUrl) ?? slot.data.filepath)
      : (resolveProductImageUrl(slot.previewUrl, externalBaseUrl) ?? slot.previewUrl)
    : '';

  const mode = slotViewModes[index];
  const showBase64 =
    (mode === 'base64' && !!base64Value.trim()) ||
    (!hasUpload && !linkValue.trim() && !!base64Value.trim());
  const showLink =
    (mode === 'link' && !!linkValue.trim()) || (!hasUpload && !!linkValue.trim() && !showBase64);
  const displayUrl = showBase64 ? base64Value : showLink ? linkValue : uploadUrl;

  const canReorder = !minimalUi && imageSlots.length > 1;
  const isSingleMinimalSlot = minimalUi && imageSlots.length === 1;
  const singleMinimalSlotFrameClass = 'h-[7.5rem] w-[7.5rem]';
  const previewSize = isSingleMinimalSlot ? 120 : 96;
  const minimalLayoutWidthClass = isSingleMinimalSlot ? 'w-[12.25rem]' : 'w-40';
  const slotLabel = controller.slotLabels?.[index] ?? `Slot ${index + 1}`;

  const isLocalPreviewUrl = (url: string) => url.startsWith('blob:') || url.startsWith('data:');

  const actionsMenu = (
    <ActionMenu
      variant={minimalUi ? 'outline' : 'ghost'}
      size={minimalUi ? 'sm' : 'icon'}
      triggerClassName={minimalUi ? 'h-6 w-full px-2 text-[10px]' : 'h-6 w-6'}
      trigger={minimalUi ? 'Actions' : <MoreVertical className='h-3.5 w-3.5' />}
      className='min-w-[160px]'
    >
      <div data-preserve-slot-selection='true'>
        <FileUploadTrigger
          accept='image/*'
          onFilesSelected={(files) => handleSlotFileUpload(index, files)}
          asChild
          preserveChildSemantics
        >
          <DropdownMenuItem>Upload image</DropdownMenuItem>
        </FileUploadTrigger>
        <DropdownMenuItem onClick={() => triggerFileManager(index)}>
          Choose existing
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={(!slot && !linkValue.trim()) || !!base64LoadingSlots[index]}
          onClick={() => void convertSlotToBase64(index)}
        >
          {base64LoadingSlots[index] ? 'Converting...' : 'Convert to Base64'}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!linkValue.trim() || imageLocked || !!linkToFileLoadingSlots[index]}
          onClick={() => void convertLinkToFile(index)}
        >
          {linkToFileLoadingSlots[index] ? 'Converting link...' : 'Convert link to file'}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!base64Value.trim() || imageLocked}
          onClick={() => {
            setImageBase64At(index, '');
            setSlotViewMode(index, linkValue.trim() ? 'link' : 'upload');
          }}
        >
          Clear Base64
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!linkValue.trim() || imageLocked}
          onClick={() => setImageLinkAt(index, '')}
        >
          Clear link
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!hasUpload || imageLocked}
          onClick={() => void clearVisibleImage(index)}
        >
          Clear upload
        </DropdownMenuItem>
      </div>
    </ActionMenu>
  );

  const thumbnailFrame = (
    <FileUploadTrigger
      accept='image/*'
      onFilesSelected={(files) => handleSlotFileUpload(index, files)}
      disabled={imageLocked}
      asChild
    >
      <div
        draggable={canReorder && hasUpload}
        onDragStart={(e) => handleDragStart(e, index)}
        onDragEnd={handleDragEnd}
        onDragOver={(e) => handleDragOver(e, index)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, index)}
        className={`
          relative flex ${isSingleMinimalSlot ? singleMinimalSlotFrameClass : 'h-24 w-24'} items-center justify-center rounded-md border-2 bg-gray-800
          ${!isReordering ? 'transition-all' : ''}
          ${hasUpload ? 'cursor-grab active:cursor-grabbing' : ''}
          ${isDragging ? 'opacity-70 ring-2 ring-emerald-400/60 scale-[0.98] border-emerald-400/40' : 'border'}
          ${isDragOver ? 'border-emerald-500 bg-emerald-500/10' : ''}
        `}
      >
        <div
          className={`flex h-full w-full items-center justify-center ${isReordering ? 'pointer-events-none' : ''}`}
        >
          {displayUrl ? (
            <>
              {hasUpload && showDragHandle && (
                <div className='absolute left-0 top-0 z-10 flex h-6 w-6 items-center justify-center rounded-br-md bg-gray-900/80 text-gray-400'>
                  <GripVertical className='h-3 w-3' />
                </div>
              )}
              {isLocalPreviewUrl(displayUrl) ? (
                <img
                  src={displayUrl}
                  alt={`Product ${index + 1}`}
                  className='h-full w-full rounded-md object-cover pointer-events-none'
                  draggable={false}
                />
              ) : (
                <NextImage
                  src={displayUrl}
                  alt={`Product ${index + 1}`}
                  width={previewSize}
                  height={previewSize}
                  sizes={`${previewSize}px`}
                  unoptimized
                  className='h-full w-full rounded-md object-cover pointer-events-none'
                  draggable={false}
                />
              )}
              {displayUrl && !minimalUi && !imageLocked && (
                <Button
                  type='button'
                  variant='destructive'
                  size='icon'
                  className='absolute right-0 top-0 h-6 w-6 rounded-full'
                  onClick={(e) => {
                    e.stopPropagation();
                    void clearVisibleImage(index);
                  }}
                >
                  <XIcon className='h-4 w-4' />
                </Button>
              )}
              {!minimalUi && (
                <div className='absolute bottom-0 left-0 flex items-center rounded-tr-md bg-gray-900/80 text-[10px] text-gray-400 overflow-hidden'>
                  <span className='px-1.5 py-0.5'>{index + 1}</span>
                  {displayUrl ? (
                    <Tooltip
                      content={
                        getDocumentationTooltip(
                          DOCUMENTATION_MODULE_IDS.products,
                          'product_open_full_preview'
                        ) ?? 'Open full preview in new tab'
                      }
                      side='top'
                    >
                      <Button
                        variant='ghost'
                        size='xs'
                        onClick={(event: React.MouseEvent): void => {
                          event.stopPropagation();
                          event.preventDefault();
                          if (typeof window === 'undefined') return;
                          window.open(displayUrl, '_blank', 'noopener,noreferrer');
                        }}
                        className='h-5 w-6 rounded-none border-l border-gray-700 p-0 text-gray-300 hover:bg-white/10 hover:text-white'
                        aria-label={`Open full preview for image slot ${index + 1} in new tab`}
                      >
                        <Eye className='size-3' />
                      </Button>
                    </Tooltip>
                  ) : null}
                </div>
              )}
            </>
          ) : (
            <div className='flex flex-col items-center justify-center text-gray-500'>
              <PlusIcon className='h-6 w-6' />
              <span className='text-xs'>Upload</span>
              <Button
                type='button'
                variant='ghost'
                className='text-xs h-7 mt-1'
                onClick={(e) => {
                  e.stopPropagation();
                  triggerFileManager(index);
                }}
              >
                Choose Existing
              </Button>
            </div>
          )}
        </div>
      </div>
    </FileUploadTrigger>
  );

  return (
    <div
      className={`flex flex-col gap-1 ${isSingleMinimalSlot && minimalSingleSlotAlign === 'left' ? 'items-start' : 'items-center'}`}
    >
      {minimalUi && slotLabel && (
        <div
          className={
            isSingleMinimalSlot
              ? `w-[7.5rem] ${minimalSingleSlotAlign === 'left' ? 'text-left' : 'text-center'} text-[10px] font-medium tracking-wide text-gray-400`
              : 'w-24 text-center text-[10px] font-medium tracking-wide text-gray-400'
          }
        >
          {slotLabel}
        </div>
      )}

      {minimalUi ? (
        <div
          className={`${isSingleMinimalSlot && minimalSingleSlotAlign === 'left' ? '' : 'mx-auto'} flex ${minimalLayoutWidthClass} items-start gap-2`}
        >
          {thumbnailFrame}
          <div className='flex w-[4.25rem] flex-col items-stretch gap-1'>
            {(['upload', 'link', 'base64'] as const).map((m) => (
              <Button
                key={m}
                type='button'
                variant={mode === m ? 'default' : 'outline'}
                size='sm'
                className='h-6 w-full px-2 text-[10px]'
                disabled={
                  (m === 'upload' && !hasUpload) ||
                  (m === 'link' && !linkValue.trim()) ||
                  (m === 'base64' && !base64Value.trim())
                }
                onClick={() => setSlotViewMode(index, m)}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </Button>
            ))}
            {actionsMenu}
          </div>
        </div>
      ) : (
        <>
          <div className='flex w-full items-center justify-between gap-2'>
            <div className='flex items-center gap-1 text-[10px] text-gray-400'>
              {(['U', 'L', 'B'] as const).map((label, i) => {
                const hasVal =
                  i === 0 ? hasUpload : i === 1 ? !!linkValue.trim() : !!base64Value.trim();
                const colorClass =
                  i === 0
                    ? 'border-emerald-400 text-emerald-300'
                    : i === 1
                      ? 'border-sky-400 text-sky-300'
                      : 'border-purple-400 text-purple-300';
                return (
                  <span
                    key={label}
                    className={`rounded-full border px-1 ${hasVal ? colorClass : 'border-gray-600 text-gray-500'}`}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
            <div className='flex items-center gap-1'>
              <ActionMenu
                variant='outline'
                size='sm'
                triggerClassName='h-6 px-2 text-[10px]'
                trigger={`View: ${(mode ?? 'upload').charAt(0).toUpperCase() + (mode ?? 'upload').slice(1)}`}
              >
                {(['upload', 'link', 'base64'] as const).map((m) => (
                  <DropdownMenuItem
                    key={m}
                    disabled={
                      (m === 'upload' && !hasUpload) ||
                      (m === 'link' && !linkValue.trim()) ||
                      (m === 'base64' && !base64Value.trim())
                    }
                    onClick={() => setSlotViewMode(index, m)}
                  >
                    {m.charAt(0).toUpperCase() + m.slice(1)}
                  </DropdownMenuItem>
                ))}
              </ActionMenu>
              {actionsMenu}
            </div>
          </div>
          {thumbnailFrame}
        </>
      )}

      {(minimalUi || mode === 'link' || (!!linkValue.trim() && !hasUpload)) && (
        <Input
          type='url'
          value={linkValue}
          onChange={(e) => setImageLinkAt(index, e.target.value)}
          placeholder='Paste image link'
          className={
            minimalUi
              ? `h-7 ${minimalLayoutWidthClass} px-2 text-[10px]`
              : 'h-7 w-full px-2 text-[10px]'
          }
        />
      )}
      {!!base64Value.trim() && (
        <div
          className={
            minimalUi
              ? `${minimalLayoutWidthClass} text-[10px] text-purple-300/80`
              : 'w-full text-[10px] text-purple-300/80'
          }
        >
          Base64 stored
        </div>
      )}
    </div>
  );
}
