'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

import type { CssAnimationConfig } from '@/shared/contracts/cms/css-animations';
import { DEFAULT_CSS_ANIMATION_CONFIG } from '@/shared/contracts/cms/css-animations';
import { cn } from '@/shared/utils';

import { useBlockSettings } from './sections/FrontendBlockRenderer';

interface CssAnimationWrapperProps {
  config?: CssAnimationConfig | undefined;
  children: React.ReactNode;
  className?: string;
}

export function CssAnimationWrapper({
  config: propConfig,
  children,
  className,
}: CssAnimationWrapperProps): React.ReactNode {
  const blockSettings = useBlockSettings();
  
  const config = useMemo(() => {
    if (propConfig) return propConfig;
    if (blockSettings?.['cssAnimation']) {
      return blockSettings['cssAnimation'] as CssAnimationConfig;
    }
    return undefined;
  }, [propConfig, blockSettings]);

  const merged = useMemo(
    () => ({ ...DEFAULT_CSS_ANIMATION_CONFIG, ...(config ?? {}) }),
    [config]
  );
  const enabled = Boolean(merged.enabled) && merged.effect !== 'none';
  const trigger = merged.trigger ?? 'load';
  const ref = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState<boolean>(trigger !== 'inView');

  useEffect(() => {
    if (trigger !== 'inView') return;
    const node = ref.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries: IntersectionObserverEntry[]) => {
        entries.forEach((entry: IntersectionObserverEntry) => {
          if (entry.isIntersecting) {
            setActive(true);
          } else if (merged.replayOnExit) {
            setActive(false);
          }
        });
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return (): void => observer.disconnect();
  }, [merged.replayOnExit, trigger]);

  if (!enabled) {
    return <>{children}</>;
  }

  const iterationCount = merged.loop ? 'infinite' : String(Math.max(1, merged.iterations ?? 1));
  const styleVars: React.CSSProperties = {
    ['--cms-css-anim-name' as string]: `cms-anim-${merged.effect}`,
    ['--cms-css-anim-duration' as string]: `${merged.duration ?? 700}ms`,
    ['--cms-css-anim-delay' as string]: `${merged.delay ?? 0}ms`,
    ['--cms-css-anim-ease' as string]: merged.easing ?? 'ease-out',
    ['--cms-css-anim-iter' as string]: iterationCount,
    ['--cms-css-anim-direction' as string]: merged.direction ?? 'normal',
    ['--cms-css-anim-fill' as string]: merged.fillMode ?? 'both',
    ['--cms-css-anim-distance' as string]: `${merged.distance ?? 40}px`,
    ['--cms-css-anim-scale' as string]: merged.scale ?? 0.9,
    ['--cms-css-anim-rotate' as string]: `${merged.rotate ?? 12}deg`,
    ['--cms-css-anim-blur' as string]: `${merged.blur ?? 6}px`,
  };

  const triggerClass =
    trigger === 'inView'
      ? 'cms-css-anim--in-view'
      : trigger === 'hover'
        ? 'cms-css-anim--hover'
        : 'cms-css-anim--load';

  return (
    <div
      ref={ref}
      className={cn('cms-css-anim', triggerClass, active ? 'is-active' : '', className)}
      style={styleVars}
    >
      {children}
    </div>
  );
}
