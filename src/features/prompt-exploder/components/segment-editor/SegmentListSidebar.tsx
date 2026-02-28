'use client';

import React from 'react';
import { GripVertical } from 'lucide-react';
import { Card, ActionMenu, DropdownMenuItem, DropdownMenuSeparator, Badge } from '@/shared/ui';
import { cn } from '@/shared/utils';
import { useDocumentState, useDocumentActions } from '../../context/hooks/useDocument';
import {
  useSegmentEditorState,
  useSegmentEditorActions,
} from '../../context/hooks/useSegmentEditor';
import type { PromptExploderSegment } from '../../types';

const promptExploderSupportsSegmentTextSplit = (segment: PromptExploderSegment): boolean =>
  Boolean(
    segment &&
    (segment.type === 'assigned_text' ||
      segment.type === 'metadata' ||
      segment.type === 'parameter_block')
  );

const resolveSegmentCardLabel = (segment: PromptExploderSegment, index: number): string => {
  const codeLabel = segment.code?.trim() ?? '';
  if (codeLabel.length > 0) return codeLabel;
  const previewSource = segment.text ?? segment.raw ?? '';
  const previewLines = previewSource
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (previewLines.length > 0) {
    return previewLines[0]!.slice(0, 80);
  }
  return `Segment ${index + 1}`;
};

export function SegmentListSidebar(): React.JSX.Element {
  const state = useDocumentState();
  const { documentState, selectedSegmentId } = state;

  const { setSelectedSegmentId } = useDocumentActions();
  const { draggingSegmentId, segmentDropTargetId, segmentDropPosition } = useSegmentEditorState();
  const {
    handleSegmentDragStart,
    handleSegmentDragEnd,
    handleSegmentDragOver,
    handleSegmentDrop,
    addSegmentRelative,
    removeSegment,
    splitSegment,
    mergeSegmentWithPrevious,
    mergeSegmentWithNext,
  } = useSegmentEditorActions();

  if (!documentState) return <></>;

  return (
    <Card variant='subtle' padding='sm' className='max-h-[65vh] space-y-2 overflow-auto bg-card/20'>
      {(documentState.segments || []).map(
        (segment: PromptExploderSegment, segmentIndex: number) => {
          const isDropTarget = segmentDropTargetId === segment.id;
          const isDropBefore = isDropTarget && segmentDropPosition === 'before';
          const isDropAfter = isDropTarget && segmentDropPosition === 'after';
          const canSplitSegment = promptExploderSupportsSegmentTextSplit(segment);
          return (
            <div
              key={segment.id}
              role='button'
              tabIndex={0}
              className={cn(
                'relative w-full transition-all group',
                draggingSegmentId === segment.id && 'opacity-60'
              )}
              onClick={() => setSelectedSegmentId(segment.id)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                setSelectedSegmentId(segment.id);
              }}
              onDragOver={(event: React.DragEvent<HTMLDivElement>) => {
                handleSegmentDragOver(event, segment.id);
              }}
              onDrop={(event: React.DragEvent<HTMLDivElement>) => {
                handleSegmentDrop(event, segment.id);
              }}
            >
              <Card
                variant={selectedSegmentId === segment.id ? 'info' : 'subtle-compact'}
                padding='sm'
                className={cn(
                  'text-left text-xs transition-colors',
                  selectedSegmentId === segment.id
                    ? 'bg-primary/10 border-primary/40 text-gray-100'
                    : 'border-border/50 bg-card/30 text-gray-300 hover:border-primary/30 hover:bg-card/50'
                )}
              >
                {isDropBefore ? (
                  <div className='pointer-events-none absolute inset-x-1 top-0 h-0.5 rounded bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]' />
                ) : null}
                {isDropAfter ? (
                  <div className='pointer-events-none absolute inset-x-1 bottom-0 h-0.5 rounded bg-primary shadow-[0_0_8px_rgba(var(--primary),0.6)]' />
                ) : null}
                <div className='flex items-center justify-between gap-2'>
                  <div className='flex min-w-0 items-center gap-2'>
                    <button
                      type='button'
                      className='inline-flex size-6 items-center justify-center rounded border border-border/60 bg-card/50 text-gray-300 transition-colors hover:bg-card/70 hover:text-gray-100 active:cursor-grabbing'
                      aria-label='Drag to reorder segment'
                      draggable
                      onMouseDown={(event: React.MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                      }}
                      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                      }}
                      onDragStart={(event: React.DragEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        handleSegmentDragStart(segment.id);
                      }}
                      onDragEnd={() => {
                        handleSegmentDragEnd();
                      }}
                    >
                      <GripVertical className='size-3.5' />
                    </button>
                    <span className='truncate font-medium'>
                      {resolveSegmentCardLabel(segment, segmentIndex)}
                    </span>
                  </div>
                  <div className='flex items-center gap-1'>
                    <Badge
                      variant='neutral'
                      className='bg-card/50 px-1 py-0 text-[9px] font-normal uppercase'
                    >
                      {(segment.type as string).replaceAll('_', ' ')}
                    </Badge>
                    <ActionMenu
                      align='end'
                      ariaLabel='Segment actions'
                      triggerClassName='h-6 w-6 text-gray-400 hover:text-gray-100'
                    >
                      <DropdownMenuItem
                        onSelect={() => {
                          addSegmentRelative(segment.id, 'before');
                        }}
                      >
                        Add Segment Above
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => {
                          addSegmentRelative(segment.id, 'after');
                        }}
                      >
                        Add Segment Below
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        disabled={!canSplitSegment}
                        onSelect={() => {
                          splitSegment(
                            segment.id,
                            (segment.text ?? '').length,
                            (segment.text ?? '').length
                          );
                        }}
                      >
                        Split at End
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={segmentIndex === 0}
                        onSelect={() => {
                          mergeSegmentWithPrevious(segment.id);
                        }}
                      >
                        Merge with Previous
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        disabled={segmentIndex === (documentState.segments || []).length - 1}
                        onSelect={() => {
                          mergeSegmentWithNext(segment.id);
                        }}
                      >
                        Merge with Next
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className='text-red-300 focus:text-red-200'
                        onSelect={() => {
                          removeSegment(segment.id);
                        }}
                      >
                        Remove Segment
                      </DropdownMenuItem>
                    </ActionMenu>
                  </div>
                </div>
                <div className='mt-1 flex items-center justify-between text-[10px] text-gray-500'>
                  <span>Confidence {((segment.confidence || 0) * 100).toFixed(0)}%</span>
                  <span>{segment.includeInOutput ? 'Included' : 'Omitted'}</span>
                </div>
              </Card>
            </div>
          );
        }
      )}
    </Card>
  );
}
