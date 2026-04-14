import { describe, expect, it } from 'vitest';

import type { AiPathLocalRunRecord } from '@/shared/contracts/ai-paths';
import { shouldIncludeLocalRun } from './local-run-filters';

const createRun = (source: string | null): AiPathLocalRunRecord => ({
  id: `run-${source ?? 'null'}`,
  status: 'success',
  startedAt: '2026-03-29T10:00:00.000Z',
  finishedAt: '2026-03-29T10:00:05.000Z',
  durationMs: 5000,
  nodeCount: 1,
  nodeDurations: null,
  pathId: 'path-1',
  pathName: 'Path',
  triggerEvent: null,
  triggerLabel: null,
  entityType: null,
  entityId: null,
  error: null,
  source,
});

describe('shouldIncludeLocalRun', () => {
  it('includes everything when there is no source filter', () => {
    expect(shouldIncludeLocalRun(createRun('external_api'))).toBe(true);
  });

  it('matches concrete sources in include and exclude modes', () => {
    expect(shouldIncludeLocalRun(createRun('external_api'), 'external_api', 'include')).toBe(true);
    expect(shouldIncludeLocalRun(createRun('trigger_button'), 'external_api', 'include')).toBe(false);
    expect(shouldIncludeLocalRun(createRun('external_api'), 'external_api', 'exclude')).toBe(false);
    expect(shouldIncludeLocalRun(createRun('trigger_button'), 'external_api', 'exclude')).toBe(true);
  });

  it('treats ai_paths_ui as the canonical UI source group', () => {
    expect(shouldIncludeLocalRun(createRun('trigger_button'), 'ai_paths_ui', 'include')).toBe(true);
    expect(shouldIncludeLocalRun(createRun('product_panel'), 'ai_paths_ui', 'include')).toBe(true);
    expect(shouldIncludeLocalRun(createRun('external_api'), 'ai_paths_ui', 'include')).toBe(false);
    expect(shouldIncludeLocalRun(createRun(null), 'ai_paths_ui', 'include')).toBe(true);
    expect(shouldIncludeLocalRun(createRun('trigger_button'), 'ai_paths_ui', 'exclude')).toBe(false);
    expect(shouldIncludeLocalRun(createRun('external_api'), 'ai_paths_ui', 'exclude')).toBe(true);
    expect(shouldIncludeLocalRun(createRun(null), 'ai_paths_ui', 'exclude')).toBe(false);
  });
});
