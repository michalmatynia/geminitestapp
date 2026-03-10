import 'dotenv/config';

import { parsePositiveInt } from '@/features/ai/ai-paths/server/settings-store.helpers';
import {
  deleteMongoAiPathsSettings,
  fetchMongoAiPathsSettings,
  upsertMongoAiPathsSettings,
} from '@/features/ai/ai-paths/server/settings-store.repository';
import {
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import { buildPlaywrightAiPathsFixtureCleanupPlan } from '@/features/ai/ai-paths/lib/playwright-fixture-cleanup';
const MONGO_TIMEOUT_MS = parsePositiveInt(process.env['AI_PATHS_MONGO_OP_TIMEOUT_MS'], 15000);

async function main(): Promise<void> {
  const settings = await fetchMongoAiPathsSettings(
    [AI_PATHS_TRIGGER_BUTTONS_KEY, AI_PATHS_INDEX_KEY],
    MONGO_TIMEOUT_MS
  );
  const settingsByKey = new Map(settings.map((item) => [item.key, item.value]));
  const plan = buildPlaywrightAiPathsFixtureCleanupPlan({
    triggerButtonsRaw: settingsByKey.get(AI_PATHS_TRIGGER_BUTTONS_KEY) ?? null,
    indexRaw: settingsByKey.get(AI_PATHS_INDEX_KEY) ?? null,
  });

  if (plan.removedTriggerButtons > 0) {
    await upsertMongoAiPathsSettings(
      [
        {
          key: AI_PATHS_TRIGGER_BUTTONS_KEY,
          value: plan.nextTriggerButtonsRaw,
        },
      ],
      MONGO_TIMEOUT_MS
    );
  }

  if (plan.removedPathIndexEntries > 0) {
    await upsertMongoAiPathsSettings(
      [
        {
          key: AI_PATHS_INDEX_KEY,
          value: plan.nextIndexRaw,
        },
      ],
      MONGO_TIMEOUT_MS
    );
  }

  if (plan.pathConfigKeysToDelete.length > 0) {
    await deleteMongoAiPathsSettings(
      plan.pathConfigKeysToDelete,
      MONGO_TIMEOUT_MS
    );
  }

  console.log(
    JSON.stringify(
      {
        removedTriggerButtons: plan.removedTriggerButtons,
        removedPathIndexEntries: plan.removedPathIndexEntries,
        removedPathConfigs: plan.removedPathConfigs,
      },
      null,
      2
    )
  );
  process.exit(0);
}

void main().catch((error) => {
  console.error(
    error instanceof Error ? error.stack ?? error.message : 'Unknown cleanup failure.'
  );
  process.exitCode = 1;
});
