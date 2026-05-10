import {
  organizationAdvancedFilterGroupSchema,
  organizationAdvancedFilterPresetBundleSchema,
  organizationAdvancedFilterPresetSchema,
  type OrganizationAdvancedFilterGroup,
  type OrganizationAdvancedFilterPreset,
  type OrganizationAdvancedFilterPresetBundle,
} from '../../filemaker-organization-advanced-filters';
import {
  createEmptyOrganizationGroup,
  createOrganizationAdvancedRuleId,
} from './organization-advanced-filter-rules';

type ClipboardLike = {
  writeText?: (value: string) => Promise<void>;
};

export const parseOrganizationAdvancedFilterPayload = (
  payload: string | null | undefined
): OrganizationAdvancedFilterGroup | null => {
  if (payload === null || payload === undefined || payload.trim().length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(payload);
    const validated = organizationAdvancedFilterGroupSchema.safeParse(parsed);
    return validated.success ? validated.data : null;
  } catch {
    return null;
  }
};

export const parseOrganizationAdvancedFilterPayloadOrDefault = (
  payload: string | null | undefined
): OrganizationAdvancedFilterGroup =>
  parseOrganizationAdvancedFilterPayload(payload) ?? createEmptyOrganizationGroup();

export const serializeOrganizationAdvancedFilterPayload = (
  group: OrganizationAdvancedFilterGroup
): string => JSON.stringify(group);

export const createOrganizationAdvancedPreset = (
  name: string,
  filter: OrganizationAdvancedFilterGroup
): OrganizationAdvancedFilterPreset => {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    filter,
    id: createOrganizationAdvancedRuleId(),
    name: name.trim(),
    updatedAt: now,
  };
};

export const normalizeOrganizationPresetName = (name: string): string => name.trim();

export const hasOrganizationPresetNameConflict = (
  presets: OrganizationAdvancedFilterPreset[],
  name: string,
  exceptPresetId?: string
): boolean => {
  const normalizedName = normalizeOrganizationPresetName(name).toLowerCase();
  if (normalizedName.length === 0) return false;
  return presets.some((preset: OrganizationAdvancedFilterPreset): boolean => {
    if (exceptPresetId !== undefined && preset.id === exceptPresetId) return false;
    return preset.name.trim().toLowerCase() === normalizedName;
  });
};

export const findOrganizationPresetById = (
  presets: OrganizationAdvancedFilterPreset[],
  presetId: string
): OrganizationAdvancedFilterPreset | null =>
  presets.find((preset: OrganizationAdvancedFilterPreset): boolean => preset.id === presetId) ??
  null;

export const cloneOrganizationAdvancedFilterGroup = (
  filter: OrganizationAdvancedFilterGroup
): OrganizationAdvancedFilterGroup =>
  JSON.parse(JSON.stringify(filter)) as OrganizationAdvancedFilterGroup;

export const buildOrganizationPresetBundle = (
  presets: OrganizationAdvancedFilterPreset[]
): OrganizationAdvancedFilterPresetBundle => ({
  exportedAt: new Date().toISOString(),
  presets,
  version: 1,
});

export const readOrganizationAdvancedPresetBundle = (
  payload: unknown
): OrganizationAdvancedFilterPreset[] | null => {
  const bundle = organizationAdvancedFilterPresetBundleSchema.safeParse(payload);
  if (bundle.success) return bundle.data.presets;
  if (Array.isArray(payload)) {
    const presets = organizationAdvancedFilterPresetBundleSchema.shape.presets.safeParse(payload);
    return presets.success ? presets.data : null;
  }
  return null;
};

export const parseOrganizationPresetImportPayload = (
  payload: unknown
): OrganizationAdvancedFilterPreset[] | null => {
  const single = organizationAdvancedFilterPresetSchema.safeParse(payload);
  if (single.success) return [single.data];
  return readOrganizationAdvancedPresetBundle(payload);
};

const resolveImportedOrganizationPresetName = (
  desiredName: string,
  usedLowercaseNames: Set<string>
): string => {
  const normalizedName = normalizeOrganizationPresetName(desiredName);
  const baseName = normalizedName.length > 0 ? normalizedName : 'Imported Preset';
  let copyIndex = 1;
  let candidate = baseName;
  while (usedLowercaseNames.has(candidate.toLowerCase())) {
    candidate = `${baseName} (copy ${copyIndex})`;
    copyIndex += 1;
  }
  usedLowercaseNames.add(candidate.toLowerCase());
  return candidate;
};

export const mapImportedOrganizationPresets = (
  currentPresets: OrganizationAdvancedFilterPreset[],
  importedPresets: OrganizationAdvancedFilterPreset[]
): OrganizationAdvancedFilterPreset[] => {
  const now = new Date().toISOString();
  const usedNames = new Set<string>(
    currentPresets.map((preset: OrganizationAdvancedFilterPreset): string =>
      preset.name.trim().toLowerCase()
    )
  );
  return importedPresets.map((preset: OrganizationAdvancedFilterPreset) => ({
    ...preset,
    createdAt: now,
    filter: cloneOrganizationAdvancedFilterGroup(preset.filter),
    id: createOrganizationAdvancedRuleId(),
    name: resolveImportedOrganizationPresetName(preset.name, usedNames),
    updatedAt: now,
  }));
};

export const downloadOrganizationJsonFile = (filename: string, payload: unknown): void => {
  if (typeof window === 'undefined') return;
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

export const slugifyOrganizationPresetFilename = (name: string): string => {
  const normalized = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized.length > 0 ? normalized : 'preset';
};

export const writeOrganizationTextToClipboard = async (value: string): Promise<void> => {
  const clipboard =
    typeof navigator === 'undefined'
      ? null
      : ((navigator as unknown as { clipboard?: ClipboardLike }).clipboard ?? null);
  if (clipboard === null || typeof clipboard.writeText !== 'function') {
    throw new Error('Clipboard API is not available in this browser.');
  }
  await clipboard.writeText(value);
};
