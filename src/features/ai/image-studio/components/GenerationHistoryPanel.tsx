'use client';

import { RotateCcw, Trash2 } from 'lucide-react';
import Image from 'next/image';
import React, { useState } from 'react';

import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

import { useGenerationActions, useGenerationState } from '../context/GenerationContext';

export type GenerationHistoryPanelProps = {
  className?: string | undefined;
};

export function GenerationHistoryPanel({
  className,
}: GenerationHistoryPanelProps): React.JSX.Element {
  const { generationHistory } = useGenerationState();
  const { restoreGeneration, removeGenerationRecord } = useGenerationActions();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (generationHistory.length === 0) {
    return (
      <div className={cn('px-2 py-3 text-center text-xs text-muted-foreground', className)}>
        No generations yet.
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {generationHistory.map((record) => {
        const isExpanded = record.id === expandedId;
        const timeStr = new Date(record.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        });

        return (
          <div
            key={record.id}
            className='rounded border border-border/40 bg-card/30 px-2 py-1.5 text-xs'
          >
            <button
              type='button'
              className='flex w-full items-center gap-2 border-0 bg-transparent p-0 text-left'
              onClick={() => setExpandedId(isExpanded ? null : record.id)}
              aria-expanded={isExpanded}
            >
              <span className='shrink-0 text-[10px] text-muted-foreground'>{timeStr}</span>
              <span className='min-w-0 flex-1 truncate'>{record.prompt.slice(0, 60)}</span>
              <span className='shrink-0 text-[10px] text-muted-foreground'>
                {record.outputs.length} img{record.outputs.length !== 1 ? 's' : ''}
              </span>
            </button>

            {isExpanded && (
              <div className='mt-1.5 space-y-1.5 border-t border-border/30 pt-1.5'>
                <p className='text-[10px] text-muted-foreground whitespace-pre-wrap break-words'>
                  {record.prompt}
                </p>
                <div className='flex items-center gap-2 text-[10px] text-muted-foreground'>
                  <span>Masks: {record.maskShapeCount}</span>
                  {record.maskInvert && <span>Inverted</span>}
                  {record.maskFeather > 0 && <span>Feather: {record.maskFeather}</span>}
                  <span>Slot: {record.slotName}</span>
                </div>

                {record.outputs.length > 0 && (
                  <div className='flex flex-wrap gap-1'>
                    {record.outputs.map((output) => (
                      <a
                        key={output.id}
                        href={output.filepath}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='block overflow-hidden rounded border border-border/40 hover:border-primary/60 transition-colors'
                      >
                        <Image
                          src={output.filepath}
                          alt={output.filename ?? 'Output'}
                          width={48}
                          height={48}
                          className='object-cover'
                          unoptimized
                        />
                      </a>
                    ))}
                  </div>
                )}

                <div className='flex items-center gap-1'>
                  <Button
                    size='xs'
                    type='button'
                    variant='outline'
                    className='h-6 text-[10px]'
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      restoreGeneration(record);
                    }}
                  >
                    <RotateCcw className='mr-1 size-3' />
                    Re-run
                  </Button>
                  <Button
                    size='xs'
                    type='button'
                    variant='outline'
                    className='h-6 text-[10px] text-destructive hover:text-destructive'
                    disabled={deletingId === record.id}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      void (async (): Promise<void> => {
                        setDeletingId(record.id);
                        await removeGenerationRecord(record.id);
                        setDeletingId(null);
                        setExpandedId((prev) => (prev === record.id ? null : prev));
                      })();
                    }}
                  >
                    <Trash2 className='mr-1 size-3' />
                    Delete
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
