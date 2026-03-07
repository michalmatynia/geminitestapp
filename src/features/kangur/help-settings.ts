import { parseJsonSetting } from '@/shared/utils/settings-json';

export const KANGUR_HELP_SETTINGS_KEY = 'kangur_help_settings_v1';

export type KangurDocsTooltipSurface =
  | 'home'
  | 'lessons'
  | 'tests'
  | 'profile'
  | 'parentDashboard'
  | 'admin';

export type KangurHelpSettings = {
  version: 1;
  docsTooltips: {
    enabled: boolean;
    homeEnabled: boolean;
    lessonsEnabled: boolean;
    testsEnabled: boolean;
    profileEnabled: boolean;
    parentDashboardEnabled: boolean;
    adminEnabled: boolean;
  };
};

export const createDefaultKangurHelpSettings = (): KangurHelpSettings => ({
  version: 1,
  docsTooltips: {
    enabled: true,
    homeEnabled: true,
    lessonsEnabled: true,
    testsEnabled: true,
    profileEnabled: true,
    parentDashboardEnabled: true,
    adminEnabled: true,
  },
});

const resolveBoolean = (value: unknown, fallback: boolean): boolean =>
  typeof value === 'boolean' ? value : fallback;

export const normalizeKangurHelpSettings = (value: unknown): KangurHelpSettings => {
  const fallback = createDefaultKangurHelpSettings();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const docsTooltipsValue = record['docsTooltips'];
  const docsTooltips =
    docsTooltipsValue && typeof docsTooltipsValue === 'object' && !Array.isArray(docsTooltipsValue)
      ? (docsTooltipsValue as Record<string, unknown>)
      : {};

  return {
    version: 1,
    docsTooltips: {
      enabled: resolveBoolean(docsTooltips['enabled'], fallback.docsTooltips.enabled),
      homeEnabled: resolveBoolean(docsTooltips['homeEnabled'], fallback.docsTooltips.homeEnabled),
      lessonsEnabled: resolveBoolean(
        docsTooltips['lessonsEnabled'],
        fallback.docsTooltips.lessonsEnabled
      ),
      testsEnabled: resolveBoolean(
        docsTooltips['testsEnabled'],
        fallback.docsTooltips.testsEnabled
      ),
      profileEnabled: resolveBoolean(
        docsTooltips['profileEnabled'],
        fallback.docsTooltips.profileEnabled
      ),
      parentDashboardEnabled: resolveBoolean(
        docsTooltips['parentDashboardEnabled'],
        fallback.docsTooltips.parentDashboardEnabled
      ),
      adminEnabled: resolveBoolean(
        docsTooltips['adminEnabled'],
        fallback.docsTooltips.adminEnabled
      ),
    },
  };
};

export const parseKangurHelpSettings = (raw: string | null | undefined): KangurHelpSettings =>
  normalizeKangurHelpSettings(parseJsonSetting<unknown>(raw, createDefaultKangurHelpSettings()));

export const areKangurDocsTooltipsEnabled = (
  settings: KangurHelpSettings,
  surface: KangurDocsTooltipSurface
): boolean => {
  if (!settings.docsTooltips.enabled) {
    return false;
  }

  switch (surface) {
    case 'home':
      return settings.docsTooltips.homeEnabled;
    case 'lessons':
      return settings.docsTooltips.lessonsEnabled;
    case 'tests':
      return settings.docsTooltips.testsEnabled;
    case 'profile':
      return settings.docsTooltips.profileEnabled;
    case 'parentDashboard':
      return settings.docsTooltips.parentDashboardEnabled;
    case 'admin':
      return settings.docsTooltips.adminEnabled;
    default:
      return false;
  }
};
