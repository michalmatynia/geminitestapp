import type { HTMLMotionProps } from 'framer-motion';

type KangurPageTransitionMotionProps = Pick<
  HTMLMotionProps<'div'>,
  'initial' | 'animate' | 'exit'
>;

export const createKangurPageTransitionMotionProps = (
  prefersReducedMotion: boolean | null
): KangurPageTransitionMotionProps =>
  prefersReducedMotion
    ? {
      initial: { opacity: 1, y: 0 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 1, y: 0 },
    }
    : {
      initial: { opacity: 0, y: 20 },
      animate: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: -20 },
    };
