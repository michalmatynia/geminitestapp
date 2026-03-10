import 'dotenv/config';

import { parsePositiveInt } from '@/features/ai/ai-paths/server/settings-store.helpers';
import {
  deleteMongoAiPathsSettings,
  fetchMongoAiPathsSettings,
  upsertMongoAiPathsSettings,
} from '@/features/ai/ai-paths/server/settings-store.repository';
import {
  AI_PATHS_CONFIG_KEY_PREFIX,
  AI_PATHS_INDEX_KEY,
  AI_PATHS_TRIGGER_BUTTONS_KEY,
} from '@/features/ai/ai-paths/server/settings-store.constants';
import {
  parseAiTriggerButtonsRaw,
  serializeAiTriggerButtonsRaw,
} from '@/features/ai/ai-paths/validations/trigger-buttons';
import {
  isPlaywrightAiPathsFixturePathId,
  isPlaywrightAiPathsFixtureTriggerButton,
} from '@/shared/lib/ai-paths/playwright-fixture-scope';

type PathIndexEntry = Record<string, unknown> & { id: string };
const MONGO_TIMEOUT_MS = parsePositiveInt(process.env['AI_PATHS_MONGO_OP_TIMEOUT_MS'], 15000);

const parsePathIndexEntries = (raw: string | null): PathIndexEntry[] => {
  if (!raw) return [];

  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error('AI Paths index payload is not an array.');
  }

  return parsed.filter((entry: unknown): entry is PathIndexEntry => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return false;
    return typeof (entry as { id?: unknown }).id === 'string';
  });
};

async function main(): Promise<void> {
  const settings = await fetchMongoAiPathsSettings(
    [AI_PATHS_TRIGGER_BUTTONS_KEY, AI_PATHS_INDEX_KEY],
    MONGO_TIMEOUT_MS
  );
  const settingsByKey = new Map(settings.map((item) => [item.key, item.value]));
  const triggerButtonsRaw = settingsByKey.get(AI_PATHS_TRIGGER_BUTTONS_KEY) ?? null;
  const triggerButtons = parseAiTriggerButtonsRaw(triggerButtonsRaw);
  const fixturePathIds = new Set<string>();
  const liveButtons = triggerButtons.filter((button) => {
    const isFixture = isPlaywrightAiPathsFixtureTriggerButton(button);
    if (isFixture && button.pathId) {
      fixturePathIds.add(button.pathId);
    }
    return !isFixture;
  });

  if (liveButtons.length !== triggerButtons.length) {
    const normalizedButtons = liveButtons.map((button, index) =>
      button.sortIndex === index ? button : { ...button, sortIndex: index }
    );
    await upsertMongoAiPathsSettings(
      [
        {
          key: AI_PATHS_TRIGGER_BUTTONS_KEY,
          value: serializeAiTriggerButtonsRaw(normalizedButtons),
        },
      ],
      MONGO_TIMEOUT_MS
    );
  }

  const indexRaw = settingsByKey.get(AI_PATHS_INDEX_KEY) ?? null;
  const indexEntries = parsePathIndexEntries(indexRaw);
  const liveIndexEntries = indexEntries.filter((entry) => {
    const isFixture = isPlaywrightAiPathsFixturePathId(entry.id);
    if (isFixture) {
      fixturePathIds.add(entry.id);
    }
    return !isFixture;
  });

  if (liveIndexEntries.length !== indexEntries.length) {
    await upsertMongoAiPathsSettings(
      [
        {
          key: AI_PATHS_INDEX_KEY,
          value: JSON.stringify(liveIndexEntries),
        },
      ],
      MONGO_TIMEOUT_MS
    );
  }

  if (fixturePathIds.size > 0) {
    await deleteMongoAiPathsSettings(
      Array.from(fixturePathIds, (pathId) => `${AI_PATHS_CONFIG_KEY_PREFIX}${pathId}`),
      MONGO_TIMEOUT_MS
    );
  }

  console.log(
    JSON.stringify(
      {
        removedTriggerButtons: triggerButtons.length - liveButtons.length,
        removedPathIndexEntries: indexEntries.length - liveIndexEntries.length,
        removedPathConfigs: fixturePathIds.size,
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
