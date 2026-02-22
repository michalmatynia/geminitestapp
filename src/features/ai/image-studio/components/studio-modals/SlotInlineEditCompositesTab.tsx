import React from 'react';

import { TabsContent } from '@/shared/ui';

import type { CompositeTabImageViewModel } from './slot-inline-edit-tab-types';

type SlotInlineEditCompositesTabProps = {
  compositeTabInputImages: CompositeTabImageViewModel[];
  compositeTabInputSourceLabel: string;
  formatBytes: (value: number | null) => string;
  formatDateTime: (value: string | Date | null | undefined) => string;
  sourceCompositeImage?: CompositeTabImageViewModel | null;
};

export function SlotInlineEditCompositesTab({
  compositeTabInputImages,
  compositeTabInputSourceLabel,
  formatBytes,
  formatDateTime,
  sourceCompositeImage,
}: SlotInlineEditCompositesTabProps): React.JSX.Element {
  return (
    <TabsContent value='composites' className='mt-0 space-y-4'>
      <div className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>Composite Inputs</div>
        <div className='text-xs text-gray-300'>
          {compositeTabInputSourceLabel}
        </div>
      </div>

      <div className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>Source Image</div>
        {!sourceCompositeImage ? (
          <div className='rounded border border-border/50 bg-card/40 px-3 py-3 text-xs text-gray-400'>
            No source image available.
          </div>
        ) : (
          <div className='grid gap-3 rounded border border-border/60 bg-card/50 p-3 md:grid-cols-[90px_1fr]'>
            <div className='h-[90px] w-[90px] overflow-hidden rounded border border-border/60 bg-black/40'>
              {sourceCompositeImage.imageSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={sourceCompositeImage.imageSrc}
                  alt={sourceCompositeImage.name}
                  className='h-full w-full object-cover'
                  loading='lazy'
                />
              ) : (
                <div className='flex h-full items-center justify-center text-[10px] text-gray-500'>
                  No image
                </div>
              )}
            </div>
            <div className='min-w-0 space-y-1 text-[11px] text-gray-300'>
              <div className='truncate text-xs text-gray-100'>{sourceCompositeImage.name}</div>
              <div className='text-[10px] text-gray-400'>
                Source: <span className='text-gray-200'>{sourceCompositeImage.sourceType}</span>
              </div>
              <div className='text-[10px] text-gray-400'>
                Card Slot: <span className='font-mono text-gray-300'>{sourceCompositeImage.slotId || 'n/a'}</span>
              </div>
              <div className='text-[10px] text-gray-400'>
                File ID: <span className='font-mono text-gray-300'>{sourceCompositeImage.imageFileId || 'n/a'}</span>
              </div>
              <div className='text-[10px] text-gray-400'>
                File: <span className='text-gray-300'>{sourceCompositeImage.filename || 'n/a'}</span>
                {' '}• Size: <span className='text-gray-300'>{formatBytes(sourceCompositeImage.size)}</span>
                {' '}• Dimensions:{' '}
                <span className='text-gray-300'>
                  {sourceCompositeImage.width && sourceCompositeImage.height
                    ? `${sourceCompositeImage.width} x ${sourceCompositeImage.height}`
                    : 'n/a'}
                </span>
              </div>
              <div className='truncate text-[10px] text-gray-500'>
                Path: <span className='font-mono text-gray-400'>{sourceCompositeImage.filepath || 'n/a'}</span>
              </div>
              <div className='text-[10px] text-gray-500'>
                Updated: {formatDateTime(sourceCompositeImage.updatedAt)}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>Composite Images</div>
        <div className='max-h-[28rem] space-y-2 overflow-y-auto rounded border border-border/60 bg-card/35 p-2'>
          {compositeTabInputImages.length === 0 ? (
            <div className='rounded border border-border/50 bg-card/40 px-3 py-3 text-xs text-gray-400'>
              No composite images to show.
            </div>
          ) : (
            compositeTabInputImages.map((entry) => (
              <div
                key={entry.key}
                className='grid gap-3 rounded border border-border/60 bg-card/50 p-3 md:grid-cols-[90px_1fr]'
              >
                <div className='h-[90px] w-[90px] overflow-hidden rounded border border-border/60 bg-black/40'>
                  {entry.imageSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={entry.imageSrc}
                      alt={entry.name}
                      className='h-full w-full object-cover'
                      loading='lazy'
                    />
                  ) : (
                    <div className='flex h-full items-center justify-center text-[10px] text-gray-500'>
                      No image
                    </div>
                  )}
                </div>
                <div className='min-w-0 space-y-1 text-[11px] text-gray-300'>
                  <div className='truncate text-xs text-gray-100'>{entry.name}</div>
                  <div className='text-[10px] text-gray-400'>
                    Type: <span className='text-gray-200'>{entry.sourceType}</span>
                    {entry.order !== null ? (
                      <>
                        {' '}• Layer order: <span className='text-gray-200'>{entry.order + 1}</span>
                      </>
                    ) : null}
                  </div>
                  <div className='text-[10px] text-gray-400'>
                    Slot: <span className='font-mono text-gray-300'>{entry.slotId || 'n/a'}</span>
                  </div>
                  <div className='text-[10px] text-gray-400'>
                    File ID: <span className='font-mono text-gray-300'>{entry.imageFileId || 'n/a'}</span>
                  </div>
                  <div className='text-[10px] text-gray-400'>
                    File: <span className='text-gray-300'>{entry.filename || 'n/a'}</span>
                    {' '}• Size: <span className='text-gray-300'>{formatBytes(entry.size)}</span>
                    {' '}• Dimensions:{' '}
                    <span className='text-gray-300'>
                      {entry.width && entry.height ? `${entry.width} x ${entry.height}` : 'n/a'}
                    </span>
                  </div>
                  <div className='truncate text-[10px] text-gray-500'>
                    Path: <span className='font-mono text-gray-400'>{entry.filepath || 'n/a'}</span>
                  </div>
                  <div className='text-[10px] text-gray-500'>
                    Updated: {formatDateTime(entry.updatedAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </TabsContent>
  );
}
