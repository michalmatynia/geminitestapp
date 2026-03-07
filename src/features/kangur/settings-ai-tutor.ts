import { parseJsonSetting } from '@/shared/utils/settings-json';
import type { KangurAiTutorConversationContext } from '@/shared/contracts/kangur-ai-tutor';

export const KANGUR_AI_TUTOR_SETTINGS_KEY = 'kangur_ai_tutor_settings';

export type KangurAiTutorTestAccessMode = 'disabled' | 'guided' | 'review_after_answer';

export type KangurAiTutorLearnerSettings = {
  enabled: boolean;
  teachingAgentId: string | null;
  agentPersonaId: string | null;
  motionPresetId: string | null;
  allowLessons: boolean;
  testAccessMode: KangurAiTutorTestAccessMode;
  showSources: boolean;
  allowSelectedTextSupport: boolean;
  dailyMessageLimit: number | null;
};

export type KangurAiTutorSettingsStore = Record<string, KangurAiTutorLearnerSettings>;

export const DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS: KangurAiTutorLearnerSettings = {
  enabled: false,
  teachingAgentId: null,
  agentPersonaId: null,
  motionPresetId: null,
  allowLessons: true,
  testAccessMode: 'guided',
  showSources: true,
  allowSelectedTextSupport: true,
  dailyMessageLimit: null,
};

export type KangurAiTutorAvailabilityReason =
  | 'disabled'
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

export function normalizeKangurAiTutorLearnerSettings(
  raw: unknown
): KangurAiTutorLearnerSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS };
  }

  const input = raw as Record<string, unknown>;

  return {
    enabled:
      typeof input['enabled'] === 'boolean'
        ? input['enabled']
        : DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS.enabled,
    teachingAgentId: normalizeOptionalId(input['teachingAgentId']),
    agentPersonaId: normalizeOptionalId(input['agentPersonaId']),
    motionPresetId:
      normalizeOptionalId(input['motionPresetId']) ??
      normalizeOptionalId(input['playwrightPersonaId']),
    allowLessons:
      typeof input['allowLessons'] === 'boolean'
        ? input['allowLessons']
        : DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS.allowLessons,
    testAccessMode: normalizeTestAccessMode(input['testAccessMode']),
    showSources:
      typeof input['showSources'] === 'boolean'
        ? input['showSources']
        : DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS.showSources,
    allowSelectedTextSupport:
      typeof input['allowSelectedTextSupport'] === 'boolean'
        ? input['allowSelectedTextSupport']
        : DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS.allowSelectedTextSupport,
    dailyMessageLimit: normalizeDailyMessageLimit(input['dailyMessageLimit']),
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
  learnerId: string
): KangurAiTutorLearnerSettings {
  return normalizeKangurAiTutorLearnerSettings(store[learnerId]);
}

export function resolveKangurAiTutorAvailability(
  settings: KangurAiTutorLearnerSettings | null | undefined,
  context: KangurAiTutorConversationContext | null | undefined
): { allowed: true } | { allowed: false; reason: KangurAiTutorAvailabilityReason } {
  if (!settings?.enabled) {
    return { allowed: false, reason: 'disabled' };
  }

  if (!context) {
    return { allowed: false, reason: 'missing_context' };
  }

  if (context.surface === 'lesson') {
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
