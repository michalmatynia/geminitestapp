'use client';

import React, { useState } from 'react';

import { KangurLessonDocumentRenderer } from '@/features/kangur/ui/components/KangurLessonDocumentRenderer';
import type { KangurLessonDocument } from '@/shared/contracts/kangur';
import { Button } from '@/shared/ui';
import { cn } from '@/shared/utils';

interface KangurLessonPreviewPanelProps {
  document: KangurLessonDocument;
  activePageId: string | null;
}

export function KangurLessonPreviewPanel({
  document,
  activePageId,
}: KangurLessonPreviewPanelProps): React.JSX.Element {
  const [previewScope, setPreviewScope] = useState<'page' | 'lesson'>('page');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const previewDocument = document;

  const previewActivePageId = previewScope === 'page' ? activePageId : null;
  const previewFrameClassName =
    previewDevice === 'mobile' ? 'max-w-[390px]' : 'max-w-2xl';
  const previewSummaryLabel =
    previewScope === 'page'
      ? `Current page preview on ${previewDevice === 'mobile' ? 'mobile' : 'desktop'}`
      : `Full lesson preview on ${previewDevice === 'mobile' ? 'mobile' : 'desktop'}`;

  return (
    <div className='sticky top-4 hidden h-[calc(100vh-2rem)] flex-col gap-4 overflow-hidden rounded-2xl border border-border/60 bg-card/35 shadow-sm xl:flex'>
      <div className='flex items-center justify-between border-b border-border/60 bg-background/70 px-4 py-3 backdrop-blur-md'>
        <div>
          <div className='text-sm font-semibold text-foreground'>Preview</div>
          <div className='text-xs text-muted-foreground'>{previewSummaryLabel}</div>
        </div>
        <div className='flex flex-col items-end gap-2'>
          <div className='flex items-center gap-1 rounded-xl border border-border/60 bg-background/60 p-1'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className={cn(
                'h-7 px-2 text-[11px]',
                previewScope === 'page'
                  ? 'border-primary/30 bg-primary/10 text-foreground'
                  : 'text-muted-foreground'
              )}
              onClick={(): void => setPreviewScope('page')}
            >
              Current page
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className={cn(
                'h-7 px-2 text-[11px]',
                previewScope === 'lesson'
                  ? 'border-primary/30 bg-primary/10 text-foreground'
                  : 'text-muted-foreground'
              )}
              onClick={(): void => setPreviewScope('lesson')}
            >
              Full lesson
            </Button>
          </div>
          <div className='flex items-center gap-1 rounded-xl border border-border/60 bg-background/60 p-1'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className={cn(
                'h-7 px-2 text-[11px]',
                previewDevice === 'desktop'
                  ? 'border-primary/30 bg-primary/10 text-foreground'
                  : 'text-muted-foreground'
              )}
              onClick={(): void => setPreviewDevice('desktop')}
            >
              Desktop
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className={cn(
                'h-7 px-2 text-[11px]',
                previewDevice === 'mobile'
                  ? 'border-primary/30 bg-primary/10 text-foreground'
                  : 'text-muted-foreground'
              )}
              onClick={(): void => setPreviewDevice('mobile')}
            >
              Mobile
            </Button>
          </div>
        </div>
      </div>
      <div className='flex-1 overflow-y-auto p-4 scrollbar-thin'>
        <div
          className={cn(
            'mx-auto overflow-hidden rounded-xl border border-border/40 bg-white shadow-sm transition-[max-width] duration-200',
            previewFrameClassName
          )}
          data-testid='lesson-document-preview-frame'
        >
          <KangurLessonDocumentRenderer
            document={previewDocument}
            activePageId={previewActivePageId}
          />
        </div>
      </div>
    </div>
  );
}
