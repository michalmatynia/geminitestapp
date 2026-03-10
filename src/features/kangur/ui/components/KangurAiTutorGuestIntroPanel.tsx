'use client';

import { createContext, useContext } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

import { KangurButton, KangurGlassPanel } from '@/features/kangur/ui/design/primitives';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';

import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type { CSSProperties, JSX } from 'react';

type Props = {
  guestIntroDescription: string;
  guestIntroHeadline: string;
  guestTutorLabel: string;
  isAnonymousVisitor: boolean;
  onAccept: () => void;
  onClose: () => void;
  onCreateAccount: () => void;
  onDismiss: () => void;
  onHelpClose: () => void;
  onLogin: () => void;
  panelStyle: CSSProperties;
  prefersReducedMotion: boolean;
};

type KangurAiTutorGuestIntroPanelContextValue = Props & {
  guestIntroHelpVisible: boolean;
  closeAria: string;
  showLoginLabel: string;
  showCreateAccountLabel: string;
  browseLabel: string;
  acceptLabel: string;
  dismissLabel: string;
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
        <div className='text-[10px] font-semibold tracking-[0.16em] text-amber-700'>
          {guestTutorLabel}
        </div>
        <div className='mt-1 text-sm font-semibold leading-relaxed text-slate-900'>
          {guestIntroHeadline}
        </div>
        <div className='mt-2 text-xs leading-relaxed text-slate-600'>{guestIntroDescription}</div>
      </div>
      <button
        data-testid='kangur-ai-tutor-guest-intro-close'
        type='button'
        onClick={onClose}
        className='shrink-0 rounded-full border border-amber-200/80 bg-white/80 p-1 text-amber-900 transition-colors hover:bg-white'
        aria-label={closeAria}
      >
        <X className='h-3.5 w-3.5' />
      </button>
    </div>
  );
}

function KangurAiTutorGuestIntroActions(): JSX.Element {
  const { acceptLabel, dismissLabel, onAccept, onDismiss } =
    useKangurAiTutorGuestIntroPanelContext();

  return (
    <div className='mt-4 flex flex-wrap gap-2'>
      <KangurButton type='button' size='sm' variant='primary' onClick={onAccept}>
        {acceptLabel}
      </KangurButton>
      <KangurButton type='button' size='sm' variant='surface' onClick={onDismiss}>
        {dismissLabel}
      </KangurButton>
    </div>
  );
}

function KangurAiTutorGuestHelpActions(): JSX.Element {
  const {
    browseLabel,
    onCreateAccount,
    onHelpClose,
    onLogin,
    showCreateAccountLabel,
    showLoginLabel,
  } = useKangurAiTutorGuestIntroPanelContext();

  return (
    <div className='mt-4 flex flex-wrap gap-2'>
      <KangurButton type='button' size='sm' variant='primary' onClick={onLogin}>
        {showLoginLabel}
      </KangurButton>
      <KangurButton type='button' size='sm' variant='surface' onClick={onCreateAccount}>
        {showCreateAccountLabel}
      </KangurButton>
      <KangurButton type='button' size='sm' variant='surface' onClick={onHelpClose}>
        {browseLabel}
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
  onCreateAccount,
  onDismiss,
  onHelpClose,
  onLogin,
  panelStyle,
  prefersReducedMotion,
}: Props): JSX.Element | null {
  const tutorContent = useKangurAiTutorContent();
  const { guestIntroHelpVisible } = useKangurAiTutorWidgetStateContext();

  if (!isAnonymousVisitor) {
    return null;
  }

  return (
    <KangurAiTutorGuestIntroPanelContext.Provider
      value={{
        browseLabel: tutorContent.guestIntro.browseLabel,
        closeAria: tutorContent.guestIntro.closeAria,
        dismissLabel: tutorContent.guestIntro.dismissLabel,
        acceptLabel: tutorContent.guestIntro.acceptLabel,
        guestIntroDescription,
        guestIntroHeadline,
        guestIntroHelpVisible,
        guestTutorLabel,
        isAnonymousVisitor,
        onAccept,
        onClose,
        onCreateAccount,
        onDismiss,
        onHelpClose,
        onLogin,
        panelStyle,
        prefersReducedMotion,
        showCreateAccountLabel: tutorContent.guestIntro.showCreateAccountLabel,
        showLoginLabel: tutorContent.guestIntro.showLoginLabel,
      }}
    >
      <motion.div
        key={guestIntroHelpVisible ? 'guest-help' : 'guest-intro'}
        data-testid={
          guestIntroHelpVisible
            ? 'kangur-ai-tutor-guest-assistance'
            : 'kangur-ai-tutor-guest-intro'
        }
        initial={
          prefersReducedMotion
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 8, scale: 0.98 }
        }
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={
          prefersReducedMotion
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 8, scale: 0.98 }
        }
        transition={prefersReducedMotion ? { duration: 0 } : undefined}
        style={panelStyle}
        className='fixed z-[75]'
      >
        <KangurGlassPanel
          surface='warmGlow'
          variant='soft'
          padding='lg'
          className='border-amber-200/80 shadow-[0_26px_60px_-34px_rgba(180,83,9,0.38)]'
        >
          <KangurAiTutorGuestIntroHeader />
          {guestIntroHelpVisible ? (
            <KangurAiTutorGuestHelpActions />
          ) : (
            <KangurAiTutorGuestIntroActions />
          )}
        </KangurGlassPanel>
      </motion.div>
    </KangurAiTutorGuestIntroPanelContext.Provider>
  );
}
