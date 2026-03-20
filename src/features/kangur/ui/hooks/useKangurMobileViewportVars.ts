'use client';

import { useLayoutEffect } from 'react';

const KANGUR_SHELL_VIEWPORT_HEIGHT_VAR = '--kangur-shell-viewport-height';
const KANGUR_MOBILE_BOTTOM_CLEARANCE_VAR = '--kangur-mobile-bottom-clearance';

type ViewportVarTarget = HTMLElement;

const getViewportVarTargets = (): ViewportVarTarget[] => {
  if (typeof document === 'undefined') {
    return [];
  }

  const targets: ViewportVarTarget[] = [];
  const appContent = document.getElementById('app-content');

  if (document.documentElement instanceof HTMLElement) {
    targets.push(document.documentElement);
  }
  if (document.body instanceof HTMLElement) {
    targets.push(document.body);
  }
  if (appContent instanceof HTMLElement) {
    targets.push(appContent);
  }

  return targets;
};

const buildBottomClearanceValue = (bottomGap: number): string =>
  bottomGap > 0
    ? `calc(env(safe-area-inset-bottom) + ${bottomGap}px)`
    : 'env(safe-area-inset-bottom)';

export const useKangurMobileViewportVars = (): void => {
  useLayoutEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return undefined;
    }

    const targets = getViewportVarTargets();
    if (targets.length === 0) {
      return undefined;
    }

    const previousValues = new Map<
      ViewportVarTarget,
      { bottomClearance: string; viewportHeight: string }
    >(
      targets.map((target) => [
        target,
        {
          bottomClearance: target.style.getPropertyValue(KANGUR_MOBILE_BOTTOM_CLEARANCE_VAR),
          viewportHeight: target.style.getPropertyValue(KANGUR_SHELL_VIEWPORT_HEIGHT_VAR),
        },
      ])
    );

    const syncViewportVars = (): void => {
      const visualViewport = window.visualViewport;
      const viewportHeight = Math.round(visualViewport?.height ?? window.innerHeight);
      const viewportOffsetTop = Math.max(0, Math.round(visualViewport?.offsetTop ?? 0));
      const viewportBottomGap = Math.max(
        0,
        Math.round(window.innerHeight - viewportHeight - viewportOffsetTop)
      );
      const bottomClearance = buildBottomClearanceValue(viewportBottomGap);

      targets.forEach((target) => {
        target.style.setProperty(KANGUR_SHELL_VIEWPORT_HEIGHT_VAR, `${viewportHeight}px`);
        target.style.setProperty(KANGUR_MOBILE_BOTTOM_CLEARANCE_VAR, bottomClearance);
      });
    };

    syncViewportVars();

    const visualViewport = window.visualViewport;
    window.addEventListener('resize', syncViewportVars);
    window.addEventListener('orientationchange', syncViewportVars);
    visualViewport?.addEventListener('resize', syncViewportVars);
    visualViewport?.addEventListener('scroll', syncViewportVars);

    return () => {
      window.removeEventListener('resize', syncViewportVars);
      window.removeEventListener('orientationchange', syncViewportVars);
      visualViewport?.removeEventListener('resize', syncViewportVars);
      visualViewport?.removeEventListener('scroll', syncViewportVars);

      previousValues.forEach((value, target) => {
        if (value.viewportHeight.length > 0) {
          target.style.setProperty(KANGUR_SHELL_VIEWPORT_HEIGHT_VAR, value.viewportHeight);
        } else {
          target.style.removeProperty(KANGUR_SHELL_VIEWPORT_HEIGHT_VAR);
        }

        if (value.bottomClearance.length > 0) {
          target.style.setProperty(KANGUR_MOBILE_BOTTOM_CLEARANCE_VAR, value.bottomClearance);
        } else {
          target.style.removeProperty(KANGUR_MOBILE_BOTTOM_CLEARANCE_VAR);
        }
      });
    };
  }, []);
};
