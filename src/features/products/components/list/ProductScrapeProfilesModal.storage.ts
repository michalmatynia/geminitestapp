'use client';

export type ProductScrapeProfileStoredProfileSettings = {
  draftTemplateId: string;
  dryRun: boolean;
  limitInput: string;
};

export type ProductScrapeProfileStoredSettings = {
  version: 1;
  selectedProfileId: string;
  profiles: Record<string, ProductScrapeProfileStoredProfileSettings>;
};

const SCRAPE_PROFILE_SETTINGS_STORAGE_KEY = 'product-scrape-profiles:settings:v1';

const createDefaultStoredSettings = (): ProductScrapeProfileStoredSettings => ({
  version: 1,
  selectedProfileId: '',
  profiles: {},
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && Array.isArray(value) === false;

const readStoredString = (value: unknown): string => (typeof value === 'string' ? value : '');

const readStoredBoolean = (value: unknown): boolean => value === true;

const readStoredProfileSettings = (
  value: unknown
): ProductScrapeProfileStoredProfileSettings | null => {
  if (!isRecord(value)) return null;
  return {
    draftTemplateId: readStoredString(value['draftTemplateId']),
    dryRun: readStoredBoolean(value['dryRun']),
    limitInput: readStoredString(value['limitInput']),
  };
};

const readStoredProfiles = (
  value: unknown
): ProductScrapeProfileStoredSettings['profiles'] => {
  if (!isRecord(value)) return {};
  return Object.entries(value).reduce<ProductScrapeProfileStoredSettings['profiles']>(
    (profiles, [profileId, settingsInput]) => {
      const normalizedProfileId = profileId.trim();
      const settings = readStoredProfileSettings(settingsInput);
      if (normalizedProfileId.length === 0 || settings === null) return profiles;
      return { ...profiles, [normalizedProfileId]: settings };
    },
    {}
  );
};

export const readStoredScrapeProfileSettings = (): ProductScrapeProfileStoredSettings => {
  if (typeof window === 'undefined') return createDefaultStoredSettings();
  try {
    const raw = window.localStorage.getItem(SCRAPE_PROFILE_SETTINGS_STORAGE_KEY);
    if (raw === null) return createDefaultStoredSettings();
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return createDefaultStoredSettings();

    return {
      version: 1,
      selectedProfileId: readStoredString(parsed['selectedProfileId']).trim(),
      profiles: readStoredProfiles(parsed['profiles']),
    };
  } catch {
    return createDefaultStoredSettings();
  }
};

export const writeStoredScrapeProfileSettings = (
  settings: ProductScrapeProfileStoredSettings
): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SCRAPE_PROFILE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Storage can be unavailable in private browsing or constrained embeds.
  }
};

export const getStoredProfileSettings = (
  settings: ProductScrapeProfileStoredSettings,
  profileId: string
): ProductScrapeProfileStoredProfileSettings | null => settings.profiles[profileId] ?? null;
