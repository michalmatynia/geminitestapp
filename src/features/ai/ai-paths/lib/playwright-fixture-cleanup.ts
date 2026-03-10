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

export type PlaywrightAiPathsFixtureCleanupResult = {
  removedTriggerButtons: number;
  removedPathIndexEntries: number;
  removedPathConfigs: number;
};

export type PlaywrightAiPathsFixtureCleanupPlan = PlaywrightAiPathsFixtureCleanupResult & {
  nextTriggerButtonsRaw: string;
  nextIndexRaw: string;
  pathConfigKeysToDelete: string[];
};

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

export const buildPlaywrightAiPathsFixtureCleanupPlan = (args: {
  triggerButtonsRaw: string | null;
  indexRaw: string | null;
}): PlaywrightAiPathsFixtureCleanupPlan => {
  const triggerButtons = parseAiTriggerButtonsRaw(args.triggerButtonsRaw);
  const fixturePathIds = new Set<string>();
  const liveButtons = triggerButtons.filter((button) => {
    const isFixture = isPlaywrightAiPathsFixtureTriggerButton(button);
    if (isFixture && button.pathId) {
      fixturePathIds.add(button.pathId);
    }
    return !isFixture;
  });

  const indexEntries = parsePathIndexEntries(args.indexRaw);
  const liveIndexEntries = indexEntries.filter((entry) => {
    const isFixture = isPlaywrightAiPathsFixturePathId(entry.id);
    if (isFixture) {
      fixturePathIds.add(entry.id);
    }
    return !isFixture;
  });

  return {
    removedTriggerButtons: triggerButtons.length - liveButtons.length,
    removedPathIndexEntries: indexEntries.length - liveIndexEntries.length,
    removedPathConfigs: fixturePathIds.size,
    nextTriggerButtonsRaw: serializeAiTriggerButtonsRaw(
      liveButtons.map((button, index) =>
        button.sortIndex === index ? button : { ...button, sortIndex: index }
      )
    ),
    nextIndexRaw: JSON.stringify(liveIndexEntries),
    pathConfigKeysToDelete: Array.from(
      fixturePathIds,
      (pathId) => `${AI_PATHS_CONFIG_KEY_PREFIX}${pathId}`
    ),
  };
};

export const PLAYWRIGHT_AI_PATHS_FIXTURE_CLEANUP_KEYS = {
  triggerButtons: AI_PATHS_TRIGGER_BUTTONS_KEY,
  pathIndex: AI_PATHS_INDEX_KEY,
} as const;
