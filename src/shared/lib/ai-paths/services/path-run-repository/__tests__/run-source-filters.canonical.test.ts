import { describe, expect, it } from 'vitest';

import { AI_PATHS_RUN_SOURCE_VALUES } from '@/shared/lib/ai-paths/run-sources';

import { buildRunFilter } from '../methods/run-query-helpers';

describe('path-run repository source filters (canonical)', () => {
  it('keeps product and trigger-button sources in the canonical AI Paths node source set', () => {
    expect(AI_PATHS_RUN_SOURCE_VALUES).toContain('product_panel');
    expect(AI_PATHS_RUN_SOURCE_VALUES).toContain('trigger_button');
  });

  it('builds mongo include ai_paths_ui filter from canonical meta.source only', () => {
    const filter = buildRunFilter({
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
    const filter = buildRunFilter({
      source: 'ai_paths_ui',
      sourceMode: 'exclude',
    });

    expect(filter).toEqual({
      $and: [{ 'meta.source': { $nin: [...AI_PATHS_RUN_SOURCE_VALUES] } }],
    });
    expect(JSON.stringify(filter)).not.toContain('meta.source.tab');
    expect(JSON.stringify(filter)).not.toContain('meta.sourceInfo.tab');
  });

  it('builds the remaining run list filters for ids, statuses, query, dates, and explicit sources', () => {
    const filter = buildRunFilter({
      id: 'run_123',
      userId: 'user_123',
      pathId: 'path_123',
      requestId: ' req_123 ',
      statuses: ['queued', 'failed'],
      source: 'manual',
      sourceMode: 'include',
      query: 'invoice+draft',
      createdAfter: '2026-03-20T00:00:00.000Z',
      createdBefore: '2026-03-21T00:00:00.000Z',
    });

    const clauses = (filter as { $and: Array<Record<string, unknown>> }).$and;
    expect(clauses).toContainEqual({ $or: [{ id: 'run_123' }, { _id: 'run_123' }] });
    expect(clauses).toContainEqual({ userId: 'user_123' });
    expect(clauses).toContainEqual({ pathId: 'path_123' });
    expect(clauses).toContainEqual({ 'meta.requestId': 'req_123' });
    expect(clauses).toContainEqual({ status: { $in: ['queued', 'failed'] } });
    expect(clauses).toContainEqual({ 'meta.source': 'manual' });

    const queryClause = clauses.find(
      (entry) =>
        '$or' in entry &&
        Array.isArray(entry['$or']) &&
        (entry['$or'] as Array<Record<string, unknown>>).some((branch) =>
          Object.values(branch).some(
            (value) =>
              Boolean(value) &&
              typeof value === 'object' &&
              '$regex' in (value as Record<string, unknown>)
          )
        )
    );
    expect(queryClause).toBeDefined();
    const regexBranches = (queryClause?.['$or'] as Array<Record<string, { $regex: RegExp }>>).map(
      (entry) => Object.values(entry)[0]?.$regex
    );
    expect(regexBranches).toHaveLength(6);
    regexBranches.forEach((regex) => {
      expect(regex).toBeInstanceOf(RegExp);
      expect(regex.source).toBe('invoice\\+draft');
      expect(regex.flags).toBe('i');
    });

    const createdAtClause = clauses.find((entry) => 'createdAt' in entry) as
      | { createdAt: { $gte: Date; $lte: Date } }
      | undefined;
    expect(createdAtClause?.createdAt.$gte.toISOString()).toBe('2026-03-20T00:00:00.000Z');
    expect(createdAtClause?.createdAt.$lte.toISOString()).toBe('2026-03-21T00:00:00.000Z');
  });

  it('uses single status values, exclude sources, and ignores invalid dates', () => {
    const filter = buildRunFilter({
      status: 'completed',
      source: 'manual',
      sourceMode: 'exclude',
      createdAfter: 'not-a-date',
      createdBefore: null,
    });

    expect(filter).toEqual({
      $and: [{ status: 'completed' }, { 'meta.source': { $ne: 'manual' } }],
    });
  });
});
