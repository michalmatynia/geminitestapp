import { parseJsonSetting } from '@/shared/utils/settings-json';

export const KANGUR_AI_TUTOR_SETTINGS_KEY = 'kangur_ai_tutor_settings';

export type KangurAiTutorLearnerSettings = {
  enabled: boolean;
  teachingAgentId: string | null;
  agentPersonaId: string | null;
  playwrightPersonaId: string | null;
};

export type KangurAiTutorSettingsStore = Record<string, KangurAiTutorLearnerSettings>;

export const DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS: KangurAiTutorLearnerSettings = {
  enabled: false,
  teachingAgentId: null,
  agentPersonaId: null,
  playwrightPersonaId: null,
};

export function parseKangurAiTutorSettings(raw: unknown): KangurAiTutorSettingsStore {
  const parsed = parseJsonSetting<KangurAiTutorSettingsStore>(
    typeof raw === 'string' ? raw : null,
    {}
  );
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return {};
  }
  return parsed;
}

export function getKangurAiTutorSettingsForLearner(
  store: KangurAiTutorSettingsStore,
  learnerId: string
): KangurAiTutorLearnerSettings {
  return store[learnerId] ?? { ...DEFAULT_KANGUR_AI_TUTOR_LEARNER_SETTINGS };
}
