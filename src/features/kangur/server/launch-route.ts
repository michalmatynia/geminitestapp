import 'server-only';

import {
  getKangurLaunchTarget,
  type KangurLaunchTarget,
} from '@/features/kangur/config/routing';
import { readKangurSettingValue } from '@/features/kangur/services/kangur-settings-repository';
import { getLiteSettingsForHydration } from '@/shared/lib/lite-settings-ssr';
import { applyCacheLife } from '@/shared/lib/next/cache-life';
import { readKangurLaunchRouteDevSnapshot } from '@/features/kangur/server/launch-route-dev-snapshot';
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

let cachedKangurLaunchRoute: KangurLaunchRoute | null = null;

const isDevelopmentEnvironment = (): boolean => process.env['NODE_ENV'] === 'development';

const commitKangurLaunchRouteSnapshot = (route: KangurLaunchRoute): KangurLaunchRoute => {
  cachedKangurLaunchRoute = route;
  return route;
};

const readBootstrappedKangurLaunchRoute = async (): Promise<KangurLaunchRoute | null> => {
  try {
    const liteSettings = await getLiteSettingsForHydration();
    const setting = liteSettings.find((entry) => entry.key === KANGUR_LAUNCH_ROUTE_SETTINGS_KEY);
    if (!setting) {
      return null;
    }
    return commitKangurLaunchRouteSnapshot(parseKangurLaunchRouteSettings(setting.value).route);
  } catch {
    return null;
  }
};

const readDevelopmentKangurLaunchRouteSnapshot = async (): Promise<KangurLaunchRoute | null> => {
  if (!isDevelopmentEnvironment()) {
    return null;
  }

  const snapshot = await readKangurLaunchRouteDevSnapshot();
  if (!snapshot) {
    return null;
  }

  return commitKangurLaunchRouteSnapshot(snapshot);
};

export const primeKangurLaunchRouteRuntime = (
  value: string | null | undefined
): KangurLaunchRoute => {
  return commitKangurLaunchRouteSnapshot(parseKangurLaunchRouteSettings(value).route);
};

const readKangurConfiguredLaunchRouteCached = async (): Promise<KangurLaunchRoute> => {
  'use cache';
  applyCacheLife('swr60');

  const bootstrappedRoute = await readBootstrappedKangurLaunchRoute();
  if (bootstrappedRoute) {
    return bootstrappedRoute;
  }

  const rawSetting = await readKangurSettingValue(KANGUR_LAUNCH_ROUTE_SETTINGS_KEY);
  return parseKangurLaunchRouteSettings(rawSetting).route;
};

export const getKangurConfiguredLaunchRoute = async (): Promise<KangurLaunchRoute> => {
  if (cachedKangurLaunchRoute && isDevelopmentEnvironment()) {
    return cachedKangurLaunchRoute;
  }

  const developmentSnapshot = await readDevelopmentKangurLaunchRouteSnapshot();
  if (developmentSnapshot) {
    return developmentSnapshot;
  }

  if (cachedKangurLaunchRoute) {
    return cachedKangurLaunchRoute;
  }

  return commitKangurLaunchRouteSnapshot(await readKangurConfiguredLaunchRouteCached());
};

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
