import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterShadowPolicy,
} from '@/features/ai/image-studio/contracts/center';
import {
  IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_MAX_CHROMA_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_MAX_WHITE_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
  IMAGE_STUDIO_CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
} from '@/features/ai/image-studio/contracts/center';
import { sanitizeStudioProjectId } from '@/shared/lib/ai/image-studio/utils/project-session';

export type ObjectLayoutPresetId =
  | 'default_product'
  | 'with_shadow'
  | 'hard_background'
  | 'transparent_png'
  | 'custom';

export type ObjectLayoutPresetOptionValue = ObjectLayoutPresetId | `user:${string}`;

export type ObjectLayoutAdvancedDefaults = {
  detection: ImageStudioCenterDetectionMode;
  shadowPolicy: ImageStudioCenterShadowPolicy;
  whiteThreshold: number;
  chromaThreshold: number;
};

type PersistedObjectLayoutAdvancedDefaults = ObjectLayoutAdvancedDefaults & {
  version: 1;
  updatedAt: string;
};

export type ObjectLayoutPresetDefinition = ObjectLayoutAdvancedDefaults & {
  id: Exclude<ObjectLayoutPresetId, 'custom'>;
  label: string;
};

export type ObjectLayoutCustomPreset = {
  id: string;
  name: string;
  values: ObjectLayoutAdvancedDefaults;
  createdAt: string;
  updatedAt: string;
};

type PersistedObjectLayoutCustomPreset = {
  version: 1;
  id: string;
  name: string;
  values: ObjectLayoutAdvancedDefaults;
  createdAt: string;
  updatedAt: string;
};

export const IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT =
  'image-studio:object-layout-presets-changed';

const OBJECT_LAYOUT_ADVANCED_DEFAULTS_LOCAL_KEY_PREFIX =
  'image_studio_object_layout_advanced_defaults_local_';
const OBJECT_LAYOUT_ADVANCED_DEFAULTS_SESSION_KEY =
  'image_studio_object_layout_advanced_defaults_session';
const OBJECT_LAYOUT_CUSTOM_PRESETS_LOCAL_KEY_PREFIX =
  'image_studio_object_layout_custom_presets_local_';
const OBJECT_LAYOUT_CUSTOM_PRESETS_SESSION_KEY =
  'image_studio_object_layout_custom_presets_session';
const CUSTOM_PRESET_NAME_MAX_LENGTH = 48;

const clampNumber = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, Math.round(value)));

const normalizeAdvancedDefaults = (
  value: Partial<ObjectLayoutAdvancedDefaults> | null | undefined
): ObjectLayoutAdvancedDefaults => {
  const detectionRaw = value?.detection;
  const detection: ImageStudioCenterDetectionMode =
    detectionRaw === 'alpha_bbox' || detectionRaw === 'white_bg_first_colored_pixel'
      ? detectionRaw
      : 'auto';
  const shadowPolicyRaw = value?.shadowPolicy;
  const shadowPolicy: ImageStudioCenterShadowPolicy =
    shadowPolicyRaw === 'include_shadow' || shadowPolicyRaw === 'exclude_shadow'
      ? shadowPolicyRaw
      : 'auto';
  const whiteThresholdRaw = value?.whiteThreshold;
  const chromaThresholdRaw = value?.chromaThreshold;
  const whiteThreshold = clampNumber(
    Number.isFinite(whiteThresholdRaw)
      ? Number(whiteThresholdRaw)
      : IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD,
    IMAGE_STUDIO_CENTER_LAYOUT_MIN_WHITE_THRESHOLD,
    IMAGE_STUDIO_CENTER_LAYOUT_MAX_WHITE_THRESHOLD
  );
  const chromaThreshold = clampNumber(
    Number.isFinite(chromaThresholdRaw)
      ? Number(chromaThresholdRaw)
      : IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD,
    IMAGE_STUDIO_CENTER_LAYOUT_MIN_CHROMA_THRESHOLD,
    IMAGE_STUDIO_CENTER_LAYOUT_MAX_CHROMA_THRESHOLD
  );
  return {
    detection,
    shadowPolicy,
    whiteThreshold,
    chromaThreshold,
  };
};

const normalizePresetName = (value: string): string =>
  value.trim().replace(/\s+/g, ' ').slice(0, CUSTOM_PRESET_NAME_MAX_LENGTH);

const buildCustomPresetOptionValue = (presetId: string): `user:${string}` =>
  `user:${presetId}`;

const parseCustomPresetOptionValue = (value: string): string | null =>
  value.startsWith('user:') ? value.slice(5).trim() : null;

const buildCustomPresetId = (): string =>
  `preset_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

const dispatchCustomPresetChanged = (): void => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(IMAGE_STUDIO_OBJECT_LAYOUT_PRESETS_CHANGED_EVENT));
};

export const OBJECT_LAYOUT_ADVANCED_PRESETS: ObjectLayoutPresetDefinition[] = [
  {
    id: 'default_product',
    label: 'Preset: Default Product',
    detection: 'auto',
    shadowPolicy: 'auto',
    whiteThreshold: IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD,
    chromaThreshold: IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD,
  },
  {
    id: 'with_shadow',
    label: 'Preset: With Shadow',
    detection: 'white_bg_first_colored_pixel',
    shadowPolicy: 'include_shadow',
    whiteThreshold: 18,
    chromaThreshold: 10,
  },
  {
    id: 'hard_background',
    label: 'Preset: Hard Background',
    detection: 'white_bg_first_colored_pixel',
    shadowPolicy: 'exclude_shadow',
    whiteThreshold: 24,
    chromaThreshold: 14,
  },
  {
    id: 'transparent_png',
    label: 'Preset: Transparent PNG',
    detection: 'alpha_bbox',
    shadowPolicy: 'auto',
    whiteThreshold: IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_WHITE_THRESHOLD,
    chromaThreshold: IMAGE_STUDIO_CENTER_LAYOUT_DEFAULT_CHROMA_THRESHOLD,
  },
];

export const OBJECT_LAYOUT_ADVANCED_PRESET_OPTIONS: Array<{ value: ObjectLayoutPresetOptionValue; label: string }> = [
  ...OBJECT_LAYOUT_ADVANCED_PRESETS.map((preset) => ({
    value: preset.id,
    label: preset.label,
  })),
  { value: 'custom', label: 'Preset: Custom (Current)' },
];

export const buildObjectLayoutPresetOptions = (
  customPresets: ObjectLayoutCustomPreset[]
): Array<{ value: ObjectLayoutPresetOptionValue; label: string }> => {
  const customOptions = customPresets.map((preset) => ({
    value: buildCustomPresetOptionValue(preset.id),
    label: `Preset: ${preset.name}`,
  }));
  return [
    ...OBJECT_LAYOUT_ADVANCED_PRESETS.map((preset) => ({
      value: preset.id,
      label: preset.label,
    })),
    ...customOptions,
    { value: 'custom', label: 'Preset: Custom (Current)' },
  ];
};

export const isCustomObjectLayoutPresetOption = (value: string): boolean =>
  value.startsWith('user:');

export const getObjectLayoutPresetById = (
  presetId: ObjectLayoutPresetId
): ObjectLayoutPresetDefinition | null => {
  if (presetId === 'custom') return null;
  return OBJECT_LAYOUT_ADVANCED_PRESETS.find((preset) => preset.id === presetId) ?? null;
};

export const getObjectLayoutPresetValuesFromOption = (
  optionValue: ObjectLayoutPresetOptionValue,
  customPresets: ObjectLayoutCustomPreset[]
): ObjectLayoutAdvancedDefaults | null => {
  if (optionValue === 'custom') return null;
  const builtIn = getObjectLayoutPresetById(optionValue as ObjectLayoutPresetId);
  if (builtIn) return normalizeAdvancedDefaults(builtIn);
  const customPresetId = parseCustomPresetOptionValue(optionValue);
  if (!customPresetId) return null;
  const customPreset = customPresets.find((preset) => preset.id === customPresetId) ?? null;
  return customPreset ? normalizeAdvancedDefaults(customPreset.values) : null;
};

export const resolveObjectLayoutPresetId = (
  values: Partial<ObjectLayoutAdvancedDefaults> | null | undefined
): ObjectLayoutPresetId => {
  const normalized = normalizeAdvancedDefaults(values);
  const matched = OBJECT_LAYOUT_ADVANCED_PRESETS.find((preset) => (
    preset.detection === normalized.detection &&
    preset.shadowPolicy === normalized.shadowPolicy &&
    preset.whiteThreshold === normalized.whiteThreshold &&
    preset.chromaThreshold === normalized.chromaThreshold
  ));
  return matched?.id ?? 'custom';
};

export const resolveObjectLayoutPresetOptionValue = (
  values: Partial<ObjectLayoutAdvancedDefaults> | null | undefined,
  customPresets: ObjectLayoutCustomPreset[]
): ObjectLayoutPresetOptionValue => {
  const builtIn = resolveObjectLayoutPresetId(values);
  if (builtIn !== 'custom') return builtIn;
  const normalized = normalizeAdvancedDefaults(values);
  const matchingCustom = customPresets.find((preset) => {
    const candidate = normalizeAdvancedDefaults(preset.values);
    return (
      candidate.detection === normalized.detection &&
      candidate.shadowPolicy === normalized.shadowPolicy &&
      candidate.whiteThreshold === normalized.whiteThreshold &&
      candidate.chromaThreshold === normalized.chromaThreshold
    );
  });
  return matchingCustom ? buildCustomPresetOptionValue(matchingCustom.id) : 'custom';
};

const getProjectScopedDefaultsLocalKey = (projectId: string | null | undefined): string | null => {
  const normalized = projectId?.trim() ?? '';
  if (!normalized) return null;
  return `${OBJECT_LAYOUT_ADVANCED_DEFAULTS_LOCAL_KEY_PREFIX}${sanitizeStudioProjectId(normalized)}`;
};

const getProjectScopedCustomPresetsLocalKey = (projectId: string | null | undefined): string | null => {
  const normalized = projectId?.trim() ?? '';
  if (!normalized) return null;
  return `${OBJECT_LAYOUT_CUSTOM_PRESETS_LOCAL_KEY_PREFIX}${sanitizeStudioProjectId(normalized)}`;
};

const parsePersistedDefaults = (
  raw: string | null
): ObjectLayoutAdvancedDefaults | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const candidate = parsed as Partial<PersistedObjectLayoutAdvancedDefaults>;
    return normalizeAdvancedDefaults(candidate);
  } catch {
    return null;
  }
};

const parsePersistedCustomPreset = (
  value: unknown
): ObjectLayoutCustomPreset | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const candidate = value as Partial<PersistedObjectLayoutCustomPreset>;
  const idRaw = typeof candidate.id === 'string' ? candidate.id.trim() : '';
  if (!idRaw) return null;
  const name = normalizePresetName(typeof candidate.name === 'string' ? candidate.name : '');
  if (!name) return null;
  const createdAt = typeof candidate.createdAt === 'string' ? candidate.createdAt : '';
  const updatedAt = typeof candidate.updatedAt === 'string' ? candidate.updatedAt : '';
  return {
    id: idRaw,
    name,
    values: normalizeAdvancedDefaults(candidate.values),
    createdAt,
    updatedAt,
  };
};

const compareCustomPresetsByRecency = (
  leftPreset: ObjectLayoutCustomPreset,
  rightPreset: ObjectLayoutCustomPreset
): number => {
  const left = Date.parse(leftPreset.updatedAt);
  const right = Date.parse(rightPreset.updatedAt);
  if (!Number.isFinite(left) && !Number.isFinite(right)) {
    return leftPreset.name.localeCompare(rightPreset.name);
  }
  if (!Number.isFinite(left)) return 1;
  if (!Number.isFinite(right)) return -1;
  return right - left;
};

const parsePersistedCustomPresets = (
  raw: string | null
): ObjectLayoutCustomPreset[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    const deduped = new Map<string, ObjectLayoutCustomPreset>();
    for (const entry of parsed) {
      const normalized = parsePersistedCustomPreset(entry);
      if (!normalized) continue;
      deduped.set(normalized.id, normalized);
    }
    return Array.from(deduped.values()).sort(compareCustomPresetsByRecency);
  } catch {
    return [];
  }
};

export const loadObjectLayoutAdvancedDefaults = (
  projectId: string | null | undefined
): ObjectLayoutAdvancedDefaults | null => {
  if (typeof window === 'undefined') return null;
  const projectKey = getProjectScopedDefaultsLocalKey(projectId);
  if (projectKey) {
    const fromLocal = parsePersistedDefaults(window.localStorage.getItem(projectKey));
    if (fromLocal) return fromLocal;
  }
  return parsePersistedDefaults(window.sessionStorage.getItem(OBJECT_LAYOUT_ADVANCED_DEFAULTS_SESSION_KEY));
};

export const saveObjectLayoutAdvancedDefaults = (
  projectId: string | null | undefined,
  values: ObjectLayoutAdvancedDefaults
): void => {
  if (typeof window === 'undefined') return;
  const normalized = normalizeAdvancedDefaults(values);
  const payload: PersistedObjectLayoutAdvancedDefaults = {
    version: 1,
    ...normalized,
    updatedAt: new Date().toISOString(),
  };
  const serialized = JSON.stringify(payload);
  const projectKey = getProjectScopedDefaultsLocalKey(projectId);
  if (projectKey) {
    window.localStorage.setItem(projectKey, serialized);
  }
  window.sessionStorage.setItem(OBJECT_LAYOUT_ADVANCED_DEFAULTS_SESSION_KEY, serialized);
};

export const loadObjectLayoutCustomPresets = (
  projectId: string | null | undefined
): ObjectLayoutCustomPreset[] => {
  if (typeof window === 'undefined') return [];
  const projectKey = getProjectScopedCustomPresetsLocalKey(projectId);
  if (projectKey) {
    const rawLocal = window.localStorage.getItem(projectKey);
    if (rawLocal !== null) {
      return parsePersistedCustomPresets(rawLocal);
    }
  }
  return parsePersistedCustomPresets(window.sessionStorage.getItem(OBJECT_LAYOUT_CUSTOM_PRESETS_SESSION_KEY));
};

export const persistObjectLayoutCustomPresets = (
  projectId: string | null | undefined,
  presets: ObjectLayoutCustomPreset[]
): void => {
  if (typeof window === 'undefined') return;
  const deduped = new Map<string, ObjectLayoutCustomPreset>();
  for (const preset of presets) {
    const id = preset.id.trim();
    if (!id) continue;
    const name = normalizePresetName(preset.name);
    if (!name) continue;
    deduped.set(id, {
      id,
      name,
      values: normalizeAdvancedDefaults(preset.values),
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
    });
  }
  const normalized = Array.from(deduped.values())
    .sort(compareCustomPresetsByRecency)
    .map((preset) => ({
      version: 1 as const,
      id: preset.id,
      name: preset.name,
      values: preset.values,
      createdAt: preset.createdAt,
      updatedAt: preset.updatedAt,
    }));
  const serialized = JSON.stringify(normalized);
  const projectKey = getProjectScopedCustomPresetsLocalKey(projectId);
  if (projectKey) {
    window.localStorage.setItem(projectKey, serialized);
  }
  window.sessionStorage.setItem(OBJECT_LAYOUT_CUSTOM_PRESETS_SESSION_KEY, serialized);
  dispatchCustomPresetChanged();
};

export const saveObjectLayoutCustomPreset = (
  projectId: string | null | undefined,
  input: {
    presetId?: string | null;
    name: string;
    values: ObjectLayoutAdvancedDefaults;
  }
): {
  presets: ObjectLayoutCustomPreset[];
  savedPreset: ObjectLayoutCustomPreset;
} => {
  const name = normalizePresetName(input.name);
  if (!name) {
    throw new Error('Preset name is required.');
  }
  const currentPresets = loadObjectLayoutCustomPresets(projectId);
  const now = new Date().toISOString();
  const normalizedValues = normalizeAdvancedDefaults(input.values);
  const normalizedPresetId = typeof input.presetId === 'string' ? input.presetId.trim() : '';

  let savedPreset: ObjectLayoutCustomPreset | null = null;
  const nextPresets = currentPresets.map((preset) => {
    if (normalizedPresetId && preset.id === normalizedPresetId) {
      const nextPreset: ObjectLayoutCustomPreset = {
        ...preset,
        name,
        values: normalizedValues,
        updatedAt: now,
      };
      savedPreset = nextPreset;
      return nextPreset;
    }
    return preset;
  });

  if (!normalizedPresetId || !savedPreset) {
    savedPreset = {
      id: buildCustomPresetId(),
      name,
      values: normalizedValues,
      createdAt: now,
      updatedAt: now,
    };
    nextPresets.unshift(savedPreset);
  }
  if (!savedPreset) {
    throw new Error('Failed to save custom preset.');
  }

  const sortedNextPresets = [...nextPresets].sort(compareCustomPresetsByRecency);
  persistObjectLayoutCustomPresets(projectId, sortedNextPresets);
  return {
    presets: sortedNextPresets,
    savedPreset,
  };
};

export const deleteObjectLayoutCustomPreset = (
  projectId: string | null | undefined,
  presetId: string
): ObjectLayoutCustomPreset[] => {
  const normalizedPresetId = presetId.trim();
  if (!normalizedPresetId) return loadObjectLayoutCustomPresets(projectId);
  const currentPresets = loadObjectLayoutCustomPresets(projectId);
  const next = currentPresets.filter((preset) => preset.id !== normalizedPresetId);
  persistObjectLayoutCustomPresets(projectId, next);
  return next;
};

export const resolveCustomPresetIdFromOptionValue = (
  optionValue: string
): string | null => parseCustomPresetOptionValue(optionValue);
