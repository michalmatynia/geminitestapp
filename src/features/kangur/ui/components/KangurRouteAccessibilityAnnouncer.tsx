'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';

type KangurAccessibilityTranslations = (
  key: string,
  values?: Record<string, string | number>
) => string;

const KANGUR_ACCESSIBILITY_PAGE_LABELS = {
  Competition: 'accessibility.pages.Competition',
  Duels: 'accessibility.pages.Duels',
  Game: 'accessibility.pages.Game',
  GamesLibrary: 'accessibility.pages.GamesLibrary',
  LearnerProfile: 'accessibility.pages.LearnerProfile',
  Lessons: 'accessibility.pages.Lessons',
  ParentDashboard: 'accessibility.pages.ParentDashboard',
  Tests: 'accessibility.pages.Tests',
} as const satisfies Record<string, string>;

const isKnownKangurAccessibilityPage = (
  pageKey: string
): pageKey is keyof typeof KANGUR_ACCESSIBILITY_PAGE_LABELS =>
  pageKey in KANGUR_ACCESSIBILITY_PAGE_LABELS;

const focusKangurMainRegion = (): void => {
  if (typeof document === 'undefined') {
    return;
  }

  const mainRegion =
    document.querySelector<HTMLElement>('[data-kangur-route-main="true"]') ??
    document.querySelector<HTMLElement>('main, [role="main"]');

  if (!mainRegion) {
    return;
  }

  withKangurClientErrorSync(
    {
      source: 'kangur-route-accessibility-announcer',
      action: 'focus-main-region',
      description: 'Move focus to the main region after navigation.',
    },
    () => {
      mainRegion.focus({ preventScroll: true });
      return true;
    },
    {
      fallback: () => {
        mainRegion.focus();
        return false;
      },
    }
  );
};

const scheduleKangurMainRegionFocus = (): (() => void) | undefined => {
  if (typeof window === 'undefined') {
    return undefined;
  }

  const frameId = window.requestAnimationFrame(() => {
    focusKangurMainRegion();
  });

  return () => {
    window.cancelAnimationFrame(frameId);
  };
};

const resolveAnnouncementLabel = (
  pageKey: string | null | undefined,
  translate: KangurAccessibilityTranslations
): string => {
  const normalizedPageKey = pageKey?.trim() ?? '';
  if (isKnownKangurAccessibilityPage(normalizedPageKey)) {
    return translate(KANGUR_ACCESSIBILITY_PAGE_LABELS[normalizedPageKey]);
  }

  return translate('accessibility.pages.default');
};

const shouldAnnounceRequestedRouteChange = ({
  previousRequestedHref,
  previousRequestedPath,
  requestedHref,
  requestedPath,
}: {
  previousRequestedHref: string | undefined;
  previousRequestedPath: string | undefined;
  requestedHref: string | undefined;
  requestedPath: string | undefined;
}): boolean => {
  const pathChanged = Boolean(previousRequestedPath && previousRequestedPath !== requestedPath);
  const hrefChanged = Boolean(previousRequestedHref && previousRequestedHref !== requestedHref);
  return pathChanged || hrefChanged;
};

const isLocaleSwitchRouteAnnouncement = ({
  previousRequestedHref,
  previousRequestedPath,
  requestedHref,
  requestedPath,
  routeTransitionKind,
}: {
  previousRequestedHref: string | undefined;
  previousRequestedPath: string | undefined;
  requestedHref: string | undefined;
  requestedPath: string | undefined;
  routeTransitionKind: string | null | undefined;
}): boolean => {
  if (routeTransitionKind === 'locale-switch') {
    return true;
  }

  const didPathStayTheSame = !previousRequestedPath || previousRequestedPath === requestedPath;
  return didPathStayTheSame && previousRequestedHref !== undefined && previousRequestedHref !== requestedHref;
};

const resolveKangurRouteAnnouncement = ({
  pageKey,
  requestedHref,
  requestedPath,
  previousRequestedHref,
  previousRequestedPath,
  routeTransitionKind,
  translate,
}: {
  pageKey: string | null | undefined;
  requestedHref: string | undefined;
  requestedPath: string | undefined;
  previousRequestedHref: string | undefined;
  previousRequestedPath: string | undefined;
  routeTransitionKind: string | null | undefined;
  translate: KangurAccessibilityTranslations;
}): string | null => {
  if (!requestedPath && !requestedHref) {
    return null;
  }

  if (
    !shouldAnnounceRequestedRouteChange({
      previousRequestedHref,
      previousRequestedPath,
      requestedHref,
      requestedPath,
    })
  ) {
    return null;
  }

  const label = resolveAnnouncementLabel(pageKey, translate);
  const isLocaleSwitch = isLocaleSwitchRouteAnnouncement({
    previousRequestedHref,
    previousRequestedPath,
    requestedHref,
    requestedPath,
    routeTransitionKind,
  });

  return isLocaleSwitch
    ? translate('accessibility.languageSwitchAnnouncement', { label })
    : translate('accessibility.pageAnnouncement', { label });
};

export function KangurRouteAccessibilityAnnouncer(): React.JSX.Element {
  const translations = useTranslations('KangurPublic');
  const { pageKey, requestedHref, requestedPath } = useKangurRouting();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const previousRequestedPathRef = useRef<string | undefined>(requestedPath);
  const previousRequestedHrefRef = useRef<string | undefined>(requestedHref);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const previousRequestedPath = previousRequestedPathRef.current;
    const previousRequestedHref = previousRequestedHrefRef.current;
    previousRequestedPathRef.current = requestedPath;
    previousRequestedHrefRef.current = requestedHref;

    const nextAnnouncement = resolveKangurRouteAnnouncement({
      pageKey,
      requestedHref,
      requestedPath,
      previousRequestedHref,
      previousRequestedPath,
      routeTransitionKind: routeTransitionState?.activeTransitionKind,
      translate: translations,
    });
    if (!nextAnnouncement) {
      return;
    }

    setAnnouncement(nextAnnouncement);
    return scheduleKangurMainRegionFocus();
  }, [
    pageKey,
    requestedHref,
    requestedPath,
    routeTransitionState?.activeTransitionKind,
    translations,
  ]);

  return (
    <div aria-atomic='true' aria-live='polite' className='sr-only' role='status'>
      {announcement}
    </div>
  );
}
