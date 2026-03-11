'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { createContext, useContext } from 'react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton, KangurGlassPanel } from '@/features/kangur/ui/design/primitives';

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
        <div className='flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] text-amber-700'>
          <span className='inline-flex h-1.5 w-1.5 rounded-full bg-amber-500' />
          {guestTutorLabel}
        </div>
        <div className='mt-1.5 text-sm font-semibold leading-relaxed [color:var(--kangur-page-text)]'>
          {guestIntroHeadline}
        </div>
        <div className='mt-2 text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>
          {guestIntroDescription}
        </div>
      </div>
      <button
        data-testid='kangur-ai-tutor-guest-intro-close'
        type='button'
        onClick={onClose}
        className='shrink-0 cursor-pointer rounded-full border border-amber-200/80 p-1 text-amber-900 transition-[background-color,box-shadow,transform] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7)] hover:-translate-y-[1px] hover:scale-[1.03] hover:[background:var(--kangur-soft-card-background)] hover:shadow-[0_10px_20px_-14px_rgba(180,83,9,0.42)]'
        aria-label={closeAria}
      >
        <X className='h-3.5 w-3.5' />
      </button>
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
          <KangurGlassPanel
            surface='warmGlow'
            variant='soft'
            padding='lg'
            className='border-amber-200/60 shadow-[0_26px_60px_-34px_rgba(180,83,9,0.34),inset_0_1px_0_rgba(255,255,255,0.5)] [background:radial-gradient(circle_at_top,color-mix(in_srgb,var(--kangur-soft-card-background)_74%,#fef3c7),var(--kangur-soft-card-background)_44%,color-mix(in_srgb,var(--kangur-page-background)_80%,#eef2ff))]'
          >
            <KangurAiTutorGuestIntroHeader />
            <KangurAiTutorGuestIntroActions />
          </KangurGlassPanel>
        </motion.div>
      </>
    </KangurAiTutorGuestIntroPanelContext.Provider>
  );
}
