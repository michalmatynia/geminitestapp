'use client';

import { Download, Save, Trash2 } from 'lucide-react';
import Image from 'next/image';
import React, { useMemo } from 'react';

import { Button, GenericGridPicker } from '@/shared/ui';
import type { GridPickerItem } from '@/shared/contracts/ui';

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

  const gridItems = useMemo(
    (): GridPickerItem<OutputImage>[] =>
      outputs.map((output) => ({
        id: output.id,
        label: output.filename,
        value: output,
      })),
    [outputs]
  );

  if (outputs.length === 0) return null;

  return (
    <GenericGridPicker
      items={gridItems}
      columns={columns}
      className={className}
      gap='8px'
      renderItem={(item) => {
        const output = item.value!;
        return (
          <div className='group relative aspect-square overflow-hidden rounded border border-border/60 transition-colors hover:border-primary/60'>
            <a
              href={output.filepath}
              target='_blank'
              rel='noopener noreferrer'
              className='block h-full w-full'
              aria-label={output.filename}
              title={output.filename}
              onClick={(e) => e.stopPropagation()}
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
                className='rounded p-1 text-white/80 hover:bg-white/10 hover:text-white'
                title='Download'
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                aria-label={'Download'}
              >
                <Download className='size-3.5' />
              </a>
              {onSaveAsSlot && (
                <Button
                  size='xs'
                  type='button'
                  variant='ghost'
                  className='size-6 rounded p-0 text-white/80 hover:bg-white/10 hover:text-white'
                  title='Save to card history'
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveAsSlot(output);
                  }}
                  aria-label={'Save to card history'}
                >
                  <Save className='size-3.5' />
                </Button>
              )}
              {onDelete && (
                <Button
                  size='xs'
                  type='button'
                  variant='ghost'
                  className='size-6 rounded p-0 text-white/80 hover:bg-white/10 hover:text-red-400'
                  title='Delete'
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    onDelete(output);
                  }}
                  aria-label={'Delete'}
                >
                  <Trash2 className='size-3.5' />
                </Button>
              )}
            </div>
          </div>
        );
      }}
    />
  );
}
