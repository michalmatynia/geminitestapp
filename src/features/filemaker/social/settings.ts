import { parseJsonSetting } from '@/shared/utils/settings-json';
import { SOCIAL_PUBLISHING_CAPTURE_PRESETS } from '@/features/filemaker/social/shared/social-capture-presets';
import { SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT } from '@/features/filemaker/social/shared/social-playwright-capture';
import {
  socialPublishingProgrammableCaptureRouteSchema,
  type SocialPublishingProgrammableCaptureRoute,
} from '@/shared/contracts/social-publishing-image-addons';
import { SOCIAL_ARTICLE_AGGREGATION_PATH_ID } from '@/shared/lib/ai-paths/social-article-aggregation';
import {
  type SocialPublishingCaptureContentConfig,
  DEFAULT_SOCIAL_PUBLISHING_CAPTURE_CONTENT_CONFIG,
  normalizeCaptureContentConfig,
} from './shared/social-capture-content-config';

export const SOCIAL_PUBLISHING_SETTINGS_KEY = 'social_publishing_settings_v1';

export type SocialPublishingSettings = {
  brainModelId: string | null;
  visionModelId: string | null;
  publishingConnectionId: string | null;
  batchCaptureBaseUrl: string | null;
  batchCapturePresetIds: string[];
  batchCapturePresetLimit: number | null;
  programmableCaptureBaseUrl: string | null;
  programmableCapturePersonaId: string | null;
  programmableCaptureScript: string;
  programmableCaptureRoutes: SocialPublishingProgrammableCaptureRoute[];
  projectUrl: string | null;
  captureContentConfig: SocialPublishingCaptureContentConfig;
  articleAggregatorPathId: string | null;
};

const DEFAULT_PRESET_IDS = SOCIAL_PUBLISHING_CAPTURE_PRESETS.map((preset) => preset.id);
const PRESET_ID_SET = new Set(DEFAULT_PRESET_IDS);

export const DEFAULT_SOCIAL_PUBLISHING_SETTINGS: Readonly<SocialPublishingSettings> = Object.freeze({
  brainModelId: null,
  visionModelId: null,
  publishingConnectionId: null,
  batchCaptureBaseUrl: null,
  batchCapturePresetIds: DEFAULT_PRESET_IDS,
  batchCapturePresetLimit: null,
  programmableCaptureBaseUrl: null,
  programmableCapturePersonaId: null,
  programmableCaptureScript: SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT,
  programmableCaptureRoutes: [],
  projectUrl: null,
  captureContentConfig: DEFAULT_SOCIAL_PUBLISHING_CAPTURE_CONTENT_CONFIG,
  articleAggregatorPathId: SOCIAL_ARTICLE_AGGREGATION_PATH_ID,
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
    return SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT;
  }
  return value.trim().length > 0
    ? value
    : SOCIAL_PUBLISHING_DEFAULT_PLAYWRIGHT_CAPTURE_SCRIPT;
};

const normalizeProgrammableCaptureRoutes = (
  value: unknown
): SocialPublishingProgrammableCaptureRoute[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .slice(0, 50)
    .map((entry) => socialPublishingProgrammableCaptureRouteSchema.safeParse(entry))
    .filter((entry): entry is { success: true; data: SocialPublishingProgrammableCaptureRoute } => entry.success)
    .map((entry) => entry.data);
};

const normalizePresetLimit = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const normalized = Math.floor(value);
    return normalized > 0 ? normalized : null;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) return null;
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

const hasOwnSetting = (record: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(record, key);

export const parseSocialPublishingSettings = (
  value: string | null | undefined
): SocialPublishingSettings => {
  const parsed = parseJsonSetting<Record<string, unknown> | null>(value, null);
  if (!parsed || !isRecord(parsed)) {
    return { ...DEFAULT_SOCIAL_PUBLISHING_SETTINGS };
  }

  return {
    brainModelId: normalizeOptionalId(parsed['brainModelId']),
    visionModelId: normalizeOptionalId(parsed['visionModelId']),
    publishingConnectionId: normalizeOptionalId(parsed['publishingConnectionId']),
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
    captureContentConfig: normalizeCaptureContentConfig(parsed['captureContentConfig']),
    articleAggregatorPathId: hasOwnSetting(parsed, 'articleAggregatorPathId')
      ? normalizeOptionalId(parsed['articleAggregatorPathId'])
      : DEFAULT_SOCIAL_PUBLISHING_SETTINGS.articleAggregatorPathId,
  };
};
