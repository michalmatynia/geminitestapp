import { parseJsonSetting } from '@/features/kangur/utils/settings-json';
import { KANGUR_SOCIAL_CAPTURE_PRESETS } from '@/features/kangur/social/shared/social-capture-presets';
import { KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT } from '@/features/kangur/social/shared/social-playwright-capture';
import {
  kangurSocialProgrammableCaptureRouteSchema,
  type KangurSocialProgrammableCaptureRoute,
} from '@/shared/contracts/kangur-social-image-addons';

export const KANGUR_SOCIAL_SETTINGS_KEY = 'kangur_social_settings_v1';

export type KangurSocialSettings = {
  brainModelId: string | null;
  visionModelId: string | null;
  linkedinConnectionId: string | null;
  batchCaptureBaseUrl: string | null;
  batchCapturePresetIds: string[];
  batchCapturePresetLimit: number | null;
  programmableCaptureBaseUrl: string | null;
  programmableCapturePersonaId: string | null;
  programmableCaptureScript: string;
  programmableCaptureRoutes: KangurSocialProgrammableCaptureRoute[];
  projectUrl: string | null;
};

const DEFAULT_PRESET_IDS = KANGUR_SOCIAL_CAPTURE_PRESETS.map((preset) => preset.id);
const PRESET_ID_SET = new Set(DEFAULT_PRESET_IDS);

export const DEFAULT_KANGUR_SOCIAL_SETTINGS: Readonly<KangurSocialSettings> = Object.freeze({
  brainModelId: null,
  visionModelId: null,
  linkedinConnectionId: null,
  batchCaptureBaseUrl: null,
  batchCapturePresetIds: DEFAULT_PRESET_IDS,
  batchCapturePresetLimit: null,
  programmableCaptureBaseUrl: null,
  programmableCapturePersonaId: null,
  programmableCaptureScript: KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
  programmableCaptureRoutes: [],
  projectUrl: null,
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const normalizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeBaseUrl = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeProgrammableCaptureScript = (value: unknown): string => {
  if (typeof value !== 'string') {
    return KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT;
  }
  return value.trim().length > 0
    ? value
    : KANGUR_SOCIAL_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT;
};

const normalizeProgrammableCaptureRoutes = (
  value: unknown
): KangurSocialProgrammableCaptureRoute[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 50)
    .map((entry) => kangurSocialProgrammableCaptureRouteSchema.safeParse(entry))
    .filter((entry): entry is { success: true; data: KangurSocialProgrammableCaptureRoute } => entry.success)
    .map((entry) => entry.data);
};

const normalizePresetLimit = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      const normalized = Math.floor(parsed);
      return normalized > 0 ? normalized : null;
    }
  }
  return null;
};

const normalizePresetIds = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return DEFAULT_PRESET_IDS;
  }
  if (value.length === 0) {
    return [];
  }
  const sanitized = value
    .filter((entry): entry is string => typeof entry === 'string')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && PRESET_ID_SET.has(entry));
  if (sanitized.length === 0) {
    return DEFAULT_PRESET_IDS;
  }
  const unique = new Set(sanitized);
  return DEFAULT_PRESET_IDS.filter((id) => unique.has(id));
};

export const parseKangurSocialSettings = (
  value: string | null | undefined
): KangurSocialSettings => {
  const parsed = parseJsonSetting<Record<string, unknown> | null>(value, null);
  if (!parsed || !isRecord(parsed)) {
    return { ...DEFAULT_KANGUR_SOCIAL_SETTINGS };
  }

  return {
    brainModelId: normalizeOptionalId(parsed['brainModelId']),
    visionModelId: normalizeOptionalId(parsed['visionModelId']),
    linkedinConnectionId: normalizeOptionalId(parsed['linkedinConnectionId']),
    batchCaptureBaseUrl: normalizeBaseUrl(parsed['batchCaptureBaseUrl']),
    batchCapturePresetIds: normalizePresetIds(parsed['batchCapturePresetIds']),
    batchCapturePresetLimit: normalizePresetLimit(parsed['batchCapturePresetLimit']),
    programmableCaptureBaseUrl: normalizeBaseUrl(parsed['programmableCaptureBaseUrl']),
    programmableCapturePersonaId: normalizeOptionalId(parsed['programmableCapturePersonaId']),
    programmableCaptureScript: normalizeProgrammableCaptureScript(
      parsed['programmableCaptureScript']
    ),
    programmableCaptureRoutes: normalizeProgrammableCaptureRoutes(
      parsed['programmableCaptureRoutes']
    ),
    projectUrl: normalizeBaseUrl(parsed['projectUrl']),
  };
};
