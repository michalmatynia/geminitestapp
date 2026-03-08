'use client';

import { useLayoutEffect } from 'react';

export const KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME = 'kangur-route-transition-active';
export const KANGUR_ROUTE_TRANSITION_SCROLLBAR_GAP_VAR =
  '--kangur-route-transition-scrollbar-gap';
const KANGUR_ROUTE_TRANSITION_PREVIOUS_OVERFLOW_Y_DATA_KEY = 'kangurPrevOverflowY';
const KANGUR_ROUTE_TRANSITION_PREVIOUS_OVERSCROLL_BEHAVIOR_Y_DATA_KEY =
  'kangurPrevOverscrollBehaviorY';
const KANGUR_ROUTE_TRANSITION_PREVIOUS_PADDING_INLINE_END_DATA_KEY =
  'kangurPrevPaddingInlineEnd';
const KANGUR_ROUTE_TRANSITION_PREVIOUS_SCROLLBAR_GAP_DATA_KEY = 'kangurPrevScrollbarGap';

const getKangurSurfaceTargets = (): HTMLElement[] => {
  if (typeof document === 'undefined') {
    return [];
  }

  const appContent = document.getElementById('app-content');
  return [document.documentElement, document.body, appContent].filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  );
};

const rememberInlineStyle = (
  target: HTMLElement,
  propertyName: string,
  dataKey: string,
  value: string
): void => {
  if (!(dataKey in target.dataset)) {
    target.dataset[dataKey] = target.style.getPropertyValue(propertyName);
  }

  target.style.setProperty(propertyName, value);
};

const restoreInlineStyle = (
  target: HTMLElement,
  propertyName: string,
  dataKey: string
): void => {
  const previousValue = target.dataset[dataKey];
  if (typeof previousValue === 'string' && previousValue.length > 0) {
    target.style.setProperty(propertyName, previousValue);
  } else {
    target.style.removeProperty(propertyName);
  }
  delete target.dataset[dataKey];
};

export const setKangurRouteTransitionScrollLock = (active: boolean): void => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return;
  }

  const targets = getKangurSurfaceTargets();

  if (!active) {
    targets.forEach((target) => {
      target.classList.remove(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
      restoreInlineStyle(
        target,
        KANGUR_ROUTE_TRANSITION_SCROLLBAR_GAP_VAR,
        KANGUR_ROUTE_TRANSITION_PREVIOUS_SCROLLBAR_GAP_DATA_KEY
      );

      if (target === document.documentElement || target === document.body) {
        restoreInlineStyle(
          target,
          'overflow-y',
          KANGUR_ROUTE_TRANSITION_PREVIOUS_OVERFLOW_Y_DATA_KEY
        );
        restoreInlineStyle(
          target,
          'overscroll-behavior-y',
          KANGUR_ROUTE_TRANSITION_PREVIOUS_OVERSCROLL_BEHAVIOR_Y_DATA_KEY
        );
      }

      if (target.id === 'app-content') {
        restoreInlineStyle(
          target,
          'padding-inline-end',
          KANGUR_ROUTE_TRANSITION_PREVIOUS_PADDING_INLINE_END_DATA_KEY
        );
      }
    });
    return;
  }

  const scrollbarGap = Math.max(window.innerWidth - document.documentElement.clientWidth, 0);
  const scrollbarGapValue = `${scrollbarGap}px`;

  targets.forEach((target) => {
    target.classList.add(KANGUR_ROUTE_TRANSITION_ACTIVE_CLASSNAME);
    rememberInlineStyle(
      target,
      KANGUR_ROUTE_TRANSITION_SCROLLBAR_GAP_VAR,
      KANGUR_ROUTE_TRANSITION_PREVIOUS_SCROLLBAR_GAP_DATA_KEY,
      scrollbarGapValue
    );

    if (target === document.documentElement || target === document.body) {
      rememberInlineStyle(
        target,
        'overflow-y',
        KANGUR_ROUTE_TRANSITION_PREVIOUS_OVERFLOW_Y_DATA_KEY,
        'hidden'
      );
      rememberInlineStyle(
        target,
        'overscroll-behavior-y',
        KANGUR_ROUTE_TRANSITION_PREVIOUS_OVERSCROLL_BEHAVIOR_Y_DATA_KEY,
        'none'
      );
    }

    if (target.id === 'app-content') {
      rememberInlineStyle(
        target,
        'padding-inline-end',
        KANGUR_ROUTE_TRANSITION_PREVIOUS_PADDING_INLINE_END_DATA_KEY,
        scrollbarGapValue
      );
    }
  });
};

export const useKangurRouteTransitionScrollLock = (active: boolean): void => {
  useLayoutEffect(() => {
    setKangurRouteTransitionScrollLock(active);

    return () => {
      if (active) {
        setKangurRouteTransitionScrollLock(false);
      }
    };
  }, [active]);
};
