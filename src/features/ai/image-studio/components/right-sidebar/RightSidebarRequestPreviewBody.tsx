import Image from 'next/image';
import React from 'react';

import type { LabeledOptionDto } from '@/shared/contracts/base';
import { InsetPanel } from '@/shared/ui/navigation-and-layout.public';
import { SelectSimple } from '@/shared/ui/forms-and-actions.public';

import { useRightSidebarContext } from '../RightSidebarContext';

const REQUEST_PREVIEW_MODE_OPTIONS = [
  { value: 'without_sequence', label: 'Without Sequence' },
  { value: 'with_sequence', label: 'With Sequence' },
] as const satisfies ReadonlyArray<LabeledOptionDto<'without_sequence' | 'with_sequence'>>;

export function RightSidebarRequestPreviewBody(): React.JSX.Element {
  const context = useRightSidebarContext();

  return (
    <div className='space-y-4 text-xs text-gray-200'>
      <PreviewModeSelector mode={context.requestPreviewMode} onChange={context.setRequestPreviewMode} />
      <PreviewInsetPanel endpoint={context.activeRequestPreviewEndpoint} />
      <PreviewStats
        promptLength={context.resolvedPromptLength}
        shapeCount={context.maskShapeCount}
        mode={context.requestPreviewMode}
        sequenceSteps={context.sequenceStepCount}
      />
      {context.activeErrors.length > 0 && (
        <ErrorDisplay errors={context.activeErrors} />
      )}
      <InputImagesList images={context.activeImages} />
      <PayloadJsonDisplay json={context.activeRequestPreviewJson} />
    </div>
  );
}

function PreviewModeSelector({ mode, onChange }: { mode: string; onChange: (v: any) => void }) {
  return (
    <div className='flex flex-wrap items-center gap-2'>
      <span className='text-[11px] text-gray-400'>Preview Mode</span>
      <SelectSimple
        size='sm'
        value={mode}
        onValueChange={(value) =>
          onChange(value === 'with_sequence' ? 'with_sequence' : 'without_sequence')
        }
        options={REQUEST_PREVIEW_MODE_OPTIONS}
        className='w-[240px]'
        triggerClassName='h-8 text-[11px]'
        ariaLabel='Preview Mode'
        title='Preview Mode'
      />
    </div>
  );
}

function PreviewInsetPanel({ endpoint }: { endpoint: string }) {
  return (
    <InsetPanel radius='compact' padding='sm' className='text-[11px] text-gray-300'>
      This is the exact payload enqueued to <span className='text-gray-100'>`{endpoint}`</span> before
      runtime processing.
    </InsetPanel>
  );
}

function PreviewStats({
  promptLength,
  shapeCount,
  mode,
  sequenceSteps,
}: {
  promptLength: number;
  shapeCount: number;
  mode: string;
  sequenceSteps: number;
}) {
  return (
    <div className='text-[11px] text-gray-400'>
      Resolved prompt length: <span className='text-gray-200'>{promptLength}</span> · mask shapes in
      payload: <span className='text-gray-200'>{shapeCount}</span>
      {mode === 'with_sequence' && (
        <>
          {' '}
          · enabled steps: <span className='text-gray-200'>{sequenceSteps}</span>
        </>
      )}
    </div>
  );
}

function ErrorDisplay({ errors }: { errors: string[] }) {
  return (
    <div className='rounded border border-red-400/40 bg-red-500/10 p-3 text-[11px] text-red-200'>
      {errors.join(' ')}
    </div>
  );
}

function InputImagesList({ images }: { images: any[] }) {
  return (
    <div className='space-y-2'>
      <div className='text-[11px] text-gray-400'>Input Images ({images.length})</div>
      {images.length > 0 ? (
        <div className='grid grid-cols-2 gap-2 md:grid-cols-3'>
          {images.map((image) => (
            <div
              key={`${image.kind}:${image.id ?? image.filepath}`}
              className='rounded border border-border/60 bg-card/30 p-2'
            >
              <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>
                {image.kind === 'base' ? 'Base' : 'Reference'}
              </div>
              <div className='relative h-28 w-full overflow-hidden rounded'>
                <Image src={image.filepath} alt={image.name} fill className='object-cover' unoptimized />
              </div>
              <div className='mt-1 truncate text-[11px] text-gray-200'>{image.name}</div>
              <div className='truncate text-[10px] text-gray-500'>{image.filepath}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className='text-[11px] text-gray-500'>No request images are available yet.</div>
      )}
    </div>
  );
}

function PayloadJsonDisplay({ json }: { json: string }) {
  return (
    <div className='space-y-2'>
      <div className='text-[11px] text-gray-400'>Payload JSON</div>
      <pre className='max-h-[50vh] overflow-auto rounded border border-border/60 bg-black/30 p-3 font-mono text-[11px] text-gray-100 whitespace-pre-wrap'>
        {json}
      </pre>
    </div>
  );
}
