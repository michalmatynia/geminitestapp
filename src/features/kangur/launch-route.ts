export const KANGUR_LAUNCH_ROUTE_VALUES = ['web_mobile_view', 'dedicated_app'] as const;

export type KangurLaunchRoute = (typeof KANGUR_LAUNCH_ROUTE_VALUES)[number];

export const DEFAULT_KANGUR_LAUNCH_ROUTE: KangurLaunchRoute = 'web_mobile_view';

export const isKangurLaunchRoute = (value: unknown): value is KangurLaunchRoute =>
  typeof value === 'string' &&
  KANGUR_LAUNCH_ROUTE_VALUES.includes(value.trim() as KangurLaunchRoute);
