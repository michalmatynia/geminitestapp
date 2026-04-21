import {
  resolveKangurMobileAuthMode,
  type KangurMobileAuthMode,
} from '../auth/mobileAuthMode';

export type KangurMobilePublicConfigSources = {
  envApiUrl?: string;
  envAuthMode?: string;
  extraApiUrl?: string;
  extraAuthMode?: string;
};

export type KangurMobilePublicConfig = {
  apiUrl: string | null;
  authMode: KangurMobileAuthMode;
};

export const normalizeKangurMobilePublicApiUrl = (
  value: string | undefined,
): string | null => {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed === '') {
    return null;
  }

  return trimmed.replace(/\/$/, '');
};

export const resolveKangurMobilePublicConfigFromSources = ({
  envApiUrl,
  envAuthMode,
  extraApiUrl,
  extraAuthMode,
}: KangurMobilePublicConfigSources): KangurMobilePublicConfig => ({
  apiUrl:
    normalizeKangurMobilePublicApiUrl(envApiUrl) ??
    normalizeKangurMobilePublicApiUrl(extraApiUrl),
  authMode: resolveKangurMobileAuthMode(envAuthMode ?? extraAuthMode),
});
