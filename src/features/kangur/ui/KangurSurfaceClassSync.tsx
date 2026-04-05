'use client';

import { useEffect, useRef, type ReactNode } from 'react';

import type { CmsStorefrontAppearanceMode } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import { useOptionalCmsStorefrontAppearance } from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';
import { logger } from '@/shared/utils/logger';
import { isKangurThemeDebugEnabled } from '@/features/kangur/utils/theme-debug';

const KANGUR_ACTIVE_SURFACE_CLASSNAME = 'kangur-surface-active';
const KANGUR_ACTIVE_SURFACE_MODE_ATTRIBUTE = 'data-kangur-appearance-mode';
const KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER = 'scrollbar-gutter';
const KANGUR_ACTIVE_SURFACE_BACKGROUND = 'background';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY =
  'kangurPrevSurfaceScrollbarGutter';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_BACKGROUND_DATA_KEY = 'kangurPrevSurfaceBackground';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_VARS_DATA_KEY = 'kangurPrevSurfaceVars';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_MODE_DATA_KEY = 'kangurPrevSurfaceAppearanceMode';

type KangurSurfaceTarget = {
  element: HTMLElement;
  slot: 'html' | 'body' | 'app';
};

const getKangurSurfaceTargets = (): KangurSurfaceTarget[] => {
  if (typeof document === 'undefined') {
    return [];
  }

  const appContent = document.getElementById('app-content');
  const targets: KangurSurfaceTarget[] = [];

  if (document.documentElement instanceof HTMLElement) {
    targets.push({ element: document.documentElement, slot: 'html' });
  }
  if (document.body instanceof HTMLElement) {
    targets.push({ element: document.body, slot: 'body' });
  }
  if (appContent instanceof HTMLElement) {
    targets.push({ element: appContent, slot: 'app' });
  }

  return targets;
};

const rememberSurfaceDatasetValue = (
  target: HTMLElement,
  datasetKey: string,
  value: string
): void => {
  if (!(datasetKey in target.dataset)) {
    target.dataset[datasetKey] = value;
  }
};

const rememberSurfaceScrollbarGutter = (target: HTMLElement): void => {
  rememberSurfaceDatasetValue(
    target,
    KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY,
    target.style.getPropertyValue(KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER)
  );
};

const rememberSurfaceBackground = (target: HTMLElement): void => {
  rememberSurfaceDatasetValue(
    target,
    KANGUR_ACTIVE_SURFACE_PREVIOUS_BACKGROUND_DATA_KEY,
    target.style.getPropertyValue(KANGUR_ACTIVE_SURFACE_BACKGROUND)
  );
};

const rememberSurfaceVars = (target: HTMLElement, vars: Record<string, string>): void => {
  const previousVars = Object.fromEntries(
    Object.keys(vars).map((key) => [key, target.style.getPropertyValue(key)])
  );
  rememberSurfaceDatasetValue(
    target,
    KANGUR_ACTIVE_SURFACE_PREVIOUS_VARS_DATA_KEY,
    JSON.stringify(previousVars)
  );
};

const rememberSurfaceMode = (target: HTMLElement): void => {
  rememberSurfaceDatasetValue(
    target,
    KANGUR_ACTIVE_SURFACE_PREVIOUS_MODE_DATA_KEY,
    target.getAttribute(KANGUR_ACTIVE_SURFACE_MODE_ATTRIBUTE) ?? ''
  );
};

const rememberKangurSurfaceStyle = ({
  applyScrollbarGutter,
  target,
  vars,
}: {
  applyScrollbarGutter: boolean;
  target: HTMLElement;
  vars: Record<string, string>;
}): void => {
  if (applyScrollbarGutter) {
    rememberSurfaceScrollbarGutter(target);
  }
  rememberSurfaceBackground(target);
  rememberSurfaceVars(target, vars);
  rememberSurfaceMode(target);
};

const restoreSurfaceProperty = (
  target: HTMLElement,
  datasetKey: string,
  propertyName: string
): void => {
  const previousValue = target.dataset[datasetKey];
  if (typeof previousValue === 'string' && previousValue.length > 0) {
    target.style.setProperty(propertyName, previousValue);
  } else {
    target.style.removeProperty(propertyName);
  }
  delete target.dataset[datasetKey];
};

const readRestoredSurfaceVars = (target: HTMLElement): Record<string, string> | null => {
  const previousVars = target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_VARS_DATA_KEY];
  if (typeof previousVars !== 'string' || previousVars.length === 0) {
    return null;
  }

  return withKangurClientErrorSync(
    {
      source: 'kangur.surface',
      action: 'restore-vars',
      description: 'Restores Kangur surface CSS variables.',
    },
    () => JSON.parse(previousVars) as Record<string, string>,
    { fallback: null }
  );
};

const restoreSurfaceVars = (target: HTMLElement): void => {
  const parsed = readRestoredSurfaceVars(target);
  if (!parsed) {
    delete target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_VARS_DATA_KEY];
    return;
  }

  Object.entries(parsed).forEach(([key, value]) => {
    if (value.length > 0) {
      target.style.setProperty(key, value);
    } else {
      target.style.removeProperty(key);
    }
  });
  delete target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_VARS_DATA_KEY];
};

const restoreSurfaceMode = (target: HTMLElement): void => {
  const previousMode = target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_MODE_DATA_KEY];
  if (typeof previousMode === 'string' && previousMode.length > 0) {
    target.setAttribute(KANGUR_ACTIVE_SURFACE_MODE_ATTRIBUTE, previousMode);
  } else {
    target.removeAttribute(KANGUR_ACTIVE_SURFACE_MODE_ATTRIBUTE);
  }
  delete target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_MODE_DATA_KEY];
};

const applyKangurSurfaceStyle = (
  target: HTMLElement,
  mode: CmsStorefrontAppearanceMode,
  background: string,
  vars: Record<string, string>,
  options: { applyScrollbarGutter?: boolean } = {}
): void => {
  rememberKangurSurfaceStyle({
    applyScrollbarGutter: options.applyScrollbarGutter === true,
    target,
    vars,
  });

  if (options.applyScrollbarGutter) {
    target.style.setProperty(KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER, 'stable');
  }
  target.style.setProperty(KANGUR_ACTIVE_SURFACE_BACKGROUND, background);
  target.setAttribute(KANGUR_ACTIVE_SURFACE_MODE_ATTRIBUTE, mode);
  Object.entries(vars).forEach(([key, value]) => {
    target.style.setProperty(key, value);
  });
};

const restoreKangurSurfaceStyle = (target: HTMLElement): void => {
  if (KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY in target.dataset) {
    restoreSurfaceProperty(
      target,
      KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY,
      KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER
    );
  }
  restoreSurfaceProperty(
    target,
    KANGUR_ACTIVE_SURFACE_PREVIOUS_BACKGROUND_DATA_KEY,
    KANGUR_ACTIVE_SURFACE_BACKGROUND
  );
  restoreSurfaceVars(target);
  restoreSurfaceMode(target);
};

export function KangurSurfaceClassSync({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();
  const kangurAppearance = useKangurStorefrontAppearance();
  const appearanceMode = appearance?.mode ?? 'default';
  const debugRef = useRef<string | null>(null);

  useEffect(() => {
    const targets = getKangurSurfaceTargets();
    const hasAppTarget = targets.some((target) => target.slot === 'app');
    targets.forEach(({ element, slot }) => {
      element.classList.add(KANGUR_ACTIVE_SURFACE_CLASSNAME);
      applyKangurSurfaceStyle(
        element,
        appearanceMode,
        kangurAppearance.background,
        kangurAppearance.vars,
        { applyScrollbarGutter: slot === 'app' || (!hasAppTarget && slot === 'body') }
      );
    });

    if (isKangurThemeDebugEnabled()) {
      const payload = {
        mode: appearanceMode,
        targets: targets.map((target) => target.slot),
        background: kangurAppearance.background,
      };
      const signature = JSON.stringify(payload);
      if (debugRef.current !== signature) {
        debugRef.current = signature;
        logger.info('[KangurThemeDebug]', payload);
      }
    }

    return () => {
      targets.forEach(({ element }) => {
        element.classList.remove(KANGUR_ACTIVE_SURFACE_CLASSNAME);
        restoreKangurSurfaceStyle(element);
      });
    };
  }, [appearanceMode, kangurAppearance]);

  return <>{children}</>;
}
