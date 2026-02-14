'use client';

import { Download, Save } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

export interface OutputImage {
  id: string;
  filepath: string;
  filename: string;
}

interface OutputImageGridProps {
  outputs: OutputImage[];
  onSaveAsSlot?: ((output: OutputImage) => void) | undefined;
  className?: string | undefined;
  columns?: 2 | 3 | undefined;
}

export function OutputImageGrid({
  outputs,
  onSaveAsSlot,
  className,
  columns = 2,
}: OutputImageGridProps): React.JSX.Element | null {
  if (outputs.length === 0) return null;

  return (
    <div className={cn(columns === 3 ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2', className)}>
      {outputs.map((output) => (
        <div
          key={output.id}
          className='group relative overflow-hidden rounded border border-border/60 hover:border-primary/60 transition-colors'
        >
          <a
            href={output.filepath}
            target='_blank'
            rel='noopener noreferrer'
            className='block'
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={output.filepath}
              alt={output.filename}
              className='aspect-square w-full object-cover'
            />
          </a>
          <div className='absolute bottom-0 left-0 right-0 flex items-center justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100'>
            <a
              href={output.filepath}
              download={output.filename}
              className='rounded p-1 text-white/80 hover:text-white hover:bg-white/10'
              title='Download'
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <Download className='size-3.5' />
            </a>
            {onSaveAsSlot && (
              <Button size='xs'
                type='button'
                variant='ghost'
                size='icon'
                className='size-6 rounded p-0 text-white/80 hover:text-white hover:bg-white/10'
                title='Save to card history'
                onClick={() => onSaveAsSlot(output)}
              >
                <Save className='size-3.5' />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
