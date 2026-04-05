'use client';

import React from 'react';

import { Label, Textarea } from '@/shared/ui/primitives.public';
import { insetPanelVariants } from '@/shared/ui/navigation-and-layout.public';

export type RegexPreviewSectionProps = {
  sampleLines: string[];
  sampleSource: string;
  onSampleChange: (value: string) => void;
  isExtractMode: boolean;
  preview: {
    matches: unknown[];
    extracted: unknown;
    grouped: unknown;
  };
};

export function RegexPreviewSection(props: RegexPreviewSectionProps): React.JSX.Element {
  const { sampleLines, sampleSource, onSampleChange, isExtractMode, preview } = props;

  return (
    <div className='space-y-3'>
      <div className='flex items-center justify-between'>
        <Label className='text-xs text-gray-400'>Preview Sample</Label>
        <div className='text-[11px] text-gray-500'>
          {sampleLines.length} item{sampleLines.length === 1 ? '' : 's'}
        </div>
      </div>
      <Textarea
        className='min-h-[110px] w-full rounded-md border border-border bg-card/70 font-mono text-xs text-white'
        value={sampleSource}
        onChange={(event: React.ChangeEvent<HTMLTextAreaElement>) =>
          onSampleChange(event.target.value)
        }
        aria-label='Preview sample'
        placeholder='Paste example strings here (one per line). Leave empty to use runtime inputs.'
       title='Paste example strings here (one per line). Leave empty to use runtime inputs.'/>
      <div className='grid grid-cols-1 gap-3 md:grid-cols-2'>
        <div
          className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} border-border bg-card/50`}
        >
          <div className='text-[11px] text-gray-300'>Matches</div>
          <pre className='mt-2 max-h-48 overflow-auto rounded bg-card/70 p-2 text-[11px] text-gray-200 whitespace-pre-wrap break-all'>
            {JSON.stringify(preview.matches, null, 2)}
          </pre>
        </div>
        <div
          className={`${insetPanelVariants({ radius: 'compact', padding: 'sm' })} border-border bg-card/50`}
        >
          <div className='text-[11px] text-gray-300'>
            {isExtractMode ? 'Extracted Value (value port)' : 'Grouped Output'}
          </div>
          <pre className='mt-2 max-h-48 overflow-auto rounded bg-card/70 p-2 text-[11px] text-gray-200 whitespace-pre-wrap break-all'>
            {JSON.stringify(isExtractMode ? preview.extracted : preview.grouped, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
