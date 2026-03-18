'use client';

import { useCallback, useEffect, useRef } from 'react';

const MOBILE_MEDIA_QUERY = '(max-width: 639px)';
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

const isMobileViewport = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia === 'function') {
    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  }
  return window.innerWidth <= 639;
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
  if (!isMobileViewport()) {
    return;
  }

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

  if (!isMobileViewport()) {
    lockReferenceCount = 0;
    if (preventScrollListenerAttached) {
      document.removeEventListener('touchmove', preventDefaultScrollable, { capture: true });
      document.removeEventListener('wheel', preventDefaultScrollable, { capture: true });
      preventScrollListenerAttached = false;
    }
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
  const isMobile = window.matchMedia?.(MOBILE_MEDIA_QUERY).matches ?? false;
  const isLockedRef = useRef(false);

  const lock = useCallback((): void => {
    if (!isMobile || isLockedRef.current) {
      return;
    }
    isLockedRef.current = true;
    lockKangurMobileInteractionScroll();
  }, [isMobile]);

  const unlock = useCallback((): void => {
    if (!isLockedRef.current) {
      return;
    }
    isLockedRef.current = false;
    unlockKangurMobileInteractionScroll();
  }, []);

  useEffect(() => {
    if (!isMobile && isLockedRef.current) {
      isLockedRef.current = false;
      unlockKangurMobileInteractionScroll();
    }

    return () => {
      if (isLockedRef.current) {
        isLockedRef.current = false;
        unlockKangurMobileInteractionScroll();
      }
    };
  }, [isMobile, unlock]);

  return { lock, unlock };
};
