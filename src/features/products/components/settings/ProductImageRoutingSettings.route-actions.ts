'use client';

import type { MutationResult } from '@/shared/contracts/ui/queries';
import type { SystemSetting } from '@/shared/contracts/settings';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  LOCAL_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
  PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY,
} from '@/shared/lib/products/constants';
import {
  normalizeProductImageExternalBaseUrl,
  productImageServingRouteByMode,
  resolveProductImageServingMode,
  type ProductImageServingMode,
} from '@/shared/utils/image-routing';
import type { Toast } from '@/shared/ui/toast';

import {
  buildSaveRoutePayload,
  dedupeRoutes,
  type ProductImageRoutesState,
} from './ProductImageRoutingSettings.route-state';

type UpdateSettingsBulkMutation = MutationResult<
  SystemSetting[],
  Array<{ key: string; value: string }>
>;

export type ProductImageRouteActions = {
  handleAddRoute: () => void;
  handleRemoveRoute: (route: string) => void;
  handleSave: () => void;
  handleSelectServingMode: (mode: ProductImageServingMode) => void;
  handleUseFastComet: () => void;
  handleUseLocalhost: () => void;
  servingMode: ProductImageServingMode;
};

type ProductImageRouteActionsArgs = ProductImageRoutesState & {
  toast: Toast;
  updateSettingsBulk: UpdateSettingsBulkMutation;
};

const getDefaultRouteAfterRemoval = (
  currentDefaultRoute: string,
  removedRoute: string,
  nextRoutes: string[]
): string => {
  if (nextRoutes.length === 0) return DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  return currentDefaultRoute === removedRoute
    ? nextRoutes[0] ?? DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL
    : currentDefaultRoute;
};

export function useProductImageRouteActions({
  defaultRoute,
  newRoute,
  routes,
  setDefaultRoute,
  setNewRoute,
  setRoutes,
  toast,
  updateSettingsBulk,
}: ProductImageRouteActionsArgs): ProductImageRouteActions {
  const setServingRoute = (route: string): void => {
    setRoutes((previous: string[]) =>
      previous.includes(route) ? previous : dedupeRoutes([route, ...previous])
    );
    setDefaultRoute(route);
  };

  const handleAddRoute = (): void => {
    const normalized = normalizeProductImageExternalBaseUrl(newRoute);
    if (normalized.length === 0) {
      toast('Enter a valid route URL.', { variant: 'warning' });
      return;
    }
    setRoutes((previous: string[]) =>
      previous.includes(normalized) ? previous : dedupeRoutes([...previous, normalized])
    );
    setNewRoute('');
  };

  const handleRemoveRoute = (route: string): void => {
    setRoutes((previous: string[]) => {
      const nextRoutes = previous.filter((entry: string) => entry !== route);
      setDefaultRoute(getDefaultRouteAfterRemoval(defaultRoute, route, nextRoutes));
      return nextRoutes.length > 0 ? nextRoutes : [DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL];
    });
  };

  const handleSave = (): void => {
    const { defaultPayload, routesPayload } = buildSaveRoutePayload({ defaultRoute, routes });
    updateSettingsBulk.mutate(
      [
        { key: PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY, value: defaultPayload },
        { key: PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY, value: JSON.stringify(routesPayload) },
      ],
      {
        onSuccess: () => {
          setRoutes(routesPayload);
          setDefaultRoute(defaultPayload);
          toast('Image routes saved.', { variant: 'success' });
        },
        onError: () => {
          toast('Failed to save image routes.', { variant: 'error' });
        },
      }
    );
  };

  const handleUseLocalhost = (): void => {
    setServingRoute(LOCAL_PRODUCT_IMAGES_EXTERNAL_BASE_URL);
  };

  const handleUseFastComet = (): void => {
    setServingRoute(DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL);
  };

  const handleSelectServingMode = (mode: ProductImageServingMode): void => {
    setServingRoute(productImageServingRouteByMode[mode]);
  };

  return {
    handleAddRoute,
    handleRemoveRoute,
    handleSave,
    handleSelectServingMode,
    handleUseFastComet,
    handleUseLocalhost,
    servingMode: resolveProductImageServingMode(defaultRoute),
  };
}
