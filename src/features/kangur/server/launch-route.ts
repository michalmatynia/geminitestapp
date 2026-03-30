import 'server-only';

import { cache } from 'react';

import {
  getKangurLaunchTarget,
  type KangurLaunchTarget,
} from '@/features/kangur/config/routing';
import { readKangurSettingValue } from '@/features/kangur/services/kangur-settings-repository';
import {
  KANGUR_LAUNCH_ROUTE_SETTINGS_KEY,
  parseKangurLaunchRouteSettings,
  type KangurLaunchRoute,
} from '@/features/kangur/settings';

type KangurPublicSearchParams =
  | URLSearchParams
  | string
  | Record<string, string | string[] | undefined>
  | null
  | undefined;

const KANGUR_LAUNCH_ROUTE_CACHE_TTL_MS = 30_000;

let cachedKangurLaunchRoute: {
  readAt: number;
  route: KangurLaunchRoute;
} | null = null;

export const getKangurConfiguredLaunchRoute = cache(async (): Promise<KangurLaunchRoute> => {
  const now = Date.now();
  if (
    cachedKangurLaunchRoute &&
    now - cachedKangurLaunchRoute.readAt < KANGUR_LAUNCH_ROUTE_CACHE_TTL_MS
  ) {
    return cachedKangurLaunchRoute.route;
  }

  const rawSetting = await readKangurSettingValue(KANGUR_LAUNCH_ROUTE_SETTINGS_KEY);
  const route = parseKangurLaunchRouteSettings(rawSetting).route;
  cachedKangurLaunchRoute = {
    readAt: now,
    route,
  };
  return route;
});

export const getKangurConfiguredLaunchTarget = async (
  slugSegments: readonly string[] = [],
  searchParams?: KangurPublicSearchParams
): Promise<KangurLaunchTarget> => {
  const route = await getKangurConfiguredLaunchRoute();
  return getKangurLaunchTarget(route, slugSegments, searchParams);
};

export const getKangurConfiguredLaunchHref = async (
  slugSegments: readonly string[] = [],
  searchParams?: KangurPublicSearchParams,
  options?: {
    localizeFallbackHref?: (href: string) => string;
  }
): Promise<string> => {
  const launchTarget = await getKangurConfiguredLaunchTarget(slugSegments, searchParams);
  if (launchTarget.href !== launchTarget.fallbackHref) {
    return launchTarget.href;
  }

  return options?.localizeFallbackHref?.(launchTarget.href) ?? launchTarget.href;
};
