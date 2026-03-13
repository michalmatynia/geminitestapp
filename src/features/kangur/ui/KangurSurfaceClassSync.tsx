'use client';

import { useEffect, type ReactNode } from 'react';

import { useOptionalCmsStorefrontAppearance } from '@/features/cms/public';
import type { CmsStorefrontAppearanceMode } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import { useKangurClassOverrides } from '@/features/kangur/ui/useKangurClassOverrides';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';

const KANGUR_ACTIVE_SURFACE_CLASSNAME = 'kangur-surface-active';
const KANGUR_ACTIVE_SURFACE_MODE_ATTRIBUTE = 'data-kangur-appearance-mode';
const KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER = 'scrollbar-gutter';
const KANGUR_ACTIVE_SURFACE_BACKGROUND = 'background';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY =
  'kangurPrevSurfaceScrollbarGutter';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_BACKGROUND_DATA_KEY = 'kangurPrevSurfaceBackground';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_VARS_DATA_KEY = 'kangurPrevSurfaceVars';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_MODE_DATA_KEY = 'kangurPrevSurfaceAppearanceMode';
const KANGUR_ACTIVE_SURFACE_PREVIOUS_CLASS_OVERRIDES_DATA_KEY = 'kangurPrevSurfaceClassOverrides';

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

const applyKangurSurfaceStyle = (
  target: HTMLElement,
  mode: CmsStorefrontAppearanceMode,
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
  if (!(KANGUR_ACTIVE_SURFACE_PREVIOUS_MODE_DATA_KEY in target.dataset)) {
    target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_MODE_DATA_KEY] =
      target.getAttribute(KANGUR_ACTIVE_SURFACE_MODE_ATTRIBUTE) ?? '';
  }

  target.style.setProperty(KANGUR_ACTIVE_SURFACE_SCROLLBAR_GUTTER, 'stable');
  target.style.setProperty(KANGUR_ACTIVE_SURFACE_BACKGROUND, background);
  target.setAttribute(KANGUR_ACTIVE_SURFACE_MODE_ATTRIBUTE, mode);
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
  const previousMode = target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_MODE_DATA_KEY];
  if (typeof previousMode === 'string' && previousMode.length > 0) {
    target.setAttribute(KANGUR_ACTIVE_SURFACE_MODE_ATTRIBUTE, previousMode);
  } else {
    target.removeAttribute(KANGUR_ACTIVE_SURFACE_MODE_ATTRIBUTE);
  }
  delete target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_SCROLLBAR_GUTTER_DATA_KEY];
  delete target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_BACKGROUND_DATA_KEY];
  delete target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_VARS_DATA_KEY];
  delete target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_MODE_DATA_KEY];
};

const splitClassList = (value: string | undefined): string[] =>
  typeof value === 'string'
    ? value
        .split(/\s+/)
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

const applyKangurSurfaceClassOverrides = (
  target: HTMLElement,
  className: string | undefined
): void => {
  const classes = splitClassList(className);
  if (classes.length === 0) {
    return;
  }

  const added = classes.filter((name) => !target.classList.contains(name));
  if (added.length > 0) {
    target.classList.add(...added);
    target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_CLASS_OVERRIDES_DATA_KEY] =
      JSON.stringify(added);
  }
};

const restoreKangurSurfaceClassOverrides = (target: HTMLElement): void => {
  const stored = target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_CLASS_OVERRIDES_DATA_KEY];
  if (typeof stored === 'string' && stored.length > 0) {
    try {
      const parsed = JSON.parse(stored) as string[];
      parsed.forEach((entry) => {
        target.classList.remove(entry);
      });
    } catch {
      // Ignore malformed restore payloads.
    }
  }
  delete target.dataset[KANGUR_ACTIVE_SURFACE_PREVIOUS_CLASS_OVERRIDES_DATA_KEY];
};

export function KangurSurfaceClassSync({
  children,
}: {
  children: ReactNode;
}): React.JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();
  const kangurAppearance = useKangurStorefrontAppearance();
  const classOverrides = useKangurClassOverrides();
  const appearanceMode = appearance?.mode ?? 'default';

  useEffect(() => {
    const targets = getKangurSurfaceTargets();
    targets.forEach(({ element, slot }) => {
      element.classList.add(KANGUR_ACTIVE_SURFACE_CLASSNAME);
      applyKangurSurfaceStyle(
        element,
        appearanceMode,
        kangurAppearance.background,
        kangurAppearance.vars
      );
      applyKangurSurfaceClassOverrides(element, classOverrides.globals[slot]);
    });

    return () => {
      targets.forEach(({ element }) => {
        element.classList.remove(KANGUR_ACTIVE_SURFACE_CLASSNAME);
        restoreKangurSurfaceClassOverrides(element);
        restoreKangurSurfaceStyle(element);
      });
    };
  }, [appearanceMode, classOverrides, kangurAppearance]);

  return <>{children}</>;
}
