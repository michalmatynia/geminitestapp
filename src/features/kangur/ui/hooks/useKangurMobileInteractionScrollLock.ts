'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useKangurCoarsePointer } from './useKangurCoarsePointer';
import { useKangurMobileBreakpoint } from './useKangurMobileBreakpoint';

const PREV_TARGET_KEY_PREFIX = 'kangurMobileInteractionScrollLockPrev';
const LOCK_STATE_DATA_KEY = 'kangurMobileInteractionScrollLockActive';

type StyleProperty = 'overflow' | 'overscroll-behavior-y' | 'touch-action';
type LockTarget = {
  html: HTMLElement;
  body: HTMLElement;
  app?: HTMLElement;
};

let lockReferenceCount = 0;
let preventScrollListenerAttached = false;

const getLockTargets = (): LockTarget | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const html = document.documentElement;
  const body = document.body;
  const app = document.getElementById('app-content');

  if (!(html instanceof HTMLElement) || !(body instanceof HTMLElement)) {
    return null;
  }

  return {
    html,
    body,
    app: app instanceof HTMLElement ? app : undefined,
  };
};

const getDatasetKey = (target: 'html' | 'body' | 'app', property: StyleProperty): string => {
  if (property === 'overflow') {
    return `${PREV_TARGET_KEY_PREFIX}${target}Overflow`;
  }
  if (property === 'overscroll-behavior-y') {
    return `${PREV_TARGET_KEY_PREFIX}${target}OverscrollBehaviorY`;
  }
  return `${PREV_TARGET_KEY_PREFIX}${target}TouchAction`;
};

const rememberInlineStyle = (
  element: HTMLElement,
  property: StyleProperty,
  propertyValue: string,
  targetKey: 'html' | 'body' | 'app'
): void => {
  const key = getDatasetKey(targetKey, property);
  if (!(key in element.dataset)) {
    element.dataset[key] = element.style.getPropertyValue(property);
  }
  element.style.setProperty(property, propertyValue);
};

const restoreInlineStyle = (
  element: HTMLElement,
  property: StyleProperty,
  targetKey: 'html' | 'body' | 'app'
): void => {
  const key = getDatasetKey(targetKey, property);
  const previousValue = element.dataset[key] ?? '';
  if (previousValue.length > 0) {
    element.style.setProperty(property, previousValue);
  } else {
    element.style.removeProperty(property);
  }
  delete element.dataset[key];
};

const applyInteractionLockStyles = (targets: LockTarget): void => {
  rememberInlineStyle(targets.html, 'overflow', 'hidden', 'html');
  rememberInlineStyle(targets.body, 'overflow', 'hidden', 'body');
  rememberInlineStyle(targets.html, 'overscroll-behavior-y', 'none', 'html');
  rememberInlineStyle(targets.body, 'overscroll-behavior-y', 'none', 'body');
  rememberInlineStyle(targets.html, 'touch-action', 'none', 'html');
  rememberInlineStyle(targets.body, 'touch-action', 'none', 'body');

  if (targets.app) {
    rememberInlineStyle(targets.app, 'overflow', 'hidden', 'app');
    rememberInlineStyle(targets.app, 'touch-action', 'none', 'app');
    rememberInlineStyle(targets.app, 'overscroll-behavior-y', 'none', 'app');
  }
  if (targets.html instanceof HTMLElement) {
    targets.html.dataset[LOCK_STATE_DATA_KEY] = 'true';
  }
};

const clearInteractionLockStyles = (targets: LockTarget): void => {
  restoreInlineStyle(targets.html, 'overflow', 'html');
  restoreInlineStyle(targets.body, 'overflow', 'body');
  restoreInlineStyle(targets.html, 'overscroll-behavior-y', 'html');
  restoreInlineStyle(targets.body, 'overscroll-behavior-y', 'body');
  restoreInlineStyle(targets.html, 'touch-action', 'html');
  restoreInlineStyle(targets.body, 'touch-action', 'body');

  if (targets.app) {
    restoreInlineStyle(targets.app, 'overflow', 'app');
    restoreInlineStyle(targets.app, 'touch-action', 'app');
    restoreInlineStyle(targets.app, 'overscroll-behavior-y', 'app');
  }

  delete targets.html.dataset[LOCK_STATE_DATA_KEY];
};

const preventDefaultScrollable = (event: Event): void => {
  if (event.cancelable) {
    event.preventDefault();
  }
};

const lockKangurMobileInteractionScroll = (): void => {
  const targets = getLockTargets();
  if (!targets) {
    return;
  }

  if (lockReferenceCount === 0) {
    applyInteractionLockStyles(targets);
  }

  lockReferenceCount += 1;

  if (!preventScrollListenerAttached) {
    document.addEventListener('touchmove', preventDefaultScrollable, { capture: true, passive: false });
    document.addEventListener('wheel', preventDefaultScrollable, { capture: true, passive: false });
    preventScrollListenerAttached = true;
  }
};

const unlockKangurMobileInteractionScroll = (): void => {
  if (lockReferenceCount <= 0) {
    return;
  }

  lockReferenceCount -= 1;

  if (lockReferenceCount > 0) {
    return;
  }

  const targets = getLockTargets();
  if (targets) {
    clearInteractionLockStyles(targets);
  }
  document.removeEventListener('touchmove', preventDefaultScrollable, { capture: true });
  document.removeEventListener('wheel', preventDefaultScrollable, { capture: true });
  preventScrollListenerAttached = false;
};

export const useKangurMobileInteractionScrollLock = (): {
  lock: () => void;
  unlock: () => void;
} => {
  const isCoarsePointer = useKangurCoarsePointer();
  const isMobileBreakpoint = useKangurMobileBreakpoint();
  const shouldEnableLock = isCoarsePointer || isMobileBreakpoint;
  const isLockedRef = useRef(false);

  const lock = useCallback((): void => {
    if (isLockedRef.current || !shouldEnableLock) {
      return;
    }
    isLockedRef.current = true;
    lockKangurMobileInteractionScroll();
  }, [shouldEnableLock]);

  const unlock = useCallback((): void => {
    if (!isLockedRef.current) {
      return;
    }
    isLockedRef.current = false;
    unlockKangurMobileInteractionScroll();
  }, []);

  useEffect(() => {
    if (!shouldEnableLock && isLockedRef.current) {
      isLockedRef.current = false;
      unlockKangurMobileInteractionScroll();
    }

    return () => {
      if (isLockedRef.current) {
        isLockedRef.current = false;
        unlockKangurMobileInteractionScroll();
      }
    };
  }, [shouldEnableLock, unlock]);

  return { lock, unlock };
};
