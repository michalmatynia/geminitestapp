import type { PlatformOSType } from 'react-native';

export type KangurApiBaseUrlSource =
  | 'env'
  | 'android-emulator-default'
  | 'localhost-default'
  | 'expo-development-host'
  | 'expo-development-host-default';

type KangurResolvedApiBaseUrl = {
  apiBaseUrl: string;
  apiBaseUrlSource: KangurApiBaseUrlSource;
};

type ResolveKangurMobileApiBaseUrlOptions = {
  configuredApiBaseUrl: string | null;
  developmentHost: string | null;
  platformOs: PlatformOSType;
};

const ANDROID_EMULATOR_HOST = '10.0.2.2';
const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export const normalizeApiBaseUrl = (value: string | undefined | null): string | null => {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed === '') {
    return null;
  }

  return trimmed.replace(/\/$/, '');
};

const normalizeHostname = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim().toLowerCase();
  return trimmed !== undefined && trimmed !== '' ? trimmed : null;
};

const readUrlHostname = (value: string): string | null => {
  try {
    return normalizeHostname(new URL(value).hostname);
  } catch {
    return null;
  }
};

const createApiUrlWithHostname = (
  apiUrl: string,
  hostname: string,
): string | null => {
  try {
    const parsed = new URL(apiUrl);
    parsed.hostname = hostname;
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
};

export const isLoopbackHost = (hostname: string | null): boolean =>
  hostname !== null && LOOPBACK_HOSTS.has(hostname);

const parseRuntimeHostCandidate = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (trimmed === undefined || trimmed === '') {
    return null;
  }

  const normalizedCandidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  try {
    return normalizeHostname(new URL(normalizedCandidate).hostname);
  } catch {
    return null;
  }
};

export const extractExpoDevelopmentHost = ({
  hostUri,
  linkingUri,
}: {
  hostUri?: string | null;
  linkingUri?: string | null;
}): string | null => {
  for (const candidate of [hostUri, linkingUri]) {
    const parsedHost = parseRuntimeHostCandidate(candidate);
    if (parsedHost !== null) {
      return parsedHost;
    }
  }

  return null;
};

const resolveDefaultApiBaseUrl = (
  platformOs: PlatformOSType,
): KangurResolvedApiBaseUrl => {
  if (platformOs === 'android') {
    return {
      apiBaseUrl: 'http://10.0.2.2:3000',
      apiBaseUrlSource: 'android-emulator-default',
    };
  }

  return {
    apiBaseUrl: 'http://localhost:3000',
    apiBaseUrlSource: 'localhost-default',
  };
};

const canUseExpoDevelopmentHost = (
  developmentHost: string | null,
  platformOs: PlatformOSType,
): developmentHost is string =>
  platformOs !== 'web' &&
  developmentHost !== null &&
  !isLoopbackHost(developmentHost) &&
  developmentHost !== ANDROID_EMULATOR_HOST;

export const resolveKangurMobileApiBaseUrl = ({
  configuredApiBaseUrl,
  developmentHost,
  platformOs,
}: ResolveKangurMobileApiBaseUrlOptions): KangurResolvedApiBaseUrl => {
  const normalizedConfiguredApiBaseUrl = normalizeApiBaseUrl(configuredApiBaseUrl);
  const normalizedDevelopmentHost = normalizeHostname(developmentHost);

  if (normalizedConfiguredApiBaseUrl !== null) {
    return resolveConfiguredUrl(
      normalizedConfiguredApiBaseUrl,
      normalizedDevelopmentHost,
      platformOs,
    );
  }

  return resolveDefaultUrl(normalizedDevelopmentHost, platformOs);
};

const resolveConfiguredUrl = (
  configuredUrl: string,
  devHost: string | null,
  platformOs: PlatformOSType,
): KangurResolvedApiBaseUrl => {
  const configuredHostname = readUrlHostname(configuredUrl);

  if (canUseExpoDevelopmentHost(devHost, platformOs) && isDevHostCandidate(configuredHostname)) {
    return {
      apiBaseUrl: createApiUrlWithHostname(configuredUrl, devHost) ?? configuredUrl,
      apiBaseUrlSource: 'expo-development-host',
    };
  }

  if (platformOs === 'android' && isLoopbackHost(configuredHostname)) {
    return {
      apiBaseUrl: createApiUrlWithHostname(configuredUrl, ANDROID_EMULATOR_HOST) ?? configuredUrl,
      apiBaseUrlSource: 'android-emulator-default',
    };
  }

  return { apiBaseUrl: configuredUrl, apiBaseUrlSource: 'env' };
};

const isDevHostCandidate = (hostname: string | null): boolean =>
  isLoopbackHost(hostname) || hostname === ANDROID_EMULATOR_HOST;

const resolveDefaultUrl = (
  devHost: string | null,
  platformOs: PlatformOSType,
): KangurResolvedApiBaseUrl => {
  const defaults = resolveDefaultApiBaseUrl(platformOs);

  if (canUseExpoDevelopmentHost(devHost, platformOs)) {
    return {
      apiBaseUrl: createApiUrlWithHostname(defaults.apiBaseUrl, devHost) ?? defaults.apiBaseUrl,
      apiBaseUrlSource: 'expo-development-host-default',
    };
  }

  return defaults;
};
