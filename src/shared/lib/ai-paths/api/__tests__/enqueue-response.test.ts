import { describe, expect, it } from 'vitest';

import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';
import {
  extractAiPathRunIdFromEnqueueResponseData,
  extractAiPathRunRecordFromEnqueueResponseData,
  mergeEnqueuedAiPathRunForCache,
  resolveAiPathRunFromEnqueueResponseData,
} from '@/shared/lib/ai-paths/api/client';

describe('AI Paths enqueue response normalization', () => {
  it('extracts run id from canonical object payload', () => {
    expect(
      extractAiPathRunIdFromEnqueueResponseData({ run: { id: 'run_456', status: 'queued' } })
    ).toBe('run_456');
  });

  it('returns null run id when enqueue payload is malformed', () => {
    expect(extractAiPathRunIdFromEnqueueResponseData({ run: { status: 'queued' } })).toBeNull();
    expect(extractAiPathRunIdFromEnqueueResponseData({})).toBeNull();
    expect(extractAiPathRunIdFromEnqueueResponseData(null)).toBeNull();
  });

  it('rejects legacy enqueue envelope shapes', () => {
    expect(extractAiPathRunIdFromEnqueueResponseData({ run: ' run_123 ' })).toBeNull();
    expect(extractAiPathRunIdFromEnqueueResponseData({ runId: 'run_top_level' })).toBeNull();
    expect(extractAiPathRunIdFromEnqueueResponseData({ id: 'run_top_level_id' })).toBeNull();
    expect(extractAiPathRunIdFromEnqueueResponseData({ data: { run: { id: 'run_nested' } } })).toBeNull();
    expect(extractAiPathRunIdFromEnqueueResponseData({ run: { _id: 'run_mongo' } })).toBeNull();
    expect(
      extractAiPathRunIdFromEnqueueResponseData({
        run: { status: 'queued' },
        runId: 'run_mixed_payload',
      })
    ).toBeNull();
  });

  it('does not treat generic wrapper ids as run ids', () => {
    const payload = {
      id: 'path_wrapper_id',
      pathId: 'path_wrapper_id',
      run: { status: 'queued' },
    };
    expect(extractAiPathRunIdFromEnqueueResponseData(payload)).toBeNull();
    expect(extractAiPathRunRecordFromEnqueueResponseData(payload)).toBeNull();
  });

  it('returns run record only for object payloads with id', () => {
    const runRecord = { id: 'run_789', status: 'queued', pathId: 'path-1' };
    expect(extractAiPathRunRecordFromEnqueueResponseData({ run: runRecord })).toEqual(runRecord);
    expect(extractAiPathRunRecordFromEnqueueResponseData({ run: 'run_789' })).toBeNull();
  });

  it('rejects non-canonical run record payloads', () => {
    expect(
      extractAiPathRunRecordFromEnqueueResponseData({
        run: { runId: 'run_only_runId', status: 'queued' },
      })
    ).toBeNull();
    expect(
      extractAiPathRunRecordFromEnqueueResponseData({
        run: { status: 'running', pathId: 'path-mixed' },
        runId: 'run_mixed_record',
      })
    ).toBeNull();
  });

  it('resolves run id and record for canonical payload', () => {
    const runRecord = { id: 'run_900', status: 'queued', pathId: 'path-2' };
    expect(resolveAiPathRunFromEnqueueResponseData({ run: runRecord })).toEqual({
      runId: 'run_900',
      runRecord,
    });
  });

  it('returns null resolution for legacy fallback payloads', () => {
    expect(resolveAiPathRunFromEnqueueResponseData({ run: 'run_901' })).toEqual({
      runId: null,
      runRecord: null,
    });
    expect(resolveAiPathRunFromEnqueueResponseData({ runId: 'run_fallback_1' })).toEqual({
      runId: null,
      runRecord: null,
    });
    expect(resolveAiPathRunFromEnqueueResponseData({ data: { id: 'run_fallback_2' } })).toEqual({
      runId: null,
      runRecord: null,
    });
  });

  it('merges partial enqueue run records with optimistic fallback metadata', () => {
    expect(
      mergeEnqueuedAiPathRunForCache({
        runId: 'run_partial_1',
        runRecord: {
          id: 'run_partial_1',
          status: 'queued',
        } as AiPathRunRecord,
        fallbackRun: {
          id: 'run_partial_1',
          status: 'queued',
          createdAt: '2026-03-07T13:00:00.000Z',
          updatedAt: '2026-03-07T13:00:00.000Z',
          pathId: 'path-1',
          pathName: 'Fallback Path',
          requestId: 'req-1',
          entityId: 'product-1',
          entityType: 'product',
          triggerEvent: 'manual',
          meta: {
            source: 'product_panel',
            requestId: 'req-1',
          },
        },
      })
    ).toEqual(
      expect.objectContaining({
        id: 'run_partial_1',
        pathId: 'path-1',
        pathName: 'Fallback Path',
        requestId: 'req-1',
        entityId: 'product-1',
        entityType: 'product',
        triggerEvent: 'manual',
        meta: {
          source: 'product_panel',
          requestId: 'req-1',
        },
      })
    );
  });

  it('preserves explicit enqueue run record fields while merging fallback metadata', () => {
    expect(
      mergeEnqueuedAiPathRunForCache({
        runId: 'run_partial_2',
        runRecord: {
          id: 'run_partial_2',
          status: 'running',
          pathName: 'Server Path',
          meta: {
            source: 'trigger_button',
            attempt: 1,
          },
        } as AiPathRunRecord,
        fallbackRun: {
          id: 'run_partial_2',
          status: 'queued',
          createdAt: '2026-03-07T13:00:00.000Z',
          updatedAt: '2026-03-07T13:00:00.000Z',
          pathId: 'path-2',
          pathName: 'Fallback Path',
          meta: {
            source: 'product_panel',
            requestId: 'req-2',
          },
        },
      })
    ).toEqual(
      expect.objectContaining({
        id: 'run_partial_2',
        status: 'running',
        pathId: 'path-2',
        pathName: 'Server Path',
        meta: {
          source: 'trigger_button',
          requestId: 'req-2',
          attempt: 1,
        },
      })
    );
  });
});
