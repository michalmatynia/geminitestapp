'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY } from '@/features/products/constants';
import { ProductWithImages } from '@/shared/contracts/products';
import { api } from '@/shared/lib/api-client';
import { internalError } from '@/shared/errors/app-error';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { useToast } from '@/shared/ui';

export interface ProductFormStudioContextType {
  studioProjectId: string | null;
  setStudioProjectId: (projectId: string | null) => void;
  studioConfigLoading: boolean;
  studioConfigSaving: boolean;
}

const PRODUCT_STUDIO_CONFIG_CACHE_TTL_MS = 30_000;

type ProductStudioConfigResponse = {
  config?: {
    projectId?: string | null;
  };
};

type ProductStudioConfigCacheEntry = {
  projectId: string | null;
  expiresAt: number;
};

const productStudioConfigCache = new Map<string, ProductStudioConfigCacheEntry>();
const productStudioConfigInFlight = new Map<string, Promise<string | null>>();

const normalizeStudioProjectId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const setCachedStudioProjectId = (productId: string, projectId: string | null): void => {
  productStudioConfigCache.set(productId, {
    projectId,
    expiresAt: Date.now() + PRODUCT_STUDIO_CONFIG_CACHE_TTL_MS,
  });
};

const loadStudioProjectId = async (productId: string): Promise<string | null> => {
  const cached = productStudioConfigCache.get(productId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.projectId;
  }

  const inFlight = productStudioConfigInFlight.get(productId);
  if (inFlight) {
    return inFlight;
  }

  const request = api
    .get<ProductStudioConfigResponse>(`/api/v2/products/${encodeURIComponent(productId)}/studio`, {
      cache: 'no-store',
      logError: false,
    })
    .then((response) => normalizeStudioProjectId(response.config?.projectId))
    .then((projectId) => {
      setCachedStudioProjectId(productId, projectId);
      return projectId;
    })
    .finally(() => {
      productStudioConfigInFlight.delete(productId);
    });

  productStudioConfigInFlight.set(productId, request);
  return request;
};

export const ProductFormStudioContext = createContext<ProductFormStudioContextType | null>(null);

export function ProductFormStudioProvider({
  children,
  product,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
}) {
  const { toast } = useToast();
  const settingsStore = useSettingsStore();
  const defaultStudioProjectIdSettingRaw =
    settingsStore.get(PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY) ?? '';
  const defaultStudioProjectId = defaultStudioProjectIdSettingRaw.trim() || null;
  const [studioProjectId, setStudioProjectIdState] = useState<string | null>(null);
  const [studioConfigLoading, setStudioConfigLoading] = useState<boolean>(Boolean(product?.id));
  const [studioConfigSaving, setStudioConfigSaving] = useState<boolean>(false);
  const studioConfigSaveRequestRef = useRef(0);
  const persistedStudioProjectRef = useRef<string | null>(null);
  const currentStudioProjectRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const productId = product?.id?.trim() ?? '';

    if (!productId) {
      const fallbackProjectId = defaultStudioProjectId;
      setStudioProjectIdState(fallbackProjectId);
      setStudioConfigLoading(false);
      setStudioConfigSaving(false);
      persistedStudioProjectRef.current = fallbackProjectId;
      currentStudioProjectRef.current = fallbackProjectId;
      return () => {
        cancelled = true;
      };
    }

    setStudioConfigLoading(true);
    void loadStudioProjectId(productId)
      .then((persistedProjectId) => {
        if (cancelled) return;
        const normalized = persistedProjectId ?? defaultStudioProjectId;
        setStudioProjectIdState(normalized);
        persistedStudioProjectRef.current = normalized;
        currentStudioProjectRef.current = normalized;
      })
      .catch(() => {
        if (cancelled) return;
        setStudioProjectIdState(defaultStudioProjectId);
        persistedStudioProjectRef.current = defaultStudioProjectId;
        currentStudioProjectRef.current = defaultStudioProjectId;
      })
      .finally(() => {
        if (cancelled) return;
        setStudioConfigLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [defaultStudioProjectId, product?.id]);

  const persistStudioConfig = (nextProjectId: string | null): void => {
    const productId = product?.id?.trim() ?? '';
    if (!productId) return;

    const requestId = ++studioConfigSaveRequestRef.current;
    setStudioConfigSaving(true);

    void api
      .put<{
        config?: {
          projectId?: string | null;
        };
      }>(
        `/api/v2/products/${encodeURIComponent(productId)}/studio`,
        {
          projectId: nextProjectId,
        },
        { logError: false }
      )
      .then((response) => {
        if (studioConfigSaveRequestRef.current !== requestId) return;
        const persistedProjectId = normalizeStudioProjectId(response.config?.projectId);
        setCachedStudioProjectId(productId, persistedProjectId);
        persistedStudioProjectRef.current = persistedProjectId;
        currentStudioProjectRef.current = persistedProjectId;
        setStudioProjectIdState(persistedProjectId);
      })
      .catch(() => {
        if (studioConfigSaveRequestRef.current !== requestId) return;
        const fallbackProjectId = persistedStudioProjectRef.current;
        currentStudioProjectRef.current = fallbackProjectId;
        setStudioProjectIdState(fallbackProjectId);
        toast('Failed to autosave Product Studio settings.', {
          variant: 'error',
        });
      })
      .finally(() => {
        if (studioConfigSaveRequestRef.current !== requestId) return;
        setStudioConfigSaving(false);
      });
  };

  const setStudioProjectId = (projectId: string | null): void => {
    const normalized = typeof projectId === 'string' ? projectId.trim() : '';
    const nextProjectId = normalized || null;
    currentStudioProjectRef.current = nextProjectId;
    setStudioProjectIdState(nextProjectId);
    persistStudioConfig(nextProjectId);
  };

  const value = useMemo(
    () => ({
      studioProjectId,
      setStudioProjectId,
      studioConfigLoading,
      studioConfigSaving,
    }),
    [studioProjectId, studioConfigLoading, studioConfigSaving]
  );

  return (
    <ProductFormStudioContext.Provider value={value}>{children}</ProductFormStudioContext.Provider>
  );
}

export const useProductFormStudio = (): ProductFormStudioContextType => {
  const context = useContext(ProductFormStudioContext);
  if (!context) {
    throw internalError('useProductFormStudio must be used within a ProductFormStudioProvider');
  }
  return context;
};
