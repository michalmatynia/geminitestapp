import Image from 'next/image';
import React from 'react';

import { SelectSimple } from '@/shared/ui';

import { useRightSidebarContext } from '../RightSidebarContext';

export function RightSidebarRequestPreviewBody(): React.JSX.Element {
  const {
    activeErrors,
    activeImages,
    activeRequestPreviewEndpoint,
    activeRequestPreviewJson,
    maskShapeCount,
    requestPreviewMode,
    resolvedPromptLength,
    sequenceStepCount,
    setRequestPreviewMode,
  } = useRightSidebarContext();

  return (
    <div className='space-y-4 text-xs text-gray-200'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-[11px] text-gray-400'>Preview Mode</span>
        <SelectSimple
          size='sm'
          value={requestPreviewMode}
          onValueChange={(value: string): void => {
            setRequestPreviewMode(value === 'with_sequence' ? 'with_sequence' : 'without_sequence');
          }}
          options={[
            { value: 'without_sequence', label: 'Without Sequence' },
            { value: 'with_sequence', label: 'With Sequence' },
          ]}
          className='w-[240px]'
          triggerClassName='h-8 text-[11px]'
        />
      </div>
      <div className='rounded border border-border/60 bg-card/40 p-3 text-[11px] text-gray-300'>
        This is the exact payload enqueued to{' '}
        <span className='text-gray-100'>`{activeRequestPreviewEndpoint}`</span> before runtime
        processing.
      </div>
      <div className='text-[11px] text-gray-400'>
        Resolved prompt length: <span className='text-gray-200'>{resolvedPromptLength}</span> · mask
        shapes in payload: <span className='text-gray-200'>{maskShapeCount}</span>
        {requestPreviewMode === 'with_sequence' ? (
          <>
            {' '}
            · enabled steps: <span className='text-gray-200'>{sequenceStepCount}</span>
          </>
        ) : null}
      </div>

      {activeErrors.length > 0 ? (
        <div className='rounded border border-red-400/40 bg-red-500/10 p-3 text-[11px] text-red-200'>
          {activeErrors.join(' ')}
        </div>
      ) : null}

      <div className='space-y-2'>
        <div className='text-[11px] text-gray-400'>Input Images ({activeImages.length})</div>
        {activeImages.length > 0 ? (
          <div className='grid grid-cols-2 gap-2 md:grid-cols-3'>
            {activeImages.map((image) => (
              <div
                key={`${image.kind}:${image.id ?? image.filepath}`}
                className='rounded border border-border/60 bg-card/30 p-2'
              >
                <div className='mb-1 text-[10px] uppercase tracking-wide text-gray-500'>
                  {image.kind === 'base' ? 'Base' : 'Reference'}
                </div>
                <div className='relative h-28 w-full overflow-hidden rounded'>
                  <Image
                    src={image.filepath}
                    alt={image.name}
                    fill
                    className='object-cover'
                    unoptimized
                  />
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

      <div className='space-y-2'>
        <div className='text-[11px] text-gray-400'>Payload JSON</div>
        <pre className='max-h-[50vh] overflow-auto rounded border border-border/60 bg-black/30 p-3 font-mono text-[11px] text-gray-100 whitespace-pre-wrap'>
          {activeRequestPreviewJson}
        </pre>
      </div>
    </div>
  );
}
