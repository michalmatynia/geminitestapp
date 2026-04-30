'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from 'react';

import { useProductSettings } from '@/features/products/hooks/useProductSettings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import { productStudioConfigResponseSchema } from '@/shared/contracts/products/studio';
import { api } from '@/shared/lib/api-client';
import { useToast } from '@/shared/ui/toast';

import type {
  ProductFormStudioActionsContextType,
  ProductFormStudioStateContextType,
} from './ProductFormStudioContext';

const PRODUCT_STUDIO_CONFIG_CACHE_TTL_MS = 30_000;

type ProductStudioConfigCacheEntry = {
  projectId: string | null;
  expiresAt: number;
};

type Toast = ReturnType<typeof useToast>['toast'];

interface StudioProjectRefs {
  currentStudioProjectRef: MutableRefObject<string | null>;
  persistedStudioProjectRef: MutableRefObject<string | null>;
  studioConfigSaveRequestRef: MutableRefObject<number>;
}

interface ProductFormStudioController {
  actionsValue: ProductFormStudioActionsContextType;
  stateValue: ProductFormStudioStateContextType;
}

interface StudioConfigStateSetters {
  setStudioConfigLoading: Dispatch<SetStateAction<boolean>>;
  setStudioConfigSaving: Dispatch<SetStateAction<boolean>>;
  setStudioProjectIdState: Dispatch<SetStateAction<string | null>>;
}

const productStudioConfigCache = new Map<string, ProductStudioConfigCacheEntry>();
const productStudioConfigInFlight = new Map<string, Promise<string | null>>();

const normalizeStudioProjectId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolveProductId = (product: ProductWithImages | undefined): string =>
  product?.id.trim() ?? '';

const setCachedStudioProjectId = (productId: string, projectId: string | null): void => {
  productStudioConfigCache.set(productId, {
    projectId,
    expiresAt: Date.now() + PRODUCT_STUDIO_CONFIG_CACHE_TTL_MS,
  });
};

const loadStudioProjectId = async (productId: string): Promise<string | null> => {
  const cached = productStudioConfigCache.get(productId);
  const now = Date.now();
  if (cached !== undefined && cached.expiresAt > now) return cached.projectId;

  const inFlight = productStudioConfigInFlight.get(productId);
  if (inFlight !== undefined) return inFlight;

  const request = api
    .get<unknown>(`/api/v2/products/${encodeURIComponent(productId)}/studio`, {
      cache: 'no-store',
      logError: false,
    })
    .then((response) => productStudioConfigResponseSchema.parse(response))
    .then((response) => normalizeStudioProjectId(response.config.projectId))
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

const useStudioProjectRefs = (): StudioProjectRefs => {
  const currentStudioProjectRef = useRef<string | null>(null);
  const persistedStudioProjectRef = useRef<string | null>(null);
  const studioConfigSaveRequestRef = useRef(0);

  return useMemo(
    () => ({
      currentStudioProjectRef,
      persistedStudioProjectRef,
      studioConfigSaveRequestRef,
    }),
    []
  );
};

const applyStudioProjectFallback = ({
  defaultStudioProjectId,
  refs,
  setters,
}: {
  defaultStudioProjectId: string | null;
  refs: StudioProjectRefs;
  setters: StudioConfigStateSetters;
}): void => {
  const { currentStudioProjectRef, persistedStudioProjectRef } = refs;
  setters.setStudioProjectIdState(defaultStudioProjectId);
  setters.setStudioConfigLoading(false);
  setters.setStudioConfigSaving(false);
  persistedStudioProjectRef.current = defaultStudioProjectId;
  currentStudioProjectRef.current = defaultStudioProjectId;
};

const useLoadPersistedStudioConfig = ({
  defaultStudioProjectId,
  productId,
  refs,
  setters,
}: {
  defaultStudioProjectId: string | null;
  productId: string;
  refs: StudioProjectRefs;
  setters: StudioConfigStateSetters;
}): void => {
  useEffect((): (() => void) => {
    const { currentStudioProjectRef, persistedStudioProjectRef } = refs;
    let cancelled = false;

    if (productId.length === 0) {
      applyStudioProjectFallback({ defaultStudioProjectId, refs, setters });
      return (): void => {
        cancelled = true;
      };
    }

    setters.setStudioConfigLoading(true);
    loadStudioProjectId(productId)
      .then((persistedProjectId) => {
        if (cancelled === true) return;
        const normalized = persistedProjectId ?? defaultStudioProjectId;
        setters.setStudioProjectIdState(normalized);
        persistedStudioProjectRef.current = normalized;
        currentStudioProjectRef.current = normalized;
      })
      .catch(() => {
        if (cancelled === true) return;
        setters.setStudioProjectIdState(defaultStudioProjectId);
        persistedStudioProjectRef.current = defaultStudioProjectId;
        currentStudioProjectRef.current = defaultStudioProjectId;
      })
      .finally(() => {
        if (cancelled === true) return;
        setters.setStudioConfigLoading(false);
      });

    return (): void => {
      cancelled = true;
    };
  }, [defaultStudioProjectId, productId, refs, setters]);
};

const usePersistStudioConfig = ({
  productId,
  refs,
  setStudioConfigSaving,
  setStudioProjectIdState,
  toast,
}: {
  productId: string;
  refs: StudioProjectRefs;
  setStudioConfigSaving: Dispatch<SetStateAction<boolean>>;
  setStudioProjectIdState: Dispatch<SetStateAction<string | null>>;
  toast: Toast;
}): ((nextProjectId: string | null) => void) => {
  const { currentStudioProjectRef, persistedStudioProjectRef, studioConfigSaveRequestRef } = refs;

  return useCallback(
    (nextProjectId: string | null): void => {
      if (productId.length === 0) return;

      const requestId = ++studioConfigSaveRequestRef.current;
      setStudioConfigSaving(true);

      api
        .put<unknown>(
          `/api/v2/products/${encodeURIComponent(productId)}/studio`,
          { projectId: nextProjectId },
          { logError: false }
        )
        .then((response) => productStudioConfigResponseSchema.parse(response))
        .then((response) => {
          if (studioConfigSaveRequestRef.current !== requestId) return;
          const persistedProjectId = normalizeStudioProjectId(response.config.projectId);
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
          toast('Failed to autosave Product Studio settings.', { variant: 'error' });
        })
        .finally(() => {
          if (studioConfigSaveRequestRef.current !== requestId) return;
          setStudioConfigSaving(false);
        });
    },
    [
      currentStudioProjectRef,
      persistedStudioProjectRef,
      productId,
      setStudioConfigSaving,
      setStudioProjectIdState,
      studioConfigSaveRequestRef,
      toast,
    ]
  );
};

export const useProductFormStudioController = (
  product: ProductWithImages | undefined
): ProductFormStudioController => {
  const { toast } = useToast();
  const { defaultProjectId } = useProductSettings();
  const defaultStudioProjectId = normalizeStudioProjectId(defaultProjectId);
  const productId = resolveProductId(product);
  const [studioProjectId, setStudioProjectIdState] = useState<string | null>(null);
  const [studioConfigLoading, setStudioConfigLoading] = useState<boolean>(productId.length > 0);
  const [studioConfigSaving, setStudioConfigSaving] = useState<boolean>(false);
  const refs = useStudioProjectRefs();
  const setters = useMemo(
    () => ({ setStudioConfigLoading, setStudioConfigSaving, setStudioProjectIdState }),
    []
  );

  useLoadPersistedStudioConfig({ defaultStudioProjectId, productId, refs, setters });

  const persistStudioConfig = usePersistStudioConfig({
    productId,
    refs,
    setStudioConfigSaving,
    setStudioProjectIdState,
    toast,
  });
  const { currentStudioProjectRef, persistedStudioProjectRef } = refs;
  const setStudioProjectId = useCallback(
    (projectId: string | null): void => {
      const normalized = typeof projectId === 'string' ? projectId.trim() : '';
      const nextProjectId = normalized.length > 0 ? normalized : null;
      if (currentStudioProjectRef.current === nextProjectId) {
        setStudioProjectIdState((current) => (current === nextProjectId ? current : nextProjectId));
        return;
      }
      currentStudioProjectRef.current = nextProjectId;
      setStudioProjectIdState((current) => (current === nextProjectId ? current : nextProjectId));
      if (persistedStudioProjectRef.current === nextProjectId) return;
      persistStudioConfig(nextProjectId);
    },
    [currentStudioProjectRef, persistedStudioProjectRef, persistStudioConfig]
  );
  const stateValue = useMemo(
    (): ProductFormStudioStateContextType => ({
      studioProjectId,
      studioConfigLoading,
      studioConfigSaving,
    }),
    [studioConfigLoading, studioConfigSaving, studioProjectId]
  );
  const actionsValue = useMemo(
    (): ProductFormStudioActionsContextType => ({ setStudioProjectId }),
    [setStudioProjectId]
  );

  return { actionsValue, stateValue };
};
