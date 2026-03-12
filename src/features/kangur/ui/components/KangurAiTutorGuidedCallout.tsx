'use client';

import { AnimatePresence, motion, type Transition } from 'framer-motion';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton } from '@/features/kangur/ui/design/primitives';
import { cn } from '@/shared/utils';

import {
  KangurAiTutorChromeBadge,
  KangurAiTutorChromeCloseButton,
  KangurAiTutorChromeKicker,
  KangurAiTutorWarmInsetCard,
  KangurAiTutorWarmOverlayPanel,
} from './KangurAiTutorChrome';
import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type { TutorHorizontalSide } from './KangurAiTutorWidget.shared';
import type { GuidedTutorTarget } from './KangurAiTutorWidget.types';
import type { CSSProperties, JSX } from 'react';

type ReducedMotionTransitions = {
  instant: {
    duration: number;
  };
  stableState: {
    opacity: number;
    scale: number;
    y: number;
  };
};

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
  reducedMotionTransitions: ReducedMotionTransitions;
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
  selectionPreview,
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
  const { guidedTutorTarget, homeOnboardingStepIndex } = useKangurAiTutorWidgetStateContext();
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

  const selectionPreviewHasOverflow = Boolean(
    selectionPreview &&
      isSelectionGuidedTutorTarget(guidedTutorTarget) &&
      guidedTutorTarget.selectedText.length > selectionPreview.length
  );
  const sectionLabel =
    sectionGuidanceLabel ??
    (isSectionGuidedTutorTarget(guidedTutorTarget)
      ? guidedTutorTarget.kind
      : sectionResponsePendingKind);
  const homeOnboardingCanGoBack = homeOnboardingStepIndex !== null && homeOnboardingStepIndex > 0;
  const selectionPreviewInsetClassName = cn(
    avatarPlacement === 'bottom' && 'mb-4',
    avatarPlacement === 'top' && 'mt-2',
    avatarPlacement === 'left' && 'ml-5',
    avatarPlacement === 'right' && 'mr-5'
  );
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
          style={style}
          className='z-[73]'
        >
          <KangurAiTutorWarmOverlayPanel
            padding='md'
            className={cn(
              isMobileHomeOnboardingSheet && '!p-3 shadow-[0_16px_40px_-28px_rgba(180,83,9,0.34),inset_0_1px_0_rgba(255,255,255,0.5)]'
            )}
          >
            <div className={selectionKeepoutClassName}>
              <div className='flex items-start justify-between gap-3'>
                <KangurAiTutorChromeKicker>
                  {headerLabel}
                </KangurAiTutorChromeKicker>
                {!showSelectionGuidanceCallout ? (
                  <KangurAiTutorChromeCloseButton
                    data-testid='kangur-ai-tutor-guided-callout-close'
                    onClick={handleCloseCallout}
                    aria-label={tutorContent.guidedCallout.closeAria}
                  />
                ) : null}
              </div>
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
              <div
                className={cn(
                  'mt-1 text-sm font-semibold leading-relaxed [color:var(--kangur-chat-panel-text,var(--kangur-page-text))]',
                  isMobileHomeOnboardingSheet && 'text-[13px] leading-6'
                )}
              >
                {title}
              </div>
              <div
                className={cn(
                  'mt-2 text-xs leading-relaxed [color:var(--kangur-chat-muted-text,var(--kangur-page-muted-text))]',
                  isMobileHomeOnboardingSheet && 'mt-1.5 line-clamp-3 text-[11px] leading-5'
                )}
              >
                {detail}
              </div>
              {selectionPreview ? (
                <KangurAiTutorWarmInsetCard
                  data-testid='kangur-ai-tutor-selection-preview'
                  data-avatar-avoid-edge={avatarPlacement ?? 'none'}
                  tone='guide'
                  className={cn(
                    'mt-3 px-3 py-2 text-xs italic leading-relaxed',
                    selectionPreviewInsetClassName
                  )}
                >
                  „{selectionPreview}”
                  {selectionPreviewHasOverflow ? '…' : ''}
                </KangurAiTutorWarmInsetCard>
              ) : showSectionGuidanceCallout ? (
                <KangurAiTutorWarmInsetCard tone='guide' className='mt-3 px-3 py-2 text-xs leading-relaxed'>
                  {tutorContent.guidedCallout.sectionPrefix}: {sectionLabel}
                </KangurAiTutorWarmInsetCard>
              ) : null}
              <div
                className={cn(
                  'mt-3 flex flex-wrap justify-end gap-2',
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
                        onClick={handleGoBackHomeOnboarding}
                      >
                        {tutorContent.guidedCallout.buttons.back}
                      </KangurButton>
                    ) : null}
                    <KangurButton
                      type='button'
                      size='sm'
                      variant='surface'
                      onClick={handleFinishHomeOnboarding}
                    >
                      {tutorContent.guidedCallout.buttons.finish}
                    </KangurButton>
                    <KangurButton
                      type='button'
                      size='sm'
                      variant='primary'
                      onClick={handleAdvanceHomeOnboarding}
                    >
                      {tutorContent.guidedCallout.buttons.understand}
                    </KangurButton>
                  </>
                ) : mode === 'selection' ? (
                  <KangurAiTutorChromeBadge
                    className={cn(
                      'px-3 py-1 text-[11px] normal-case tracking-normal text-amber-800 [border-color:var(--kangur-chat-control-border,var(--kangur-chat-chip-border,var(--kangur-chat-panel-border,rgba(253,186,116,0.52))))] [background:var(--kangur-chat-control-background,color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7))]',
                      selectionPreparingBadgeInsetClassName
                    )}
                  >
                    {tutorContent.guidedCallout.selectionPreparingBadge}
                  </KangurAiTutorChromeBadge>
                ) : (
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='surface'
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
