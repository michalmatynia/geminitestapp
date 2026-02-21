import { Loader2 } from 'lucide-react';
import React from 'react';

import { Button, TabsContent, Hint, LoadingState } from '@/shared/ui';

import { InlineImagePreviewCanvas } from './InlineImagePreviewCanvas';

import type { LinkedGeneratedVariantViewModel } from './slot-inline-edit-tab-types';

type SlotInlineEditGenerationsTabProps = {
  formatBytes: (value: number | null) => string;
  formatLinkedVariantTimestamp: (value: string) => string;
  linkedGeneratedVariants: LinkedGeneratedVariantViewModel[];
  linkedRunsErrorMessage: string;
  linkedRunsIsError: boolean;
  linkedRunsIsFetching: boolean;
  linkedRunsIsLoading: boolean;
  onOpenGenerationPreviewModal: (variant: LinkedGeneratedVariantViewModel) => void;
  onRefreshLinkedRuns: () => void;
  selectedGenerationPreview: LinkedGeneratedVariantViewModel | null;
  selectedGenerationPreviewDimensions: string;
  selectedSlotName?: string | null;
  setGenerationPreviewNaturalSize: (dimensions: { width: number; height: number } | null) => void;
  slotNameDraft: string;
};

export function SlotInlineEditGenerationsTab({
  formatBytes,
  formatLinkedVariantTimestamp,
  linkedGeneratedVariants,
  linkedRunsErrorMessage,
  linkedRunsIsError,
  linkedRunsIsFetching,
  linkedRunsIsLoading,
  onOpenGenerationPreviewModal,
  onRefreshLinkedRuns,
  selectedGenerationPreview,
  selectedGenerationPreviewDimensions,
  selectedSlotName,
  setGenerationPreviewNaturalSize,
  slotNameDraft,
}: SlotInlineEditGenerationsTabProps): React.JSX.Element {
  return (
    <TabsContent value='generations' className='mt-0 space-y-4'>
      <div className='space-y-3 rounded-lg border border-border/60 bg-card/35 p-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='space-y-0.5'>
            <Hint size='xxs' uppercase className='text-gray-500'>Generation Preview</Hint>
            <div className='text-xs text-gray-200'>
              {selectedGenerationPreview
                ? `Run ${selectedGenerationPreview.runId.slice(0, 8)} • Variant ${selectedGenerationPreview.outputIndex}/${selectedGenerationPreview.outputCount}`
                : 'No generated variants available for this card.'}
            </div>
          </div>
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
          
        <InlineImagePreviewCanvas          imageSrc={selectedGenerationPreview?.imageSrc ?? null}
          imageAlt={
            selectedGenerationPreview?.output.filename ||
            `${slotNameDraft.trim() || selectedSlotName || 'Card'} generation preview`
          }
          onImageDimensionsChange={setGenerationPreviewNaturalSize}
        />

        {selectedGenerationPreview ? (
          <div className='grid gap-2 rounded-md border border-border/60 bg-card/30 p-3 text-[11px] text-gray-300 sm:grid-cols-2'>
            <div>
              <span className='text-gray-500'>Run:</span>{' '}
              <span className='font-mono text-[10px]'>{selectedGenerationPreview.runId}</span>
            </div>
            <div>
              <span className='text-gray-500'>Variant:</span>{' '}
              {selectedGenerationPreview.outputIndex}/{selectedGenerationPreview.outputCount}
            </div>
            <div>
              <span className='text-gray-500'>Output file id:</span>{' '}
              <span className='font-mono text-[10px]'>{selectedGenerationPreview.output.id}</span>
            </div>
            <div>
              <span className='text-gray-500'>Dimensions:</span> {selectedGenerationPreviewDimensions}
            </div>
            <div>
              <span className='text-gray-500'>Filename:</span>{' '}
              {selectedGenerationPreview.output.filename || 'n/a'}
            </div>
            <div>
              <span className='text-gray-500'>Size:</span>{' '}
              {formatBytes(selectedGenerationPreview.output.size)}
            </div>
            <div className='sm:col-span-2'>
              <span className='text-gray-500'>Path:</span>{' '}
              <span className='break-all font-mono text-[10px] text-gray-300'>
                {selectedGenerationPreview.output.filepath}
              </span>
            </div>
            <div className='sm:col-span-2'>
              <span className='text-gray-500'>Generated:</span>{' '}
              {formatLinkedVariantTimestamp(selectedGenerationPreview.runCreatedAt)}
            </div>
          </div>
        ) : (
          <div className='rounded-md border border-border/60 bg-card/30 px-3 py-2 text-xs text-gray-400'>
            Generate or attach variants to this card to populate generation slots.
          </div>
        )}
      </div>

      <div className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
        <div className='flex items-center justify-between gap-2'>
          <Hint size='xxs' uppercase className='text-gray-500'>
            Generated Image Slots
          </Hint>
          <div className='text-[11px] text-gray-400'>
            {linkedGeneratedVariants.length} image{linkedGeneratedVariants.length === 1 ? '' : 's'}
          </div>
        </div>
        <div className='grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'>
          {linkedRunsIsLoading ? (
            <LoadingState message='Loading generation slots...' className='col-span-full' />
          ) : linkedRunsIsError ? (
            <div className='col-span-full rounded border border-red-500/35 bg-red-500/10 px-3 py-2 text-xs text-red-200'>
              {linkedRunsErrorMessage}
            </div>
          ) : linkedGeneratedVariants.length === 0 ? (
            <div className='col-span-full rounded border border-border/50 bg-card/40 px-3 py-2 text-xs text-gray-400'>
              No generated image slots are linked to this card yet.
            </div>
          ) : (
            linkedGeneratedVariants.map((variant) => {
              const isSelected = selectedGenerationPreview?.key === variant.key;
              return (
                <button
                  key={variant.key}
                  type='button'
                  onClick={() => {
                    onOpenGenerationPreviewModal(variant);
                  }}
                  className={`group overflow-hidden rounded-md border text-left transition-colors ${
                    isSelected
                      ? 'border-emerald-400/70 bg-emerald-500/10'
                      : 'border-border/60 bg-card/40 hover:border-border'
                  }`}
                  title='Open generation preview'
                >
                  <div className='relative aspect-square overflow-hidden bg-black/35'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={variant.imageSrc}
                      alt={variant.output.filename || `Generation ${variant.outputIndex}`}
                      className='h-full w-full object-cover'
                      loading='lazy'
                    />
                    <div className='absolute left-1 top-1 rounded border border-border/60 bg-black/65 px-1 py-0.5 text-[10px] text-gray-200'>
                      {variant.outputIndex}/{variant.outputCount}
                    </div>
                  </div>
                  <div className='truncate border-t border-border/50 px-2 py-1 text-[10px] text-gray-200'>
                    {variant.output.filename || `Variant ${variant.outputIndex}`}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </TabsContent>
  );
}
