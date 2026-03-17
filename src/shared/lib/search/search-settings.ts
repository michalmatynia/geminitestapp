import 'server-only';

import { readSecretSettingValue } from '@/shared/lib/settings/secret-settings';

export const SEARCH_SETTINGS_KEYS = {
  braveApiKey: 'search_brave_api_key',
  braveApiUrl: 'search_brave_api_url',
  googleApiKey: 'search_google_api_key',
  googleEngineId: 'search_google_engine_id',
  googleApiUrl: 'search_google_api_url',
  serpApiKey: 'search_serpapi_api_key',
  serpApiUrl: 'search_serpapi_api_url',
} as const;

const DEFAULT_BRAVE_API_URL = 'https://api.search.brave.com/res/v1/web/search';
const DEFAULT_GOOGLE_API_URL = 'https://www.googleapis.com/customsearch/v1';
const DEFAULT_SERPAPI_API_URL = 'https://serpapi.com/search.json';

export type SearchProviderSettings = {
  brave: {
    apiKey: string | null;
    apiUrl: string;
  };
  google: {
    apiKey: string | null;
    engineId: string | null;
    apiUrl: string;
  };
  serpapi: {
    apiKey: string | null;
    apiUrl: string;
  };
};

const normalizeUrl = (value: string | null, fallback: string): string => {
  if (!value) return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : fallback;
};

export const getSearchProviderSettings = async (): Promise<SearchProviderSettings> => {
  const [
    braveApiKey,
    braveApiUrl,
    googleApiKey,
    googleEngineId,
    googleApiUrl,
    serpApiKey,
    serpApiUrl,
  ] = await Promise.all([
    readSecretSettingValue(SEARCH_SETTINGS_KEYS.braveApiKey),
    readSecretSettingValue(SEARCH_SETTINGS_KEYS.braveApiUrl),
    readSecretSettingValue(SEARCH_SETTINGS_KEYS.googleApiKey),
    readSecretSettingValue(SEARCH_SETTINGS_KEYS.googleEngineId),
    readSecretSettingValue(SEARCH_SETTINGS_KEYS.googleApiUrl),
    readSecretSettingValue(SEARCH_SETTINGS_KEYS.serpApiKey),
    readSecretSettingValue(SEARCH_SETTINGS_KEYS.serpApiUrl),
  ]);

  return {
    brave: {
      apiKey: braveApiKey,
      apiUrl: normalizeUrl(braveApiUrl, DEFAULT_BRAVE_API_URL),
    },
    google: {
      apiKey: googleApiKey,
      engineId: googleEngineId,
      apiUrl: normalizeUrl(googleApiUrl, DEFAULT_GOOGLE_API_URL),
    },
    serpapi: {
      apiKey: serpApiKey,
      apiUrl: normalizeUrl(serpApiUrl, DEFAULT_SERPAPI_API_URL),
    },
  };
};
