'use client';

import { useEffect, useState } from 'react';

import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
  PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY,
} from '@/features/products/constants';
import { normalizeProductImageExternalBaseUrl } from '@/features/products/utils/image-routing';
import { useUpdateSettingsBulk } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Button, Input, Label, RadioGroup, RadioGroupItem, useToast } from '@/shared/ui';

const dedupeRoutes = (routes: string[]): string[] => {
  const next: string[] = [];
  routes.forEach((route) => {
    if (!route) return;
    if (next.includes(route)) return;
    next.push(route);
  });
  return next;
};

const parseRoutesSetting = (
  rawValue: string | null | undefined,
  fallbackRoute: string
): string[] => {
  if (!rawValue?.trim()) return [fallbackRoute];
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return [fallbackRoute];
    const normalized = dedupeRoutes(
      parsed
        .map((entry: unknown) =>
          typeof entry === 'string' ? normalizeProductImageExternalBaseUrl(entry) : ''
        )
        .filter((entry: string) => entry.length > 0)
    );
    return normalized.length > 0 ? normalized : [fallbackRoute];
  } catch {
    return [fallbackRoute];
  }
};

export function ProductImageRoutingSettings(): React.JSX.Element {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const updateSettingsBulk = useUpdateSettingsBulk();

  const persistedBaseUrlRaw =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  const persistedBaseUrl =
    normalizeProductImageExternalBaseUrl(persistedBaseUrlRaw) ||
    DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
  const persistedRoutesRaw =
    settingsStore.get(PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY) ?? null;

  const [routes, setRoutes] = useState<string[]>(
    parseRoutesSetting(persistedRoutesRaw, persistedBaseUrl)
  );
  const [defaultRoute, setDefaultRoute] = useState<string>(persistedBaseUrl);
  const [newRoute, setNewRoute] = useState<string>('');

  useEffect(() => {
    const nextRoutes = parseRoutesSetting(persistedRoutesRaw, persistedBaseUrl);
    const ensuredRoutes = nextRoutes.includes(persistedBaseUrl)
      ? nextRoutes
      : dedupeRoutes([persistedBaseUrl, ...nextRoutes]);
    setRoutes(ensuredRoutes);
    setDefaultRoute(persistedBaseUrl);
  }, [persistedBaseUrl, persistedRoutesRaw]);

  const handleAddRoute = (): void => {
    const normalized = normalizeProductImageExternalBaseUrl(newRoute);
    if (!normalized) {
      toast('Enter a valid route URL.', { variant: 'warning' });
      return;
    }
    setRoutes((prev: string[]) =>
      prev.includes(normalized) ? prev : dedupeRoutes([...prev, normalized])
    );
    setNewRoute('');
  };

  const handleRemoveRoute = (route: string): void => {
    setRoutes((prev: string[]) => {
      const next = prev.filter((entry: string) => entry !== route);
      if (next.length > 0) {
        if (defaultRoute === route) {
          setDefaultRoute(next[0] ?? DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL);
        }
        return next;
      }
      const fallback = DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
      setDefaultRoute(fallback);
      return [fallback];
    });
  };

  const handleSave = (): void => {
    const normalizedRoutes = dedupeRoutes(
      routes
        .map((route: string) => normalizeProductImageExternalBaseUrl(route))
        .filter((route: string) => route.length > 0)
    );
    const normalizedDefault =
      normalizeProductImageExternalBaseUrl(defaultRoute) ||
      normalizedRoutes[0] ||
      DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
    const ensuredRoutes = normalizedRoutes.includes(normalizedDefault)
      ? normalizedRoutes
      : dedupeRoutes([normalizedDefault, ...normalizedRoutes]);
    const routesPayload = ensuredRoutes.length > 0
      ? ensuredRoutes
      : [DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL];
    const defaultPayload = routesPayload.includes(normalizedDefault)
      ? normalizedDefault
      : routesPayload[0] ?? DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;

    updateSettingsBulk.mutate(
      [
        {
          key: PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
          value: defaultPayload,
        },
        {
          key: PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY,
          value: JSON.stringify(routesPayload),
        },
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
    const localhostRoute = DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL;
    setRoutes((prev: string[]) =>
      prev.includes(localhostRoute) ? prev : dedupeRoutes([localhostRoute, ...prev])
    );
    setDefaultRoute(localhostRoute);
  };

  return (
    <div className='space-y-5'>
      <div className='space-y-2'>
        <Label htmlFor='productImageRoute'>Add Product Image Route</Label>
        <div className='flex items-center gap-2'>
          <Input
            id='productImageRoute'
            value={newRoute}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setNewRoute(event.target.value)}
            placeholder={DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL}
            onKeyDown={(event: React.KeyboardEvent<HTMLInputElement>) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleAddRoute();
              }
            }}
          />
          <Button
            type='button'
            variant='outline'
            onClick={handleAddRoute}
            disabled={updateSettingsBulk.isPending}
          >
            Add
          </Button>
        </div>
        <p className='text-xs text-gray-500'>
          Add multiple image routes and choose one default route used by Product List and modals.
        </p>
      </div>

      <div className='space-y-2'>
        <Label>Available Routes</Label>
        <RadioGroup
          value={defaultRoute}
          onValueChange={setDefaultRoute}
          className='space-y-2'
          disabled={updateSettingsBulk.isPending}
        >
          {routes.map((route: string) => {
            return (
              <div
                key={route}
                className='flex items-center gap-3 rounded-md border border-gray-200 px-3 py-2'
              >
                <RadioGroupItem value={route} id={`route-${route}`} />
                <Label
                  htmlFor={`route-${route}`}
                  className='min-w-0 flex-1 truncate text-sm font-normal cursor-pointer'
                >
                  {route}
                </Label>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={() => handleRemoveRoute(route)}
                  disabled={routes.length <= 1 || updateSettingsBulk.isPending}
                >
                  Remove
                </Button>
              </div>
            );
          })}
        </RadioGroup>
      </div>

      <div className='flex items-center gap-3'>
        <Button
          type='button'
          variant='outline'
          onClick={handleUseLocalhost}
          disabled={updateSettingsBulk.isPending}
        >
          Use localhost:3000
        </Button>
        <Button
          type='button'
          onClick={handleSave}
          disabled={updateSettingsBulk.isPending}
        >
          {updateSettingsBulk.isPending ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
