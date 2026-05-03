'use client';

import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
} from '@/shared/lib/products/constants';
import { normalizeProductImageExternalBaseUrl } from '@/shared/utils/image-routing';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

export type ProductImageRoutesState = {
  defaultRoute: string;
  newRoute: string;
  routes: string[];
  setDefaultRoute: Dispatch<SetStateAction<string>>;
  setNewRoute: Dispatch<SetStateAction<string>>;
  setRoutes: Dispatch<SetStateAction<string[]>>;
};

type ProductImageRoutesStateArgs = {
  persistedBaseUrlRaw: string;
  persistedRoutesRaw: string | null | undefined;
};

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

export const dedupeRoutes = (routes: string[]): string[] => {
  const next: string[] = [];
  routes.forEach((route) => {
    if (route.length === 0) return;
    if (next.includes(route)) return;
    next.push(route);
  });
  return next;
};

export const normalizePersistedBaseUrl = (persistedBaseUrlRaw: string): string => {
  const normalized = normalizeProductImageExternalBaseUrl(persistedBaseUrlRaw);
  return normalized.length > 0 ? normalized : DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
};

export const ensureDefaultRouteIncluded = (routes: string[], defaultRoute: string): string[] =>
  routes.includes(defaultRoute) ? routes : dedupeRoutes([defaultRoute, ...routes]);

export const parseRoutesSetting = (
  rawValue: string | null | undefined,
  fallbackRoute: string
): string[] => {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    return [fallbackRoute];
  }

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return [fallbackRoute];
    const normalized = dedupeRoutes(
      parsed
        .map((entry: unknown) =>
          typeof entry === 'string' ? normalizeProductImageExternalBaseUrl(entry) : ''
        )
        .filter(hasText)
    );
    return normalized.length > 0 ? normalized : [fallbackRoute];
  } catch (error) {
    logClientError(error);
    return [fallbackRoute];
  }
};

export const buildSaveRoutePayload = ({
  defaultRoute,
  routes,
}: {
  defaultRoute: string;
  routes: string[];
}): { defaultPayload: string; routesPayload: string[] } => {
  const normalizedRoutes = dedupeRoutes(
    routes.map((route: string) => normalizeProductImageExternalBaseUrl(route)).filter(hasText)
  );
  const normalizedDefault = normalizeProductImageExternalBaseUrl(defaultRoute);
  const fallbackDefault =
    normalizedDefault.length > 0
      ? normalizedDefault
      : normalizedRoutes[0] ?? DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  const routesPayload = ensureDefaultRouteIncluded(normalizedRoutes, fallbackDefault);
  const defaultPayload = routesPayload.includes(fallbackDefault)
    ? fallbackDefault
    : routesPayload[0] ?? DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

  return { defaultPayload, routesPayload };
};

export function useProductImageRoutesState({
  persistedBaseUrlRaw,
  persistedRoutesRaw,
}: ProductImageRoutesStateArgs): ProductImageRoutesState {
  const persistedBaseUrl = normalizePersistedBaseUrl(persistedBaseUrlRaw);
  const [routes, setRoutes] = useState<string[]>(
    parseRoutesSetting(persistedRoutesRaw, persistedBaseUrl)
  );
  const [defaultRoute, setDefaultRoute] = useState<string>(persistedBaseUrl);
  const [newRoute, setNewRoute] = useState<string>('');

  useEffect(() => {
    const nextRoutes = parseRoutesSetting(persistedRoutesRaw, persistedBaseUrl);
    setRoutes(ensureDefaultRouteIncluded(nextRoutes, persistedBaseUrl));
    setDefaultRoute(persistedBaseUrl);
  }, [persistedBaseUrl, persistedRoutesRaw]);

  return { defaultRoute, newRoute, routes, setDefaultRoute, setNewRoute, setRoutes };
}
