'use client';

export const KANGUR_LEGACY_APP_CONTENT_ID = 'app-content';
export const KANGUR_MAIN_CONTENT_ID = 'kangur-main-content';

export const getKangurAppContentElement = (): HTMLElement | null => {
  if (typeof document === 'undefined') {
    return null;
  }

  const appContent = document.getElementById(KANGUR_LEGACY_APP_CONTENT_ID);
  if (appContent instanceof HTMLElement) {
    return appContent;
  }

  const mainContent = document.getElementById(KANGUR_MAIN_CONTENT_ID);
  return mainContent instanceof HTMLElement ? mainContent : null;
};

export const isKangurAppContentElement = (element: HTMLElement): boolean =>
  element.id === KANGUR_LEGACY_APP_CONTENT_ID || element.id === KANGUR_MAIN_CONTENT_ID;
