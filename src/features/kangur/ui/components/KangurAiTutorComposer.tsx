import { Send } from 'lucide-react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton, KangurTextField } from '@/features/kangur/ui/design/primitives';

import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type { JSX } from 'react';

export function KangurAiTutorComposer(): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const {
    canSendMessages,
    handleKeyDown,
    handleQuickAction,
    handleSend,
    inputPlaceholder,
    isAskModalMode,
    isLoading,
    visibleQuickActions,
  } = useKangurAiTutorPanelBodyContext();
  const { inputRef, inputValue, setInputValue } = useKangurAiTutorWidgetStateContext();

  return (
    <div
      className='border-t border-slate-100 px-3 py-3'
      data-testid='kangur-ai-tutor-composer-shell'
    >
      <div className='flex items-center gap-2'>
        <KangurTextField
          ref={inputRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onKeyDown={handleKeyDown}
          accent='amber'
          size='sm'
          className='flex-1'
          disabled={isLoading || !canSendMessages}
          placeholder={isAskModalMode ? tutorContent.placeholders.askModal : inputPlaceholder}
          aria-label={tutorContent.common.questionInputAria}
        />
        <KangurButton
          type='button'
          size='sm'
          variant='primary'
          onClick={() => void handleSend()}
          disabled={!inputValue.trim() || isLoading || !canSendMessages}
          aria-label={tutorContent.common.sendAria}
        >
          <Send className='h-3.5 w-3.5' />
        </KangurButton>
      </div>
      {visibleQuickActions.length ? (
        <div
          className='mt-2 flex flex-wrap gap-2'
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
              className='h-8 rounded-full px-3 text-[11px]'
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
