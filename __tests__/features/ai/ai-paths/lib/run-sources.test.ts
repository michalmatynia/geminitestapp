import { describe, expect, it } from 'vitest';

import { AI_PATHS_RUN_SOURCE_VALUES, isAiPathsRunSourceValue } from '@/shared/lib/ai-paths/run-sources';

describe('ai-paths run source classification', () => {
  it('normalizes source value checks', () => {
    expect(AI_PATHS_RUN_SOURCE_VALUES).toContain('trigger_button');
    expect(isAiPathsRunSourceValue('TRIGGER_BUTTON')).toBe(true);
    expect(isAiPathsRunSourceValue('  product_panel  ')).toBe(true);
    expect(isAiPathsRunSourceValue('ai_insights')).toBe(false);
  });
});
