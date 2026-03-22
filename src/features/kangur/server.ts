import { registerSettingsProvider } from '@/shared/lib/db/settings-registry';
import {
  deleteKangurSettingValue,
  isKangurSettingKey,
  readKangurSettingValue,
  upsertKangurSettingValue,
} from '@/features/kangur/services/kangur-settings-repository';

// Register Kangur-specific settings provider to shared AI Brain without circular dependencies
registerSettingsProvider({
  isKey: isKangurSettingKey,
  readValue: readKangurSettingValue,
  upsertValue: async (key, value) => Boolean(await upsertKangurSettingValue(key, value)),
  deleteValue: deleteKangurSettingValue,
});

export * from '@/features/kangur/services/kangur-progress-repository';
export * from '@/features/kangur/services/kangur-score-repository';
export * from '@/features/kangur/services/kangur-subject-focus-repository';
export * from '@/features/kangur/services/kangur-assignment-repository';
export * from '@/features/kangur/services/kangur-learner-activity-repository';
export * from '@/features/kangur/services/kangur-learner-repository';
export * from '@/features/kangur/services/kangur-lesson-repository';
export * from '@/features/kangur/services/kangur-lesson-document-repository';
export * from '@/features/kangur/services/kangur-actor';
export * from '@/features/kangur/services/kangur-settings-repository';
export * from '@/features/kangur/server/context-registry';
export * from '@/features/kangur/server/kangur-learner-sessions';
export * from '@/features/kangur/server/kangur-learner-interactions';
export * from '@/features/kangur/server/ai-tutor-mood';
export * from '@/features/kangur/server/storefront-appearance';
export * from '@/features/kangur/workers/kangurSocialSchedulerQueue';
export * from '@/features/kangur/workers/kangurSocialPipelineQueue';
