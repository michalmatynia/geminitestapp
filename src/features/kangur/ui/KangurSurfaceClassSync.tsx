'use client';

import { useEffect, type ReactNode } from 'react';

const KANGUR_ACTIVE_SURFACE_CLASSNAME = 'kangur-surface-active';
const KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER = 'scrollbar-gutter';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY =
  'kangurPrevSurfaceScrollbarGutter';

const getKangurSurfaceTargets = (): HTMLElement[] => {
  if (typeof document === 'undefined') {
    return [];
  }

  const appContent = document.getElementById('app-content');
  return [document.documentElement, document.body, appContent].filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  );
};

const applyKangurSurfaceStyle = (target: HTMLElement): void => {
  if (!(KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY in target.dataset)) {
    target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY] =
      target.style.getPropertyValue(KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER);
  }

  target.style.setProperty(KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER, 'stable');
};

const restoreKangurSurfaceStyle = (target: HTMLElement): void => {
  const previousValue =
    target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY];
  if (typeof previousValue === 'string' && previousValue.length > 0) {
    target.style.setProperty(KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER, previousValue);
  } else {
    target.style.removeProperty(KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER);
  }
  delete target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY];
};

export function KangurSurfaceClassSync({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  useEffect(() => {
    const targets = getKangurSurfaceTargets();
    targets.forEach((target) => {
      target.classList.add(KANGUR_ACTIVE_SURFACE_CLASSNAME);
      applyKangurSurfaceStyle(target);
    });

    return () => {
      targets.forEach((target) => {
        target.classList.remove(KANGUR_ACTIVE_SURFACE_CLASSNAME);
        restoreKangurSurfaceStyle(target);
      });
    };
  }, []);

  return <>{children}</>;
}
