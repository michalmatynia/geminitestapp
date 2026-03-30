'use client';

import { Pen, X } from 'lucide-react';
import { useCallback, useMemo } from 'react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurTextField } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_START_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_FINE_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

import { KangurAiTutorDrawingCanvas } from './KangurAiTutorDrawingCanvas';
import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import { useKangurAiTutorWidgetStateContext } from './ai-tutor-widget/KangurAiTutorWidget.state';

import type { JSX } from 'react';

type TutorDrawingContent = {
  attachedLabel?: string;
  clearLabel?: string;
  previewAlt?: string;
  toggleLabel?: string;
};

export function KangurAiTutorComposer(): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const isCoarsePointer = useKangurCoarsePointer();
  const drawingContent = (tutorContent as { drawing?: TutorDrawingContent }).drawing;
  const {
    canSendMessages,
    drawingImageData,
    drawingMode,
    guestAuthFormVisible,
    handleClearDrawing: clearAttachedDrawing,
    handleDrawingComplete: commitDrawingImage,
    handleKeyDown,
    handleQuickAction,
    handleSend,
    handleToggleDrawing,
    inputPlaceholder,
    isAskModalMode,
    isLoading,
    showToolboxLayout,
    visibleQuickActions,
  } = useKangurAiTutorPanelBodyContext();
  const {
    drawingDraftSnapshot,
    inputRef,
    inputValue,
    setDrawingDraftSnapshot,
    setInputValue,
  } = useKangurAiTutorWidgetStateContext();
  const showDrawingToggle = !showToolboxLayout && !guestAuthFormVisible;
  const drawingDraftStorage = useMemo(
    () => ({
      clearDraftSnapshot: () => setDrawingDraftSnapshot(null),
      draftSnapshot: drawingDraftSnapshot,
      setDraftSnapshot: setDrawingDraftSnapshot,
    }),
    [drawingDraftSnapshot, setDrawingDraftSnapshot]
  );

  const canSubmit = Boolean(inputValue.trim() || drawingImageData);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || isLoading || !canSendMessages) {
      return;
    }
    void handleSend();
  }, [canSubmit, canSendMessages, handleSend, isLoading]);

  const handleDrawingComplete = useCallback(
    (dataUrl: string): void => {
      setDrawingDraftSnapshot(null);
      commitDrawingImage(dataUrl);
    },
    [commitDrawingImage, setDrawingDraftSnapshot]
  );

  const handleClearDrawing = useCallback((): void => {
    setDrawingDraftSnapshot(null);
    clearAttachedDrawing();
  }, [clearAttachedDrawing, setDrawingDraftSnapshot]);

  if (drawingMode) {
    return (
      <section className='kangur-chat-padding-md pt-3 pb-0'>
        <KangurAiTutorDrawingCanvas
          draftStorage={drawingDraftStorage}
          onComplete={handleDrawingComplete}
          onCancel={handleToggleDrawing}
        />
      </section>
    );
  }

  return (
    <section className='kangur-chat-padding-md pt-3 pb-0'>
      {drawingImageData ? (
        <div
          data-testid='kangur-ai-tutor-drawing-preview'
          className={`mb-2 ${KANGUR_START_ROW_CLASSNAME}`}
        >
          <div className='relative'>
            <img
              src={drawingImageData}
              alt={drawingContent?.previewAlt ?? 'Rysunek'}
              className='h-16 w-auto kangur-chat-inset border kangur-chat-surface-warm shadow-[0_4px_10px_-6px_rgba(15,23,42,0.1)]'
            />
            <button
              type='button'
              onClick={handleClearDrawing}
              className={`absolute -right-1.5 -top-1.5 flex cursor-pointer items-center justify-center rounded-full border kangur-chat-surface-soft shadow-sm transition-colors touch-manipulation select-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white hover:[background:var(--kangur-chat-danger-background,#fff1f2)] hover:[color:var(--kangur-chat-danger-text,#ef4444)] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] ${
                isCoarsePointer ? 'h-11 w-11' : 'h-5 w-5'
              }`}
              aria-label={drawingContent?.clearLabel ?? 'Usuń rysunek'}
              title={drawingContent?.clearLabel ?? 'Usuń rysunek'}>
              <X aria-hidden='true' className={isCoarsePointer ? 'h-4 w-4' : 'h-2.5 w-2.5'} />
            </button>
          </div>
          <span className='mt-1 text-[10px] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
            {drawingContent?.attachedLabel ?? 'Rysunek załączony'}
          </span>
        </div>
      ) : null}
      {!showToolboxLayout && visibleQuickActions.length ? (
        <div
          className={`mb-2.5 ${KANGUR_WRAP_ROW_FINE_CLASSNAME}`}
          data-kangur-tts-ignore='true'
          data-testid='kangur-ai-tutor-composer-pills'
        >
          {visibleQuickActions.map((action) => (
            <button
              key={action.id}
              data-testid={`kangur-ai-tutor-quick-action-${action.id}`}
              type='button'
              disabled={isLoading || !canSendMessages}
              aria-label={action.label}
              className={`inline-flex items-center rounded-full border font-medium transition-colors touch-manipulation select-none active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white ${
                isCoarsePointer ? 'min-h-11 px-4 text-xs' : 'h-7 px-3 text-[11px]'
              } ${
                isLoading || !canSendMessages
                  ? 'cursor-not-allowed border-transparent opacity-40'
                  : 'cursor-pointer border-[color:var(--kangur-soft-card-border)] [color:var(--kangur-chat-panel-text,var(--kangur-page-text))] hover:[background:var(--kangur-soft-card-background)]'
              }`}
              onClick={() => {
                if (isLoading || !canSendMessages) return;
                void handleQuickAction(action);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className={KANGUR_CENTER_ROW_CLASSNAME}>
        <div className='relative flex-1'>
          <KangurTextField
            ref={inputRef}
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSubmit();
              }
              handleKeyDown(event);
            }}
            accent='amber'
            size='sm'
            className={`w-full shadow-[0_4px_12px_-8px_rgba(15,23,42,0.06)] ${
              showDrawingToggle ? 'pr-11' : ''
            }`}
            disabled={isLoading || !canSendMessages}
            placeholder={isAskModalMode ? tutorContent.placeholders.askModal : inputPlaceholder}
            aria-label={tutorContent.common.questionInputAria}
          />
          {showDrawingToggle ? (
            <button
              data-testid='kangur-ai-tutor-drawing-toggle'
              type='button'
              className={`absolute right-1 top-1/2 flex -translate-y-1/2 cursor-pointer items-center justify-center p-0 transition-colors touch-manipulation select-none active:scale-[0.97] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))] hover:[color:var(--kangur-chat-panel-text,var(--kangur-page-text))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 disabled:opacity-40 disabled:cursor-not-allowed ${
                isCoarsePointer ? 'h-11 w-11' : 'h-8 w-8'
              }`}
              disabled={isLoading || !canSendMessages}
              onClick={handleToggleDrawing}
              aria-label={drawingContent?.toggleLabel ?? 'Rysuj'}
              aria-pressed={drawingMode}
            >
              <Pen aria-hidden='true' className={isCoarsePointer ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}
