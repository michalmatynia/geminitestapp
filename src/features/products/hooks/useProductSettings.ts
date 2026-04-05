'use client';

import { useCallback, useRef } from 'react';

import { normalizeProductStudioSequenceGenerationMode } from '@/shared/contracts/products/studio';
import { type ProductStudioSequenceGenerationMode } from '@/shared/contracts/products';
import {
  DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
  PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY,
  PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY,
  PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY,
  PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY,
} from '@/shared/lib/products/constants';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

export type ProductSettingsSnapshot = {
  /** External image server base URL (never null; defaults to localhost:3000) */
  imageExternalBaseUrl: string;
  /** Persisted image route JSON string, null when not yet configured */
  imageExternalRoutesRaw: string | null;
  /** Default Image Studio project ID (trimmed; may be empty string) */
  defaultProjectId: string;
  /** How the studio generates variant image sequences */
  sequenceGenerationMode: ProductStudioSequenceGenerationMode;
};

/**
 * Domain hook that centralises all products-feature settings reads.
 *
 * Snapshot values (`imageExternalBaseUrl`, `imageExternalRoutesRaw`,
 * `defaultProjectId`, `sequenceGenerationMode`) are safe for render-time use
 * and update whenever the settings store refetches.
 *
 * The stable getters (`getImageExternalBaseUrl`, `getDefaultProjectId`,
 * `refetch`) are created once and are safe to call inside `useCallback` /
 * `useEffect` / `useMemo` without being added to dependency arrays.
 */
export function useProductSettings(): ProductSettingsSnapshot & {
  /** Stable — safe inside useCallback / useEffect / useMemo without being a dep */
  getImageExternalBaseUrl: () => string;
  /** Stable — safe inside useCallback / useEffect / useMemo without being a dep */
  getDefaultProjectId: () => string;
  /** Stable — triggers a settings store refetch from inside a callback */
  refetch: () => void;
  } {
  const settingsStore = useSettingsStore();
  const settingsStoreRef = useRef(settingsStore);
  settingsStoreRef.current = settingsStore;

  const getImageExternalBaseUrl = useCallback(
    () =>
      settingsStoreRef.current.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
      DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
    []
  );

  const getDefaultProjectId = useCallback(
    () => settingsStoreRef.current.get(PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY)?.trim() ?? '',
    []
  );

  const refetch = useCallback(() => {
    settingsStoreRef.current.refetch();
  }, []);

  return {
    imageExternalBaseUrl:
      settingsStore.get(PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY) ??
      DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL,
    imageExternalRoutesRaw: settingsStore.get(PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY) ?? null,
    defaultProjectId: settingsStore.get(PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY)?.trim() ?? '',
    sequenceGenerationMode: normalizeProductStudioSequenceGenerationMode(
      settingsStore.get(PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY)
    ),
    getImageExternalBaseUrl,
    getDefaultProjectId,
    refetch,
  };
}
