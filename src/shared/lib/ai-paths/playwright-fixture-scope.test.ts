import { describe, expect, it } from 'vitest';

import {
  PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX,
  isPlaywrightAiPathsFixturePathId,
  isPlaywrightAiPathsFixtureTriggerButton,
  shouldIncludePlaywrightAiPathsFixtureButtons,
} from '@/shared/lib/ai-paths/playwright-fixture-scope';

describe('playwright ai-paths fixture scope helpers', () => {
  it('treats common truthy flag values as enabled and rejects everything else', () => {
    expect(shouldIncludePlaywrightAiPathsFixtureButtons('1')).toBe(true);
    expect(shouldIncludePlaywrightAiPathsFixtureButtons(' TRUE ')).toBe(true);
    expect(shouldIncludePlaywrightAiPathsFixtureButtons('yes')).toBe(true);
    expect(shouldIncludePlaywrightAiPathsFixtureButtons('off')).toBe(false);
    expect(shouldIncludePlaywrightAiPathsFixtureButtons(null)).toBe(false);
    expect(shouldIncludePlaywrightAiPathsFixtureButtons(undefined)).toBe(false);
  });

  it('recognizes fixture path ids and trigger buttons by prefix', () => {
    const fixturePathId = `${PLAYWRIGHT_AI_PATHS_PATH_ID_PREFIX}catalog-sync`;

    expect(isPlaywrightAiPathsFixturePathId(fixturePathId)).toBe(true);
    expect(isPlaywrightAiPathsFixturePathId('path_live_products_123')).toBe(false);
    expect(isPlaywrightAiPathsFixturePathId(null)).toBe(false);

    expect(
      isPlaywrightAiPathsFixtureTriggerButton({
        pathId: fixturePathId,
      })
    ).toBe(true);
    expect(
      isPlaywrightAiPathsFixtureTriggerButton({
        pathId: 'path_live_products_123',
      })
    ).toBe(false);
  });
});
