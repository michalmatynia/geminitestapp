import { describe, expect, it } from 'vitest';

import {
  AI_PATHS_RUN_SOURCE_TABS,
  AI_PATHS_RUN_SOURCE_VALUES,
  isAiPathsRunSourceTab,
  isAiPathsRunSourceValue,
} from '@/features/ai/ai-paths/lib/run-sources';

describe('ai-paths run source classification', () => {
  it('includes translation tab aliases for queue/source filters', () => {
    expect(AI_PATHS_RUN_SOURCE_TABS).toContain('translation');
    expect(AI_PATHS_RUN_SOURCE_TABS).toContain('translations');
  });

  it('normalizes source value checks', () => {
    expect(AI_PATHS_RUN_SOURCE_VALUES).toContain('trigger_button');
    expect(isAiPathsRunSourceValue('TRIGGER_BUTTON')).toBe(true);
    expect(isAiPathsRunSourceValue('  product_panel  ')).toBe(true);
    expect(isAiPathsRunSourceValue('ai_insights')).toBe(false);
  });

  it('normalizes source tab checks', () => {
    expect(isAiPathsRunSourceTab('Translation')).toBe(true);
    expect(isAiPathsRunSourceTab(' translations ')).toBe(true);
    expect(isAiPathsRunSourceTab('brain')).toBe(false);
  });
});
