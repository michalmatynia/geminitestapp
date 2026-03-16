'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';

import {
  KangurAiTutorChromeCloseButton,
  KangurAiTutorChromeKicker,
  KangurAiTutorWarmOverlayPanel,
} from './KangurAiTutorChrome';
import { KangurAiTutorComposer } from './KangurAiTutorComposer';

import type { CSSProperties, JSX } from 'react';

type Props = {
  guestIntroDescription: string;
  guestIntroHeadline: string;
  guestTutorLabel: string;
  isAnonymousVisitor: boolean;
  onAccept: () => void;
  onClose: () => void;
  onDismiss: () => void;
  onStartChat: () => void;
  panelStyle: CSSProperties;
  prefersReducedMotion: boolean;
};

export function KangurAiTutorGuestIntroPanel({
  guestTutorLabel,
  isAnonymousVisitor,
  onAccept,
  onClose,
  onDismiss,
  onStartChat,
  panelStyle,
  prefersReducedMotion,
}: Props): JSX.Element | null {
  const [dismissed, setDismissed] = useState(false);
  const handleClose = onClose;
  const shouldShowProposal = isAnonymousVisitor && !dismissed;
  const handleYes = (): void => {
    setDismissed(true);
    if (isAnonymousVisitor) {
      onStartChat();
    } else {
      onAccept();
    }
  };

  return (
    <>
      <motion.button
        key='guest-intro-backdrop'
        data-testid='kangur-ai-tutor-guest-intro-backdrop'
        type='button'
        aria-label='Zamknij'
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
        data-modal-card='warm-glow-soft'
        data-modal-motion='fade-only'
        data-modal-surface={shouldShowProposal ? 'canonical-onboarding' : 'canonical-chat'}
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
          className='flex kangur-max-h-screen-6 flex-col kangur-panel-gap overflow-y-auto'
        >
          <div className='flex items-center justify-between kangur-panel-gap'>
            <KangurAiTutorChromeKicker>
              {guestTutorLabel}
            </KangurAiTutorChromeKicker>
            <KangurAiTutorChromeCloseButton
              data-testid='kangur-ai-tutor-guest-intro-close'
              onClick={handleClose}
              aria-label='Zamknij'
            />
          </div>
          {shouldShowProposal ? (
            <>
              <p className='text-sm kangur-chat-text-primary'>
                Cześć,
                <br />
                Jestem {guestTutorLabel}.
                <br />
                Jak chcesz, mogę pokazać Ci, jak odnaleźć się na Stronie.
              </p>
              <div className='flex items-center kangur-panel-gap text-[12px] font-semibold'>
                <button
                  type='button'
                  data-testid='kangur-ai-tutor-onboarding-accept'
                  className='cursor-pointer transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white [color:var(--kangur-chat-panel-text,var(--kangur-page-text))] hover:scale-[1.02]'
                  onClick={handleYes}
                >
                  Tak
                </button>
                <button
                  type='button'
                  data-testid='kangur-ai-tutor-onboarding-dismiss'
                  className='cursor-pointer transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white [color:var(--kangur-chat-panel-text,var(--kangur-page-text))] hover:scale-[1.02]'
                  onClick={() => {
                    setDismissed(true);
                    onDismiss();
                  }}
                >
                  Nie
                </button>
              </div>
            </>
          ) : (
            <>
              <p
                data-testid='kangur-ai-tutor-minimal-prompt'
                className='text-sm kangur-chat-text-primary'
              >
                W czym mogę ci pomóc?
              </p>
              <KangurAiTutorComposer />
            </>
          )}
        </KangurAiTutorWarmOverlayPanel>
      </motion.div>
    </>
  );
}
