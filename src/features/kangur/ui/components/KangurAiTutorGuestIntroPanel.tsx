import { Pen } from 'lucide-react';
import { motion } from 'framer-motion';
import { createContext, useCallback, useContext, useState } from 'react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton, KangurTextField } from '@/features/kangur/ui/design/primitives';

import { KangurAiTutorDrawingCanvas } from './KangurAiTutorDrawingCanvas';
import { KangurAiTutorMessageList } from './KangurAiTutorMessageList';
import {
  KangurAiTutorChromeCloseButton,
  KangurAiTutorChromeKicker,
  KangurAiTutorWarmOverlayPanel,
} from './KangurAiTutorChrome';
import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';
import { KangurNarratorControl } from './KangurNarratorControl';

import type { CSSProperties, JSX } from 'react';

type Props = {
  guestIntroDescription: string;
  guestIntroHeadline: string;
  guestTutorLabel: string;
  isAnonymousVisitor: boolean;
  onAccept: () => void;
  onClose: () => void;
  onStartChat: () => void;
  panelStyle: CSSProperties;
  prefersReducedMotion: boolean;
};

type KangurAiTutorGuestIntroPanelContextValue = {
  guestTutorLabel: string;
  isAnonymousVisitor: boolean;
  onAccept: () => void;
  onClose: () => void;
  onDraw: () => void;
  onStartChat: () => void;
  panelStyle: CSSProperties;
  prefersReducedMotion: boolean;
  closeAria: string;
  drawLabel: string;
};

const KangurAiTutorGuestIntroPanelContext =
  createContext<KangurAiTutorGuestIntroPanelContextValue | null>(null);

const useKangurAiTutorGuestIntroPanelContext = (): KangurAiTutorGuestIntroPanelContextValue => {
  const context = useContext(KangurAiTutorGuestIntroPanelContext);

  if (!context) {
    throw new Error(
      'useKangurAiTutorGuestIntroPanelContext must be used within KangurAiTutorGuestIntroPanel.'
    );
  }

  return context;
};

function KangurAiTutorGuestIntroHeader(): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const {
    narratorSettings,
    tutorNarrationScript,
    tutorNarratorContextRegistry,
  } = useKangurAiTutorPanelBodyContext();
  const {
    closeAria,
    guestTutorLabel,
    onClose,
  } = useKangurAiTutorGuestIntroPanelContext();

  return (
    <div className='flex items-center justify-between gap-3'>
      <div className='flex min-w-0 items-center gap-2'>
        <KangurAiTutorChromeKicker>
          {guestTutorLabel}
        </KangurAiTutorChromeKicker>
        <KangurNarratorControl
          className='w-auto'
          contextRegistry={tutorNarratorContextRegistry}
          displayMode='icon'
          docId='kangur_ai_tutor_narrator'
          engine={narratorSettings.engine}
          pauseLabel={tutorContent.narrator.pauseLabel}
          readLabel={tutorContent.narrator.readLabel}
          renderWhenEmpty
          resumeLabel={tutorContent.narrator.resumeLabel}
          script={tutorNarrationScript}
          shellTestId='kangur-ai-tutor-narrator-guest-intro'
          showFeedback={false}
          voice={narratorSettings.voice}
        />
      </div>
      <KangurAiTutorChromeCloseButton
        data-testid='kangur-ai-tutor-guest-intro-close'
        onClick={onClose}
        aria-label={closeAria}
      />
    </div>
  );
}

function KangurAiTutorGuestIntroActionPill(): JSX.Element {
  const {
    isAnonymousVisitor,
    onAccept,
    onStartChat,
  } = useKangurAiTutorGuestIntroPanelContext();
  const tutorContent = useKangurAiTutorContent();
  const handlePrimaryAction = isAnonymousVisitor ? onStartChat : onAccept;

  return (
    <KangurButton
      type='button'
      size='sm'
      variant='surface'
      className='h-8 rounded-full px-4 text-[11px] shadow-[0_4px_10px_-8px_rgba(15,23,42,0.1)]'
      onClick={handlePrimaryAction}
    >
      {tutorContent.guestIntro.acceptLabel}
    </KangurButton>
  );
}

function KangurAiTutorGuestIntroChatInput(): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const {
    canSendMessages,
    drawingImageData,
    handleSend,
    isLoading,
    inputPlaceholder,
  } = useKangurAiTutorPanelBodyContext();
  const { inputRef, inputValue, setInputValue } = useKangurAiTutorWidgetStateContext();
  const { drawLabel, onDraw } = useKangurAiTutorGuestIntroPanelContext();
  const canSubmit = Boolean(inputValue.trim() || drawingImageData);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || isLoading || !canSendMessages) {
      return;
    }
    void handleSend();
  }, [canSubmit, canSendMessages, handleSend, isLoading]);

  return (
    <div className='mt-2'>
      <div className='flex items-center gap-2'>
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
            }}
            accent='amber'
            size='sm'
            className='w-full pr-11 shadow-[0_4px_12px_-8px_rgba(15,23,42,0.06)]'
            disabled={isLoading || !canSendMessages}
            placeholder={inputPlaceholder}
            aria-label={tutorContent.common.questionInputAria}
          />
          <KangurButton
            data-testid='kangur-ai-tutor-guest-intro-drawing'
            type='button'
            size='sm'
            variant='surface'
            className='absolute right-1 top-1/2 h-8 w-8 -translate-y-1/2 p-0'
            disabled={isLoading || !canSendMessages}
            onClick={onDraw}
            aria-label={drawLabel}
          >
            <Pen className='h-3.5 w-3.5' />
          </KangurButton>
        </div>
      </div>
    </div>
  );
}

export function KangurAiTutorGuestIntroPanel({
  guestIntroDescription,
  guestIntroHeadline,
  guestTutorLabel,
  isAnonymousVisitor,
  onAccept,
  onClose,
  onStartChat,
  panelStyle,
  prefersReducedMotion,
}: Props): JSX.Element | null {
  const tutorContent = useKangurAiTutorContent();
  const { guestAuthFormVisible, setDrawingImageData, guestIntroNarrationRootRef } =
    useKangurAiTutorWidgetStateContext();
  const { messages } = useKangurAiTutorPanelBodyContext();
  const introMessage = [guestIntroHeadline, guestIntroDescription]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join('\n\n');
  const shouldShowMessageList =
    messages.length > 0 || guestAuthFormVisible || introMessage.length > 0;
  const [isDrawingOpen, setIsDrawingOpen] = useState(false);
  const handleDrawOpen = () => setIsDrawingOpen(true);
  const handleDrawClose = () => setIsDrawingOpen(false);
  const handleDrawComplete = (dataUrl: string) => {
    setDrawingImageData(dataUrl);
    setIsDrawingOpen(false);
  };

  return (
    <KangurAiTutorGuestIntroPanelContext.Provider
      value={{
        closeAria: tutorContent.guestIntro.closeAria,
        guestTutorLabel,
        isAnonymousVisitor,
        onAccept,
        onClose,
        onStartChat,
        onDraw: handleDrawOpen,
        panelStyle,
        prefersReducedMotion,
        drawLabel: tutorContent.drawing?.toggleLabel ?? 'Rysuj',
      }}
    >
      <>
        <motion.button
          key='guest-intro-backdrop'
          data-testid='kangur-ai-tutor-guest-intro-backdrop'
          type='button'
          aria-label={tutorContent.guestIntro.closeAria}
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : undefined}
          onClick={onClose}
          className='fixed inset-0 z-[74] cursor-pointer border-0 bg-transparent p-0'
        />
        <motion.div
          data-kangur-ai-tutor-root='true'
          key='guest-intro'
          data-modal-actions='single-primary'
          data-modal-card='warm-glow-soft'
          data-modal-motion='fade-only'
          data-modal-surface='canonical-onboarding'
          data-testid='kangur-ai-tutor-guest-intro'
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : undefined}
          style={panelStyle}
          className='fixed z-[75]'
        >
          <KangurAiTutorWarmOverlayPanel
            tone='modal'
            padding='lg'
            className='flex min-h-0 max-h-[min(72vh,560px)] flex-col'
          >
            <div ref={guestIntroNarrationRootRef} className='flex min-h-0 flex-1 flex-col'>
              <KangurAiTutorGuestIntroHeader />
              {shouldShowMessageList ? (
                <div className='mt-3 flex min-h-0 flex-1 flex-col'>
                  <KangurAiTutorMessageList introMessage={introMessage} />
                </div>
              ) : null}
              <div className='mt-2 flex justify-start'>
                <KangurAiTutorGuestIntroActionPill />
              </div>
              <KangurAiTutorGuestIntroChatInput />
            </div>
          </KangurAiTutorWarmOverlayPanel>
        </motion.div>
        {isDrawingOpen ? (
          <>
            <motion.button
              key='guest-intro-drawing-backdrop'
              data-testid='kangur-ai-tutor-guest-intro-drawing-backdrop'
              type='button'
              aria-label={tutorContent.guestIntro.closeAria}
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : undefined}
              onClick={handleDrawClose}
              className='fixed inset-0 z-[76] cursor-pointer border-0 bg-transparent p-0'
            />
            <motion.div
              data-kangur-ai-tutor-root='true'
              key='guest-intro-drawing'
              data-modal-card='warm-glow-soft'
              data-modal-motion='fade-only'
              data-modal-surface='canonical-onboarding'
              data-testid='kangur-ai-tutor-guest-intro-drawing'
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
              transition={prefersReducedMotion ? { duration: 0 } : undefined}
              style={panelStyle}
              className='fixed z-[77]'
            >
              <KangurAiTutorWarmOverlayPanel
                tone='modal'
                padding='md'
              >
                <KangurAiTutorDrawingCanvas
                  onComplete={handleDrawComplete}
                  onCancel={handleDrawClose}
                />
              </KangurAiTutorWarmOverlayPanel>
            </motion.div>
          </>
        ) : null}
      </>
    </KangurAiTutorGuestIntroPanelContext.Provider>
  );
}
