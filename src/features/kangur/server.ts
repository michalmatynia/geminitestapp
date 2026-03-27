import { contextRegistryEngine } from '@/features/ai/server';
import { kangurRuntimeContextProvider } from '@/features/kangur/server/context-registry/kangur-ai-context-provider';
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

// Register Kangur-specific context provider to shared AI Context Registry without circular dependencies
contextRegistryEngine.registerProvider(kangurRuntimeContextProvider);

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
export * from '@/features/kangur/server/auth-bootstrap';
export * from '@/features/kangur/server/route-access';
export * from '@/features/kangur/server/alias-shell-page';
export * from '@/features/kangur/server/launch-route';
export * from '@/features/kangur/server/KangurAliasAppLayout';
export * from '@/features/kangur/workers/kangurSocialSchedulerQueue';
export * from '@/features/kangur/workers/kangurSocialPipelineQueue';
