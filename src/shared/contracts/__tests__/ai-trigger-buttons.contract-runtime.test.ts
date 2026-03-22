import { describe, expect, it } from 'vitest';

import {
  aiTriggerButtonCreatePayloadSchema,
  aiTriggerButtonsQuerySchema,
} from '@/shared/contracts/ai-trigger-buttons';
import { PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM } from '@/shared/lib/ai-paths/playwright-fixture-scope';

describe('ai trigger buttons contract runtime', () => {
  it('parses trigger button create payloads', () => {
    expect(
      aiTriggerButtonCreatePayloadSchema.parse({
        name: 'Run Path',
        iconId: null,
        pathId: 'path-1',
        locations: ['product_row'],
      })
    ).toMatchObject({
      name: 'Run Path',
      iconId: null,
      pathId: 'path-1',
      enabled: true,
      locations: ['product_row'],
      mode: 'click',
      display: 'icon_label',
    });
  });

  it('parses trigger button query DTOs', () => {
    expect(
      aiTriggerButtonsQuerySchema.parse({
        [PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM]: 'true',
      })
    ).toEqual({
      [PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM]: true,
    });
    expect(aiTriggerButtonsQuerySchema.parse({})).toEqual({});
  });
});
