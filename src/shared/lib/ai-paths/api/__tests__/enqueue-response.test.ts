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

  it('returns run record only for object payloads with id', () => {
    const runRecord = { id: 'run_789', status: 'queued', pathId: 'path-1' };
    expect(extractAiPathRunRecordFromEnqueueResponseData({ run: runRecord })).toEqual(runRecord);
    expect(extractAiPathRunRecordFromEnqueueResponseData({ run: 'run_789' })).toBeNull();
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
});
