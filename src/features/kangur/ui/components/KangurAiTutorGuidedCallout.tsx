'use client';

import { AnimatePresence, motion, type Transition } from 'framer-motion';
import { X } from 'lucide-react';

import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import { KangurButton, KangurGlassPanel } from '@/features/kangur/ui/design/primitives';

import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

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
  calloutKey: string;
  calloutTestId: string;
  detail: string | null;
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

const isSelectionGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'selection' }> => value?.mode === 'selection';

const isSectionGuidedTutorTarget = (
  value: GuidedTutorTarget | null | undefined
): value is Extract<GuidedTutorTarget, { mode: 'section' }> => value?.mode === 'section';

export function KangurAiTutorGuidedCallout({
  calloutKey,
  calloutTestId,
  detail,
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

  return (
    <AnimatePresence mode='wait'>
      {shouldRender && style ? (
        <motion.div
          data-kangur-ai-tutor-root='true'
          key={calloutKey}
          data-testid={calloutTestId}
          data-guidance-motion='gentle'
          data-guidance-placement={placement}
          initial={
            prefersReducedMotion
              ? reducedMotionTransitions.stableState
              : { opacity: 0 }
          }
          animate={reducedMotionTransitions.stableState}
          exit={
            prefersReducedMotion
              ? reducedMotionTransitions.stableState
              : { opacity: 0 }
          }
          transition={
            calloutTransition
          }
          style={style}
          className='z-[73]'
        >
          <KangurGlassPanel
            surface='warmGlow'
            variant='soft'
            padding='md'
            className='border-amber-200/60 shadow-[0_20px_48px_-30px_rgba(180,83,9,0.34),inset_0_1px_0_rgba(255,255,255,0.5)] [background:radial-gradient(circle_at_top,color-mix(in_srgb,var(--kangur-soft-card-background)_74%,#fef3c7),var(--kangur-soft-card-background)_44%,color-mix(in_srgb,var(--kangur-page-background)_80%,#eef2ff))]'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] text-amber-700'>
                <span className='inline-flex h-1.5 w-1.5 rounded-full bg-amber-500' />
                {headerLabel}
              </div>
              {!showSelectionGuidanceCallout ? (
                <button
                  data-testid='kangur-ai-tutor-guided-callout-close'
                  type='button'
                  onClick={handleCloseCallout}
                  className='shrink-0 cursor-pointer rounded-full border border-amber-200/80 p-1 text-amber-900 transition-[background-color,box-shadow,transform] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7)] hover:-translate-y-[1px] hover:scale-[1.03] hover:[background:var(--kangur-soft-card-background)] hover:shadow-[0_10px_20px_-14px_rgba(180,83,9,0.42)]'
                  aria-label={tutorContent.guidedCallout.closeAria}
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              ) : null}
            </div>
            {stepLabel ? (
              <div className='mt-1 text-[10px] font-semibold tracking-[0.16em] [color:var(--kangur-page-muted-text)]'>
                {stepLabel}
              </div>
            ) : null}
            <div className='mt-1 text-sm font-semibold leading-relaxed [color:var(--kangur-page-text)]'>
              {title}
            </div>
            <div className='mt-2 text-xs leading-relaxed [color:var(--kangur-page-muted-text)]'>
              {detail}
            </div>
            {selectionPreview ? (
              <div className='mt-3 rounded-2xl border border-amber-200/80 px-3 py-2 text-xs italic leading-relaxed [background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,#fff7cf)] [color:var(--kangur-page-text)]'>
                „{selectionPreview}”
                {selectionPreviewHasOverflow ? '…' : ''}
              </div>
            ) : showSectionGuidanceCallout ? (
              <div className='mt-3 rounded-2xl border border-amber-200/80 px-3 py-2 text-xs leading-relaxed [background:color-mix(in_srgb,var(--kangur-soft-card-background)_86%,#fff7cf)] [color:var(--kangur-page-text)]'>
                {tutorContent.guidedCallout.sectionPrefix}: {sectionLabel}
              </div>
            ) : null}
            <div className='mt-3 flex flex-wrap justify-end gap-2'>
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
                <div className='rounded-full border border-amber-200/80 px-3 py-1 text-[11px] font-semibold text-amber-800 [background:color-mix(in_srgb,var(--kangur-soft-card-background)_84%,#fef3c7)]'>
                  {tutorContent.guidedCallout.selectionPreparingBadge}
                </div>
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
          </KangurGlassPanel>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
