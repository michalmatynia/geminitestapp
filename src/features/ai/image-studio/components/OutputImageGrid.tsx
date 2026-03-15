'use client';

import { Download, Save, Trash2 } from 'lucide-react';
import Image from 'next/image';
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
  onDelete?: ((output: OutputImage) => void) | undefined;
  className?: string | undefined;
  columns?: 2 | 3 | undefined;
}

export function OutputImageGrid(props: OutputImageGridProps): React.JSX.Element | null {
  const { outputs, onSaveAsSlot, onDelete, className, columns = 2 } = props;

  if (outputs.length === 0) return null;

  return (
    <div
      className={cn(columns === 3 ? 'grid grid-cols-3 gap-2' : 'grid grid-cols-2 gap-2', className)}
    >
      {outputs.map((output) => (
        <div
          key={output.id}
          className='group relative overflow-hidden rounded border border-border/60 hover:border-primary/60 transition-colors'
        >
          <a
            href={output.filepath}
            target='_blank'
            rel='noopener noreferrer'
            className='block relative aspect-square'
            aria-label={output.filename}
            title={output.filename}
          >
            <Image
              src={output.filepath}
              alt={output.filename}
              fill
              className='object-cover'
              unoptimized
            />
          </a>
          <div className='absolute bottom-0 left-0 right-0 z-10 flex items-center justify-end gap-1 bg-gradient-to-t from-black/70 to-transparent p-1 opacity-0 transition-opacity group-hover:opacity-100'>
            <a
              href={output.filepath}
              download={output.filename}
              className='rounded p-1 text-white/80 hover:text-white hover:bg-white/10'
              title='Download'
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
              aria-label={'Download'}>
              <Download className='size-3.5' />
            </a>
            {onSaveAsSlot && (
              <Button
                size='xs'
                type='button'
                variant='ghost'
                className='size-6 rounded p-0 text-white/80 hover:text-white hover:bg-white/10'
                title='Save to card history'
                onClick={() => onSaveAsSlot(output)}
                aria-label={'Save to card history'}>
                <Save className='size-3.5' />
              </Button>
            )}
            {onDelete && (
              <Button
                size='xs'
                type='button'
                variant='ghost'
                className='size-6 rounded p-0 text-white/80 hover:text-red-400 hover:bg-white/10'
                title='Delete'
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDelete(output);
                }}
                aria-label={'Delete'}>
                <Trash2 className='size-3.5' />
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
