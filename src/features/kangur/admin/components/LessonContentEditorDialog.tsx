'use client';

import React from 'react';
import { Sparkles, X } from 'lucide-react';

import {
  hasKangurLessonDocumentContent,
} from '@/features/kangur/lesson-documents';
import type { KangurLesson, KangurLessonDocument } from '@/shared/contracts/kangur';
import { Badge, Button, Dialog, DialogContent } from '@/shared/ui';

import { KangurLessonDocumentEditor } from '../KangurLessonDocumentEditor';
import { KangurLessonNarrationPanel } from '../KangurLessonNarrationPanel';

type Props = {
  lesson: KangurLesson | null;
  document: KangurLessonDocument;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onChange: (next: KangurLessonDocument) => void;
  onSave: () => void;
  onImportLegacy: () => void;
  onClearContent: () => void;
};

export function LessonContentEditorDialog({
  lesson,
  document,
  isOpen,
  isSaving,
  onClose,
  onChange,
  onSave,
  onImportLegacy,
  onClearContent,
}: Props): React.JSX.Element {
  return (
    <Dialog open={isOpen} onOpenChange={(open): void => { if (!open) onClose(); }}>
      <DialogContent
        className='top-2 right-2 bottom-2 left-2 w-auto max-w-none translate-x-0 translate-y-0 flex flex-col overflow-hidden p-0 gap-0'
        onInteractOutside={(e): void => e.preventDefault()}
        onEscapeKeyDown={(e): void => e.preventDefault()}
      >
        {/* Sticky toolbar */}
        <div className='flex shrink-0 items-center gap-3 border-b border-border/60 bg-card/90 px-4 py-3 backdrop-blur-md'>
          <div className='min-w-0 flex-1'>
            <div className='flex items-center gap-2'>
              {lesson?.emoji ? (
                <span className='shrink-0 text-lg leading-none'>{lesson.emoji}</span>
              ) : null}
              <span className='truncate text-sm font-semibold text-white'>
                {lesson?.title ?? 'Lesson Content'}
              </span>
              <Badge variant='outline' className='shrink-0 text-[10px] uppercase tracking-wide'>
                document
              </Badge>
            </div>
            <div className='mt-0.5 text-[11px] text-muted-foreground'>
              Author lesson pages with text, SVG images, and responsive layouts.
            </div>
          </div>

          <div className='flex shrink-0 items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8 text-sky-200 hover:bg-sky-500/10 hover:text-sky-100'
              onClick={onImportLegacy}
              disabled={isSaving}
            >
              <Sparkles className='mr-1 size-3.5' />
              Import legacy
            </Button>
            {hasKangurLessonDocumentContent(document) ? (
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-8 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200'
                onClick={onClearContent}
                disabled={isSaving}
              >
                Clear content
              </Button>
            ) : null}
            <Button
              type='button'
              size='sm'
              className='h-8'
              onClick={onSave}
              disabled={isSaving}
            >
              {isSaving ? 'Saving…' : 'Save content'}
            </Button>
            <button
              type='button'
              onClick={onClose}
              className='inline-flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-white'
              aria-label='Close editor'
            >
              <X className='size-4' />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className='min-h-0 flex-1 overflow-y-auto p-4 scrollbar-thin'>
          {lesson ? (
            <div className='space-y-6'>
              <KangurLessonNarrationPanel
                lesson={lesson}
                document={document}
                onChange={onChange}
              />
              <KangurLessonDocumentEditor value={document} onChange={onChange} />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
