import {} from 'lucide-react';
import React from 'react';

import {
  ProductImageManager,
  ProductImageManagerControllerProvider,
  Button,
  Input,
  Label,
  TabsContent,
  LoadingState,
  Hint,
} from '@/shared/ui';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
} from '@/shared/lib/products/constants';

import { InlineImagePreviewCanvas } from './InlineImagePreviewCanvas';
import {
  isCardImageRemovalLocked,
  formatBytes,
  formatDateTime,
  formatLinkedVariantTimestamp,
} from './slot-inline-edit-utils';
import { useStudioInlineEdit } from './StudioInlineEditContext';
import type { StudioInlineEditContextValue } from './StudioInlineEditContext.types';

export function SlotInlineEditCardTab(): React.JSX.Element {
  const {
    inlineCardImageManagerController,
    inlinePreviewBase64Bytes,
    inlinePreviewDimensions,
    inlinePreviewMimeType,
    inlinePreviewSource,
    linkedGeneratedVariants,
    linkedRunsQuery,
    linkedVariantApplyBusyKey,
    onApplyLinkedVariantToCard,
    onClearSlotImage,
    onReplaceFromDrive,
    onReplaceFromLocal,
    selectedSlot,
    setInlinePreviewNaturalSize,
    setSlotFolderDraft,
    setSlotNameDraft,
    slotBase64Draft,
    slotFolderDraft,
    slotNameDraft,
    slotUpdateBusy,
    uploadPending,
    onRefreshLinkedRuns,
  }: StudioInlineEditContextValue = useStudioInlineEdit();

  const settingsStore = useSettingsStore();
  const externalBaseUrl =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  const linkedRunsErrorMessage =
    linkedRunsQuery.error instanceof Error
      ? linkedRunsQuery.error.message
      : 'Failed to load linked variants.';

  const linkedRunsIsError = linkedRunsQuery.isError;
  const linkedRunsIsFetching = linkedRunsQuery.isFetching;
  const linkedRunsIsLoading = linkedRunsQuery.isLoading;

  const clearImageDisabled = slotUpdateBusy || isCardImageRemovalLocked(selectedSlot);
  const clearImageTitle = isCardImageRemovalLocked(selectedSlot)
    ? 'Card image is locked and can only be removed by deleting the card.'
    : undefined;

  return (
    <TabsContent value='card' className='mt-0 space-y-4'>
      <div className='space-y-3 rounded-lg border border-border/60 bg-card/35 p-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='space-y-0.5'>
            <Hint size='xxs' uppercase className='text-gray-500'>
              Image Slot Preview
            </Hint>
            <div className='text-xs text-gray-200'>Source: {inlinePreviewSource.sourceType}</div>
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
            <span className='text-gray-500'>Filename:</span>{' '}
            {selectedSlot?.imageFile?.filename || 'n/a'}
          </div>
          <div>
            <span className='text-gray-500'>File size:</span>{' '}
            {formatBytes(selectedSlot?.imageFile?.size ?? inlinePreviewBase64Bytes ?? null)}
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
            <span className='text-gray-500'>Tags:</span> {'n/a'}
          </div>
          <div>
            <span className='text-gray-500'>Created:</span>{' '}
            {formatDateTime(selectedSlot?.imageFile?.createdAt)}
          </div>
          <div>
            <span className='text-gray-500'>Updated:</span>{' '}
            {formatDateTime(selectedSlot?.imageFile?.updatedAt)}
          </div>
        </div>
      </div>

      <div className='grid gap-3 sm:grid-cols-2'>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Card Name</Label>
          <Input
            size='sm'
            value={slotNameDraft}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSlotNameDraft(event.target.value)
            }
            className='h-9'
          />
        </div>
        <div className='space-y-1'>
          <Label className='text-xs text-gray-400'>Folder Path</Label>
          <Input
            size='sm'
            value={slotFolderDraft}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
              setSlotFolderDraft(event.target.value)
            }
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
          <ProductImageManager externalBaseUrl={externalBaseUrl} showDragHandle={false} />
        </ProductImageManagerControllerProvider>
      </div>

      <div className='space-y-2'>
        <div className='flex items-center justify-between gap-2'>
          <Label className='text-xs text-gray-400'>Linked Generated Variants</Label>
          <Button
            size='xs'
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
                      Run {variant.runId.slice(0, 8)} • Variant {variant.outputIndex}/
                      {variant.outputCount}
                    </div>
                    <div className='truncate text-[10px] text-gray-500'>
                      {formatLinkedVariantTimestamp(variant.runCreatedAt)}
                    </div>
                  </div>
                  <Button
                    size='xs'
                    type='button'
                    variant='outline'
                    onClick={() => {
                      void onApplyLinkedVariantToCard(variant);
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
        <Button size='xs' type='button' variant='outline' onClick={onReplaceFromDrive}>
          Replace From Drive
        </Button>
        <Button
          size='xs'
          type='button'
          variant='outline'
          onClick={onReplaceFromLocal}
          disabled={uploadPending}
          loading={uploadPending}
        >
          Replace From Local Upload
        </Button>{' '}
        <Button
          size='xs'
          type='button'
          variant='outline'
          onClick={() => {
            void onClearSlotImage();
          }}
          disabled={clearImageDisabled}
          title={clearImageTitle}
        >
          Clear Image
        </Button>
      </div>
    </TabsContent>
  );
}
