'use client';

import { motion } from 'framer-motion';

import { KangurButton, KangurPanelRow } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_TIGHT_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

import {
  KangurAiTutorChromeBadge,
  KangurAiTutorChromeCloseButton,
  KangurAiTutorChromeKicker,
  KangurAiTutorWarmOverlayPanel,
} from '../KangurAiTutorChrome';

import type { CSSProperties, JSX } from 'react';

import {
  resolveGuidedCalloutMotionProps,
} from './KangurAiTutorGuided.state';
import { useGuidedCalloutContext } from './KangurAiTutorGuided.context';
import {
  KangurAiTutorGuidedCalloutSectionCard,
  KangurAiTutorGuidedSelectionResolvedContent,
  KangurAiTutorGuidedSelectionSourceCard,
} from './KangurAiTutorGuidedCards';

type GuidedButtons = {
  back: string;
  finish: string;
  understand: string;
};

type GuidedTutorContent = {
  guidedCallout: {
    buttons: GuidedButtons;
    closeAria: string;
    sectionPrefix: string;
    selectionSketchCtaLabel?: string | null;
    selectionSketchHint?: string | null;
    selectionPreparingBadge: string;
  };
  messageList: {
    hintFollowUpActionLabel: string;
    hintFollowUpQuestion: string;
  };
};

type GuidedCalloutStateLike = {
  entryDirection: string | null;
  headerLabel: string | null;
  mode: string | null;
  placement: string | null;
  reducedMotionTransitions: {
    instant: Record<string, unknown>;
    stableState: Record<string, unknown>;
  };
  showSectionGuidanceCallout: boolean;
  showSelectionGuidanceCallout: boolean;
  stepLabel: string | null;
  style: CSSProperties | null;
  title: string | null | undefined;
  transitionEase: unknown;
};

export function KangurAiTutorGuidedCalloutShell({
  children,
}: {
  children: JSX.Element;
}): JSX.Element {
  const {
    calloutDescriptionId,
    calloutLabelId,
    layoutState,
    selectionDisplayState,
    usesDirectionalEntry,
    guidedCallout,
  } = useGuidedCalloutContext();

  const {
    accessibleCalloutDescription,
    accessibleCalloutTitle,
    isMobileHomeOnboardingSheet,
    shouldAnnounceCallout,
  } = layoutState;

  const {
    calloutKey,
    calloutTestId,
    entryDirection,
    placement,
    prefersReducedMotion,
    reducedMotionTransitions,
    style,
    transitionDuration,
    transitionEase,
  } = guidedCallout;

  const motionProps = resolveGuidedCalloutMotionProps({
    entryDirection,
    prefersReducedMotion,
    reducedMotionTransitions,
    transitionDuration,
    transitionEase,
    usesDirectionalEntry,
  });

  return (
    <motion.div
      data-kangur-ai-tutor-root='true'
      key={calloutKey}
      data-testid={calloutTestId}
      data-entry-direction={entryDirection}
      data-entry-animation={usesDirectionalEntry ? 'directional' : 'fade'}
      data-guidance-motion='gentle'
      data-guidance-placement={placement}
      role='region'
      aria-live={shouldAnnounceCallout ? 'polite' : undefined}
      aria-atomic={shouldAnnounceCallout ? 'true' : undefined}
      aria-labelledby={calloutLabelId}
      aria-describedby={accessibleCalloutDescription ? calloutDescriptionId : undefined}
      style={style ?? undefined}
      className='z-[73]'
      {...motionProps}
    >
      <h2 id={calloutLabelId} className='sr-only'>
        {accessibleCalloutTitle}
      </h2>
      {accessibleCalloutDescription ? (
        <p id={calloutDescriptionId} className='sr-only'>
          {accessibleCalloutDescription}
        </p>
      ) : null}
      <KangurAiTutorWarmOverlayPanel
        padding='md'
        className={cn(
          isMobileHomeOnboardingSheet &&
            '!p-3 shadow-[0_16px_40px_-28px_rgba(180,83,9,0.34),inset_0_1px_0_rgba(255,255,255,0.5)]',
          selectionDisplayState.isResolvedSelectionCallout && 'max-h-[min(72vh,560px)] overflow-y-auto'
        )}
      >
        {children}
      </KangurAiTutorWarmOverlayPanel>
    </motion.div>
  );
}

export function KangurAiTutorGuidedCalloutHeader(): JSX.Element {
  const {
    tutorContent,
    guidedCallout,
    selectionDisplayState,
  } = useGuidedCalloutContext();

  const { headerLabel, onClose, showSelectionGuidanceCallout } = guidedCallout;
  const { isResolvedSelectionCallout } = selectionDisplayState;

  return (
    <KangurPanelRow className='items-start sm:justify-between'>
      <KangurAiTutorChromeKicker>{headerLabel ?? ''}</KangurAiTutorChromeKicker>
      {!showSelectionGuidanceCallout || isResolvedSelectionCallout ? (
        <KangurAiTutorChromeCloseButton
          data-testid='kangur-ai-tutor-guided-callout-close'
          onClick={onClose}
          aria-label={tutorContent.guidedCallout.closeAria}
          className='self-start sm:self-auto'
        />
      ) : null}
    </KangurPanelRow>
  );
}

export function KangurAiTutorGuidedCalloutStepLabel(): JSX.Element | null {
  const { layoutState, guidedCallout } = useGuidedCalloutContext();
  const { isMobileHomeOnboardingSheet } = layoutState;
  const { stepLabel } = guidedCallout;

  if (!stepLabel) {
    return null;
  }

  return (
    <div
      className={cn(
        'mt-1 text-[10px] font-semibold tracking-[0.16em] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]',
        isMobileHomeOnboardingSheet && 'mt-0.5'
      )}
    >
      {stepLabel}
    </div>
  );
}

export function KangurAiTutorGuidedCalloutIntro(): JSX.Element | null {
  const { layoutState, selectionDisplayState, guidedCallout } = useGuidedCalloutContext();
  const { isMobileHomeOnboardingSheet } = layoutState;
  const { resolvedSelectionDetail, shouldShowSelectionDetail, shouldShowSelectionIntro } = selectionDisplayState;
  const { title } = guidedCallout;

  if (!shouldShowSelectionIntro) {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          'mt-1 text-sm font-semibold leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
          isMobileHomeOnboardingSheet && 'text-[13px] leading-6'
        )}
      >
        {title}
      </div>
      {shouldShowSelectionDetail ? (
        <div
          className={cn(
            'mt-2 text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]',
            isMobileHomeOnboardingSheet && 'mt-1.5 line-clamp-3 text-[11px] leading-5'
          )}
        >
          {resolvedSelectionDetail}
        </div>
      ) : null}
    </>
  );
}

export function KangurAiTutorGuidedCalloutActions(): JSX.Element {
  const {
    tutorContent,
    layoutState,
    selectionDisplayState,
    guidedCallout,
    homeOnboardingCanGoBack,
  } = useGuidedCalloutContext();

  const { buttons } = tutorContent.guidedCallout;
  const { compactActionClassName, isMobileHomeOnboardingSheet, selectionPreparingBadgeInsetClassName } = layoutState;
  const { isResolvedSelectionCallout, shouldHideResolvedSelectionAnswer, shouldShowSelectionPreparingBadge } = selectionDisplayState;
  const { mode, onAdvanceHomeOnboarding, onBackHomeOnboarding, onClose, onFinishHomeOnboarding } = guidedCallout;

  return (
    <div
      className={cn(
        'mt-3',
        KANGUR_TIGHT_ROW_CLASSNAME,
        'sm:flex-wrap sm:justify-end',
        isMobileHomeOnboardingSheet && 'mt-2'
      )}
    >
      {mode === 'home_onboarding' ? (
        <>
          {homeOnboardingCanGoBack ? (
            <KangurButton
              type='button'
              size='sm'
              variant='surface'
              className={compactActionClassName}
              onClick={onBackHomeOnboarding}
            >
              {buttons.back}
            </KangurButton>
          ) : null}
          <KangurButton
            type='button'
            size='sm'
            variant='surface'
            className={compactActionClassName}
            onClick={onFinishHomeOnboarding}
          >
            {buttons.finish}
          </KangurButton>
          <KangurButton
            type='button'
            size='sm'
            variant='primary'
            className={compactActionClassName}
            onClick={onAdvanceHomeOnboarding}
          >
            {buttons.understand}
          </KangurButton>
        </>
      ) : mode === 'selection' ? (
        isResolvedSelectionCallout ? (
          shouldHideResolvedSelectionAnswer ? null : (
            <KangurButton
              type='button'
              size='sm'
              variant='surface'
              className={compactActionClassName}
              onClick={onClose}
            >
              {buttons.understand}
            </KangurButton>
          )
        ) : shouldShowSelectionPreparingBadge ? (
          <KangurAiTutorChromeBadge
            className={cn(
              'w-fit max-w-full self-start px-3 py-1 text-[11px] normal-case tracking-normal [color:var(--kangur-chat-control-text,var(--kangur-chat-panel-text,var(--kangur-page-text)))] [border-color:var(--kangur-chat-control-border,var(--kangur-chat-chip-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7))] sm:self-auto',
              selectionPreparingBadgeInsetClassName
            )}
          >
            {tutorContent.guidedCallout.selectionPreparingBadge}
          </KangurAiTutorChromeBadge>
        ) : null
      ) : (
        <KangurButton
          type='button'
          size='sm'
          variant='surface'
          className={compactActionClassName}
          onClick={onClose}
        >
          {buttons.understand}
        </KangurButton>
      )}
    </div>
  );
}

export function KangurAiTutorGuidedCalloutBody(): JSX.Element {
  const {
    layoutState,
    selectionDisplayState,
  } = useGuidedCalloutContext();

  return (
    <div className={layoutState.selectionKeepoutClassName}>
      <KangurAiTutorGuidedCalloutHeader />
      <KangurAiTutorGuidedCalloutStepLabel />
      <KangurAiTutorGuidedCalloutIntro />
      <KangurAiTutorGuidedCalloutSectionCard />
      <KangurAiTutorGuidedSelectionSourceCard />
      {selectionDisplayState.isResolvedSelectionCallout ? (
        <KangurAiTutorGuidedSelectionResolvedContent />
      ) : null}
      <KangurAiTutorGuidedCalloutActions />
    </div>
  );
}
