'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2, Sparkles, X } from 'lucide-react';

import { hasKangurLessonDocumentContent } from '@/features/kangur/lesson-documents';
import { KANGUR_LESSON_COMPONENT_OPTIONS } from '@/features/kangur/settings';
import type { KangurLesson, KangurLessonDocument } from '@/shared/contracts/kangur';
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { KangurLessonDocumentEditor } from '../KangurLessonDocumentEditor';
import { KangurLessonNarrationPanel } from '../KangurLessonNarrationPanel';
import { validateKangurLessonDocumentDraft } from '../content-creator-insights';
import {
  LessonContentEditorProvider,
  useLessonContentEditorContext,
} from '../context/LessonContentEditorContext';
import {
  LessonContentEditorRuntimeProvider,
  useLessonContentEditorRuntimeContext,
} from '../context/LessonContentEditorRuntimeContext';

type Props = {
  lesson: KangurLesson | null;
  document: KangurLessonDocument;
  isOpen: boolean;
  isSaving: boolean;
  onClose: () => void;
  onLessonChange: (next: KangurLesson) => void;
  onChange: (next: KangurLessonDocument) => void;
  onSave: () => void;
  onImportLegacy: () => void;
  onClearContent: () => void;
};

export function LessonContentEditorDialog(props: Props): React.JSX.Element {
  const {
    lesson,
    document,
    isOpen,
    isSaving,
    onClose,
    onLessonChange,
    onChange,
    onSave,
    onImportLegacy,
    onClearContent,
  } = props;

  return (
    <LessonContentEditorProvider lesson={lesson} document={document} onChange={onChange}>
      <LessonContentEditorRuntimeProvider
        isSaving={isSaving}
        onClose={onClose}
        onSave={onSave}
        onImportLegacy={onImportLegacy}
        onClearContent={onClearContent}
      >
        <Dialog
          open={isOpen}
          onOpenChange={(open): void => {
            if (!open) onClose();
          }}
        >
          <LessonContentEditorDialogContent
            key={isOpen ? lesson?.id ?? 'lesson-editor-open' : 'lesson-editor-closed'}
            onLessonChange={onLessonChange}
          />
        </Dialog>
      </LessonContentEditorRuntimeProvider>
    </LessonContentEditorProvider>
  );
}

function LessonContentEditorDialogContent({
  onLessonChange,
}: {
  onLessonChange: (next: KangurLesson) => void;
}): React.JSX.Element {
  const { lesson, document } = useLessonContentEditorContext();
  const { isSaving, onClose, onSave, onImportLegacy, onClearContent } =
    useLessonContentEditorRuntimeContext();
  const [discardConfirmOpen, setDiscardConfirmOpen] = React.useState(false);
  const [initialSnapshot] = React.useState(() =>
    JSON.stringify({
      lesson,
      document,
    })
  );

  const currentSnapshot = React.useMemo(
    () =>
      JSON.stringify({
        lesson,
        document,
      }),
    [document, lesson]
  );
  const isDirty = currentSnapshot !== initialSnapshot;
  const validation = React.useMemo(
    () => validateKangurLessonDocumentDraft({ lesson, document }),
    [document, lesson]
  );
  const canSave = isDirty && validation.blockers.length === 0 && !isSaving;
  const saveStateMessage = !isDirty
    ? 'No changes to save yet.'
    : validation.blockers.length > 0
      ? validation.blockers[0] ?? 'This lesson cannot be saved yet.'
      : 'Ready to save this lesson draft.';
  const handleRequestClose = React.useCallback((): void => {
    if (isSaving) return;
    if (isDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  }, [isDirty, isSaving, onClose]);
  const handleSave = React.useCallback((): void => {
    onSave();
  }, [onSave]);

  return (
    <>
      <DialogContent
        className='top-2 right-2 bottom-2 left-2 w-auto max-w-none translate-x-0 translate-y-0 flex flex-col overflow-hidden p-0 gap-0'
        onInteractOutside={(event): void => {
          event.preventDefault();
          handleRequestClose();
        }}
        onEscapeKeyDown={(event): void => {
          event.preventDefault();
          handleRequestClose();
        }}
      >
        <DialogTitle className='sr-only'>
          {lesson ? `Edit lesson content for ${lesson.title}` : 'Lesson Content'}
        </DialogTitle>
        <DialogDescription className='sr-only'>
          Author lesson pages, SVG blocks, and narration for the selected lesson.
        </DialogDescription>

        {/* Sticky toolbar */}
        <div className='flex shrink-0 items-center gap-3 border-b border-border/60 bg-card/90 px-4 py-3 backdrop-blur-md'>
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              {lesson?.emoji ? (
                <span className='shrink-0 text-lg leading-none'>{lesson.emoji}</span>
              ) : null}
              <span className='truncate text-sm font-semibold text-white'>
                {lesson?.title ?? 'Lesson Content'}
              </span>
              <Badge variant='outline' className='shrink-0 text-[10px] uppercase tracking-wide'>
                document
              </Badge>
              <Badge
                variant='outline'
                className='shrink-0 text-[10px] uppercase tracking-wide'
              >
                {validation.pageCount} pages
              </Badge>
              <Badge
                variant='outline'
                className='shrink-0 text-[10px] uppercase tracking-wide'
              >
                {validation.blockCount} blocks
              </Badge>
              <Badge
                variant='outline'
                className='shrink-0 text-[10px] uppercase tracking-wide'
              >
                {isDirty ? 'Unsaved changes' : 'Saved'}
              </Badge>
            </div>
            <div className='mt-0.5 text-[11px] text-muted-foreground'>
              Author lesson pages with text, SVG blocks, SVG image references, and responsive
              layouts.
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
              onClick={handleSave}
              disabled={!canSave}
            >
              {isSaving ? 'Saving…' : 'Save content'}
            </Button>
            <button
              type='button'
              onClick={handleRequestClose}
              className='inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-white'
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
              <LessonMetadataWorkspacePanel lesson={lesson} onLessonChange={onLessonChange} />
              <div className='rounded-2xl border border-white/10 bg-slate-950/35 p-4'>
                <div className='flex flex-wrap items-start gap-3'>
                  <div
                    className={
                      validation.blockers.length > 0 || validation.warnings.length > 0
                        ? 'rounded-xl border border-amber-400/20 bg-amber-500/10 p-2 text-amber-200'
                        : 'rounded-xl border border-emerald-400/20 bg-emerald-500/10 p-2 text-emerald-200'
                    }
                  >
                    {validation.blockers.length > 0 || validation.warnings.length > 0 ? (
                      <AlertTriangle className='size-4' />
                    ) : (
                      <CheckCircle2 className='size-4' />
                    )}
                  </div>
                  <div className='min-w-0 flex-1'>
                    <div className='text-sm font-semibold text-white'>
                      {validation.blockers.length > 0
                        ? 'Draft needs required fixes'
                        : validation.warnings.length > 0
                        ? 'Draft review'
                        : 'Draft is structurally ready'}
                    </div>
                    <div className='mt-1 text-xs leading-relaxed text-muted-foreground'>
                      {validation.blockers.length > 0
                        ? 'Resolve the required issue before saving this lesson draft.'
                        : validation.warnings.length > 0
                        ? 'Review the remaining issues before publishing or handing this lesson off.'
                        : 'Pages, learner content, and narration all have usable baseline structure.'}
                    </div>
                    <div className='mt-2 text-xs font-medium text-slate-300'>{saveStateMessage}</div>
                    {validation.blockers.length > 0 ? (
                      <ul className='mt-3 space-y-1 text-xs text-rose-100/90'>
                        {validation.blockers.map((blocker) => (
                          <li key={blocker}>• {blocker}</li>
                        ))}
                      </ul>
                    ) : null}
                    {validation.warnings.length > 0 ? (
                      <ul className='mt-3 space-y-1 text-xs text-amber-100/90'>
                        {validation.warnings.map((warning) => (
                          <li key={warning}>• {warning}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>
              </div>
              <KangurLessonNarrationPanel />
              <KangurLessonDocumentEditor />
            </div>
          ) : null}
        </div>
      </DialogContent>

      <ConfirmModal
        isOpen={discardConfirmOpen}
        onClose={(): void => setDiscardConfirmOpen(false)}
        onConfirm={(): void => {
          setDiscardConfirmOpen(false);
          onClose();
        }}
        title='Discard lesson changes?'
        subtitle='You have unsaved changes in this lesson draft.'
        message='Close the editor without saving? Your current narration and document edits will be lost.'
        confirmText='Discard changes'
        cancelText='Keep editing'
        isDangerous={true}
      />
    </>
  );
}

function LessonMetadataWorkspacePanel({
  lesson,
  onLessonChange,
}: {
  lesson: KangurLesson;
  onLessonChange: (next: KangurLesson) => void;
}): React.JSX.Element {
  const titleId = `lesson-setup-title-${lesson.id}`;
  const emojiId = `lesson-setup-emoji-${lesson.id}`;
  const componentId = `lesson-setup-component-${lesson.id}`;
  const descriptionId = `lesson-setup-description-${lesson.id}`;
  const visibilityId = `lesson-setup-visible-${lesson.id}`;

  return (
    <section className='rounded-2xl border border-white/10 bg-slate-950/35 p-4'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-white'>Lesson setup</div>
          <div className='mt-1 text-xs leading-relaxed text-muted-foreground'>
            Editing content here also saves the lesson title, description, emoji, visibility, and
            lesson type.
          </div>
        </div>
        <Badge variant='outline' className='shrink-0 text-[10px] uppercase tracking-wide'>
          document workspace
        </Badge>
      </div>

      <div className='mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]'>
        <div className='space-y-2'>
          <label
            htmlFor={titleId}
            className='block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400'
          >
            Title
          </label>
          <input
            id={titleId}
            type='text'
            value={lesson.title}
            onChange={(event): void => onLessonChange({ ...lesson, title: event.target.value })}
            placeholder='Lesson title'
            className='h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none transition focus:border-sky-400/50'
          />
        </div>

        <div className='space-y-2'>
          <label
            htmlFor={emojiId}
            className='block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400'
          >
            Emoji
          </label>
          <input
            id={emojiId}
            type='text'
            value={lesson.emoji}
            onChange={(event): void => onLessonChange({ ...lesson, emoji: event.target.value })}
            placeholder='📚'
            maxLength={12}
            className='h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none transition focus:border-sky-400/50'
          />
        </div>

        <div className='space-y-2'>
          <label
            htmlFor={componentId}
            className='block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400'
          >
            Lesson type
          </label>
          <select
            id={componentId}
            value={lesson.componentId}
            onChange={(event): void =>
              onLessonChange({
                ...lesson,
                componentId: event.target.value as KangurLesson['componentId'],
              })
            }
            className='h-10 w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 text-sm text-white outline-none transition focus:border-sky-400/50'
          >
            {KANGUR_LESSON_COMPONENT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className='mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]'>
        <div className='space-y-2'>
          <label
            htmlFor={descriptionId}
            className='block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400'
          >
            Description
          </label>
          <textarea
            id={descriptionId}
            value={lesson.description}
            onChange={(event): void =>
              onLessonChange({ ...lesson, description: event.target.value })
            }
            placeholder='Short lesson description'
            rows={4}
            className='w-full rounded-xl border border-white/10 bg-slate-950/60 px-3 py-2 text-sm text-white outline-none transition focus:border-sky-400/50'
          />
        </div>

        <div className='rounded-2xl border border-white/10 bg-slate-950/50 p-4'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400'>
            Visibility
          </div>
          <label
            htmlFor={visibilityId}
            className='mt-3 flex cursor-pointer items-center justify-between gap-3'
          >
            <div>
              <div className='text-sm font-medium text-white'>Visible in learner app</div>
              <div className='mt-1 text-xs leading-relaxed text-muted-foreground'>
                Hidden lessons stay editable here, but disappear from the learner side.
              </div>
            </div>
            <input
              id={visibilityId}
              type='checkbox'
              checked={lesson.enabled}
              onChange={(event): void =>
                onLessonChange({ ...lesson, enabled: event.target.checked })
              }
              className='size-4 rounded border-white/20 bg-slate-950/60 accent-sky-400'
            />
          </label>
        </div>
      </div>
    </section>
  );
}
