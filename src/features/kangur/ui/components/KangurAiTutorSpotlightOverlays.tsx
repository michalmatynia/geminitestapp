import { AnimatePresence, motion } from 'framer-motion';

import { useKangurAiTutorWidgetStateContext } from './KangurAiTutorWidget.state';

import type { CSSProperties, JSX } from 'react';

const LIGHT_MODE_SELECTION_GRADIENT_FALLBACK =
  'color-mix(in srgb, var(--kangur-page-text) 78%, rgb(146 64 14))';
const LIGHT_MODE_SELECTION_GRADIENT_START =
  'color-mix(in srgb, var(--kangur-page-text) 90%, rgb(120 53 15))';
const LIGHT_MODE_SELECTION_GRADIENT_MID =
  'color-mix(in srgb, var(--kangur-page-text) 82%, rgb(146 64 14))';
const LIGHT_MODE_SELECTION_GRADIENT_END =
  'color-mix(in srgb, var(--kangur-page-text) 72%, rgb(180 83 9))';

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
  const guidedSelectionOverlay =
    guidedMode === 'selection' ? (
      <AnimatePresence>
        {selectionGlowStyles.length > 0
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
          : selectionSpotlightStyle
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
    ) : null;

  return (
    <>
      <style>{`
        :root {
          --kangur-ai-tutor-selection-gradient-fallback: ${LIGHT_MODE_SELECTION_GRADIENT_FALLBACK};
          --kangur-ai-tutor-selection-gradient-start: ${LIGHT_MODE_SELECTION_GRADIENT_START};
          --kangur-ai-tutor-selection-gradient-mid: ${LIGHT_MODE_SELECTION_GRADIENT_MID};
          --kangur-ai-tutor-selection-gradient-end: ${LIGHT_MODE_SELECTION_GRADIENT_END};
          --kangur-ai-tutor-selection-glow-fill-start: rgba(245, 158, 11, 0.18);
          --kangur-ai-tutor-selection-glow-fill-end: rgba(180, 83, 9, 0.08);
          --kangur-ai-tutor-selection-glow-border: rgba(217, 119, 6, 0.28);
          --kangur-ai-tutor-selection-glow-shadow-inner: rgba(217, 119, 6, 0.18);
          --kangur-ai-tutor-selection-glow-shadow-outer: rgba(217, 119, 6, 0.12);
          --kangur-ai-tutor-selection-glow-shadow-far: rgba(180, 83, 9, 0.08);
          --kangur-ai-tutor-selection-spotlight-fill: rgba(245, 158, 11, 0.08);
        }

        [data-kangur-appearance='dark'],
        [data-kangur-appearance-mode='dark'] {
          --kangur-ai-tutor-selection-gradient-fallback: #fde68a;
          --kangur-ai-tutor-selection-gradient-start: #fef3c7;
          --kangur-ai-tutor-selection-gradient-mid: #fcd34d;
          --kangur-ai-tutor-selection-gradient-end: #f59e0b;
          --kangur-ai-tutor-selection-glow-fill-start: rgba(250, 204, 21, 0.28);
          --kangur-ai-tutor-selection-glow-fill-end: rgba(251, 191, 36, 0.12);
          --kangur-ai-tutor-selection-glow-border: rgba(252, 211, 77, 0.34);
          --kangur-ai-tutor-selection-glow-shadow-inner: rgba(250, 204, 21, 0.34);
          --kangur-ai-tutor-selection-glow-shadow-outer: rgba(250, 204, 21, 0.24);
          --kangur-ai-tutor-selection-glow-shadow-far: rgba(251, 146, 60, 0.18);
          --kangur-ai-tutor-selection-spotlight-fill: rgba(250, 204, 21, 0.12);
        }

        @keyframes kangur-ai-tutor-selection-gradient-drift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        [data-kangur-ai-tutor-selection-emphasis='gradient'] {
          color: var(--kangur-ai-tutor-selection-gradient-fallback);
          transition: color 220ms ease;
        }

        @supports ((-webkit-background-clip: text) or (background-clip: text)) {
          [data-kangur-ai-tutor-selection-emphasis='gradient'] {
            background-image: linear-gradient(
              110deg,
              var(--kangur-ai-tutor-selection-gradient-start) 0%,
              var(--kangur-ai-tutor-selection-gradient-mid) 35%,
              var(--kangur-ai-tutor-selection-gradient-end) 65%,
              var(--kangur-ai-tutor-selection-gradient-mid) 100%
            );
            background-size: 190% 100%;
            background-position: 0% 50%;
            background-clip: text;
            -webkit-background-clip: text;
            color: transparent;
            -webkit-text-fill-color: transparent;
            animation: kangur-ai-tutor-selection-gradient-drift 6.8s linear infinite;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-kangur-ai-tutor-selection-emphasis='gradient'] {
            animation: none;
            background-position: 50% 50%;
          }
        }
      `}</style>

      {guidedSelectionOverlay}

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
