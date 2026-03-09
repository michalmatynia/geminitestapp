import { parseJsonSetting } from '@/shared/utils/settings-json';
import type {
  KangurAiTutorConversationContext,
  KangurAiTutorMotionPresetKind,
} from '@/shared/contracts/kangur-ai-tutor';

export const KANGUR_AI_TUTOR_SETTINGS_KEY = 'kangur_ai_tutor_settings';
export const KANGUR_AI_TUTOR_APP_SETTINGS_KEY = 'kangur_ai_tutor_app_settings_v1';

export type KangurAiTutorTestAccessMode = 'disabled' | 'guided' | 'review_after_answer';
export type KangurAiTutorUiMode = 'anchored' | 'static';
export type KangurAiTutorHintDepth = 'brief' | 'guided' | 'step_by_step';
export type KangurAiTutorProactiveNudges = 'off' | 'gentle' | 'coach';
export type KangurAiTutorGuestIntroMode = 'first_visit' | 'every_visit';

export const KANGUR_AI_TUTOR_MOTION_PRESET_OPTIONS: Array<{
  id: Exclude<KangurAiTutorMotionPresetKind, 'default'>;
  label: string;
  description: string;
}> = [
  {
    id: 'desktop',
    label: 'Desktop',
    description: 'Wider bubble and desktop-sized motion thresholds.',
  },
  {
    id: 'tablet',
    label: 'Tablet',
    description: 'Broader sheet breakpoint and softer anchored motion.',
  },
  {
    id: 'mobile',
    label: 'Mobile',
    description: 'Mobile-first sheet layout with tighter motion tuning.',
  },
];

export type KangurAiTutorAppSettings = {
  agentPersonaId: string | null;
  motionPresetId: string | null;
  dailyMessageLimit: number | null;
  guestIntroMode: KangurAiTutorGuestIntroMode;
};

export type KangurAiTutorLearnerGuardrails = {
  enabled: boolean;
  uiMode: KangurAiTutorUiMode;
  allowCrossPagePersistence: boolean;
  rememberTutorContext: boolean;
  allowLessons: boolean;
  testAccessMode: KangurAiTutorTestAccessMode;
  showSources: boolean;
  allowSelectedTextSupport: boolean;
  hintDepth: KangurAiTutorHintDepth;
  proactiveNudges: KangurAiTutorProactiveNudges;
};

export type KangurAiTutorLearnerSettings = KangurAiTutorLearnerGuardrails &
  KangurAiTutorAppSettings;

export type KangurAiTutorLearnerStoredSettings = KangurAiTutorLearnerGuardrails &
  Partial<KangurAiTutorAppSettings>;

export type KangurAiTutorSettingsStore = Record<string, KangurAiTutorLearnerStoredSettings>;

export const DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS: KangurAiTutorAppSettings = {
  agentPersonaId: null,
  motionPresetId: null,
  dailyMessageLimit: null,
  guestIntroMode: 'first_visit',
};

export const DEFAULT_KANGUR_AI_TUTOR_LEARNER_GUARDRAILS: KangurAiTutorLearnerGuardrails = {
  enabled: false,
  uiMode: 'anchored',
  allowCrossPagePersistence: true,
  rememberTutorContext: true,
  allowLessons: true,
  testAccessMode: 'guided',
  showSources: true,
  allowSelectedTextSupport: true,
  hintDepth: 'guided',
  proactiveNudges: 'gentle',
};

export const DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS: KangurAiTutorLearnerSettings = {
  ...DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS,
  ...DEFAULT_KANGUR_AI_TUTOR_LEARNER_GUARDRAILS,
};

export type KangurAiTutorAvailabilityReason =
  | 'disabled'
  | 'email_unverified'
  | 'missing_context'
  | 'lessons_disabled'
  | 'tests_disabled'
  | 'review_after_answer_only';

const normalizeOptionalId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeTestAccessMode = (value: unknown): KangurAiTutorTestAccessMode => {
  switch (value) {
    case 'disabled':
    case 'guided':
    case 'review_after_answer':
      return value;
    default:
      return DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS.testAccessMode;
  }
};

const normalizeUiMode = (value: unknown): KangurAiTutorUiMode => {
  switch (value) {
    case 'static':
    case 'anchored':
      return value;
    default:
      return DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS.uiMode;
  }
};

const normalizeHintDepth = (value: unknown): KangurAiTutorHintDepth => {
  switch (value) {
    case 'brief':
    case 'guided':
    case 'step_by_step':
      return value;
    default:
      return DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS.hintDepth;
  }
};

const normalizeProactiveNudges = (value: unknown): KangurAiTutorProactiveNudges => {
  switch (value) {
    case 'off':
    case 'gentle':
    case 'coach':
      return value;
    default:
      return DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS.proactiveNudges;
  }
};

export function resolveKangurAiTutorMotionPresetKind(
  value: string | null | undefined
): KangurAiTutorMotionPresetKind {
  const normalized = normalizeOptionalId(value)?.toLowerCase();
  if (!normalized) {
    return 'default';
  }

  if (normalized === 'desktop' || normalized === 'tablet' || normalized === 'mobile') {
    return normalized;
  }

  if (
    normalized.includes('ipad') ||
    normalized.includes('tablet') ||
    normalized.includes('galaxy tab') ||
    normalized.includes('galaxy-tab') ||
    normalized.includes('galaxy_tab')
  ) {
    return 'tablet';
  }

  if (
    normalized.includes('iphone') ||
    normalized.includes('pixel') ||
    normalized.includes('android') ||
    normalized.includes('phone') ||
    normalized.includes('mobile')
  ) {
    return 'mobile';
  }

  if (
    normalized.includes('desktop') ||
    normalized.includes('laptop') ||
    normalized.includes('macbook') ||
    normalized.includes('windows') ||
    normalized.includes('chromeos')
  ) {
    return 'desktop';
  }

  return 'default';
}

const normalizeDailyMessageLimit = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  const normalized = Math.floor(value);
  if (normalized <= 0) {
    return null;
  }

  return Math.min(normalized, 200);
};

const normalizeGuestIntroMode = (value: unknown): KangurAiTutorGuestIntroMode => {
  switch (value) {
    case 'every_visit':
    case 'first_visit':
      return value;
    default:
      return DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS.guestIntroMode;
  }
};

const normalizeKangurAiTutorAppSettingsFields = (
  input: Record<string, unknown>
): KangurAiTutorAppSettings => ({
  // Legacy teachingAgentId values are intentionally ignored.
  // Kangur AI Tutor now runs directly through Brain with persona selection only.
  agentPersonaId: normalizeOptionalId(input['agentPersonaId']),
  motionPresetId:
    normalizeOptionalId(input['motionPresetId']) ?? normalizeOptionalId(input['playwrightPersonaId']),
  dailyMessageLimit: normalizeDailyMessageLimit(input['dailyMessageLimit']),
  guestIntroMode: normalizeGuestIntroMode(input['guestIntroMode']),
});

export function normalizeKangurAiTutorAppSettings(raw: unknown): KangurAiTutorAppSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS };
  }

  return normalizeKangurAiTutorAppSettingsFields(raw as Record<string, unknown>);
}

export function parseKangurAiTutorAppSettings(raw: unknown): KangurAiTutorAppSettings {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return normalizeKangurAiTutorAppSettings(raw);
  }

  return normalizeKangurAiTutorAppSettings(
    parseJsonSetting<unknown>(typeof raw === 'string' ? raw : null, null)
  );
}

function deriveLegacyKangurAiTutorAppSettings(
  store: KangurAiTutorSettingsStore
): KangurAiTutorAppSettings {
  return Object.values(store).reduce<KangurAiTutorAppSettings>(
    (resolved, learnerSettings) => {
      const legacy = normalizeKangurAiTutorAppSettings(learnerSettings);

      return {
        agentPersonaId: resolved.agentPersonaId ?? legacy.agentPersonaId,
        motionPresetId: resolved.motionPresetId ?? legacy.motionPresetId,
        dailyMessageLimit: resolved.dailyMessageLimit ?? legacy.dailyMessageLimit,
        guestIntroMode:
          resolved.guestIntroMode !== DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS.guestIntroMode
            ? resolved.guestIntroMode
            : legacy.guestIntroMode,
      };
    },
    { ...DEFAULT_KANGUR_AI_TUTOR_APP_SETTINGS }
  );
}

export function resolveKangurAiTutorAppSettings(
  raw: unknown,
  store: KangurAiTutorSettingsStore
): KangurAiTutorAppSettings {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return normalizeKangurAiTutorAppSettings(raw);
  }

  const parsed = parseJsonSetting<unknown>(typeof raw === 'string' ? raw : null, null);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return normalizeKangurAiTutorAppSettings(parsed);
  }

  return deriveLegacyKangurAiTutorAppSettings(store);
}

export function normalizeKangurAiTutorLearnerSettings(
  raw: unknown
): KangurAiTutorLearnerStoredSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_KANGUR_AI_TUTOR_LEARNER_GUARDRAILS };
  }

  const input = raw as Record<string, unknown>;

  return {
    enabled:
      typeof input['enabled'] === 'boolean'
        ? input['enabled']
        : DEFAULT_KANGUR_AI_TUTOR_LEARNER_GUARDRAILS.enabled,
    uiMode: normalizeUiMode(input['uiMode']),
    allowCrossPagePersistence:
      typeof input['allowCrossPagePersistence'] === 'boolean'
        ? input['allowCrossPagePersistence']
        : DEFAULT_KANGUR_AI_TUTOR_LEARNER_GUARDRAILS.allowCrossPagePersistence,
    rememberTutorContext:
      typeof input['rememberTutorContext'] === 'boolean'
        ? input['rememberTutorContext']
        : DEFAULT_KANGUR_AI_TUTOR_LEARNER_GUARDRAILS.rememberTutorContext,
    allowLessons:
      typeof input['allowLessons'] === 'boolean'
        ? input['allowLessons']
        : DEFAULT_KANGUR_AI_TUTOR_LEARNER_GUARDRAILS.allowLessons,
    testAccessMode: normalizeTestAccessMode(input['testAccessMode']),
    showSources:
      typeof input['showSources'] === 'boolean'
        ? input['showSources']
        : DEFAULT_KANGUR_AI_TUTOR_LEARNER_GUARDRAILS.showSources,
    allowSelectedTextSupport:
      typeof input['allowSelectedTextSupport'] === 'boolean'
        ? input['allowSelectedTextSupport']
        : DEFAULT_KANGUR_AI_TUTOR_LEARNER_GUARDRAILS.allowSelectedTextSupport,
    hintDepth: normalizeHintDepth(input['hintDepth']),
    proactiveNudges: normalizeProactiveNudges(input['proactiveNudges']),
    ...normalizeKangurAiTutorAppSettingsFields(input),
  };
}

export function parseKangurAiTutorSettings(raw: unknown): KangurAiTutorSettingsStore {
  const parsed = parseJsonSetting<KangurAiTutorSettingsStore>(
    typeof raw === 'string' ? raw : null,
    {}
  );
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }

  return Object.entries(parsed).reduce<KangurAiTutorSettingsStore>((acc, [learnerId, settings]) => {
    if (!learnerId.trim()) {
      return acc;
    }

    acc[learnerId] = normalizeKangurAiTutorLearnerSettings(settings);
    return acc;
  }, {});
}

export function getKangurAiTutorSettingsForLearner(
  store: KangurAiTutorSettingsStore,
  learnerId: string,
  appSettings?: KangurAiTutorAppSettings
): KangurAiTutorLearnerSettings {
  const learnerSettings = normalizeKangurAiTutorLearnerSettings(store[learnerId]);

  return {
    ...DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS,
    ...learnerSettings,
    ...(appSettings ?? normalizeKangurAiTutorAppSettings(learnerSettings)),
  };
}

export function resolveKangurAiTutorAvailability(
  settings: KangurAiTutorLearnerSettings | null | undefined,
  context: KangurAiTutorConversationContext | null | undefined,
  options?: {
    ownerEmailVerified?: boolean | null;
  }
): { allowed: true } | { allowed: false; reason: KangurAiTutorAvailabilityReason } {
  if (!settings?.enabled) {
    return { allowed: false, reason: 'disabled' };
  }

  if (options?.ownerEmailVerified === false) {
    return { allowed: false, reason: 'email_unverified' };
  }

  if (!context) {
    return { allowed: false, reason: 'missing_context' };
  }

  if (context.surface === 'lesson') {
    return settings.allowLessons
      ? { allowed: true }
      : { allowed: false, reason: 'lessons_disabled' };
  }

  if (context.surface === 'game') {
    return settings.allowLessons
      ? { allowed: true }
      : { allowed: false, reason: 'lessons_disabled' };
  }

  if (settings.testAccessMode === 'disabled') {
    return { allowed: false, reason: 'tests_disabled' };
  }

  if (settings.testAccessMode === 'review_after_answer' && !context.answerRevealed) {
    return { allowed: false, reason: 'review_after_answer_only' };
  }

  return { allowed: true };
}
