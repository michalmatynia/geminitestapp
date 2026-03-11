import 'dotenv/config';

import {
  listMongoAiPathsSettings,
  upsertMongoAiPathsSetting,
} from '@/features/ai/ai-paths/server/settings-store.repository';
import { buildStaleTriggerButtonCleanupPlan } from '@/features/ai/ai-paths/lib/stale-trigger-button-cleanup';
import { AI_PATHS_TRIGGER_BUTTONS_KEY } from '@/features/ai/ai-paths/server/settings-store.constants';

const AI_PATHS_SETTINGS_TIMEOUT_MS = 15_000;

const shouldApply = process.argv.includes('--apply');

async function main(): Promise<void> {
  const settings = await listMongoAiPathsSettings(AI_PATHS_SETTINGS_TIMEOUT_MS);
  const triggerButtonsRaw =
    settings.find((record) => record.key === AI_PATHS_TRIGGER_BUTTONS_KEY)?.value ?? null;
  const indexRaw = settings.find((record) => record.key === 'ai_paths_index')?.value ?? null;
  const plan = buildStaleTriggerButtonCleanupPlan({
    triggerButtonsRaw,
    indexRaw,
    existingSettingKeys: settings.map((record) => record.key),
  });

  if (shouldApply && plan.removedTriggerButtons > 0) {
    await upsertMongoAiPathsSetting(
      AI_PATHS_TRIGGER_BUTTONS_KEY,
      plan.nextTriggerButtonsRaw,
      AI_PATHS_SETTINGS_TIMEOUT_MS
    );
  }

  console.log(
    JSON.stringify(
      {
        mode: shouldApply ? 'apply' : 'dry-run',
        removedTriggerButtons: plan.removedTriggerButtons,
        staleButtonIds: plan.staleButtonIds,
        stalePathIds: plan.stalePathIds,
      },
      null,
      2
    )
  );
}

void main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
