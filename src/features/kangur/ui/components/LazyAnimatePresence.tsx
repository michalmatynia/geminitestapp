'use client';

import {
  forwardRef,
  useEffect,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import type { AnimatePresenceProps, HTMLMotionProps } from 'framer-motion';

import { onBootReady } from '@/features/kangur/ui/boot/boot-ready-signal';

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

// Defer loading framer-motion until after boot-critical network requests
// (auth, settings) have completed. The LazyMotionDiv gracefully falls back
// to a plain <div> until the library is available.
if (typeof window !== 'undefined') {
  onBootReady(() => {
    loadFramerMotion().catch(() => undefined);
  });
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

type LazyMotionDivProps = HTMLMotionProps<'div'> & {
  children?: ReactNode;
  className?: string;
  loadMotion?: boolean;
  'data-testid'?: string;
  'data-route-transition-phase'?: string;
  'data-route-interactive-ready'?: string;
  'data-route-transition-key'?: string;
  'data-route-transition-source-id'?: string;
};

export const LazyMotionDiv = forwardRef<HTMLDivElement, LazyMotionDivProps>(
  (props, ref) => {
    const { loadMotion = true, ...motionProps } = props;
    const fm = useFramerMotion(loadMotion);

    if (fm) {
      const MotionDiv = fm.MotionDiv;
      return <MotionDiv ref={ref} {...motionProps} />;
    }

    // Before framer-motion loads, render a plain div with only standard HTML props.
    const divProps: Record<string, unknown> = { ...motionProps };
    delete divProps.initial;
    delete divProps.animate;
    delete divProps.exit;
    delete divProps.transition;
    delete divProps.whileHover;
    delete divProps.whileTap;
    delete divProps.whileFocus;
    delete divProps.whileInView;
    delete divProps.whileDrag;
    delete divProps.variants;
    delete divProps.layout;
    delete divProps.layoutId;
    delete divProps.onAnimationStart;
    delete divProps.onAnimationComplete;

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

  if (fm) {
    const MotionButton = fm.MotionButton;
    return <MotionButton ref={ref} {...motionProps} />;
  }

  const buttonProps: Record<string, unknown> = { ...motionProps };
  delete buttonProps.initial;
  delete buttonProps.animate;
  delete buttonProps.exit;
  delete buttonProps.transition;
  delete buttonProps.whileHover;
  delete buttonProps.whileTap;
  delete buttonProps.whileFocus;
  delete buttonProps.whileInView;
  delete buttonProps.whileDrag;
  delete buttonProps.variants;
  delete buttonProps.layout;
  delete buttonProps.layoutId;
  delete buttonProps.onAnimationStart;
  delete buttonProps.onAnimationComplete;

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
