'use client';

import { useEffect, useMemo, type ReactNode } from 'react';

import {
  resolveKangurStorefrontAppearance,
  useOptionalCmsStorefrontAppearance,
} from '@/features/cms/components/frontend/CmsStorefrontAppearance';

const KANGUR_ACTIVE_SURFACE_CLASSNAME = 'kangur-surface-active';
const KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER = 'scrollbar-gutter';
const KANGUR_ACTIVE_SURFACE_BACKGROUND = 'background';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY =
  'kangurPrevSurfaceScrollbarGutter';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_BACKGROUND_DATA_KEY = 'kangurPrevSurfaceBackground';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_VARS_DATA_KEY = 'kangurPrevSurfaceVars';

const getKangurSurfaceTargets = (): HTMLElement[] => {
  if (typeof document === 'undefined') {
    return [];
  }

  const appContent = document.getElementById('app-content');
  return [document.documentElement, document.body, appContent].filter(
    (element): element is HTMLElement => element instanceof HTMLElement
  );
};

const applyKangurSurfaceStyle = (
  target: HTMLElement,
  background: string,
  vars: Record<string, string>
): void => {
  if (!(KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY in target.dataset)) {
    target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY] =
      target.style.getPropertyValue(KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER);
  }
  if (!(KANGUR_ACTIVE_SURFACE_PREVIOUS_BACKGROUND_DATA_KEY in target.dataset)) {
    target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_BACKGROUND_DATA_KEY] =
      target.style.getPropertyValue(KANGUR_ACTIVE_SURFACE_BACKGROUND);
  }
  if (!(KANGUR_ACTIVE_SURFACE_PREVIOUS_VARS_DATA_KEY in target.dataset)) {
    const previousVars = Object.fromEntries(
      Object.keys(vars).map((key) => [key, target.style.getPropertyValue(key)])
    );
    target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_VARS_DATA_KEY] = JSON.stringify(previousVars);
  }

  target.style.setProperty(KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER, 'stable');
  target.style.setProperty(KANGUR_ACTIVE_SURFACE_BACKGROUND, background);
  Object.entries(vars).forEach(([key, value]) => {
    target.style.setProperty(key, value);
  });
};

const restoreKangurSurfaceStyle = (target: HTMLElement): void => {
  const previousValue =
    target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY];
  if (typeof previousValue === 'string' && previousValue.length > 0) {
    target.style.setProperty(KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER, previousValue);
  } else {
    target.style.removeProperty(KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER);
  }
  const previousBackground = target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_BACKGROUND_DATA_KEY];
  if (typeof previousBackground === 'string' && previousBackground.length > 0) {
    target.style.setProperty(KANGUR_ACTIVE_SURFACE_BACKGROUND, previousBackground);
  } else {
    target.style.removeProperty(KANGUR_ACTIVE_SURFACE_BACKGROUND);
  }
  const previousVars = target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_VARS_DATA_KEY];
  if (typeof previousVars === 'string' && previousVars.length > 0) {
    try {
      const parsed = JSON.parse(previousVars) as Record<string, string>;
      Object.entries(parsed).forEach(([key, value]) => {
        if (value.length > 0) {
          target.style.setProperty(key, value);
        } else {
          target.style.removeProperty(key);
        }
      });
    } catch {
      // Ignore malformed restore payloads and fall back to removing injected vars.
    }
  }
  delete target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY];
  delete target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_BACKGROUND_DATA_KEY];
  delete target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_VARS_DATA_KEY];
};

export function KangurSurfaceClassSync({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();
  const kangurAppearance = useMemo(
    () => resolveKangurStorefrontAppearance(appearance?.mode ?? 'default'),
    [appearance?.mode]
  );

  useEffect(() => {
    const targets = getKangurSurfaceTargets();
    targets.forEach((target) => {
      target.classList.add(KANGUR_ACTIVE_SURFACE_CLASSNAME);
      applyKangurSurfaceStyle(target, kangurAppearance.background, kangurAppearance.vars);
    });

    return () => {
      targets.forEach((target) => {
        target.classList.remove(KANGUR_ACTIVE_SURFACE_CLASSNAME);
        restoreKangurSurfaceStyle(target);
      });
    };
  }, [kangurAppearance]);

  return <>{children}</>;
}
