'use client';

import { useEffect } from 'react';
import type { KangurAiTutorWidgetState } from '../ai-tutor-widget/KangurAiTutorWidget.state';

export function useTutorNavigationLifecycle({
  mounted,
  routingPageKey,
  shouldTrackViewportScroll,
  widgetState,
}: {
  mounted: boolean;
  routingPageKey?: string | null;
  shouldTrackViewportScroll: boolean;
  widgetState: KangurAiTutorWidgetState;
}) {
  const {
    suppressAvatarClickRef,
    setViewportTick,
  } = widgetState;

  useEffect(() => {
    if (!mounted) return;
    suppressAvatarClickRef.current = false;
  }, [mounted, routingPageKey, suppressAvatarClickRef]);

  useEffect(() => {
    if (!mounted) return;
    let rafId = 0;
    const handleViewportChange = (): void => {
      cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(() => {
        setViewportTick((current) => current + 1);
      });
    };
    window.addEventListener('resize', handleViewportChange);
    if (shouldTrackViewportScroll) {
      window.addEventListener('scroll', handleViewportChange, { capture: true, passive: true });
    }
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', handleViewportChange);
      if (shouldTrackViewportScroll) {
        window.removeEventListener('scroll', handleViewportChange, true);
      }
    };
  }, [mounted, setViewportTick, shouldTrackViewportScroll]);
}
