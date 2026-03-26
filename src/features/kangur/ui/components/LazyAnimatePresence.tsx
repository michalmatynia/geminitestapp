'use client';

import {
  forwardRef,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import type { AnimatePresenceProps, HTMLMotionProps } from 'framer-motion';

// ---------------------------------------------------------------------------
// Shared lazy loader — resolves once, cached for all consumers
// ---------------------------------------------------------------------------

type FramerMotionExports = {
  AnimatePresence: React.ComponentType<AnimatePresenceProps & { children: ReactNode }>;
  motion: { div: React.ComponentType<HTMLMotionProps<'div'>> };
};

let cached: FramerMotionExports | null = null;
let loadPromise: Promise<FramerMotionExports> | null = null;

const loadFramerMotion = (): Promise<FramerMotionExports> => {
  if (cached) return Promise.resolve(cached);
  if (!loadPromise) {
    loadPromise = import('framer-motion').then((mod) => {
      cached = {
        AnimatePresence: mod.AnimatePresence as FramerMotionExports['AnimatePresence'],
        motion: mod.motion as unknown as FramerMotionExports['motion'],
      };
      return cached;
    });
  }
  return loadPromise;
};

const useFramerMotion = (): FramerMotionExports | null => {
  const [resolved, setResolved] = useState<FramerMotionExports | null>(() => cached);

  useEffect(() => {
    if (cached) {
      setResolved(cached);
      return;
    }
    void loadFramerMotion().then((exports) => {
      setResolved(exports);
    });
  }, []);

  return resolved;
};

// ---------------------------------------------------------------------------
// LazyAnimatePresence
// ---------------------------------------------------------------------------

type LazyAnimatePresenceProps = AnimatePresenceProps & {
  children: ReactNode;
};

export function LazyAnimatePresence({
  children,
  ...props
}: LazyAnimatePresenceProps): React.JSX.Element {
  const fm = useFramerMotion();

  if (fm) {
    return <fm.AnimatePresence {...props}>{children}</fm.AnimatePresence>;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// LazyMotionDiv — renders a plain <div> until framer-motion loads
// ---------------------------------------------------------------------------

type LazyMotionDivProps = HTMLMotionProps<'div'> & {
  children?: ReactNode;
  className?: string;
  'data-testid'?: string;
  'data-route-transition-phase'?: string;
  'data-route-interactive-ready'?: string;
  'data-route-transition-key'?: string;
  'data-route-transition-source-id'?: string;
};

export const LazyMotionDiv = forwardRef<HTMLDivElement, LazyMotionDivProps>(
  function LazyMotionDiv(props, ref) {
    const fm = useFramerMotion();

    if (fm) {
      const MotionDiv = fm.motion.div;
      return <MotionDiv ref={ref} {...props} />;
    }

    // Before framer-motion loads, render a plain div with only standard HTML props.
    const {
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      whileFocus: _whileFocus,
      whileInView: _whileInView,
      whileDrag: _whileDrag,
      variants: _variants,
      layout: _layout,
      layoutId: _layoutId,
      onAnimationStart: _onAnimationStart,
      onAnimationComplete: _onAnimationComplete,
      ...divProps
    } = props;

    return <div ref={ref} {...(divProps as ComponentProps<'div'>)} />;
  }
);

// ---------------------------------------------------------------------------
// usePrefersReducedMotion — replaces framer-motion's useReducedMotion
// ---------------------------------------------------------------------------

export const usePrefersReducedMotion = (): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMatches(mql.matches);

    const handler = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };
    mql.addEventListener('change', handler);
    return () => {
      mql.removeEventListener('change', handler);
    };
  }, []);

  return matches;
};
