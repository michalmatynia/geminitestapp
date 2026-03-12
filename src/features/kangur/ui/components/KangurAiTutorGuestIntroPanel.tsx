'use client';

import { motion } from 'framer-motion';
import { createContext, useContext } from 'react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';

import {
  KangurAiTutorChromeCloseButton,
  KangurAiTutorChromeKicker,
  KangurAiTutorWarmOverlayPanel,
} from './KangurAiTutorChrome';

import type { CSSProperties, JSX } from 'react';

type Props = {
  guestIntroDescription: string;
  guestIntroHeadline: string;
  guestTutorLabel: string;
  isAnonymousVisitor: boolean;
  onAccept: () => void;
  onClose: () => void;
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
  panelStyle: CSSProperties;
  prefersReducedMotion: boolean;
  closeAria: string;
  acceptLabel: string;
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
    <div className='flex items-start justify-between gap-3'>
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
      />
    </div>
  );
}

function KangurAiTutorGuestIntroActions(): JSX.Element {
  const { acceptLabel, onAccept } = useKangurAiTutorGuestIntroPanelContext();

  return (
    <div className='mt-4 flex justify-end'>
      <KangurButton type='button' size='sm' variant='primary' onClick={onAccept}>
        {acceptLabel}
      </KangurButton>
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
  panelStyle,
  prefersReducedMotion,
}: Props): JSX.Element | null {
  const tutorContent = useKangurAiTutorContent();

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
        panelStyle,
        prefersReducedMotion,
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
          >
            <KangurAiTutorGuestIntroHeader />
            <KangurAiTutorGuestIntroActions />
          </KangurAiTutorWarmOverlayPanel>
        </motion.div>
      </>
    </KangurAiTutorGuestIntroPanelContext.Provider>
  );
}
