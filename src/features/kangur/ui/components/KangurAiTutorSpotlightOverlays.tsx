import { AnimatePresence, motion } from 'framer-motion';

import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

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
  guidedMode: 'auth' | 'home_onboarding' | 'section' | 'selection' | null;
  prefersReducedMotion: boolean;
  reducedMotionTransitions: ReducedMotionTransitions;
  sectionContextSpotlightStyle: CSSProperties | null;
  sectionDropHighlightStyle: CSSProperties | null;
  selectionContextSpotlightStyle: CSSProperties | null;
  selectionSpotlightStyle: CSSProperties | null;
};

export function KangurAiTutorSpotlightOverlays({
  guidedMode,
  prefersReducedMotion,
  reducedMotionTransitions,
  sectionContextSpotlightStyle,
  sectionDropHighlightStyle,
  selectionContextSpotlightStyle,
  selectionSpotlightStyle,
}: Props): JSX.Element {
  const { highlightedSection, hoveredSectionAnchorId, selectionContextSpotlightTick, viewportTick } =
    useKangurAiTutorWidgetStateContext();

  return (
    <>
      <AnimatePresence>
        {guidedMode === 'selection' && selectionSpotlightStyle ? (
          <motion.div
            key='guided-selection-spotlight'
            data-testid='kangur-ai-tutor-selection-spotlight'
            initial={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, scale: 0.98 }
            }
            animate={reducedMotionTransitions.stableState}
            exit={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, scale: 0.98 }
            }
            transition={prefersReducedMotion ? reducedMotionTransitions.instant : undefined}
            style={selectionSpotlightStyle}
            className='pointer-events-none fixed z-[72] rounded-[22px] border-2 border-amber-400/85 bg-amber-100/20 shadow-[0_0_0_8px_rgba(251,191,36,0.18)]'
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectionContextSpotlightStyle ? (
          <motion.div
            key={`selection-context-spotlight:${selectionContextSpotlightTick}`}
            data-testid='kangur-ai-tutor-selection-context-spotlight'
            initial={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, scale: 0.985 }
            }
            animate={reducedMotionTransitions.stableState}
            exit={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, scale: 0.985 }
            }
            transition={prefersReducedMotion ? reducedMotionTransitions.instant : undefined}
            style={selectionContextSpotlightStyle}
            className='pointer-events-none fixed z-[68] rounded-[22px] border-2 border-amber-300/75 bg-amber-100/10 shadow-[0_0_0_6px_rgba(251,191,36,0.12)]'
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {sectionContextSpotlightStyle ? (
          <motion.div
            key={`section-context-spotlight:${highlightedSection?.anchorId ?? 'section'}:${viewportTick}`}
            data-testid='kangur-ai-tutor-section-context-spotlight'
            initial={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, scale: 0.985 }
            }
            animate={reducedMotionTransitions.stableState}
            exit={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, scale: 0.985 }
            }
            transition={prefersReducedMotion ? reducedMotionTransitions.instant : undefined}
            style={sectionContextSpotlightStyle}
            className='pointer-events-none fixed z-[68] rounded-[22px] border-2 border-amber-300/75 bg-amber-100/10 shadow-[0_0_0_6px_rgba(251,191,36,0.12)]'
          />
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {sectionDropHighlightStyle ? (
          <motion.div
            key={`section-drop-highlight:${hoveredSectionAnchorId ?? 'section'}`}
            data-testid='kangur-ai-tutor-section-drop-highlight'
            initial={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, scale: 0.985 }
            }
            animate={reducedMotionTransitions.stableState}
            exit={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0, scale: 0.985 }
            }
            transition={prefersReducedMotion ? reducedMotionTransitions.instant : undefined}
            style={sectionDropHighlightStyle}
            className='pointer-events-none fixed z-[70] rounded-[22px] border-2 border-amber-300/75 bg-amber-100/10 shadow-[0_0_0_6px_rgba(251,191,36,0.12)]'
          />
        ) : null}
      </AnimatePresence>
    </>
  );
}
