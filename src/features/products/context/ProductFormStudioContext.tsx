'use client';

import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import {
  ProductWithImages,
  productStudioConfigResponseSchema,
} from '@/shared/contracts/products';
import { internalError } from '@/shared/errors/app-error';
import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui';

export interface ProductFormStudioStateContextType {
  studioProjectId: string | null;
  studioConfigLoading: boolean;
  studioConfigSaving: boolean;
}

export interface ProductFormStudioActionsContextType {
  setStudioProjectId: (projectId: string | null) => void;
}

export type ProductFormStudioContextType = ProductFormStudioStateContextType &
  ProductFormStudioActionsContextType;

const PRODUCT_STUDIO_CONFIG_CACHE_TTL_MS = 30_000;

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
    .get<unknown>(`/api/v2/products/${encodeURIComponent(productId)}/studio`, {
      cache: 'no-store',
      logError: false,
    })
    .then((response) => productStudioConfigResponseSchema.parse(response))
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

export const ProductFormStudioStateContext = createContext<ProductFormStudioStateContextType | null>(
  null
);
export const ProductFormStudioActionsContext =
  createContext<ProductFormStudioActionsContextType | null>(null);

export function ProductFormStudioProvider({
  children,
  product,
}: {
  children: React.ReactNode;
  product?: ProductWithImages;
}) {
  const { toast } = useToast();
  const { defaultProjectId } = useProductSettings();
  const defaultStudioProjectId = defaultProjectId || null;
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
      .put<unknown>(
        `/api/v2/products/${encodeURIComponent(productId)}/studio`,
        {
          projectId: nextProjectId,
        },
        { logError: false }
      )
      .then((response) => productStudioConfigResponseSchema.parse(response))
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

  const stateValue = useMemo(
    (): ProductFormStudioStateContextType => ({
      studioProjectId,
      studioConfigLoading,
      studioConfigSaving,
    }),
    [studioProjectId, studioConfigLoading, studioConfigSaving]
  );
  const actionsValue = useMemo(
    (): ProductFormStudioActionsContextType => ({
      setStudioProjectId,
    }),
    []
  );

  return (
    <ProductFormStudioActionsContext.Provider value={actionsValue}>
      <ProductFormStudioStateContext.Provider value={stateValue}>
        {children}
      </ProductFormStudioStateContext.Provider>
    </ProductFormStudioActionsContext.Provider>
  );
}

export const useProductFormStudioState = (): ProductFormStudioStateContextType => {
  const context = useContext(ProductFormStudioStateContext);
  if (!context) {
    throw internalError(
      'useProductFormStudioState must be used within a ProductFormStudioProvider'
    );
  }
  return context;
};

export const useProductFormStudioActions = (): ProductFormStudioActionsContextType => {
  const context = useContext(ProductFormStudioActionsContext);
  if (!context) {
    throw internalError(
      'useProductFormStudioActions must be used within a ProductFormStudioProvider'
    );
  }
  return context;
};

export const useProductFormStudio = (): ProductFormStudioContextType => {
  const state = useProductFormStudioState();
  const actions = useProductFormStudioActions();
  return useMemo(() => ({ ...state, ...actions }), [state, actions]);
};
