import { describe, expect, it } from 'vitest';

import { AI_PATHS_RUN_SOURCE_VALUES } from '@/shared/lib/ai-paths/run-sources';

import { __testOnly as mongoTestOnly } from '../mongo-path-run-repository';

describe('path-run repository source filters (canonical)', () => {
  it('keeps product and trigger-button sources in the canonical AI Paths node source set', () => {
    expect(AI_PATHS_RUN_SOURCE_VALUES).toContain('product_panel');
    expect(AI_PATHS_RUN_SOURCE_VALUES).toContain('trigger_button');
  });

  it('builds mongo include ai_paths_ui filter from canonical meta.source only', () => {
    const filter = mongoTestOnly.buildRunFilter({
      source: 'ai_paths_ui',
      sourceMode: 'include',
    });

    expect(filter).toEqual({
      $and: [{ 'meta.source': { $in: [...AI_PATHS_RUN_SOURCE_VALUES] } }],
    });
    expect(JSON.stringify(filter)).not.toContain('meta.source.tab');
    expect(JSON.stringify(filter)).not.toContain('meta.sourceInfo.tab');
  });

  it('builds mongo exclude ai_paths_ui filter from canonical meta.source only', () => {
    const filter = mongoTestOnly.buildRunFilter({
      source: 'ai_paths_ui',
      sourceMode: 'exclude',
    });

    expect(filter).toEqual({
      $and: [{ 'meta.source': { $nin: [...AI_PATHS_RUN_SOURCE_VALUES] } }],
    });
    expect(JSON.stringify(filter)).not.toContain('meta.source.tab');
    expect(JSON.stringify(filter)).not.toContain('meta.sourceInfo.tab');
  });
});
