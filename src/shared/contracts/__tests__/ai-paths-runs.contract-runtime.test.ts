import { describe, expect, it } from 'vitest';

import {
  aiPathRunHandoffRequestSchema,
  aiPathRunQueueStatusQuerySchema,
  aiPathRunResumeRequestSchema,
  aiPathRunRouteParamsSchema,
  aiPathRunStreamQuerySchema,
  aiPathRunsDeleteQuerySchema,
  aiPathRunsListQuerySchema,
} from '@/shared/contracts/ai-paths';

describe('ai paths runs contract runtime', () => {
  it('parses run list query DTOs', () => {
    expect(
      aiPathRunsListQuerySchema.parse({
        visibility: 'GLOBAL',
        pathId: 'path-1',
        source: 'scheduler',
        sourceMode: 'EXCLUDE',
        status: 'RUNNING',
        limit: '25',
        offset: '10',
        includeTotal: '0',
        fresh: 'yes',
      })
    ).toEqual({
      visibility: 'global',
      pathId: 'path-1',
      nodeId: undefined,
      requestId: undefined,
      query: undefined,
      source: 'scheduler',
      sourceMode: 'exclude',
      status: 'running',
      limit: 25,
      offset: 10,
      includeTotal: false,
      fresh: true,
    });
  });

  it('parses run delete and queue-status query DTOs', () => {
    expect(
      aiPathRunsDeleteQuerySchema.parse({
        scope: 'ALL',
        pathId: 'path-9',
        sourceMode: 'exclude',
      })
    ).toEqual({
      scope: 'all',
      pathId: 'path-9',
      source: undefined,
      sourceMode: 'exclude',
    });

    expect(aiPathRunQueueStatusQuerySchema.parse({ visibility: 'global', fresh: '1' })).toEqual({
      visibility: 'global',
      fresh: true,
    });
  });

  it('parses run route params and stream query DTOs', () => {
    expect(aiPathRunRouteParamsSchema.parse({ runId: ' run-1 ' })).toEqual({
      runId: 'run-1',
    });
    expect(aiPathRunStreamQuerySchema.parse({ since: '2026-03-22T10:00:00.000Z' })).toEqual({
      since: '2026-03-22T10:00:00.000Z',
    });
  });

  it('parses run action request DTOs', () => {
    expect(aiPathRunResumeRequestSchema.parse({ mode: 'replay' })).toEqual({
      mode: 'replay',
    });
    expect(
      aiPathRunHandoffRequestSchema.parse({
        reason: ' Worker lease is still held ',
        checkpointLineageId: ' checkpoint-1 ',
      })
    ).toEqual({
      reason: 'Worker lease is still held',
      checkpointLineageId: 'checkpoint-1',
    });
  });
});
