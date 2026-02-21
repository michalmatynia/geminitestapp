import { } from 'lucide-react';
import React from 'react';

import ProductImageManager, {
  type ProductImageManagerController,
} from '@/features/products/components/ProductImageManager';
import { ProductImageManagerControllerProvider } from '@/features/products/components/ProductImageManagerControllerContext';
import type { ImageStudioSlotRecord } from '@/shared/contracts/image-studio';
import { Button, Input, Label, TabsContent, LoadingState } from '@/shared/ui';
import { Hint } from '@/shared/ui';

import { InlineImagePreviewCanvas } from './InlineImagePreviewCanvas';

import type {
  InlinePreviewSourceViewModel,
  LinkedGeneratedVariantViewModel,
} from './slot-inline-edit-tab-types';

type SlotInlineEditCardTabProps = {
  clearImageDisabled: boolean;
  clearImageTitle?: string;
  formatBytes: (value: number | null) => string;
  formatDateTime: (value: string | Date | null | undefined) => string;
  formatLinkedVariantTimestamp: (value: string) => string;
  inlineCardImageManagerController: ProductImageManagerController;
  inlinePreviewBase64Bytes: number | null;
  inlinePreviewDimensions: string;
  inlinePreviewMimeType: string;
  inlinePreviewSource: InlinePreviewSourceViewModel;
  linkedGeneratedVariants: LinkedGeneratedVariantViewModel[];
  linkedRunsErrorMessage: string;
  linkedRunsIsError: boolean;
  linkedRunsIsFetching: boolean;
  linkedRunsIsLoading: boolean;
  linkedVariantApplyBusyKey: string | null;
  onApplyLinkedVariantToCard: (variant: LinkedGeneratedVariantViewModel) => void;
  onClearSlotImage: () => void;
  onRefreshLinkedRuns: () => void;
  onReplaceFromDrive: () => void;
  onReplaceFromLocal: () => void;
  onSlotFolderChange: (value: string) => void;
  onSlotNameChange: (value: string) => void;
  selectedSlot: ImageStudioSlotRecord | null;
  setInlinePreviewNaturalSize: (dimensions: { width: number; height: number } | null) => void;
  slotBase64Draft: string;
  slotFolderDraft: string;
  slotNameDraft: string;
  slotUpdateBusy: boolean;
  uploadPending: boolean;
};

export function SlotInlineEditCardTab({
  clearImageDisabled,
  clearImageTitle,
  formatBytes,
  formatDateTime,
  formatLinkedVariantTimestamp,
  inlineCardImageManagerController,
  inlinePreviewBase64Bytes,
  inlinePreviewDimensions,
  inlinePreviewMimeType,
  inlinePreviewSource,
  linkedGeneratedVariants,
  linkedRunsErrorMessage,
  linkedRunsIsError,
  linkedRunsIsFetching,
  linkedRunsIsLoading,
  linkedVariantApplyBusyKey,
  onApplyLinkedVariantToCard,
  onClearSlotImage,
  onRefreshLinkedRuns,
  onReplaceFromDrive,
  onReplaceFromLocal,
  onSlotFolderChange,
  onSlotNameChange,
  selectedSlot,
  setInlinePreviewNaturalSize,
  slotBase64Draft,
  slotFolderDraft,
  slotNameDraft,
  slotUpdateBusy,
  uploadPending,
}: SlotInlineEditCardTabProps): React.JSX.Element {
  return (
    <TabsContent value='card' className='mt-0 space-y-4'>
      <div className='space-y-3 rounded-lg border border-border/60 bg-card/35 p-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='space-y-0.5'>
            <Hint size='xxs' uppercase className='text-gray-500'>Image Slot Preview</Hint>
            <div className='text-xs text-gray-200'>
              Source: {inlinePreviewSource.sourceType}
            </div>
          </div>
        </div>

        <InlineImagePreviewCanvas
          imageSrc={inlinePreviewSource.src}
          imageAlt={slotNameDraft.trim() || selectedSlot?.name || 'Card preview'}
          onImageDimensionsChange={setInlinePreviewNaturalSize}
        />

        <div className='grid gap-2 rounded-md border border-border/60 bg-card/30 p-3 text-[11px] text-gray-300 sm:grid-cols-2'>
          <div>
            <span className='text-gray-500'>Source type:</span> {inlinePreviewSource.sourceType}
          </div>
          <div>
            <span className='text-gray-500'>Dimensions:</span> {inlinePreviewDimensions}
          </div>
          <div>
            <span className='text-gray-500'>Image file id:</span>{' '}
            <span className='font-mono text-[10px]'>
              {selectedSlot?.imageFile?.id || selectedSlot?.imageFileId || 'n/a'}
            </span>
          </div>
          <div>
            <span className='text-gray-500'>Mime type:</span> {inlinePreviewMimeType}
          </div>
          <div>
            <span className='text-gray-500'>Filename:</span> {selectedSlot?.imageFile?.filename || 'n/a'}
          </div>
          <div>
            <span className='text-gray-500'>File size:</span> {formatBytes(selectedSlot?.imageFile?.size ?? inlinePreviewBase64Bytes ?? null)}
          </div>
          {slotBase64Draft.trim() ? (
            <div className='sm:col-span-2'>
              <span className='text-gray-500'>Base64 payload:</span>{' '}
              {`${slotBase64Draft.trim().length.toLocaleString()} chars (~${formatBytes(inlinePreviewBase64Bytes)})`}
            </div>
          ) : null}
          <div className='sm:col-span-2'>
            <span className='text-gray-500'>Raw source:</span>{' '}
            <span className='break-all font-mono text-[10px] text-gray-300'>
              {inlinePreviewSource.rawSource}
            </span>
          </div>
          <div className='sm:col-span-2'>
            <span className='text-gray-500'>Resolved preview source:</span>{' '}
            <span className='break-all font-mono text-[10px] text-gray-300'>
              {inlinePreviewSource.resolvedSource}
            </span>
          </div>
          <div className='sm:col-span-2'>
            <span className='text-gray-500'>Tags:</span>{' '}
            {'n/a'}
          </div>
          <div>
            <span className='text-gray-500'>Created:</span> {formatDateTime(selectedSlot?.imageFile?.createdAt)}
          </div>
          <div>
            <span className='text-gray-500'>Updated:</span> {formatDateTime(selectedSlot?.imageFile?.updatedAt)}
          </div>
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Card Name</Label>
          <Input size='sm'
            value={slotNameDraft}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => onSlotNameChange(event.target.value)}
            className='h-9'
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Folder Path</Label>
          <Input size='sm'
            value={slotFolderDraft}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => onSlotFolderChange(event.target.value)}
            placeholder='e.g. variants/red'
            className='h-9'
          />
        </div>
      </div>

      <div className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
        <Hint size='xxs' uppercase className='text-gray-500'>
          Image Slot
        </Hint>
        <ProductImageManagerControllerProvider value={inlineCardImageManagerController}>
          <ProductImageManager showDragHandle={false} />
        </ProductImageManagerControllerProvider>
      </div>

      <div className='space-y-2'>
        <div className='flex items-center justify-between gap-2'>
          <Label className='text-xs text-gray-400'>Linked Generated Variants</Label>
          <Button size='xs'
            type='button'
            variant='outline'
            onClick={onRefreshLinkedRuns}
            disabled={linkedRunsIsFetching}
            loading={linkedRunsIsFetching}
          >
                        Refresh
          </Button>
        </div>
        <div className='max-h-56 space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-card/40 p-2'>
          {linkedRunsIsLoading ? (
            <LoadingState message='Loading linked variants...' />
          ) : linkedRunsIsError ? (
            <div className='rounded border border-red-500/35 bg-red-500/10 px-2 py-2 text-xs text-red-200'>
              {linkedRunsErrorMessage}
            </div>
          ) : linkedGeneratedVariants.length === 0 ? (
            <div className='px-1 py-2 text-xs text-gray-500'>
              No generated variants linked to this card yet.
            </div>
          ) : (
            linkedGeneratedVariants.map((variant) => {
              const isApplying = linkedVariantApplyBusyKey === variant.key && slotUpdateBusy;
              return (
                <div
                  key={variant.key}
                  className='flex items-center gap-3 rounded border border-border/60 bg-card/50 p-2'
                >
                  <div className='size-14 overflow-hidden rounded-md border border-border/60 bg-black/30'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={variant.imageSrc}
                      alt={variant.output.filename || `Linked variant ${variant.outputIndex}`}
                      className='h-full w-full object-cover'
                      loading='lazy'
                    />
                  </div>
                  <div className='min-w-0 flex-1 text-[11px] text-gray-300'>
                    <div className='truncate text-xs text-gray-100'>
                      {variant.output.filename || `Variant ${variant.outputIndex}`}
                    </div>
                    <div className='truncate text-[10px] text-gray-400'>
                      Run {variant.runId.slice(0, 8)} • Variant {variant.outputIndex}/{variant.outputCount}
                    </div>
                    <div className='truncate text-[10px] text-gray-500'>
                      {formatLinkedVariantTimestamp(variant.runCreatedAt)}
                    </div>
                  </div>
                  <Button size='xs'
                    type='button'
                    variant='outline'
                    onClick={() => {
                      onApplyLinkedVariantToCard(variant);
                    }}
                    disabled={slotUpdateBusy}
                    loading={isApplying}
                  >
                    Use On Card
                  </Button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onReplaceFromDrive}
        >
          Replace From Drive
        </Button>
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onReplaceFromLocal}
          disabled={uploadPending}
          loading={uploadPending}
        >
                    Replace From Local Upload
        </Button>        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onClearSlotImage}
          disabled={clearImageDisabled}
          title={clearImageTitle}
        >
          Clear Image
        </Button>
      </div>
    </TabsContent>
  );
}
