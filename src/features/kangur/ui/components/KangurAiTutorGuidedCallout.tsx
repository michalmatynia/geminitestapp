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
    <AnimatePresence>
      {shouldRender && style ? (
        <motion.div
          key={calloutKey}
          data-testid={calloutTestId}
          data-guidance-motion='gentle'
          data-guidance-placement={placement}
          initial={
            prefersReducedMotion
              ? reducedMotionTransitions.stableState
              : { opacity: 0, y: 8, scale: 0.98 }
          }
          animate={reducedMotionTransitions.stableState}
          exit={
            prefersReducedMotion
              ? reducedMotionTransitions.stableState
              : { opacity: 0, y: 8, scale: 0.98 }
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
            className='border-amber-200/80 shadow-[0_20px_48px_-30px_rgba(180,83,9,0.38)]'
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='text-[10px] font-semibold tracking-[0.16em] text-amber-700'>
                {headerLabel}
              </div>
              {!showSelectionGuidanceCallout ? (
                <button
                  data-testid='kangur-ai-tutor-guided-callout-close'
                  type='button'
                  onClick={(): void => onAction('close')}
                  className='shrink-0 rounded-full border border-amber-200/80 bg-white/80 p-1 text-amber-900 transition-colors hover:bg-white'
                  aria-label={tutorContent.guidedCallout.closeAria}
                >
                  <X className='h-3.5 w-3.5' />
                </button>
              ) : null}
            </div>
            {stepLabel ? (
              <div className='mt-1 text-[10px] font-semibold tracking-[0.16em] text-slate-500'>
                {stepLabel}
              </div>
            ) : null}
            <div className='mt-1 text-sm font-semibold leading-relaxed text-slate-900'>{title}</div>
            <div className='mt-2 text-xs leading-relaxed text-slate-600'>{detail}</div>
            {selectionPreview ? (
              <div className='mt-3 rounded-2xl border border-amber-200/80 bg-white/80 px-3 py-2 text-xs italic leading-relaxed text-slate-700'>
                „{selectionPreview}”
                {selectionPreviewHasOverflow ? '…' : ''}
              </div>
            ) : showSectionGuidanceCallout ? (
              <div className='mt-3 rounded-2xl border border-amber-200/80 bg-white/80 px-3 py-2 text-xs leading-relaxed text-slate-700'>
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
                      onClick={(): void => onAction('back_home_onboarding')}
                    >
                      {tutorContent.guidedCallout.buttons.back}
                    </KangurButton>
                  ) : null}
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='surface'
                    onClick={(): void => onAction('finish_home_onboarding')}
                  >
                    {tutorContent.guidedCallout.buttons.finish}
                  </KangurButton>
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='primary'
                    onClick={(): void => onAction('advance_home_onboarding')}
                  >
                    {tutorContent.guidedCallout.buttons.understand}
                  </KangurButton>
                </>
              ) : mode === 'selection' ? (
                <div className='rounded-full border border-amber-200/80 bg-white/85 px-3 py-1 text-[11px] font-semibold text-amber-800'>
                  {tutorContent.guidedCallout.selectionPreparingBadge}
                </div>
              ) : (
                <KangurButton
                  type='button'
                  size='sm'
                  variant='surface'
                  onClick={(): void => onAction('close')}
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
