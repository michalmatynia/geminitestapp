'use client';

import { Send } from 'lucide-react';
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
  guestIntroDescription: string;
  guestIntroHeadline: string;
  guestTutorLabel: string;
  isAnonymousVisitor: boolean;
  onAccept: () => void;
  onClose: () => void;
  onDraw: () => void;
  onStartChat: () => void;
  panelStyle: CSSProperties;
  prefersReducedMotion: boolean;
  closeAria: string;
  acceptLabel: string;
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
  const {
    closeAria,
    guestIntroDescription,
    guestIntroHeadline,
    guestTutorLabel,
    onClose,
  } = useKangurAiTutorGuestIntroPanelContext();

  return (
    <div className='flex flex-col items-start gap-3 sm:flex-row sm:justify-between'>
      <div className='min-w-0'>
        <KangurAiTutorChromeKicker>
          {guestTutorLabel}
        </KangurAiTutorChromeKicker>
        <div className='mt-1.5 text-sm font-semibold leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
          {guestIntroHeadline}
        </div>
        <div className='mt-2 text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
          {guestIntroDescription}
        </div>
      </div>
      <KangurAiTutorChromeCloseButton
        data-testid='kangur-ai-tutor-guest-intro-close'
        onClick={onClose}
        aria-label={closeAria}
        className='self-start sm:self-auto'
      />
    </div>
  );
}

function KangurAiTutorGuestIntroActions(): JSX.Element {
  const {
    acceptLabel,
    drawLabel,
    isAnonymousVisitor,
    onAccept,
    onDraw,
    onStartChat,
  } = useKangurAiTutorGuestIntroPanelContext();
  const handlePrimaryAction = isAnonymousVisitor ? onStartChat : onAccept;

  return (
    <div className='mt-4 flex flex-col justify-stretch gap-2 sm:flex-row sm:justify-end'>
      <KangurButton
        data-testid='kangur-ai-tutor-guest-intro-drawing'
        type='button'
        size='sm'
        variant='surface'
        className='w-full sm:w-auto'
        onClick={onDraw}
      >
        {drawLabel}
      </KangurButton>
      <KangurButton
        type='button'
        size='sm'
        variant='primary'
        className='w-full sm:w-auto'
        onClick={handlePrimaryAction}
      >
        {acceptLabel}
      </KangurButton>
    </div>
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
  const canSubmit = Boolean(inputValue.trim() || drawingImageData);

  const handleSubmit = useCallback(() => {
    if (!canSubmit || isLoading || !canSendMessages) {
      return;
    }
    void handleSend();
  }, [canSubmit, canSendMessages, handleSend, isLoading]);

  return (
    <div className='mt-4'>
      <div className='flex items-center gap-2'>
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
          className='flex-1 shadow-[0_4px_12px_-8px_rgba(15,23,42,0.06)]'
          disabled={isLoading || !canSendMessages}
          placeholder={inputPlaceholder}
          aria-label={tutorContent.common.questionInputAria}
        />
        <KangurButton
          type='button'
          size='sm'
          variant='primary'
          className='kangur-chat-send-shadow'
          onClick={handleSubmit}
          disabled={!canSubmit || isLoading || !canSendMessages}
          aria-label={tutorContent.common.sendAria}
        >
          <Send className='h-3.5 w-3.5' />
        </KangurButton>
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
  const { setDrawingImageData } = useKangurAiTutorWidgetStateContext();
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
        acceptLabel: tutorContent.guestIntro.acceptLabel,
        guestIntroDescription,
        guestIntroHeadline,
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
            <KangurAiTutorGuestIntroHeader />
            <div className='mt-4 flex min-h-0 flex-1 flex-col'>
              <KangurAiTutorMessageList />
            </div>
            <KangurAiTutorGuestIntroChatInput />
            <KangurAiTutorGuestIntroActions />
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
