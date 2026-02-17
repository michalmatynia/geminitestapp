import React from 'react';

import { TabsContent } from '@/shared/ui';

import type { LinkedMaskSlotViewModel } from './slot-inline-edit-tab-types';

type SlotInlineEditMasksTabProps = {
  formatBytes: (value: number | null) => string;
  formatDateTime: (value: string | Date | null | undefined) => string;
  linkedMaskSlots: LinkedMaskSlotViewModel[];
};

export function SlotInlineEditMasksTab({
  formatBytes,
  formatDateTime,
  linkedMaskSlots,
}: SlotInlineEditMasksTabProps): React.JSX.Element {
  return (
    <TabsContent value='masks' className='mt-0 space-y-4'>
      <div className='space-y-2 rounded-lg border border-border/60 bg-card/35 p-3'>
        <div className='text-[10px] uppercase tracking-wide text-gray-500'>Linked Masks</div>
        <div className='text-xs text-gray-300'>
          Masks attached to this card via mask metadata links.
        </div>
      </div>
      <div className='max-h-[34rem] space-y-2 overflow-y-auto rounded-lg border border-border/60 bg-card/35 p-2'>
        {linkedMaskSlots.length === 0 ? (
          <div className='rounded border border-border/50 bg-card/40 px-3 py-3 text-xs text-gray-400'>
            No linked masks found for this card.
          </div>
        ) : (
          linkedMaskSlots.map((mask) => (
            <div
              key={mask.slotId}
              className='grid gap-3 rounded border border-border/60 bg-card/50 p-3 md:grid-cols-[90px_1fr]'
            >
              <div className='h-[90px] w-[90px] overflow-hidden rounded border border-border/60 bg-black/40'>
                {mask.imageSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={mask.imageSrc}
                    alt={mask.name}
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
                <div className='truncate text-xs text-gray-100'>{mask.name}</div>
                <div className='text-[10px] text-gray-400'>
                  Variant: <span className='text-gray-200'>{mask.variant}</span>
                  {' '}• Inverted: <span className='text-gray-200'>{mask.inverted ? 'Yes' : 'No'}</span>
                  {' '}• Mode: <span className='text-gray-200'>{mask.generationMode}</span>
                </div>
                <div className='text-[10px] text-gray-400'>
                  Relation: <span className='font-mono text-gray-300'>{mask.relationType || 'mask'}</span>
                </div>
                <div className='text-[10px] text-gray-400'>
                  Mask Slot: <span className='font-mono text-gray-300'>{mask.slotId}</span>
                </div>
                <div className='text-[10px] text-gray-400'>
                  File ID: <span className='font-mono text-gray-300'>{mask.imageFileId || 'n/a'}</span>
                </div>
                <div className='text-[10px] text-gray-400'>
                  File: <span className='text-gray-300'>{mask.filename || 'n/a'}</span>
                  {' '}• Size: <span className='text-gray-300'>{formatBytes(mask.size)}</span>
                  {' '}• Dimensions:{' '}
                  <span className='text-gray-300'>
                    {mask.width && mask.height ? `${mask.width} x ${mask.height}` : 'n/a'}
                  </span>
                </div>
                <div className='truncate text-[10px] text-gray-500'>
                  Path: <span className='font-mono text-gray-400'>{mask.filepath || 'n/a'}</span>
                </div>
                <div className='text-[10px] text-gray-500'>
                  Updated: {formatDateTime(mask.updatedAt)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </TabsContent>
  );
}
