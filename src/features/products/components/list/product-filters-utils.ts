import {
  createRuleId,
  readAdvancedPresetBundle,
} from '@/features/products/components/list/advanced-filter';
import { productAdvancedFilterPresetSchema, productAdvancedFilterPresetBundleSchema } from '@/shared/contracts/products/filters';
import { type ProductAdvancedFilterPreset, type ProductAdvancedFilterGroup } from '@/shared/contracts/products';

export const normalizePresetName = (name: string): string => name.trim();

export const hasPresetNameConflict = (
  presets: ProductAdvancedFilterPreset[],
  name: string,
  exceptPresetId?: string
): boolean => {
  const normalizedName = name.trim().toLowerCase();
  if (!normalizedName) return false;
  return presets.some((preset: ProductAdvancedFilterPreset) => {
    if (exceptPresetId && preset.id === exceptPresetId) return false;
    return preset.name.trim().toLowerCase() === normalizedName;
  });
};

export const createAdvancedPreset = (
  name: string,
  filter: ProductAdvancedFilterGroup
): ProductAdvancedFilterPreset => {
  const now = new Date().toISOString();
  return {
    id: createRuleId(),
    name: normalizePresetName(name),
    filter,
    createdAt: now,
    updatedAt: now,
  };
};

export const buildPresetBundle = (presets: ProductAdvancedFilterPreset[]) => ({
  version: 1 as const,
  exportedAt: new Date().toISOString(),
  presets,
});

export const parsePresetImportPayload = (
  payload: unknown
): ProductAdvancedFilterPreset[] | null => {
  const single = productAdvancedFilterPresetSchema.safeParse(payload);
  if (single.success) return [single.data];

  const bundle = productAdvancedFilterPresetBundleSchema.safeParse(payload);
  if (bundle.success) return bundle.data.presets;

  return readAdvancedPresetBundle(payload);
};

const resolveImportedPresetName = (
  desiredName: string,
  usedLowercaseNames: Set<string>
): string => {
  const baseName = normalizePresetName(desiredName) || 'Imported Preset';
  let copyIndex = 1;
  let candidate = baseName;

  while (usedLowercaseNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} (copy ${copyIndex})`;
    copyIndex += 1;
  }

  usedLowercaseNames.add(candidate.toLowerCase());
  return candidate;
};

export const mapImportedPresets = (
  currentPresets: ProductAdvancedFilterPreset[],
  importedPresets: ProductAdvancedFilterPreset[]
): ProductAdvancedFilterPreset[] => {
  const now = new Date().toISOString();
  const usedNames = new Set<string>(
    currentPresets.map((preset: ProductAdvancedFilterPreset) => preset.name.trim().toLowerCase())
  );

  return importedPresets.map((preset: ProductAdvancedFilterPreset) => ({
    ...preset,
    id: createRuleId(),
    name: resolveImportedPresetName(preset.name, usedNames),
    filter: JSON.parse(JSON.stringify(preset.filter)) as ProductAdvancedFilterGroup,
    createdAt: now,
    updatedAt: now,
  }));
};

export const downloadJsonFile = (filename: string, payload: unknown): void => {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const slugifyPresetFilename = (name: string): string => {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'preset';
};

export const writeToClipboard = async (value: string): Promise<void> => {
  if (!navigator.clipboard?.writeText) {
    throw new Error('Clipboard API is not available in this browser.');
  }
  await navigator.clipboard.writeText(value);
};
