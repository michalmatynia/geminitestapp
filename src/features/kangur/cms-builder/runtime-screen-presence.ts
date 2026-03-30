import type { KangurCmsScreenKey } from './project-contracts';

const KANGUR_CMS_SCREEN_KEY_BY_PAGE_KEY: Readonly<Record<string, KangurCmsScreenKey>> = {
  Game: 'Game',
  Lessons: 'Lessons',
  LearnerProfile: 'LearnerProfile',
  ParentDashboard: 'ParentDashboard',
};

type MinimalKangurCmsProjectShape = {
  screens?: Partial<Record<KangurCmsScreenKey, { components?: unknown[] | null } | null>>;
};

export const resolveKangurCmsScreenKey = (
  pageKey: string | null | undefined
): KangurCmsScreenKey | null => {
  if (!pageKey) {
    return null;
  }

  return KANGUR_CMS_SCREEN_KEY_BY_PAGE_KEY[pageKey] ?? null;
};

export const hasKangurCmsRuntimeScreen = (
  rawProject: string | null | undefined,
  pageKey: string | null | undefined
): boolean => {
  const screenKey = resolveKangurCmsScreenKey(pageKey);
  if (!screenKey || typeof rawProject !== 'string' || rawProject.trim().length === 0) {
    return false;
  }

  try {
    const project = JSON.parse(rawProject) as MinimalKangurCmsProjectShape;
    return Array.isArray(project.screens?.[screenKey]?.components);
  } catch {
    return false;
  }
};
