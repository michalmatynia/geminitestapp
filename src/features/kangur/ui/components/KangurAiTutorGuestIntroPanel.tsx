'use client';

import { useState } from 'react';

import {
  LazyMotionButton,
  LazyMotionDiv,
} from '@/features/kangur/ui/components/LazyAnimatePresence';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { cn } from '@/features/kangur/shared/utils';

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

type GuestIntroProposalActions = {
  onAccept: () => void;
  onDismiss: () => void;
};

type GuestIntroProposalProps = {
  guestTutorLabel: string;
  isCoarsePointer: boolean;
  actions: GuestIntroProposalActions;
};

type GuestIntroProposalActionButtonProps = {
  actionClassName: string;
  label: string;
  onClick: () => void;
  testId: string;
};

const resolveGuestIntroModalSurface = (shouldShowProposal: boolean): string =>
  shouldShowProposal ? 'canonical-onboarding' : 'canonical-chat';

const resolveGuestIntroMotionProps = (
  prefersReducedMotion: boolean
): {
  initial: { opacity: number };
  animate: { opacity: number };
  exit: { opacity: number };
  transition: { duration: number } | undefined;
} => ({
  initial: prefersReducedMotion ? { opacity: 1 } : { opacity: 0 },
  animate: { opacity: 1 },
  exit: prefersReducedMotion ? { opacity: 1 } : { opacity: 0 },
  transition: prefersReducedMotion ? { duration: 0 } : undefined,
});

const resolveGuestIntroActionClassName = (isCoarsePointer: boolean): string =>
  cn(
    'cursor-pointer transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/70 focus-visible:ring-offset-2 ring-offset-white [color:var(--kangur-chat-panel-text,var(--kangur-page-text))] hover:scale-[1.02]',
    isCoarsePointer && 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
  );

function GuestIntroProposalCopy({
  guestTutorLabel,
}: Pick<GuestIntroProposalProps, 'guestTutorLabel'>): JSX.Element {
  return (
    <p className='text-sm kangur-chat-text-primary'>
      Cześć,
      <br />
      Jestem {guestTutorLabel}.
      <br />
      Jak chcesz, mogę pokazać Ci, jak odnaleźć się na Stronie.
    </p>
  );
}

function GuestIntroProposalActionButton({
  actionClassName,
  label,
  onClick,
  testId,
}: GuestIntroProposalActionButtonProps): JSX.Element {
  return (
    <button type='button' data-testid={testId} className={actionClassName} onClick={onClick}>
      {label}
    </button>
  );
}

function GuestIntroProposal({
  guestTutorLabel,
  isCoarsePointer,
  actions,
}: GuestIntroProposalProps): JSX.Element {
  const { onAccept, onDismiss } = actions;
  const actionClassName = resolveGuestIntroActionClassName(isCoarsePointer);

  return (
    <>
      <GuestIntroProposalCopy guestTutorLabel={guestTutorLabel} />
      <div className='flex items-center kangur-panel-gap text-[12px] font-semibold'>
        <GuestIntroProposalActionButton
          actionClassName={actionClassName}
          label='Tak'
          onClick={onAccept}
          testId='kangur-ai-tutor-onboarding-accept'
        />
        <GuestIntroProposalActionButton
          actionClassName={actionClassName}
          label='Nie'
          onClick={onDismiss}
          testId='kangur-ai-tutor-onboarding-dismiss'
        />
      </div>
    </>
  );
}

function GuestIntroChatPrompt(): JSX.Element {
  return (
    <>
      <p
        data-testid='kangur-ai-tutor-minimal-prompt'
        className='text-sm kangur-chat-text-primary'
      >
        W czym mogę ci pomóc?
      </p>
      <KangurAiTutorComposer />
    </>
  );
}

function KangurAiTutorGuestIntroContent(props: {
  shouldShowProposal: boolean;
  guestTutorLabel: string;
  isCoarsePointer: boolean;
  onAccept: () => void;
  onDismiss: () => void;
}): JSX.Element {
  const { shouldShowProposal, guestTutorLabel, isCoarsePointer, onAccept, onDismiss } = props;

  if (shouldShowProposal) {
    return (
      <GuestIntroProposal
        guestTutorLabel={guestTutorLabel}
        isCoarsePointer={isCoarsePointer}
        actions={{ onAccept, onDismiss }}
      />
    );
  }

  return <GuestIntroChatPrompt />;
}

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
  const isCoarsePointer = useKangurCoarsePointer();
  const handleClose = onClose;
  const shouldShowProposal = isAnonymousVisitor && !dismissed;
  const motionProps = resolveGuestIntroMotionProps(prefersReducedMotion);
  const handleAccept = (): void => {
    setDismissed(true);
    if (isAnonymousVisitor) {
      onStartChat();
      return;
    }
    onAccept();
  };
  const handleDismiss = (): void => {
    setDismissed(true);
    onDismiss();
  };

  return (
    <>
      <LazyMotionButton
        key='guest-intro-backdrop'
        data-testid='kangur-ai-tutor-guest-intro-backdrop'
        type='button'
        aria-label='Zamknij'
        initial={motionProps.initial}
        animate={motionProps.animate}
        exit={motionProps.exit}
        transition={motionProps.transition}
        onClick={onClose}
        className='fixed inset-0 z-[74] cursor-pointer border-0 bg-transparent p-0 touch-manipulation active:opacity-95'
      />
      <LazyMotionDiv
        data-kangur-ai-tutor-root='true'
        key='guest-intro'
        data-modal-card='warm-glow-soft'
        data-modal-motion='fade-only'
        data-modal-surface={resolveGuestIntroModalSurface(shouldShowProposal)}
        data-testid='kangur-ai-tutor-guest-intro'
        initial={motionProps.initial}
        animate={motionProps.animate}
        exit={motionProps.exit}
        transition={motionProps.transition}
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
          <KangurAiTutorGuestIntroContent
            shouldShowProposal={shouldShowProposal}
            guestTutorLabel={guestTutorLabel}
            isCoarsePointer={isCoarsePointer}
            onAccept={handleAccept}
            onDismiss={handleDismiss}
          />
        </KangurAiTutorWarmOverlayPanel>
      </LazyMotionDiv>
    </>
  );
}
