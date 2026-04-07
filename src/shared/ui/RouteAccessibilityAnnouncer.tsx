'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';


const DEFAULT_PATH_LABEL = 'Home';
const DEFAULT_ANNOUNCEMENT_LABEL = 'Current page';
const DEFAULT_DOCUMENT_TITLE = 'StudiQ';

const trimText = (value: string | null | undefined): string => value?.replace(/\s+/g, ' ').trim() ?? '';

const getMainRegion = (): HTMLElement | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const mainRegion =
    document.getElementById('kangur-main-content') ??
    document.getElementById('app-content') ??
    document.querySelector<HTMLElement>('main, [role="main"]');

  return mainRegion instanceof HTMLElement ? mainRegion : null;
};

const focusMainRegion = (): void => {
  const mainRegion = getMainRegion();
  if (!mainRegion) {
    return;
  }

  try {
    mainRegion.focus({ preventScroll: true });
  } catch (error) {
    logClientCatch(error, {
      source: 'RouteAccessibilityAnnouncer',
      action: 'focusMainRegion',
      level: 'warn',
    });
    mainRegion.focus();
  }
};

const getHeadingLabel = (): string => {
  if (typeof document === 'undefined') {
    return '';
  }

  const heading = document.querySelector<HTMLElement>(
    '#kangur-main-content h1, #kangur-main-content [role="heading"][aria-level="1"], #kangur-main-content h2, #kangur-main-content [role="heading"][aria-level="2"], #app-content h1, #app-content [role="heading"][aria-level="1"], #app-content h2, #app-content [role="heading"][aria-level="2"]'
  );

  return trimText(heading?.textContent);
};

const getDocumentTitleLabel = (): string => {
  if (typeof document === 'undefined') {
    return '';
  }

  const title = trimText(document.title);
  return title === DEFAULT_DOCUMENT_TITLE ? '' : title;
};

const buildPathLabel = (pathname: string | null): string => {
  if (!pathname || pathname === '/') {
    return DEFAULT_PATH_LABEL;
  }

  const segments = pathname
    .split('/')
    .filter(Boolean)
    .map((segment) =>
      decodeURIComponent(segment)
        .replace(/[-_]+/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase())
    );

  return segments.join(' / ') || DEFAULT_PATH_LABEL;
};

const resolveAnnouncementLabel = (pathname: string | null): string =>
  getHeadingLabel() || getDocumentTitleLabel() || buildPathLabel(pathname) || DEFAULT_ANNOUNCEMENT_LABEL;

export function RouteAccessibilityAnnouncer(): React.JSX.Element {
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(pathname);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;

    if (!pathname || !previousPathname || previousPathname === pathname) {
      return;
    }

    setAnnouncement('');

    const frameId = window.requestAnimationFrame(() => {
      setAnnouncement(resolveAnnouncementLabel(pathname));
      focusMainRegion();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [pathname]);

  return (
    <div aria-atomic='true' aria-live='polite' className='sr-only' role='status'>
      {announcement}
    </div>
  );
}
