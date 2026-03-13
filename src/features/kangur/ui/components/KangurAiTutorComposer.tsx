import { Pen, Send, X } from 'lucide-react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton, KangurTextField } from '@/features/kangur/ui/design/primitives';

import { KangurAiTutorDrawingCanvas } from './KangurAiTutorDrawingCanvas';
import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type { JSX } from 'react';

type TutorDrawingContent = {
  attachedLabel?: string;
  clearLabel?: string;
  previewAlt?: string;
  toggleLabel?: string;
};

export function KangurAiTutorComposer(): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const drawingContent = (tutorContent as { drawing?: TutorDrawingContent }).drawing;
  const {
    canSendMessages,
    drawingImageData,
    drawingMode,
    guestAuthFormVisible,
    handleClearDrawing,
    handleDrawingComplete,
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
  const { inputRef, inputValue, setInputValue } = useKangurAiTutorWidgetStateContext();

  if (drawingMode) {
    return (
      <div
        className='border-t kangur-chat-divider kangur-chat-padding-md kangur-chat-composer-shell'
        data-testid='kangur-ai-tutor-composer-shell'
      >
        <KangurAiTutorDrawingCanvas
          onComplete={handleDrawingComplete}
          onCancel={handleToggleDrawing}
        />
      </div>
    );
  }

  return (
    <div
      className='border-t kangur-chat-divider kangur-chat-padding-md kangur-chat-composer-shell'
      data-testid='kangur-ai-tutor-composer-shell'
    >
      {drawingImageData ? (
        <div
          data-testid='kangur-ai-tutor-drawing-preview'
          className='mb-2 flex items-start gap-2'
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
              className='absolute -right-1.5 -top-1.5 flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border kangur-chat-surface-soft shadow-sm transition-colors hover:[background:var(--kangur-chat-danger-background,#fff1f2)] hover:[color:var(--kangur-chat-danger-text,#ef4444)] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'
              aria-label={drawingContent?.clearLabel ?? 'Usuń rysunek'}
            >
              <X className='h-2.5 w-2.5' />
            </button>
          </div>
          <span className='mt-1 text-[10px] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
            {drawingContent?.attachedLabel ?? 'Rysunek załączony'}
          </span>
        </div>
      ) : null}
      <div className='flex items-center gap-2'>
        {!showToolboxLayout && !guestAuthFormVisible ? (
          <KangurButton
            data-testid='kangur-ai-tutor-drawing-toggle'
            type='button'
            size='sm'
            variant='surface'
            className='h-9 w-9 shrink-0 p-0'
            disabled={isLoading || !canSendMessages}
            onClick={handleToggleDrawing}
            aria-label={drawingContent?.toggleLabel ?? 'Rysuj'}
          >
            <Pen className='h-3.5 w-3.5' />
          </KangurButton>
        ) : null}
        <KangurTextField
          ref={inputRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          accent='amber'
          size='sm'
          className='flex-1 shadow-[0_4px_12px_-8px_rgba(15,23,42,0.06)]'
          disabled={isLoading || !canSendMessages}
          placeholder={isAskModalMode ? tutorContent.placeholders.askModal : inputPlaceholder}
          aria-label={tutorContent.common.questionInputAria}
        />
        <KangurButton
          type='button'
          size='sm'
          variant='primary'
          className='kangur-chat-send-shadow'
          onClick={() => void handleSend()}
          disabled={(!inputValue.trim() && !drawingImageData) || isLoading || !canSendMessages}
          aria-label={tutorContent.common.sendAria}
        >
          <Send className='h-3.5 w-3.5' />
        </KangurButton>
      </div>
      {!showToolboxLayout && visibleQuickActions.length ? (
        <div
          className='mt-2.5 flex flex-wrap gap-1.5'
          data-kangur-tts-ignore='true'
          data-testid='kangur-ai-tutor-composer-pills'
        >
          {visibleQuickActions.map((action) => (
            <KangurButton
              key={action.id}
              data-testid={`kangur-ai-tutor-quick-action-${action.id}`}
              type='button'
              size='sm'
              variant='surface'
              className='h-8 rounded-full px-3 text-[11px] shadow-[0_4px_10px_-8px_rgba(15,23,42,0.1)]'
              disabled={isLoading || !canSendMessages}
              onClick={() => void handleQuickAction(action)}
            >
              {action.label}
            </KangurButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}
