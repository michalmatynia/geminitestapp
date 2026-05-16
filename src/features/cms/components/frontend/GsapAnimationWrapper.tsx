'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import type { GsapAnimationConfig } from '@/features/gsap/public';
import { DEFAULT_ANIMATION_CONFIG } from '@/features/gsap/public';
import { useBlockSettings } from './sections/FrontendBlockRenderer';
import { buildEase, buildStagger, buildTargets } from './gsap-wrapper/animation-builders';
import { buildScrollTrigger } from './gsap-wrapper/animation-triggers';
import {
  buildKeyframes,
  buildMotionPathVars,
  resolveMotionPath,
} from './gsap-wrapper/animation-presets';
import { getGsapFromVars } from '@/features/gsap/public';

interface GsapAnimationWrapperProps {
  config?: Partial<GsapAnimationConfig> | undefined;
  children: React.ReactNode;
  className?: string | undefined;
}

export function GsapAnimationWrapper({
  config: propConfig,
  children,
  className,
}: GsapAnimationWrapperProps): React.ReactNode {
  const ref = useRef<HTMLDivElement>(null);
  const blockSettings = useBlockSettings();

  const config = useMemo(() => {
    if (propConfig) return propConfig;
    if (blockSettings?.['gsapAnimation']) {
      return blockSettings['gsapAnimation'] as Partial<GsapAnimationConfig>;
    }
    return undefined;
  }, [propConfig, blockSettings]);

  const configSignature = useMemo(() => JSON.stringify(config ?? null), [config]);
  const mergedConfig: GsapAnimationConfig | null = useMemo(() => {
    if (!config) return null;
    return { ...DEFAULT_ANIMATION_CONFIG, ...config };
  }, [config]);

  useEffect(() => {
    if (!mergedConfig || (mergedConfig.preset === 'none' && !mergedConfig.motionPathEnabled)) return;
    if (!ref.current) return;
    let ctx: ReturnType<typeof import('gsap').gsap.context> | null = null;
    let cancelled = false;

    const loadGsap = async (): Promise<void> => {
      const { gsap } = await import('gsap');
      const { ScrollTrigger } = await import('gsap/ScrollTrigger');
      const { CustomEase } = await import('gsap/CustomEase');
      const { MotionPathPlugin } = await import('gsap/MotionPathPlugin');
      gsap.registerPlugin(ScrollTrigger, CustomEase, MotionPathPlugin);

      if (cancelled || !ref.current) return;
      const root = ref.current;

      ctx = gsap.context(() => {
        const targets = buildTargets(root, mergedConfig.selector);
        if (!targets.length) return;
        const ease = buildEase(mergedConfig, CustomEase);
        const stagger = buildStagger(mergedConfig, targets.length);
        const scrollTrigger = buildScrollTrigger(mergedConfig, root, targets.length);
        const baseVars = {
          duration: mergedConfig.duration ?? DEFAULT_ANIMATION_CONFIG.duration ?? 0.6,
          delay: mergedConfig.delay ?? DEFAULT_ANIMATION_CONFIG.delay ?? 0,
          ease,
          ...(stagger ? { stagger } : {}),
          ...(scrollTrigger ? { scrollTrigger } : {}),
        };

        handleMotionPath(gsap, targets, mergedConfig, root, baseVars);
        const keyframes = buildKeyframes(mergedConfig.preset);
        if (keyframes) {
          gsap.to(targets, { ...baseVars, ...keyframes });
          return;
        }

        const fromVars = getGsapFromVars(mergedConfig.preset);
        gsap.from(targets, { ...fromVars, ...baseVars });
      }, root);

      ScrollTrigger?.refresh?.();
    };

    void loadGsap();

    return (): void => {
      cancelled = true;
      ctx?.revert();
    };
  }, [mergedConfig, configSignature]);

  if (!mergedConfig || mergedConfig.preset === 'none') {
    return <>{children}</>;
  }

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

const handleMotionPath = (
  gsap: any,
  targets: Element[],
  config: GsapAnimationConfig,
  root: HTMLElement,
  baseVars: any
): void => {
  if (config.motionPathEnabled) {
    const path = resolveMotionPath(config, root);
    if (path) {
      const motionPathVars = buildMotionPathVars(config, path);
      gsap.to(targets, { ...baseVars, motionPath: motionPathVars });
    }
  }
};
