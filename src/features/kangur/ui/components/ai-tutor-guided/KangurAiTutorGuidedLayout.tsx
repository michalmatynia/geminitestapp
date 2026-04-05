'use client';

import { motion } from 'framer-motion';
import type { JSX } from 'react';

import { KangurButton, KangurPanelRow } from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

import {
  KangurAiTutorChromeBadge,
  KangurAiTutorChromeCloseButton,
  KangurAiTutorChromeKicker,
  KangurAiTutorWarmInsetCard,
  KangurAiTutorWarmOverlayPanel,
} from '../KangurAiTutorChrome';
import {
  resolveGuidedCalloutMotionProps,
} from './KangurAiTutorGuided.state';
import { useGuidedCalloutContext } from './KangurAiTutorGuided.context';

const resolveTutorGuidedFallback = (
  value: string | null | undefined,
  fallback: string
): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return fallback;
  }

  return value;
};

// --- Cards (previously cards.tsx) ---

export function KangurAiTutorGuidedCalloutSectionCard(): JSX.Element | null {
  const { tutorContent, guidedCallout, sectionLabel } = useGuidedCalloutContext();

  if (!guidedCallout.showSectionGuidanceCallout) {
    return null;
  }

  return (
    <KangurAiTutorWarmInsetCard tone='guide' className='mt-3 px-3 py-2 text-xs leading-relaxed'>
      {tutorContent.guidedCallout.sectionPrefix}: {sectionLabel}
    </KangurAiTutorWarmInsetCard>
  );
}

export function KangurAiTutorGuidedSelectionSourceCard(): JSX.Element | null {
  const { fallbackCopy, selectionState, selectionDisplayState } = useGuidedCalloutContext();
  const { selectedKnowledgeFragment } = selectionState;
  const { selectedKnowledgeSummary, selectedKnowledgeTitle, shouldShowSelectedKnowledgeReference } = selectionDisplayState;

  if (!shouldShowSelectedKnowledgeReference) {
    return null;
  }

  return (
    <KangurAiTutorWarmInsetCard
      data-testid='kangur-ai-tutor-selection-guided-source'
      tone='panel'
      className='mt-3 px-3 py-3'
    >
      <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
        {selectedKnowledgeTitle ? (
          <KangurAiTutorChromeBadge className='px-3 py-1 text-[10px] normal-case tracking-normal'>
            {selectedKnowledgeTitle}
          </KangurAiTutorChromeBadge>
        ) : null}
        <KangurAiTutorChromeBadge className='px-3 py-1 text-[10px]'>
          {selectedKnowledgeFragment
            ? fallbackCopy.knowledgeFragmentBadge
            : fallbackCopy.pageContentBadge}
        </KangurAiTutorChromeBadge>
      </div>
      {selectedKnowledgeSummary ? (
        <div className='mt-2 text-xs leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
          {selectedKnowledgeSummary}
        </div>
      ) : null}
    </KangurAiTutorWarmInsetCard>
  );
}

export function KangurAiTutorGuidedSelectionSketchCard(): JSX.Element | null {
  const {
    tutorContent,
    fallbackCopy,
    sketchState,
    selectionDisplayState,
    panelBody,
  } = useGuidedCalloutContext();

  const { canOpenDrawingPanel, handleSketchRequest, shouldShowSketchHint } = sketchState;
  const { isResolvedSelectionCallout, selectedKnowledgeSummary } = selectionDisplayState;
  const { canSendMessages, drawingPanelOpen, isLoading } = panelBody;

  const shouldShow = isResolvedSelectionCallout && (
    Boolean(selectedKnowledgeSummary) ||
    Boolean(useGuidedCalloutContext().selectionState.resolvedSelectionAssistantMessage?.content)
  );

  if (!shouldShow) {
    return null;
  }

  return (
    <div
      data-testid='kangur-ai-tutor-selection-sketch-cta'
      className='soft-card kangur-chat-card kangur-chat-padding-md border kangur-chat-surface-warm kangur-chat-surface-warm-shadow'
    >
      <div className='flex flex-col items-start gap-2'>
        <KangurButton
          type='button'
          size='sm'
          variant='surface'
          disabled={isLoading || !canSendMessages || (drawingPanelOpen && canOpenDrawingPanel)}
          onClick={handleSketchRequest}
        >
          {resolveTutorGuidedFallback(
            tutorContent.guidedCallout.selectionSketchCtaLabel,
            fallbackCopy.selectionSketchCtaLabel
          )}
        </KangurButton>
        {shouldShowSketchHint ? (
          <div className='text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
            {resolveTutorGuidedFallback(
              tutorContent.guidedCallout.selectionSketchHint,
              fallbackCopy.selectionSketchHint
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function KangurAiTutorGuidedSelectionHintCard(): JSX.Element | null {
  const {
    tutorContent,
    layoutState,
    selectionDisplayState,
    selectionState,
    panelBody,
  } = useGuidedCalloutContext();

  const { compactActionClassName } = layoutState;
  const { shouldShowHintFollowUp } = selectionDisplayState;
  const { hintQuickAction } = selectionState;
  const { canSendMessages, handleQuickAction, isLoading } = panelBody;

  if (!shouldShowHintFollowUp) {
    return null;
  }

  return (
    <div
      data-testid='kangur-ai-tutor-selection-hint-followup'
      className='soft-card kangur-chat-card kangur-chat-padding-md border kangur-chat-surface-warm kangur-chat-surface-warm-shadow'
    >
      <div className='text-xs font-medium leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
        {tutorContent.messageList.hintFollowUpQuestion}
      </div>
      <div className='mt-2'>
        <KangurButton
          data-testid='kangur-ai-tutor-selection-hint-followup-cta'
          type='button'
          className={compactActionClassName}
          size='sm'
          variant='primary'
          disabled={isLoading || !canSendMessages}
          onClick={() => void handleQuickAction(hintQuickAction)}
        >
          {tutorContent.messageList.hintFollowUpActionLabel}
        </KangurButton>
      </div>
    </div>
  );
}

export function KangurAiTutorGuidedSelectionResolvedContent(): JSX.Element {
  const {
    fallbackCopy,
    selectionState,
    selectionDisplayState,
  } = useGuidedCalloutContext();

  const { resolvedSelectionAssistantMessage } = selectionState;
  const { shouldHideResolvedSelectionAnswer, shouldShowSelectionPageContentBadge } = selectionDisplayState;

  return (
    <div className='mt-3 space-y-2'>
      {!shouldHideResolvedSelectionAnswer ? (
        <>
          {shouldShowSelectionPageContentBadge ? (
            <KangurAiTutorChromeBadge
              data-testid='kangur-ai-tutor-selection-guided-page-content-badge'
              className='w-fit max-w-full px-3 py-1 text-[10px]'
            >
              {fallbackCopy.savedPageContentBadge}
            </KangurAiTutorChromeBadge>
          ) : null}
          <KangurAiTutorWarmInsetCard
            data-testid='kangur-ai-tutor-selection-guided-answer'
            tone='panel'
            className='px-3 py-3 text-sm leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'
          >
            {resolvedSelectionAssistantMessage?.content}
          </KangurAiTutorWarmInsetCard>
        </>
      ) : null}
      <KangurAiTutorGuidedSelectionSketchCard />
      <KangurAiTutorGuidedSelectionHintCard />
    </div>
  );
}

// --- Layout Components ---

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
