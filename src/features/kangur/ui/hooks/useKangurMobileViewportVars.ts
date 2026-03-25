'use client';

import { useLayoutEffect } from 'react';

const KANGUR_SHELL_VIEWPORT_HEIGHT_VAR = '--kangur-shell-viewport-height';
const KANGUR_MOBILE_BOTTOM_CLEARANCE_VAR = '--kangur-mobile-bottom-clearance';
const KANGUR_MOBILE_MEDIA_QUERY = '(max-width: 639px)';

type ViewportVarTarget = HTMLElement;
type ViewportVarValues = {
  bottomClearance: string;
  viewportHeight: string;
};

const getViewportVarTarget = (): ViewportVarTarget | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  return document.documentElement instanceof HTMLElement ? document.documentElement : null;
};

const buildBottomClearanceValue = (bottomGap: number): string =>
  bottomGap > 0
    ? `calc(env(safe-area-inset-bottom) + ${bottomGap}px)`
    : 'env(safe-area-inset-bottom)';

const getViewportWidth = (): number => {
  if (typeof window === 'undefined') {
    return Number.POSITIVE_INFINITY;
  }

  const visualViewportWidth = window.visualViewport?.width;
  return Math.min(window.innerWidth, visualViewportWidth ?? window.innerWidth);
};

const shouldApplyDynamicViewportVars = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const visualViewport = window.visualViewport;
  if (!visualViewport) {
    return false;
  }

  const viewportWidth = getViewportWidth();
  const matchesMobileViewport =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_MOBILE_MEDIA_QUERY).matches
      : viewportWidth <= 639;
  const viewportHeight = Math.round(visualViewport.height ?? window.innerHeight);
  const viewportOffsetTop = Math.max(0, Math.round(visualViewport.offsetTop ?? 0));

  return (
    matchesMobileViewport ||
    viewportHeight !== Math.round(window.innerHeight) ||
    viewportOffsetTop > 0
  );
};

const resolveViewportVarValues = (): ViewportVarValues => {
  const visualViewport = window.visualViewport;
  const viewportHeight = Math.round(visualViewport?.height ?? window.innerHeight);
  const viewportOffsetTop = Math.max(0, Math.round(visualViewport?.offsetTop ?? 0));
  const viewportBottomGap = Math.max(
    0,
    Math.round(window.innerHeight - viewportHeight - viewportOffsetTop)
  );

  return {
    viewportHeight: `${viewportHeight}px`,
    bottomClearance: buildBottomClearanceValue(viewportBottomGap),
  };
};

export const useKangurMobileViewportVars = (): void => {
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const target = getViewportVarTarget();
    if (!target) {
      return undefined;
    }

    const previousValues = {
      bottomClearance: target.style.getPropertyValue(KANGUR_MOBILE_BOTTOM_CLEARANCE_VAR),
      viewportHeight: target.style.getPropertyValue(KANGUR_SHELL_VIEWPORT_HEIGHT_VAR),
    };
    let appliedValues: ViewportVarValues | null = null;
    let animationFrameId: number | null = null;

    const clearViewportVars = (): void => {
      if (appliedValues === null) {
        return;
      }

      appliedValues = null;
      target.style.removeProperty(KANGUR_SHELL_VIEWPORT_HEIGHT_VAR);
      target.style.removeProperty(KANGUR_MOBILE_BOTTOM_CLEARANCE_VAR);
    };

    const syncViewportVars = (): void => {
      if (!shouldApplyDynamicViewportVars()) {
        clearViewportVars();
        return;
      }

      const nextValues = resolveViewportVarValues();
      if (
        appliedValues?.viewportHeight === nextValues.viewportHeight &&
        appliedValues?.bottomClearance === nextValues.bottomClearance
      ) {
        return;
      }

      appliedValues = nextValues;
      target.style.setProperty(KANGUR_SHELL_VIEWPORT_HEIGHT_VAR, nextValues.viewportHeight);
      target.style.setProperty(
        KANGUR_MOBILE_BOTTOM_CLEARANCE_VAR,
        nextValues.bottomClearance
      );
    };

    const scheduleViewportSync = (): void => {
      if (animationFrameId !== null) {
        return;
      }

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        syncViewportVars();
      });
    };

    syncViewportVars();

    const visualViewport = window.visualViewport;
    window.addEventListener('resize', scheduleViewportSync);
    window.addEventListener('orientationchange', scheduleViewportSync);
    visualViewport?.addEventListener('resize', scheduleViewportSync);

    return () => {
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      window.removeEventListener('resize', scheduleViewportSync);
      window.removeEventListener('orientationchange', scheduleViewportSync);
      visualViewport?.removeEventListener('resize', scheduleViewportSync);

      if (previousValues.viewportHeight.length > 0) {
        target.style.setProperty(KANGUR_SHELL_VIEWPORT_HEIGHT_VAR, previousValues.viewportHeight);
      } else {
        target.style.removeProperty(KANGUR_SHELL_VIEWPORT_HEIGHT_VAR);
      }

      if (previousValues.bottomClearance.length > 0) {
        target.style.setProperty(
          KANGUR_MOBILE_BOTTOM_CLEARANCE_VAR,
          previousValues.bottomClearance
        );
      } else {
        target.style.removeProperty(KANGUR_MOBILE_BOTTOM_CLEARANCE_VAR);
      }
    };
  }, []);
};
