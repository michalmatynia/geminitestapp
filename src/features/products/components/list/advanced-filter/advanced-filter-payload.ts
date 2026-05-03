import {
  productAdvancedFilterGroupSchema,
  productAdvancedFilterPresetBundleSchema,
} from '@/shared/contracts/products/filters';
import type {
  ProductAdvancedFilterGroup,
  ProductAdvancedFilterPreset,
} from '@/shared/contracts/products';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import { createEmptyGroup } from './advanced-filter-rules';

export const parseAdvancedFilterPayload = (
  payload: string | null | undefined
): ProductAdvancedFilterGroup | null => {
  if (payload === null || payload === undefined || payload.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    const validated = productAdvancedFilterGroupSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch (error) {
    logClientError(error);
    return null;
  }
};

export const parseAdvancedFilterPayloadOrDefault = (
  payload: string | null | undefined
): ProductAdvancedFilterGroup => parseAdvancedFilterPayload(payload) ?? createEmptyGroup();

export const serializeAdvancedFilterPayload = (group: ProductAdvancedFilterGroup): string =>
  JSON.stringify(group);

export const readAdvancedPresetBundle = (
  payload: unknown
): ProductAdvancedFilterPreset[] | null => {
  const bundleResult = productAdvancedFilterPresetBundleSchema.safeParse(payload);
  if (bundleResult.success) return bundleResult.data.presets;
  if (Array.isArray(payload)) {
    const presetsResult = productAdvancedFilterPresetBundleSchema.shape.presets.safeParse(payload);
    return presetsResult.success ? presetsResult.data : null;
  }
  return null;
};

export const findPresetById = (
  presets: ProductAdvancedFilterPreset[],
  presetId: string
): ProductAdvancedFilterPreset | null => presets.find((preset) => preset.id === presetId) ?? null;
