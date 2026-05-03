'use client';

import { type motion } from 'framer-motion';

import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';

import {
  getGuidedCalloutFallbackCopy,
  resolveGuidedCalloutLayoutState,
  resolveGuidedSelectionDisplayState,
  resolveSectionLabel,
  useGuidedCalloutSelectionState as useGuidedCalloutSelectionStateCore,
  useGuidedCalloutSketchState,
} from '../KangurAiTutorGuidedCallout.utils';

import type { ComponentProps } from 'react';

const GUIDED_CALLOUT_ENTRY_OFFSET_PX = 72;

type GuidedCalloutMotionProps = Pick<
  ComponentProps<typeof motion.div>,
  'animate' | 'exit' | 'initial' | 'transition'
>;

type GuidedCalloutMotionState = {
  stableState: Record<string, unknown>;
  instant: Record<string, unknown>;
};

export {
  getGuidedCalloutFallbackCopy,
  resolveGuidedCalloutLayoutState,
  resolveGuidedSelectionDisplayState,
  resolveSectionLabel,
  useGuidedCalloutSketchState,
};

export function useGuidedCalloutSelectionState(
  input: Omit<
    Parameters<typeof useGuidedCalloutSelectionStateCore>[0],
    'useKangurPageContentEntry'
  >
) {
  return useGuidedCalloutSelectionStateCore({
    ...input,
    useKangurPageContentEntry,
  });
}

export const resolveGuidedCalloutMotionProps = ({
  entryDirection,
  prefersReducedMotion,
  reducedMotionTransitions,
  transitionDuration,
  transitionEase,
  usesDirectionalEntry,
}: {
  entryDirection: string | null;
  prefersReducedMotion: boolean;
  reducedMotionTransitions: GuidedCalloutMotionState;
  transitionDuration: number;
  transitionEase: unknown;
  usesDirectionalEntry: boolean;
}): GuidedCalloutMotionProps => ({
  animate: { ...reducedMotionTransitions.stableState, x: 0 },
  exit: prefersReducedMotion ? { ...reducedMotionTransitions.stableState, x: 0 } : { opacity: 0 },
  initial: prefersReducedMotion
    ? { ...reducedMotionTransitions.stableState, x: 0 }
    : usesDirectionalEntry
      ? {
          ...reducedMotionTransitions.stableState,
          opacity: 0,
          x: entryDirection === 'left' ? -GUIDED_CALLOUT_ENTRY_OFFSET_PX : GUIDED_CALLOUT_ENTRY_OFFSET_PX,
          scale: 0.98,
        }
      : {
          ...reducedMotionTransitions.stableState,
          opacity: 0,
          x: 0,
        },
  transition: prefersReducedMotion
    ? reducedMotionTransitions.instant
    : {
        duration: transitionDuration,
        ease: transitionEase as never,
      },
});
