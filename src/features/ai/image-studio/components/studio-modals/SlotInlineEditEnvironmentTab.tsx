import { Loader2 } from 'lucide-react';
import React from 'react';

import { Button, TabsContent } from '@/shared/ui';

import { InlineImagePreviewCanvas } from './InlineImagePreviewCanvas';

import type {
  EnvironmentReferenceDraftViewModel,
  InlinePreviewSourceViewModel,
} from './slot-inline-edit-tab-types';

type SlotInlineEditEnvironmentTabProps = {
  canClearEnvironmentImage: boolean;
  environmentPreviewDimensions: string;
  environmentPreviewSource: InlinePreviewSourceViewModel;
  environmentReferenceDraft: EnvironmentReferenceDraftViewModel;
  formatBytes: (value: number | null) => string;
  formatDateTime: (value: string | Date | null | undefined) => string;
  onClearEnvironmentImage: () => void;
  onUploadEnvironmentFromDrive: () => void;
  onUploadEnvironmentFromLocal: () => void;
  selectedSlotName?: string | null;
  setEnvironmentPreviewNaturalSize: (dimensions: { width: number; height: number } | null) => void;
  slotNameDraft: string;
  uploadPending: boolean;
};

export function SlotInlineEditEnvironmentTab({
  canClearEnvironmentImage,
  environmentPreviewDimensions,
  environmentPreviewSource,
  environmentReferenceDraft,
  formatBytes,
  formatDateTime,
  onClearEnvironmentImage,
  onUploadEnvironmentFromDrive,
  onUploadEnvironmentFromLocal,
  selectedSlotName,
  setEnvironmentPreviewNaturalSize,
  slotNameDraft,
  uploadPending,
}: SlotInlineEditEnvironmentTabProps): React.JSX.Element {
  return (
    <TabsContent value='environment' className='mt-0 space-y-4'>
      <div className='space-y-3 rounded-lg border border-border/60 bg-card/35 p-3'>
        <div className='flex flex-wrap items-center justify-between gap-2'>
          <div className='space-y-0.5'>
            <div className='text-[10px] uppercase tracking-wide text-gray-500'>Environment Reference</div>
            <div className='text-xs text-gray-200'>
              Source: {environmentPreviewSource.sourceType}
            </div>
          </div>
        </div>

        <InlineImagePreviewCanvas
          imageSrc={environmentPreviewSource.src}
          imageAlt={`${slotNameDraft.trim() || selectedSlotName || 'Card'} environment reference`}
          onImageDimensionsChange={setEnvironmentPreviewNaturalSize}
        />

        <div className='grid gap-2 rounded-md border border-border/60 bg-card/30 p-3 text-[11px] text-gray-300 sm:grid-cols-2'>
          <div>
            <span className='text-gray-500'>Source type:</span> {environmentPreviewSource.sourceType}
          </div>
          <div>
            <span className='text-gray-500'>Dimensions:</span> {environmentPreviewDimensions}
          </div>
          <div>
            <span className='text-gray-500'>Image file id:</span>{' '}
            <span className='font-mono text-[10px]'>
              {environmentReferenceDraft.imageFileId || 'n/a'}
            </span>
          </div>
          <div>
            <span className='text-gray-500'>Mime type:</span> {environmentReferenceDraft.mimetype || 'n/a'}
          </div>
          <div>
            <span className='text-gray-500'>Filename:</span> {environmentReferenceDraft.filename || 'n/a'}
          </div>
          <div>
            <span className='text-gray-500'>File size:</span> {formatBytes(environmentReferenceDraft.size)}
          </div>
          <div className='sm:col-span-2'>
            <span className='text-gray-500'>Raw source:</span>{' '}
            <span className='break-all font-mono text-[10px] text-gray-300'>
              {environmentPreviewSource.rawSource}
            </span>
          </div>
          <div className='sm:col-span-2'>
            <span className='text-gray-500'>Resolved preview source:</span>{' '}
            <span className='break-all font-mono text-[10px] text-gray-300'>
              {environmentPreviewSource.resolvedSource}
            </span>
          </div>
          <div>
            <span className='text-gray-500'>Updated:</span> {formatDateTime(environmentReferenceDraft.updatedAt)}
          </div>
          <div />
        </div>
      </div>

      <div className='rounded-lg border border-border/60 bg-card/30 p-3 text-xs text-gray-300'>
        Upload a reference image for the card environment. Save Card to persist changes.
      </div>

      <div className='flex flex-wrap items-center gap-2'>
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onUploadEnvironmentFromDrive}
        >
          Upload Environment From Drive
        </Button>
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onUploadEnvironmentFromLocal}
          disabled={uploadPending}
        >
          {uploadPending ? <Loader2 className='mr-2 size-4 animate-spin' /> : null}
          Upload Environment From Local
        </Button>
        <Button size='xs'
          type='button'
          variant='outline'
          onClick={onClearEnvironmentImage}
          disabled={!canClearEnvironmentImage}
        >
          Clear Environment Image
        </Button>
      </div>
    </TabsContent>
  );
}
