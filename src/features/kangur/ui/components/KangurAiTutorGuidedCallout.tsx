'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { AnimatePresence, motion, type Transition } from 'framer-motion';

import { resolveKangurPageContentFragment } from '@/features/kangur/page-content-fragments';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton, KangurPanelRow } from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { KANGUR_PAGE_CONTENT_COLLECTION } from '@/features/kangur/shared/contracts/kangur-page-content';
import { cn } from '@/features/kangur/shared/utils';
import {
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

import {
  KangurAiTutorChromeBadge,
  KangurAiTutorChromeCloseButton,
  KangurAiTutorChromeKicker,
  KangurAiTutorWarmInsetCard,
  KangurAiTutorWarmOverlayPanel,
} from './KangurAiTutorChrome';
import { useKangurAiTutorPanelBodyContext } from './KangurAiTutorPanelBody.context';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type {
  TutorHorizontalSide,
  TutorReducedMotionStableTransitions,
} from './KangurAiTutorWidget.shared';
import type { GuidedTutorTarget } from './KangurAiTutorWidget.types';
import type { KangurAiTutorRuntimeMessage } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import type { CSSProperties, JSX } from 'react';

type Props = {
  avatarPlacement: 'top' | 'bottom' | 'left' | 'right' | null;
  calloutKey: string;
  calloutTestId: string;
  detail: string | null;
  entryDirection: TutorHorizontalSide;
  headerLabel: string;
  mode: 'auth' | 'home_onboarding' | 'section' | 'selection' | null;
  onAction: (
    action: 'advance_home_onboarding' | 'close' | 'finish_home_onboarding' | 'back_home_onboarding'
  ) => void;
  placement: string;
  prefersReducedMotion: boolean;
  reducedMotionTransitions: TutorReducedMotionStableTransitions;
  sectionGuidanceLabel: string | null;
  sectionResponsePendingKind: string | null;
  selectionPreview: string | null;
  shouldRender: boolean;
  showSectionGuidanceCallout: boolean;
  showSelectionGuidanceCallout: boolean;
  stepLabel: string | null;
  style: CSSProperties | null;
  title: string | null;
  transitionDuration: number;
  transitionEase: [number, number, number, number];
};

const GUIDED_CALLOUT_ENTRY_OFFSET_PX = 72;

const isSelectionGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'selection' }> => value?.mode === 'selection';

const isSectionGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'section' }> => value?.mode === 'section';

const getLatestAssistantMessage = (
  messages: KangurAiTutorRuntimeMessage[]
): KangurAiTutorRuntimeMessage | null =>
  [...messages].reverse().find((message) => message.role === 'assistant') ?? null;

export function KangurAiTutorGuidedCallout({
  avatarPlacement,
  calloutKey,
  calloutTestId,
  detail,
  entryDirection,
  headerLabel,
  mode,
  onAction,
  placement,
  prefersReducedMotion,
  reducedMotionTransitions,
  sectionGuidanceLabel,
  sectionResponsePendingKind,
  shouldRender,
  showSectionGuidanceCallout,
  showSelectionGuidanceCallout,
  stepLabel,
  style,
  title,
  transitionDuration,
  transitionEase,
}: Props): JSX.Element {
  const tutorContent = useKangurAiTutorContent();
  const isCoarsePointer = useKangurCoarsePointer();
  const calloutLabelId = useId();
  const calloutDescriptionId = useId();
  const {
    activeSelectedText,
    activeFocus,
    canSendMessages,
    drawingPanelAvailable,
    drawingPanelOpen,
    handleOpenDrawingPanel,
    handleQuickAction,
    handleToggleDrawing,
    isLoading,
    lastInteractionIntent,
    lastPromptMode,
    isSelectionExplainPendingMode,
    messages,
    sessionSurface,
    visibleQuickActions,
  } = useKangurAiTutorPanelBodyContext();
  const {
    guidedTutorTarget,
    homeOnboardingStepIndex,
    selectionConversationContext,
    selectionGuidanceHandoffText,
    selectionResponsePending,
  } = useKangurAiTutorWidgetStateContext();
  const usesDirectionalEntry = !showSelectionGuidanceCallout;
  const calloutTransition: Transition = prefersReducedMotion
    ? reducedMotionTransitions.instant
    : {
      duration: transitionDuration,
      ease: transitionEase,
    };
  const handleCloseCallout = (): void => onAction('close');
  const handleGoBackHomeOnboarding = (): void => onAction('back_home_onboarding');
  const handleFinishHomeOnboarding = (): void => onAction('finish_home_onboarding');
  const handleAdvanceHomeOnboarding = (): void => onAction('advance_home_onboarding');
  const resolvedSelectedText =
    selectionConversationContext?.selectedText ??
    selectionResponsePending?.selectedText ??
    selectionGuidanceHandoffText ??
    activeSelectedText ??
    (isSelectionGuidedTutorTarget(guidedTutorTarget) ? guidedTutorTarget.selectedText : null) ??
    null;
  const sectionLabel =
    sectionGuidanceLabel ??
    (isSectionGuidedTutorTarget(guidedTutorTarget)
      ? guidedTutorTarget.kind
      : sectionResponsePendingKind);
  const homeOnboardingCanGoBack = homeOnboardingStepIndex !== null && homeOnboardingStepIndex > 0;
  const selectionPreparingBadgeInsetClassName = cn(
    avatarPlacement === 'bottom' && 'mb-2',
    avatarPlacement === 'top' && 'mt-1',
    avatarPlacement === 'left' && 'ml-4',
    avatarPlacement === 'right' && 'mr-4'
  );
  const selectionKeepoutClassName = cn(
    showSelectionGuidanceCallout && avatarPlacement === 'bottom' && 'pb-2',
    showSelectionGuidanceCallout && avatarPlacement === 'top' && 'pt-2'
  );
  const isMobileHomeOnboardingSheet =
    mode === 'home_onboarding' && style?.bottom !== undefined && style?.top === undefined;
  const compactActionClassName = isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';
  const resolvedSelectedKnowledgeReference =
    selectionConversationContext?.knowledgeReference ??
    activeFocus.conversationFocus.knowledgeReference ??
    null;
  const resolvedSelectedKnowledgeLabel =
    selectionConversationContext?.focusLabel ?? activeFocus.conversationFocus.label ?? null;
  const selectedKnowledgeEntryId =
    resolvedSelectedKnowledgeReference?.sourceCollection === KANGUR_PAGE_CONTENT_COLLECTION
      ? resolvedSelectedKnowledgeReference.sourceRecordId
      : null;
  const { entry: selectedKnowledgeEntry } = useKangurPageContentEntry(selectedKnowledgeEntryId);
  const selectedKnowledgeFragment = useMemo(
    () =>
      selectedKnowledgeEntry
        ? resolveKangurPageContentFragment({
            entry: selectedKnowledgeEntry,
            knowledgeReference: resolvedSelectedKnowledgeReference,
            selectedText: resolvedSelectedText,
          })
        : null,
    [resolvedSelectedKnowledgeReference, resolvedSelectedText, selectedKnowledgeEntry]
  );
  const resolvedSelectionAssistantMessage = useMemo(
    () => (mode === 'selection' ? getLatestAssistantMessage(messages) : null),
    [messages, mode]
  );
  const isTestSurface =
    sessionSurface === 'test' || activeFocus.conversationFocus.surface === 'test';
  const hintQuickAction = useMemo(() => {
    const action = visibleQuickActions.find((candidate) => candidate.id === 'hint');
    if (action) {
      return action;
    }
    return {
      id: 'hint',
      label: tutorContent.quickActions.hint.defaultLabel,
      prompt: tutorContent.quickActions.hint.defaultPrompt,
      promptMode: 'hint' as const,
      interactionIntent: 'hint' as const,
    };
  }, [
    tutorContent.quickActions.hint.defaultLabel,
    tutorContent.quickActions.hint.defaultPrompt,
    visibleQuickActions,
  ]);
  const isResolvedSelectionCallout =
    mode === 'selection' &&
    showSelectionGuidanceCallout &&
    !isSelectionExplainPendingMode &&
    !isLoading &&
    resolvedSelectionAssistantMessage !== null;
  const shouldHideResolvedSelectionAnswer = isResolvedSelectionCallout && isTestSurface;
  const isHintResponseCandidate =
    resolvedSelectionAssistantMessage?.coachingFrame?.mode === 'hint_ladder' ||
    lastPromptMode === 'hint' ||
    lastInteractionIntent === 'hint';
  const shouldShowHintFollowUp =
    Boolean(hintQuickAction) &&
    isResolvedSelectionCallout &&
    (isHintResponseCandidate || shouldHideResolvedSelectionAnswer);
  const shouldShowSelectedKnowledgeReference =
    mode === 'selection' &&
    showSelectionGuidanceCallout &&
    !isTestSurface &&
    (
      resolvedSelectedKnowledgeReference?.sourceCollection === KANGUR_PAGE_CONTENT_COLLECTION ||
      resolvedSelectionAssistantMessage?.answerResolutionMode === 'page_content'
    );
  const selectedKnowledgeTitle =
    resolvedSelectedKnowledgeLabel ?? selectedKnowledgeEntry?.title ?? null;
  const selectedKnowledgeSummary =
    selectedKnowledgeFragment?.explanation ?? selectedKnowledgeEntry?.summary ?? null;
  const resolvedSelectionDetail =
    resolvedSelectionAssistantMessage?.answerResolutionMode === 'page_content'
      ? 'Wyjaśnienie korzysta z zapisanej treści strony dla tego zaznaczenia.'
      : isResolvedSelectionCallout
        ? 'Wyjaśnienie jest już gotowe dla zaznaczonego fragmentu.'
        : detail;
  const shouldShowSelectionIntro =
    !(mode === 'selection' && isResolvedSelectionCallout);
  const shouldShowSelectionDetail = Boolean(resolvedSelectionDetail);
  const shouldShowSelectionPageContentBadge =
    resolvedSelectionAssistantMessage?.answerResolutionMode === 'page_content' &&
    !shouldHideResolvedSelectionAnswer;
  const shouldShowSelectionPreparingBadge =
    mode === 'selection' && !isResolvedSelectionCallout && !shouldShowSelectedKnowledgeReference;
  const shouldAnnounceCallout =
    mode === 'selection' || mode === 'section' || mode === 'auth';
  const accessibleCalloutTitle = title ?? headerLabel;
  const accessibleCalloutDescription = [stepLabel, resolvedSelectionDetail]
    .filter((value): value is string => Boolean(value))
    .join(' ');
  const [showSketchHint, setShowSketchHint] = useState(false);
  const canOpenDrawingPanel = Boolean(drawingPanelAvailable);
  const shouldShowSketchCta =
    isResolvedSelectionCallout &&
    (Boolean(selectedKnowledgeSummary) || Boolean(resolvedSelectionAssistantMessage?.content));
  const shouldShowSketchHint = showSketchHint || drawingPanelOpen;

  useEffect(() => {
    setShowSketchHint(false);
  }, [calloutKey]);

  useEffect(() => {
    if (!shouldShowSketchCta) {
      setShowSketchHint(false);
    }
  }, [shouldShowSketchCta]);

  const handleSketchRequest = (): void => {
    setShowSketchHint(true);
    if (canOpenDrawingPanel) {
      handleOpenDrawingPanel();
      return;
    }
    handleToggleDrawing();
  };

  return (
    <AnimatePresence mode='wait'>
      {shouldRender && style ? (
        <motion.div
          data-kangur-ai-tutor-root='true'
          key={calloutKey}
          data-testid={calloutTestId}
          data-entry-direction={entryDirection}
          data-entry-animation={usesDirectionalEntry ? 'directional' : 'fade'}
          data-guidance-motion='gentle'
          data-guidance-placement={placement}
          initial={
            prefersReducedMotion
              ? { ...reducedMotionTransitions.stableState, x: 0 }
              : usesDirectionalEntry
                ? {
                  ...reducedMotionTransitions.stableState,
                  opacity: 0,
                  x:
                    entryDirection === 'left'
                      ? -GUIDED_CALLOUT_ENTRY_OFFSET_PX
                      : GUIDED_CALLOUT_ENTRY_OFFSET_PX,
                  scale: 0.98,
                }
                : {
                  ...reducedMotionTransitions.stableState,
                  opacity: 0,
                  x: 0,
                }
          }
          animate={{ ...reducedMotionTransitions.stableState, x: 0 }}
          exit={
            prefersReducedMotion
              ? { ...reducedMotionTransitions.stableState, x: 0 }
              : { opacity: 0 }
          }
          transition={
            calloutTransition
          }
          role='region'
          aria-live={shouldAnnounceCallout ? 'polite' : undefined}
          aria-atomic={shouldAnnounceCallout ? 'true' : undefined}
          aria-labelledby={calloutLabelId}
          aria-describedby={accessibleCalloutDescription ? calloutDescriptionId : undefined}
          style={style}
          className='z-[73]'
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
              isMobileHomeOnboardingSheet && '!p-3 shadow-[0_16px_40px_-28px_rgba(180,83,9,0.34),inset_0_1px_0_rgba(255,255,255,0.5)]',
              isResolvedSelectionCallout && 'max-h-[min(72vh,560px)] overflow-y-auto'
            )}
          >
            <div className={selectionKeepoutClassName}>
              <KangurPanelRow className='items-start sm:justify-between'>
                <KangurAiTutorChromeKicker>
                  {headerLabel}
                </KangurAiTutorChromeKicker>
                {!showSelectionGuidanceCallout || isResolvedSelectionCallout ? (
                  <KangurAiTutorChromeCloseButton
                    data-testid='kangur-ai-tutor-guided-callout-close'
                    onClick={handleCloseCallout}
                    aria-label={tutorContent.guidedCallout.closeAria}
                    className='self-start sm:self-auto'
                  />
                ) : null}
              </KangurPanelRow>
              {stepLabel ? (
                <div
                  className={cn(
                    'mt-1 text-[10px] font-semibold tracking-[0.16em] [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]',
                    isMobileHomeOnboardingSheet && 'mt-0.5'
                  )}
                >
                  {stepLabel}
                </div>
              ) : null}
              {shouldShowSelectionIntro ? (
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
              ) : null}
              {showSectionGuidanceCallout ? (
                <KangurAiTutorWarmInsetCard tone='guide' className='mt-3 px-3 py-2 text-xs leading-relaxed'>
                  {tutorContent.guidedCallout.sectionPrefix}: {sectionLabel}
                </KangurAiTutorWarmInsetCard>
              ) : null}
              {shouldShowSelectedKnowledgeReference ? (
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
                      {selectedKnowledgeFragment ? 'Fragment z bazy wiedzy' : 'Treść strony'}
                    </KangurAiTutorChromeBadge>
                  </div>
                  {selectedKnowledgeSummary ? (
                    <div className='mt-2 text-xs leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]'>
                      {selectedKnowledgeSummary}
                    </div>
                  ) : null}
                </KangurAiTutorWarmInsetCard>
              ) : null}
              {isResolvedSelectionCallout ? (
                <div className='mt-3 space-y-2'>
                  {!shouldHideResolvedSelectionAnswer ? (
                    <>
                      {shouldShowSelectionPageContentBadge ? (
                        <KangurAiTutorChromeBadge
                          data-testid='kangur-ai-tutor-selection-guided-page-content-badge'
                          className='w-fit max-w-full px-3 py-1 text-[10px]'
                        >
                          Zapisana treść strony
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
                  {shouldShowSketchCta ? (
                    <div
                      data-testid='kangur-ai-tutor-selection-sketch-cta'
                      className='soft-card kangur-chat-card kangur-chat-padding-md border kangur-chat-surface-warm kangur-chat-surface-warm-shadow'
                    >
                      <div className='flex flex-col items-start gap-2'>
                        <KangurButton
                          type='button'
                          size='sm'
                          variant='surface'
                          disabled={
                            isLoading || !canSendMessages || (drawingPanelOpen && canOpenDrawingPanel)
                          }
                          onClick={handleSketchRequest}
                        >
                          {tutorContent.guidedCallout.selectionSketchCtaLabel ?? 'Rozrysuj mi to, proszę'}
                        </KangurButton>
                        {shouldShowSketchHint ? (
                          <div className='text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]'>
                            {tutorContent.guidedCallout.selectionSketchHint ??
                              'Otwieram planszę do rysowania. Spróbuj rozrysować podziały i porównać kształty po obrocie lub odbiciu.'}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                  {shouldShowHintFollowUp ? (
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
                  ) : null}
                </div>
              ) : null}
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
                        onClick={handleGoBackHomeOnboarding}
                      >
                        {tutorContent.guidedCallout.buttons.back}
                      </KangurButton>
                    ) : null}
                    <KangurButton
                      type='button'
                      size='sm'
                      variant='surface'
                      className={compactActionClassName}
                      onClick={handleFinishHomeOnboarding}
                    >
                      {tutorContent.guidedCallout.buttons.finish}
                    </KangurButton>
                    <KangurButton
                      type='button'
                      size='sm'
                      variant='primary'
                      className={compactActionClassName}
                      onClick={handleAdvanceHomeOnboarding}
                    >
                      {tutorContent.guidedCallout.buttons.understand}
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
                      onClick={handleCloseCallout}
                    >
                      {tutorContent.guidedCallout.buttons.understand}
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
                    onClick={handleCloseCallout}
                  >
                    {tutorContent.guidedCallout.buttons.understand}
                  </KangurButton>
                )}
              </div>
            </div>
          </KangurAiTutorWarmOverlayPanel>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
