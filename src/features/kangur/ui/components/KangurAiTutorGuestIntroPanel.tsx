import { motion } from 'framer-motion';

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
  onStartChat: () => void;
  panelStyle: CSSProperties;
  prefersReducedMotion: boolean;
};

export function KangurAiTutorGuestIntroPanel({
  guestTutorLabel,
  isAnonymousVisitor,
  onAccept,
  onClose,
  onStartChat,
  panelStyle,
  prefersReducedMotion,
}: Props): JSX.Element | null {
  const handleYes = isAnonymousVisitor ? onStartChat : onAccept;

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
          className='flex flex-col gap-4'
        >
          <div className='flex items-center justify-between gap-3'>
            <KangurAiTutorChromeKicker>
              {guestTutorLabel}
            </KangurAiTutorChromeKicker>
            <KangurAiTutorChromeCloseButton
              data-testid='kangur-ai-tutor-guest-intro-close'
              onClick={onClose}
              aria-label='Zamknij'
            />
          </div>
          <p className='text-sm kangur-chat-text-primary'>
            Czy chcesz rozpocząć onboarding?
          </p>
          <div className='flex items-center gap-3'>
            <KangurButton
              type='button'
              size='sm'
              variant='surface'
              data-testid='kangur-ai-tutor-onboarding-accept'
              className='h-8 rounded-full px-5 text-[12px] font-medium'
              onClick={handleYes}
            >
              Tak
            </KangurButton>
            <KangurButton
              type='button'
              size='sm'
              variant='ghost'
              data-testid='kangur-ai-tutor-onboarding-dismiss'
              className='h-8 rounded-full px-5 text-[12px] font-medium'
              onClick={onClose}
            >
              Nie
            </KangurButton>
          </div>
        </KangurAiTutorWarmOverlayPanel>
      </motion.div>
    </>
  );
}
