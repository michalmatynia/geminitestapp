'use client';

import { AlertTriangle, CheckCircle2, Sparkles, X } from 'lucide-react';
import React from 'react';

import { hasKangurLessonDocumentContent } from '@/features/kangur/lesson-documents';
import { KANGUR_LESSON_COMPONENT_OPTIONS } from '@/features/kangur/settings';
import type { KangurLesson, KangurLessonDocument } from '@/shared/contracts/kangur';
import { Badge, Button, Dialog, DialogContent, DialogDescription, DialogTitle } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { validateKangurLessonDocumentDraft } from '../content-creator-insights';
import {
  LessonContentEditorProvider,
  useLessonContentEditorContext,
} from '../context/LessonContentEditorContext';
import {
  LessonContentEditorRuntimeProvider,
  useLessonContentEditorRuntimeContext,
} from '../context/LessonContentEditorRuntimeContext';
import { KangurLessonDocumentEditor } from '../KangurLessonDocumentEditor';
import { KangurLessonNarrationPanel } from '../KangurLessonNarrationPanel';
import {
  clearLessonContentEditorDraft,
  readLessonContentEditorDraft,
  writeLessonContentEditorDraft,
} from '../lesson-content-editor-drafts';
import { KangurAdminWorkspaceSectionCard } from './KangurAdminWorkspaceSectionCard';

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

const formatDraftTimestamp = (value: string | null): string | null => {
  if (!value) return null;

  try {
    return new Intl.DateTimeFormat('pl-PL', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
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
  const { lesson, document, onChange } = useLessonContentEditorContext();
  const { isSaving, onClose, onSave, onImportLegacy, onClearContent } =
    useLessonContentEditorRuntimeContext();
  const [discardConfirmOpen, setDiscardConfirmOpen] = React.useState(false);
  const [restorableDraftSavedAt, setRestorableDraftSavedAt] = React.useState<string | null>(null);
  const [localDraftSavedAt, setLocalDraftSavedAt] = React.useState<string | null>(null);
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
  const lessonId = lesson?.id ?? null;
  const validation = React.useMemo(
    () => validateKangurLessonDocumentDraft({ lesson, document }),
    [document, lesson]
  );
  const editorialChecklist = React.useMemo(() => {
    const hasLessonTitle = (lesson?.title.trim().length ?? 0) > 0;
    const hasLessonDescription = (lesson?.description.trim().length ?? 0) > 0;
    const contentStatus = validation.hasMeaningfulContent
      ? validation.hasStructuralWarnings
        ? 'needs-review'
        : 'ready'
      : 'needs-work';
    const narrationStatus =
      validation.narrationState === 'ready'
        ? 'ready'
        : validation.narrationState === 'waiting'
          ? 'waiting'
          : 'needs-review';

    const items = [
      {
        id: 'setup',
        label: 'Lesson setup',
        status: hasLessonTitle && hasLessonDescription ? 'ready' : 'needs-review',
        detail:
          hasLessonTitle && hasLessonDescription
            ? 'Title and description are set.'
            : hasLessonTitle
              ? 'Add a short description so the lesson overview has context.'
              : 'Add the lesson title before saving.',
      },
      {
        id: 'content',
        label: 'Learner content',
        status: contentStatus,
        detail:
          contentStatus === 'ready'
            ? 'Pages and blocks have visible learner content.'
            : contentStatus === 'needs-review'
              ? 'Content exists, but some pages or blocks still need cleanup.'
              : 'Add visible learner content to at least one page.',
      },
      {
        id: 'narration',
        label: 'Narration',
        status: narrationStatus,
        detail:
          narrationStatus === 'ready'
            ? 'Narration has usable script coverage.'
            : validation.narrationState === 'stale'
              ? 'Refresh narration preview so it matches the latest lesson draft.'
              : narrationStatus === 'needs-review'
                ? 'Review narration coverage before handing the lesson off.'
                : 'Narration review starts after visible lesson content exists.',
      },
    ] as const;

    const nextRecommendedAction =
      !hasLessonTitle
        ? 'Finish the lesson title in Lesson setup.'
        : !hasLessonDescription
          ? 'Add a short lesson description so the overview and narration have context.'
          : !validation.hasMeaningfulContent
            ? 'Add visible learner content to at least one page.'
            : validation.hasStructuralWarnings
              ? validation.warnings[0] ?? 'Clean up the remaining lesson issues.'
              : validation.narrationState === 'stale'
                ? 'Refresh narration preview so it matches the latest content edits.'
                : !validation.hasNarrationContent
                  ? 'Review narration coverage and generate an audio preview.'
                  : 'This draft is ready for a final preview and save.';

    return {
      items,
      nextRecommendedAction,
    };
  }, [lesson, validation]);
  const canSave = isDirty && validation.blockers.length === 0 && !isSaving;
  const saveStateMessage = !isDirty
    ? 'No changes to save yet.'
    : validation.blockers.length > 0
      ? validation.blockers[0] ?? 'This lesson cannot be saved yet.'
      : 'Ready to save this lesson draft.';

  React.useEffect(() => {
    if (!lessonId) {
      setRestorableDraftSavedAt(null);
      return;
    }

    const draft = readLessonContentEditorDraft(lessonId);
    if (
      draft &&
      JSON.stringify({
        lesson: draft.lesson,
        document: draft.document,
      }) !== initialSnapshot
    ) {
      setRestorableDraftSavedAt(draft.savedAt);
      return;
    }

    setRestorableDraftSavedAt(null);
  }, [initialSnapshot, lessonId]);

  React.useEffect(() => {
    if (!lessonId || !lesson) return;

    if (!isDirty) {
      setLocalDraftSavedAt(null);
      const draft = readLessonContentEditorDraft(lessonId);
      const hasRestorableDraft =
        draft &&
        JSON.stringify({
          lesson: draft.lesson,
          document: draft.document,
        }) !== currentSnapshot;

      if (!hasRestorableDraft) {
        clearLessonContentEditorDraft(lessonId);
      }
      return;
    }

    const timeoutId = window.setTimeout(() => {
      const savedAt = writeLessonContentEditorDraft({ lesson, document });
      if (savedAt) {
        setLocalDraftSavedAt(savedAt);
      }
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [currentSnapshot, document, isDirty, lesson, lessonId]);

  const handleRequestClose = React.useCallback((): void => {
    if (isSaving) return;
    if (isDirty) {
      setDiscardConfirmOpen(true);
      return;
    }
    onClose();
  }, [isDirty, isSaving, onClose]);
  const handleRestoreDraft = React.useCallback((): void => {
    if (!lessonId) return;
    const draft = readLessonContentEditorDraft(lessonId);
    if (!draft) {
      setRestorableDraftSavedAt(null);
      return;
    }

    onLessonChange(draft.lesson);
    onChange(draft.document);
    setLocalDraftSavedAt(draft.savedAt);
    setRestorableDraftSavedAt(null);
  }, [lessonId, onChange, onLessonChange]);
  const handleDiscardStoredDraft = React.useCallback((): void => {
    if (!lessonId) return;
    clearLessonContentEditorDraft(lessonId);
    setLocalDraftSavedAt(null);
    setRestorableDraftSavedAt(null);
  }, [lessonId]);
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
        <div className='flex shrink-0 items-center gap-3 border-b border-border/60 bg-background/90 px-4 py-3 backdrop-blur-md'>
          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              {lesson?.emoji ? (
                <span className='shrink-0 text-lg leading-none'>{lesson.emoji}</span>
              ) : null}
              <span className='truncate text-sm font-semibold text-foreground'>
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
              {localDraftSavedAt ? ` Local draft autosaved: ${formatDraftTimestamp(localDraftSavedAt)}.` : ''}
            </div>
          </div>

          <div className='flex shrink-0 items-center gap-2'>
            <Button
              type='button'
              variant='outline'
              size='sm'
              className='h-8'
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
                className='h-8 text-rose-600 hover:text-rose-700'
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
              className='inline-flex size-8 cursor-pointer items-center justify-center rounded-lg text-muted-foreground hover:bg-muted/60 hover:text-foreground'
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
              {restorableDraftSavedAt ? (
                <KangurAdminWorkspaceSectionCard
                  title='Recovered local draft'
                  description={`A newer local draft is available from ${formatDraftTimestamp(restorableDraftSavedAt)}.`}
                  badge='Local recovery'
                  actions={
                    <div className='flex items-center gap-2'>
                      <Button type='button' size='sm' variant='outline' onClick={handleDiscardStoredDraft}>
                        Dismiss draft
                      </Button>
                      <Button type='button' size='sm' onClick={handleRestoreDraft}>
                        Restore draft
                      </Button>
                    </div>
                  }
                />
              ) : null}
              <LessonMetadataWorkspacePanel lesson={lesson} onLessonChange={onLessonChange} />
              <KangurAdminWorkspaceSectionCard
                title='Draft review'
                description='Keep lesson setup, learner content, and narration in one editorial checklist before saving.'
                badge='Editorial checklist'
              >
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
                    <div className='text-sm font-semibold text-foreground'>
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
                    <div className='mt-2 text-xs font-medium text-muted-foreground'>
                      {saveStateMessage}
                    </div>
                    <div className='mt-3 rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-foreground'>
                      Next recommended action: {editorialChecklist.nextRecommendedAction}
                    </div>
                    {validation.blockers.length > 0 ? (
                      <ul className='mt-3 space-y-1 text-xs text-rose-200'>
                        {validation.blockers.map((blocker) => (
                          <li key={blocker}>• {blocker}</li>
                        ))}
                      </ul>
                    ) : null}
                    {validation.warnings.length > 0 ? (
                      <ul className='mt-3 space-y-1 text-xs text-amber-200'>
                        {validation.warnings.map((warning) => (
                          <li key={warning}>• {warning}</li>
                        ))}
                      </ul>
                    ) : null}
                    {validation.publishBlockers.length > 0 ? (
                      <div className='mt-4 rounded-xl border border-rose-400/20 bg-rose-500/10 px-3 py-2'>
                        <div className='text-[11px] font-semibold uppercase tracking-[0.16em] text-rose-200'>
                          Publish blockers
                        </div>
                        <ul className='mt-2 space-y-1 text-xs text-rose-200'>
                          {validation.publishBlockers.map((blocker) => (
                            <li key={blocker}>• {blocker}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className='mt-4 grid gap-3 md:grid-cols-3'>
                  {editorialChecklist.items.map((item) => (
                    <div
                      key={item.id}
                      className='rounded-xl border border-border/60 bg-background/60 px-3 py-3'
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <div className='text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground'>
                          {item.label}
                        </div>
                        <Badge
                          variant='outline'
                          className={
                            item.status === 'ready'
                              ? 'border-emerald-400/30 text-emerald-300'
                              : item.status === 'waiting'
                                ? 'border-border/60 text-muted-foreground'
                                : 'border-amber-400/30 text-amber-300'
                          }
                        >
                          {item.status === 'ready'
                            ? 'Ready'
                            : item.status === 'waiting'
                              ? 'Waiting'
                              : 'Review'}
                        </Badge>
                      </div>
                      <div className='mt-2 text-xs leading-relaxed text-muted-foreground'>
                        {item.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </KangurAdminWorkspaceSectionCard>
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
          if (lessonId) {
            clearLessonContentEditorDraft(lessonId);
          }
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
    <KangurAdminWorkspaceSectionCard
      title='Lesson setup'
      description='Editing content here also saves the lesson title, description, emoji, visibility, and lesson type.'
      badge='Document workspace'
    >
      <div className='mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_220px]'>
        <div className='space-y-2'>
          <label
            htmlFor={titleId}
            className='block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground'
          >
            Title
          </label>
          <input
            id={titleId}
            type='text'
            value={lesson.title}
            onChange={(event): void => onLessonChange({ ...lesson, title: event.target.value })}
            placeholder='Lesson title'
            className='h-10 w-full rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none transition focus:border-primary/40'
          />
        </div>

        <div className='space-y-2'>
          <label
            htmlFor={emojiId}
            className='block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground'
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
            className='h-10 w-full rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none transition focus:border-primary/40'
          />
        </div>

        <div className='space-y-2'>
          <label
            htmlFor={componentId}
            className='block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground'
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
            className='h-10 w-full rounded-xl border border-border/60 bg-background/70 px-3 text-sm text-foreground outline-none transition focus:border-primary/40'
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
            className='block text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground'
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
            className='w-full rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary/40'
          />
        </div>

        <div className='rounded-2xl border border-border/60 bg-background/60 p-4'>
          <div className='text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground'>
            Visibility
          </div>
          <label
            htmlFor={visibilityId}
            className='mt-3 flex cursor-pointer items-center justify-between gap-3'
          >
            <div>
              <div className='text-sm font-medium text-foreground'>Visible in learner app</div>
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
              className='size-4 rounded border-border/60 bg-background/70 accent-sky-400'
            />
          </label>
        </div>
      </div>
    </KangurAdminWorkspaceSectionCard>
  );
}
