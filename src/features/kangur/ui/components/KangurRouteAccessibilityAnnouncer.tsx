import { useEffect, useRef, useState } from 'react';

import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


const KANGUR_PAGE_ACCESSIBILITY_LABELS: Record<string, string> = {
  Game: 'Strona główna',
  Lessons: 'Lekcje',
  Tests: 'Testy',
  LearnerProfile: 'Profil ucznia',
  ParentDashboard: 'Panel rodzica',
};

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

  try {
    mainRegion.focus({ preventScroll: true });
  } catch (error) {
    logClientError(error);
    mainRegion.focus();
  }
};

const resolveAnnouncementLabel = (pageKey: string | null | undefined): string =>
  KANGUR_PAGE_ACCESSIBILITY_LABELS[pageKey ?? ''] ?? 'Strona Kangur';

export function KangurRouteAccessibilityAnnouncer(): React.JSX.Element {
  const { pageKey, requestedPath } = useKangurRouting();
  const previousRequestedPathRef = useRef<string | undefined>(requestedPath);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!requestedPath) {
      return;
    }

    const previousRequestedPath = previousRequestedPathRef.current;
    previousRequestedPathRef.current = requestedPath;

    if (!previousRequestedPath || previousRequestedPath === requestedPath) {
      return;
    }

    setAnnouncement(`Widok: ${resolveAnnouncementLabel(pageKey)}`);

    if (typeof window === 'undefined') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      focusKangurMainRegion();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pageKey, requestedPath]);

  return (
    <div aria-atomic='true' aria-live='polite' className='sr-only' role='status'>
      {announcement}
    </div>
  );
}
