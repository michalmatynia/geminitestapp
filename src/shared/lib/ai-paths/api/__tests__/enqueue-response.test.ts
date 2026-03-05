import { describe, expect, it } from 'vitest';

import {
  extractAiPathRunIdFromEnqueueResponseData,
  extractAiPathRunRecordFromEnqueueResponseData,
  resolveAiPathRunFromEnqueueResponseData,
} from '@/shared/lib/ai-paths/api/client';

describe('AI Paths enqueue response normalization', () => {
  it('extracts run id from legacy string payload', () => {
    expect(extractAiPathRunIdFromEnqueueResponseData({ run: ' run_123 ' })).toBe('run_123');
  });

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

  it('extracts run id from alternate run keys and nested data payloads', () => {
    expect(extractAiPathRunIdFromEnqueueResponseData({ runId: 'run_top_level' })).toBe(
      'run_top_level'
    );
    expect(extractAiPathRunIdFromEnqueueResponseData({ id: 'run_top_level_id' })).toBe(
      'run_top_level_id'
    );
    expect(extractAiPathRunIdFromEnqueueResponseData({ data: { run: { id: 'run_nested' } } })).toBe(
      'run_nested'
    );
    expect(
      extractAiPathRunIdFromEnqueueResponseData({ data: { run: { runId: 'run_nested_alt' } } })
    ).toBe('run_nested_alt');
    expect(extractAiPathRunIdFromEnqueueResponseData({ run: { _id: 'run_mongo' } })).toBe(
      'run_mongo'
    );
    expect(
      extractAiPathRunIdFromEnqueueResponseData({
        run: { status: 'queued' },
        runId: 'run_mixed_payload',
      })
    ).toBe('run_mixed_payload');
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

  it('normalizes run records that expose runId only', () => {
    expect(
      extractAiPathRunRecordFromEnqueueResponseData({
        run: { runId: 'run_only_runId', status: 'queued' },
      })
    ).toEqual({ id: 'run_only_runId', runId: 'run_only_runId', status: 'queued' });
  });

  it('normalizes mixed payloads where runId is outside run object', () => {
    expect(
      extractAiPathRunRecordFromEnqueueResponseData({
        run: { status: 'running', pathId: 'path-mixed' },
        runId: 'run_mixed_record',
      })
    ).toEqual({ id: 'run_mixed_record', status: 'running', pathId: 'path-mixed' });
  });

  it('resolves run id and record for canonical payload', () => {
    const runRecord = { id: 'run_900', status: 'queued', pathId: 'path-2' };
    expect(resolveAiPathRunFromEnqueueResponseData({ run: runRecord })).toEqual({
      runId: 'run_900',
      runRecord,
    });
  });

  it('resolves run id and null record for legacy string payload', () => {
    expect(resolveAiPathRunFromEnqueueResponseData({ run: 'run_901' })).toEqual({
      runId: 'run_901',
      runRecord: null,
    });
  });

  it('resolves run id for top-level fallback payloads', () => {
    expect(resolveAiPathRunFromEnqueueResponseData({ runId: 'run_fallback_1' })).toEqual({
      runId: 'run_fallback_1',
      runRecord: { id: 'run_fallback_1', runId: 'run_fallback_1', status: 'queued' },
    });
    expect(resolveAiPathRunFromEnqueueResponseData({ data: { id: 'run_fallback_2' } })).toEqual({
      runId: 'run_fallback_2',
      runRecord: { id: 'run_fallback_2', status: 'queued' },
    });
  });
});
