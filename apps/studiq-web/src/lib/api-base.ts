import { headers } from 'next/headers';

import { createKangurApiClient } from '@kangur/api-client';

import type { KangurApiClientOptions } from '@kangur/api-client';

const DEFAULT_LOCAL_API_ORIGIN = 'http://localhost:3000';

const stripTrailingSlash = (value: string): string => value.replace(/\/+$/, '');

export const getKangurApiOrigin = (): string => {
  const configured = process.env['KANGUR_API_ORIGIN'] ?? process.env['NEXT_PUBLIC_KANGUR_API_ORIGIN'];
  if (configured && configured.trim().length > 0) {
    return stripTrailingSlash(configured.trim());
  }
  return DEFAULT_LOCAL_API_ORIGIN;
};

const defaultForwardCookieHeaders: NonNullable<KangurApiClientOptions['getHeaders']> = async () => {
  const incoming = await headers();
  const cookie = incoming.get('cookie');
  const result: HeadersInit = cookie ? { cookie } : {};
  return result;
};

export const createServerKangurApiClient = (
  overrides: Partial<KangurApiClientOptions> = {},
): ReturnType<typeof createKangurApiClient> =>
  createKangurApiClient({
    baseUrl: overrides.baseUrl ?? getKangurApiOrigin(),
    credentials: overrides.credentials ?? 'include',
    getHeaders: overrides.getHeaders ?? defaultForwardCookieHeaders,
    ...(overrides.fetchImpl ? { fetchImpl: overrides.fetchImpl } : {}),
    ...(overrides.onResponse ? { onResponse: overrides.onResponse } : {}),
  });

export const createBrowserKangurApiClient = (
  overrides: Partial<KangurApiClientOptions> = {},
): ReturnType<typeof createKangurApiClient> =>
  createKangurApiClient({
    baseUrl: overrides.baseUrl ?? getKangurApiOrigin(),
    credentials: overrides.credentials ?? 'include',
    ...(overrides.fetchImpl ? { fetchImpl: overrides.fetchImpl } : {}),
    ...(overrides.getHeaders ? { getHeaders: overrides.getHeaders } : {}),
    ...(overrides.onResponse ? { onResponse: overrides.onResponse } : {}),
  });
