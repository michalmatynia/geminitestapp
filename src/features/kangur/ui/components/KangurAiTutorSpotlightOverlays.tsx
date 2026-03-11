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
  selectionGlowStyles: CSSProperties[];
  selectionContextSpotlightStyle: CSSProperties | null;
  selectionSpotlightStyle: CSSProperties | null;
};

export function KangurAiTutorSpotlightOverlays({
  guidedMode,
  prefersReducedMotion,
  reducedMotionTransitions,
  sectionContextSpotlightStyle,
  sectionDropHighlightStyle,
  selectionGlowStyles = [],
  selectionContextSpotlightStyle,
  selectionSpotlightStyle,
}: Props): JSX.Element {
  const { highlightedSection, hoveredSectionAnchorId, selectionContextSpotlightTick, viewportTick } =
    useKangurAiTutorWidgetStateContext();

  return (
    <>
      <style>{`
        :root {
          --kangur-ai-tutor-selection-highlight-fill: rgba(251, 191, 36, 0.18);
          --kangur-ai-tutor-selection-highlight-text: #92400e;
          --kangur-ai-tutor-selection-highlight-shadow-near: rgba(251, 191, 36, 0.42);
          --kangur-ai-tutor-selection-highlight-shadow-far: rgba(245, 158, 11, 0.24);
          --kangur-ai-tutor-selection-glow-fill-start: rgba(254, 243, 199, 0.38);
          --kangur-ai-tutor-selection-glow-fill-end: rgba(253, 224, 71, 0.18);
          --kangur-ai-tutor-selection-glow-border: rgba(251, 191, 36, 0.22);
          --kangur-ai-tutor-selection-glow-shadow-inner: rgba(251, 191, 36, 0.2);
          --kangur-ai-tutor-selection-glow-shadow-outer: rgba(245, 158, 11, 0.12);
          --kangur-ai-tutor-selection-glow-shadow-far: rgba(245, 158, 11, 0.08);
          --kangur-ai-tutor-selection-spotlight-fill: rgba(254, 243, 199, 0.08);
        }

        [data-kangur-appearance='dark'],
        .dark {
          --kangur-ai-tutor-selection-highlight-fill: rgba(250, 204, 21, 0.26);
          --kangur-ai-tutor-selection-highlight-text: #fef3c7;
          --kangur-ai-tutor-selection-highlight-shadow-near: rgba(250, 204, 21, 0.6);
          --kangur-ai-tutor-selection-highlight-shadow-far: rgba(251, 146, 60, 0.34);
          --kangur-ai-tutor-selection-glow-fill-start: rgba(250, 204, 21, 0.28);
          --kangur-ai-tutor-selection-glow-fill-end: rgba(251, 191, 36, 0.12);
          --kangur-ai-tutor-selection-glow-border: rgba(252, 211, 77, 0.34);
          --kangur-ai-tutor-selection-glow-shadow-inner: rgba(250, 204, 21, 0.34);
          --kangur-ai-tutor-selection-glow-shadow-outer: rgba(250, 204, 21, 0.24);
          --kangur-ai-tutor-selection-glow-shadow-far: rgba(251, 146, 60, 0.18);
          --kangur-ai-tutor-selection-spotlight-fill: rgba(250, 204, 21, 0.12);
        }

        ::highlight(kangur-ai-tutor-selection-glow) {
          background: var(--kangur-ai-tutor-selection-highlight-fill);
          color: var(--kangur-ai-tutor-selection-highlight-text);
          text-shadow:
            0 0 6px var(--kangur-ai-tutor-selection-highlight-shadow-near),
            0 0 14px var(--kangur-ai-tutor-selection-highlight-shadow-far);
        }
      `}</style>

      <AnimatePresence>
        {guidedMode === 'selection' && selectionGlowStyles.length > 0
          ? selectionGlowStyles.map((style, index) => (
            <motion.div
              key={`guided-selection-glow:${index}`}
              data-testid='kangur-ai-tutor-selection-glow'
              data-selection-emphasis='glow'
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
              transition={prefersReducedMotion ? reducedMotionTransitions.instant : undefined}
              style={style}
              className='pointer-events-none fixed z-[72] rounded-[18px]'
            />
          ))
          : guidedMode === 'selection' && selectionSpotlightStyle
            ? (
              <motion.div
                key='guided-selection-spotlight'
                data-testid='kangur-ai-tutor-selection-spotlight'
                data-selection-emphasis='glow'
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
                transition={prefersReducedMotion ? reducedMotionTransitions.instant : undefined}
                style={{
                  ...selectionSpotlightStyle,
                  background: 'var(--kangur-ai-tutor-selection-spotlight-fill)',
                  border: '1px solid var(--kangur-ai-tutor-selection-glow-border)',
                  boxShadow:
                    '0 0 14px 3px var(--kangur-ai-tutor-selection-glow-shadow-inner), 0 0 24px 8px var(--kangur-ai-tutor-selection-glow-shadow-outer), 0 0 36px 14px var(--kangur-ai-tutor-selection-glow-shadow-far)',
                }}
                className='pointer-events-none fixed z-[72] rounded-[22px]'
              />
            )
            : null}
      </AnimatePresence>

      <AnimatePresence>
        {selectionContextSpotlightStyle ? (
          <motion.div
            key={`selection-context-spotlight:${selectionContextSpotlightTick}`}
            data-testid='kangur-ai-tutor-selection-context-spotlight'
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
                : { opacity: 0 }
            }
            animate={reducedMotionTransitions.stableState}
            exit={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0 }
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
                : { opacity: 0 }
            }
            animate={reducedMotionTransitions.stableState}
            exit={
              prefersReducedMotion
                ? reducedMotionTransitions.stableState
                : { opacity: 0 }
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
