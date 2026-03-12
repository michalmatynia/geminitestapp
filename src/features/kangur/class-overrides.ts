import { KANGUR_CLASS_OVERRIDES_SETTING_KEY } from '@/shared/contracts/kangur';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export { KANGUR_CLASS_OVERRIDES_SETTING_KEY };

export type KangurClassOverrides = {
  version: 1;
  globals: {
    html: string;
    body: string;
    app: string;
    shell: string;
  };
  components: Record<string, Record<string, string>>;
};

export const createDefaultKangurClassOverrides = (): KangurClassOverrides => ({
  version: 1,
  globals: {
    html: '',
    body: '',
    app: '',
    shell: '',
  },
  components: {},
});

const normalizeClassString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeSlotOverrides = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const normalized: Record<string, string> = {};

  Object.entries(record).forEach(([slot, className]) => {
    const slotKey = slot.trim();
    if (!slotKey) return;
    const normalizedClass = normalizeClassString(className);
    if (!normalizedClass) return;
    normalized[slotKey] = normalizedClass;
  });

  return normalized;
};

const normalizeComponentOverrides = (value: unknown): Record<string, Record<string, string>> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const record = value as Record<string, unknown>;
  const normalized: Record<string, Record<string, string>> = {};

  Object.entries(record).forEach(([componentId, slots]) => {
    const componentKey = componentId.trim();
    if (!componentKey) return;
    const normalizedSlots = normalizeSlotOverrides(slots);
    if (Object.keys(normalizedSlots).length === 0) return;
    normalized[componentKey] = normalizedSlots;
  });

  return normalized;
};

export const normalizeKangurClassOverrides = (value: unknown): KangurClassOverrides => {
  const fallback = createDefaultKangurClassOverrides();
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return fallback;
  }

  const record = value as Record<string, unknown>;
  const globalsRaw = record['globals'];
  const globalsRecord =
    globalsRaw && typeof globalsRaw === 'object' && !Array.isArray(globalsRaw)
      ? (globalsRaw as Record<string, unknown>)
      : {};

  return {
    version: 1,
    globals: {
      html: normalizeClassString(globalsRecord['html']),
      body: normalizeClassString(globalsRecord['body']),
      app: normalizeClassString(globalsRecord['app']),
      shell: normalizeClassString(globalsRecord['shell']),
    },
    components: normalizeComponentOverrides(record['components']),
  };
};

export const parseKangurClassOverrides = (
  raw: string | null | undefined
): KangurClassOverrides => {
  const fallback = createDefaultKangurClassOverrides();
  return normalizeKangurClassOverrides(parseJsonSetting<unknown>(raw, fallback));
};
