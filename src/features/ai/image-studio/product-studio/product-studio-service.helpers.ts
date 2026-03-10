import { createHash } from 'crypto';

import {
  parsePersistedImageStudioSettings,
  type ImageStudioSettings,
} from '@/features/ai/image-studio/server';
import { sanitizeImageStudioProjectId } from '@/features/ai/image-studio/server/run-executor';
import {
  type ProductStudioSequencingDiagnostics,
  type ProductWithImages,
} from '@/shared/contracts/products';
import { badRequestError } from '@/shared/errors/app-error';
import { DEFAULT_IMAGE_SLOT_COUNT } from '@/shared/lib/image-slots';

export const normalizeProjectId = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = sanitizeImageStudioProjectId(value);
  return normalized.length > 0 ? normalized : null;
};

export const normalizeImageSlotIndex = (value: number): number => {
  if (!Number.isFinite(value)) {
    throw badRequestError('Image slot index must be a number.');
  }
  const normalized = Math.floor(value);
  if (normalized < 0 || normalized >= DEFAULT_IMAGE_SLOT_COUNT) {
    throw badRequestError(
      `Image slot index must be between 0 and ${DEFAULT_IMAGE_SLOT_COUNT - 1}.`
    );
  }
  return normalized;
};

export const trimString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

export const hasPersistedSettingValue = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const buildSequencingDiagnostics = (params: {
  projectId: string;
  projectSettingsKey: string | null;
  projectSettingsRaw: unknown;
  globalSettingsRaw: unknown;
  selectedSettings: ImageStudioSettings;
}): ProductStudioSequencingDiagnostics => {
  const projectSettingsRaw = hasPersistedSettingValue(params.projectSettingsRaw)
    ? params.projectSettingsRaw
    : null;
  const globalSettingsRaw = hasPersistedSettingValue(params.globalSettingsRaw)
    ? params.globalSettingsRaw
    : null;
  const hasProjectSettings = projectSettingsRaw !== null;
  const hasGlobalSettings = globalSettingsRaw !== null;
  const selectedScope = hasProjectSettings ? 'project' : 'default';
  const selectedSettingsKey = params.projectSettingsKey;
  const projectSettings = projectSettingsRaw
    ? parsePersistedImageStudioSettings(projectSettingsRaw)
    : null;
  const globalSettings = globalSettingsRaw
    ? parsePersistedImageStudioSettings(globalSettingsRaw)
    : null;

  return {
    projectId: trimString(params.projectId),
    projectSettingsKey: params.projectSettingsKey,
    selectedSettingsKey,
    selectedScope,
    hasProjectSettings,
    hasGlobalSettings,
    projectSequencingEnabled: Boolean(projectSettings?.projectSequencing.enabled),
    globalSequencingEnabled: Boolean(globalSettings?.projectSequencing.enabled),
    selectedSequencingEnabled: Boolean(params.selectedSettings.projectSequencing.enabled),
    selectedSnapshotHash: trimString(params.selectedSettings.projectSequencing.snapshotHash),
    selectedSnapshotSavedAt: trimString(params.selectedSettings.projectSequencing.snapshotSavedAt),
    selectedSnapshotStepCount: Number.isFinite(
      params.selectedSettings.projectSequencing.snapshotStepCount
    )
      ? Math.max(0, Math.floor(params.selectedSettings.projectSequencing.snapshotStepCount))
      : 0,
    selectedSnapshotModelId: trimString(params.selectedSettings.projectSequencing.snapshotModelId),
  };
};

export const sanitizeSkuSegment = (value: string | null): string | null => {
  if (!value) return null;
  const cleaned = value
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
  return cleaned.length > 0 ? cleaned : null;
};

export const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

export const pickProductName = (product: ProductWithImages): string => {
  return (
    product.name_en?.trim() ||
    product.name_pl?.trim() ||
    product.name_de?.trim() ||
    product.sku?.trim() ||
    product.id
  );
};

export const buildSettingsSnapshotHash = (settings: Record<string, unknown>): string => {
  const payload = JSON.stringify(settings);
  return createHash('sha1').update(payload).digest('hex').slice(0, 20);
};

export const clamp01 = (value: number): number => {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};
