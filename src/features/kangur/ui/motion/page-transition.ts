import type { HTMLMotionProps } from 'framer-motion';

type KangurPageTransitionMotionProps = Pick<
  HTMLMotionProps<'div'>,
  'initial' | 'animate' | 'exit' | 'transition'
>;

const KANGUR_PAGE_TRANSITION_EASE = [0.22, 1, 0.36, 1] as const;

export const createKangurPageTransitionMotionProps = (
  prefersReducedMotion: boolean | null
): KangurPageTransitionMotionProps =>
  prefersReducedMotion
    ? {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 1, y: 0 },
      transition: { duration: 0 },
    }
    : {
      initial: { opacity: 0, y: 12 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -6 },
      transition: {
        duration: 0.28,
        ease: KANGUR_PAGE_TRANSITION_EASE,
      },
    };
