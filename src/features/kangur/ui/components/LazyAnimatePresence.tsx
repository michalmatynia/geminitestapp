'use client';

import {
  forwardRef,
  useEffect,
  useRef,
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
  MotionDiv: React.ComponentType<HTMLMotionProps<'div'>>;
  MotionButton: React.ComponentType<HTMLMotionProps<'button'>>;
};

let cached: FramerMotionExports | null = null;
let loadPromise: Promise<FramerMotionExports> | null = null;
const MOTION_ONLY_PROP_KEYS = [
  'initial',
  'animate',
  'exit',
  'transition',
  'whileHover',
  'whileTap',
  'whileFocus',
  'whileInView',
  'whileDrag',
  'variants',
  'layout',
  'layoutId',
  'onAnimationStart',
  'onAnimationComplete',
] as const;

const loadFramerMotion = (): Promise<FramerMotionExports> => {
  if (cached) return Promise.resolve(cached);
  loadPromise ??= import('framer-motion').then((mod) => {
    cached = {
      AnimatePresence: mod.AnimatePresence as FramerMotionExports['AnimatePresence'],
      MotionDiv: mod.motion.div,
      MotionButton: mod.motion.button,
    };
    return cached;
  });
  return loadPromise;
};

// Start loading framer-motion as early as possible so the cached value is
// available before route content first renders. Starting at module import time
// (rather than onBootReady) gives the entire auth/settings loading window as
// a head start — meaning LazyMotionDiv renders as motion.div from its first
// render and never switches element types, preventing the subtree remount that
// would otherwise trigger a Suspense fallback flash.
if (typeof window !== 'undefined') {
  loadFramerMotion().catch(() => undefined);
}

const useFramerMotion = (enabled = true): FramerMotionExports | null => {
  const [resolved, setResolved] = useState<FramerMotionExports | null>(() =>
    enabled ? cached : null
  );

  useEffect(() => {
    if (!enabled) {
      setResolved(null);
      return;
    }

    if (cached) {
      setResolved(cached);
      return;
    }
    loadFramerMotion()
      .then((exports) => {
        setResolved(exports);
      })
      .catch(() => undefined);
  }, [enabled]);

  return resolved;
};

const stripMotionOnlyProps = (props: Record<string, unknown>): Record<string, unknown> => {
  const stripped = { ...props };
  MOTION_ONLY_PROP_KEYS.forEach((key) => {
    delete stripped[key];
  });
  return stripped;
};

// ---------------------------------------------------------------------------
// LazyAnimatePresence
// ---------------------------------------------------------------------------

type LazyAnimatePresenceProps = AnimatePresenceProps & {
  children: ReactNode;
  loadMotion?: boolean;
};

export function LazyAnimatePresence({
  children,
  loadMotion = true,
  ...props
}: LazyAnimatePresenceProps): React.JSX.Element {
  const fm = useFramerMotion(loadMotion);

  if (fm) {
    return <fm.AnimatePresence {...props}>{children}</fm.AnimatePresence>;
  }

  return <>{children}</>;
}

// ---------------------------------------------------------------------------
// LazyMotionDiv — renders a plain <div> until framer-motion loads
// ---------------------------------------------------------------------------

type LazyMotionDivProps = Omit<
  HTMLMotionProps<'div'>,
  'animate' | 'exit' | 'initial' | 'transition'
> & {
  animate?: HTMLMotionProps<'div'>['animate'] | Record<string, unknown>;
  children?: ReactNode;
  className?: string;
  exit?: HTMLMotionProps<'div'>['exit'] | Record<string, unknown>;
  initial?: HTMLMotionProps<'div'>['initial'] | Record<string, unknown>;
  loadMotion?: boolean;
  transition?: HTMLMotionProps<'div'>['transition'] | Record<string, unknown>;
  'data-testid'?: string;
  'data-route-capture-ready'?: string;
  'data-route-transition-phase'?: string;
  'data-route-interactive-ready'?: string;
  'data-route-transition-key'?: string;
  'data-route-transition-source-id'?: string;
};

export const LazyMotionDiv = forwardRef<HTMLDivElement, LazyMotionDivProps>(
  (props, ref) => {
    const { loadMotion = true, ...motionProps } = props;
    const fm = useFramerMotion(loadMotion);
    const hasRenderedWithoutMotionRef = useRef(false);

    if (fm) {
      const MotionDiv = fm.MotionDiv;
      const resolvedMotionProps = hasRenderedWithoutMotionRef.current
        ? { ...motionProps, initial: false }
        : motionProps;
      return <MotionDiv ref={ref} {...(resolvedMotionProps as HTMLMotionProps<'div'>)} />;
    }

    // Before framer-motion loads, render a plain div with only standard HTML props.
    const divProps = stripMotionOnlyProps(motionProps as Record<string, unknown>);
    hasRenderedWithoutMotionRef.current = true;

    return <div ref={ref} {...(divProps as ComponentProps<'div'>)} />;
  }
);

type LazyMotionButtonProps = HTMLMotionProps<'button'> & {
  children?: ReactNode;
  loadMotion?: boolean;
};

export const LazyMotionButton = forwardRef<
  HTMLButtonElement,
  LazyMotionButtonProps
>((props, ref) => {
  const { loadMotion = true, ...motionProps } = props;
  const fm = useFramerMotion(loadMotion);
  const hasRenderedWithoutMotionRef = useRef(false);

  if (fm) {
    const MotionButton = fm.MotionButton;
    const resolvedMotionProps = hasRenderedWithoutMotionRef.current
      ? { ...motionProps, initial: false }
      : motionProps;
    return <MotionButton ref={ref} {...resolvedMotionProps} />;
  }

  const buttonProps = stripMotionOnlyProps(motionProps as Record<string, unknown>);
  hasRenderedWithoutMotionRef.current = true;

  return <button ref={ref} {...(buttonProps as ComponentProps<'button'>)} />;
});

// ---------------------------------------------------------------------------
// usePrefersReducedMotion — replaces framer-motion's useReducedMotion
// ---------------------------------------------------------------------------

export const usePrefersReducedMotion = (): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setMatches(mql.matches);

    const handler = (event: MediaQueryListEvent): void => {
      setMatches(event.matches);
    };
    mql.addEventListener('change', handler);
    const cleanup = (): void => {
      mql.removeEventListener('change', handler);
    };
    return cleanup;
  }, []);

  return matches;
};
