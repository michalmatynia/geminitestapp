'use client';

import { useSyncExternalStore } from 'react';

const KANGUR_COARSE_POINTER_QUERY = '(pointer: coarse)';
const KANGUR_HOVER_NONE_QUERY = '(hover: none)';
const KANGUR_MOBILE_MAX_WIDTH = 639;
const KANGUR_MOBILE_MEDIA_QUERY = `(max-width: ${KANGUR_MOBILE_MAX_WIDTH}px)`;

type KangurMobileEnvironmentSnapshot = {
  isCoarsePointer: boolean;
  isMobileViewport: boolean;
};

const DEFAULT_KANGUR_MOBILE_ENVIRONMENT_SNAPSHOT: KangurMobileEnvironmentSnapshot = {
  isCoarsePointer: false,
  isMobileViewport: false,
};

let kangurMobileEnvironmentSnapshot = DEFAULT_KANGUR_MOBILE_ENVIRONMENT_SNAPSHOT;
const listeners = new Set<() => void>();
let stopKangurMobileEnvironmentSync: (() => void) | null = null;

const resolveViewportWidth = (): number => {
  if (typeof window === 'undefined') {
    return Number.POSITIVE_INFINITY;
  }

  const visualViewportWidth = window.visualViewport?.width;
  return Math.min(window.innerWidth, visualViewportWidth ?? window.innerWidth);
};

const resolveCoarsePointer = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const matchesCoarsePointer =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_COARSE_POINTER_QUERY).matches
      : false;

  if (matchesCoarsePointer) {
    return true;
  }

  const maxTouchPoints =
    typeof navigator === 'undefined' ? 0 : Math.max(navigator.maxTouchPoints ?? 0, 0);
  const prefersTouchOnlyInteraction =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_HOVER_NONE_QUERY).matches
      : false;

  return maxTouchPoints > 0 && prefersTouchOnlyInteraction;
};

const resolveMobileViewport = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const viewportWidth = resolveViewportWidth();
  const matchesMedia =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_MOBILE_MEDIA_QUERY).matches
      : viewportWidth <= KANGUR_MOBILE_MAX_WIDTH;

  return matchesMedia && viewportWidth <= KANGUR_MOBILE_MAX_WIDTH;
};

const resolveKangurMobileEnvironmentSnapshot = (): KangurMobileEnvironmentSnapshot => ({
  isCoarsePointer: resolveCoarsePointer(),
  isMobileViewport: resolveMobileViewport(),
});

const areSnapshotsEqual = (
  left: KangurMobileEnvironmentSnapshot,
  right: KangurMobileEnvironmentSnapshot
): boolean =>
  left.isCoarsePointer === right.isCoarsePointer &&
  left.isMobileViewport === right.isMobileViewport;

const emitKangurMobileEnvironment = (): void => {
  listeners.forEach((listener) => listener());
};

const refreshKangurMobileEnvironmentSnapshot = (): KangurMobileEnvironmentSnapshot => {
  const nextSnapshot = resolveKangurMobileEnvironmentSnapshot();
  if (!areSnapshotsEqual(kangurMobileEnvironmentSnapshot, nextSnapshot)) {
    kangurMobileEnvironmentSnapshot = nextSnapshot;
  }
  return kangurMobileEnvironmentSnapshot;
};

const handleKangurMobileEnvironmentChange = (): void => {
  const previousSnapshot = kangurMobileEnvironmentSnapshot;
  const nextSnapshot = refreshKangurMobileEnvironmentSnapshot();
  if (!areSnapshotsEqual(previousSnapshot, nextSnapshot)) {
    emitKangurMobileEnvironment();
  }
};

const watchMediaQuery = (
  media: MediaQueryList | null,
  listener: () => void,
  cleanups: Array<() => void>
): void => {
  if (!media) {
    return;
  }

  if (typeof media.addEventListener === 'function') {
    media.addEventListener('change', listener);
    cleanups.push(() => media.removeEventListener('change', listener));
    return;
  }

  if (typeof media.addListener === 'function') {
    media.addListener(listener);
    cleanups.push(() => media.removeListener(listener));
  }
};

const startKangurMobileEnvironmentSync = (): (() => void) => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const cleanups: Array<() => void> = [];
  const coarseMedia =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_COARSE_POINTER_QUERY)
      : null;
  const hoverMedia =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_HOVER_NONE_QUERY)
      : null;
  const mobileMedia =
    typeof window.matchMedia === 'function'
      ? window.matchMedia(KANGUR_MOBILE_MEDIA_QUERY)
      : null;

  watchMediaQuery(coarseMedia, handleKangurMobileEnvironmentChange, cleanups);
  watchMediaQuery(hoverMedia, handleKangurMobileEnvironmentChange, cleanups);
  watchMediaQuery(mobileMedia, handleKangurMobileEnvironmentChange, cleanups);

  window.addEventListener('resize', handleKangurMobileEnvironmentChange, { passive: true });
  cleanups.push(() =>
    window.removeEventListener('resize', handleKangurMobileEnvironmentChange)
  );

  window.addEventListener('orientationchange', handleKangurMobileEnvironmentChange);
  cleanups.push(() =>
    window.removeEventListener('orientationchange', handleKangurMobileEnvironmentChange)
  );

  const visualViewport = window.visualViewport;
  if (visualViewport) {
    visualViewport.addEventListener('resize', handleKangurMobileEnvironmentChange);
    cleanups.push(() =>
      visualViewport.removeEventListener('resize', handleKangurMobileEnvironmentChange)
    );
  }

  return () => {
    cleanups.forEach((cleanup) => cleanup());
  };
};

const subscribeToKangurMobileEnvironment = (listener: () => void): (() => void) => {
  listeners.add(listener);

  if (listeners.size === 1) {
    kangurMobileEnvironmentSnapshot = resolveKangurMobileEnvironmentSnapshot();
    stopKangurMobileEnvironmentSync = startKangurMobileEnvironmentSync();
  }

  return () => {
    listeners.delete(listener);

    if (listeners.size === 0) {
      stopKangurMobileEnvironmentSync?.();
      stopKangurMobileEnvironmentSync = null;
    }
  };
};

const getKangurMobileEnvironmentSnapshot = (): KangurMobileEnvironmentSnapshot =>
  refreshKangurMobileEnvironmentSnapshot();

const getKangurCoarsePointerSnapshot = (): boolean =>
  getKangurMobileEnvironmentSnapshot().isCoarsePointer;

const getKangurMobileBreakpointSnapshot = (): boolean =>
  getKangurMobileEnvironmentSnapshot().isMobileViewport;

const getKangurMobileEnvironmentServerSnapshot = (): KangurMobileEnvironmentSnapshot =>
  DEFAULT_KANGUR_MOBILE_ENVIRONMENT_SNAPSHOT;

export const useKangurCoarsePointer = (): boolean =>
  useSyncExternalStore(
    subscribeToKangurMobileEnvironment,
    getKangurCoarsePointerSnapshot,
    () => getKangurMobileEnvironmentServerSnapshot().isCoarsePointer
  );

export const useKangurMobileBreakpoint = (): boolean =>
  useSyncExternalStore(
    subscribeToKangurMobileEnvironment,
    getKangurMobileBreakpointSnapshot,
    () => getKangurMobileEnvironmentServerSnapshot().isMobileViewport
  );
