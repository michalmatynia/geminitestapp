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

const resolveAnnouncementLabel = (
  pageKey: string | null | undefined,
  translate: KangurAccessibilityTranslations
): string => {
  const normalizedPageKey = pageKey?.trim();

  switch (normalizedPageKey) {
    case 'Competition':
      return translate('accessibility.pages.Competition');
    case 'Game':
      return translate('accessibility.pages.Game');
    case 'GamesLibrary':
      return translate('accessibility.pages.GamesLibrary');
    case 'Lessons':
      return translate('accessibility.pages.Lessons');
    case 'Tests':
      return translate('accessibility.pages.Tests');
    case 'LearnerProfile':
      return translate('accessibility.pages.LearnerProfile');
    case 'ParentDashboard':
      return translate('accessibility.pages.ParentDashboard');
    case 'Duels':
      return translate('accessibility.pages.Duels');
    default:
      return translate('accessibility.pages.default');
  }
};

export function KangurRouteAccessibilityAnnouncer(): React.JSX.Element {
  const translations = useTranslations('KangurPublic');
  const { pageKey, requestedHref, requestedPath } = useKangurRouting();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const previousRequestedPathRef = useRef<string | undefined>(requestedPath);
  const previousRequestedHrefRef = useRef<string | undefined>(requestedHref);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!requestedPath && !requestedHref) {
      return;
    }

    const previousRequestedPath = previousRequestedPathRef.current;
    const previousRequestedHref = previousRequestedHrefRef.current;
    previousRequestedPathRef.current = requestedPath;
    previousRequestedHrefRef.current = requestedHref;

    const pathChanged = Boolean(previousRequestedPath && previousRequestedPath !== requestedPath);
    const hrefChanged = Boolean(previousRequestedHref && previousRequestedHref !== requestedHref);
    if (!pathChanged && !hrefChanged) {
      return;
    }

    const label = resolveAnnouncementLabel(pageKey, translations);
    const isLocaleSwitch =
      routeTransitionState?.activeTransitionKind === 'locale-switch' ||
      (!pathChanged && hrefChanged);

    setAnnouncement(
      isLocaleSwitch
        ? translations('accessibility.languageSwitchAnnouncement', { label })
        : translations('accessibility.pageAnnouncement', { label })
    );

    if (typeof window === 'undefined') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      focusKangurMainRegion();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
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
