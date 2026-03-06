import { describe, expect, it } from 'vitest';

import { AI_PATHS_RUN_SOURCE_VALUES } from '@/shared/lib/ai-paths/run-sources';

import { __testOnly as mongoTestOnly } from '../mongo-path-run-repository';
import { __testOnly as prismaTestOnly } from '../prisma-path-run-repository';

describe('path-run repository source filters (canonical)', () => {
  it('keeps product and trigger-button sources in the canonical AI Paths node source set', () => {
    expect(AI_PATHS_RUN_SOURCE_VALUES).toContain('product_panel');
    expect(AI_PATHS_RUN_SOURCE_VALUES).toContain('trigger_button');
  });

  it('builds prisma include ai_paths_ui filters from canonical meta.source only', () => {
    const where = prismaTestOnly.buildRunWhere({
      source: 'ai_paths_ui',
      sourceMode: 'include',
    }) as Record<string, unknown>;

    const sourceClauses = (((where['AND'] as unknown[])?.[0] as Record<string, unknown>)?.['OR'] ??
      []) as Array<Record<string, unknown>>;

    expect(sourceClauses).toHaveLength(AI_PATHS_RUN_SOURCE_VALUES.length);
    expect(
      sourceClauses.every(
        (clause: Record<string, unknown>) =>
          JSON.stringify(clause).includes('"path":["source"]') &&
          JSON.stringify(clause).includes('"equals"')
      )
    ).toBe(true);

    const serialized = JSON.stringify(where);
    expect(serialized).not.toContain('sourceInfo');
    expect(serialized).not.toContain('["source","tab"]');
  });

  it('builds prisma exclude ai_paths_ui filters from canonical meta.source only', () => {
    const where = prismaTestOnly.buildRunWhere({
      source: 'ai_paths_ui',
      sourceMode: 'exclude',
    }) as Record<string, unknown>;

    const excludeClauses = (((where['AND'] as unknown[])?.[0] as Record<string, unknown>)?.[
      'AND'
    ] ?? []) as Array<Record<string, unknown>>;

    expect(excludeClauses).toHaveLength(AI_PATHS_RUN_SOURCE_VALUES.length);
    expect(
      excludeClauses.every(
        (clause: Record<string, unknown>) =>
          JSON.stringify(clause).includes('"NOT"') &&
          JSON.stringify(clause).includes('"path":["source"]')
      )
    ).toBe(true);

    const serialized = JSON.stringify(where);
    expect(serialized).not.toContain('sourceInfo');
    expect(serialized).not.toContain('["source","tab"]');
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
