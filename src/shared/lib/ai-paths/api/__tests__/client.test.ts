import { describe, it, expect } from 'vitest';
import {
  extractAiPathRunIdFromEnqueueResponseData,
  extractAiPathRunRecordFromEnqueueResponseData,
  mergeEnqueuedAiPathRunForCache,
} from '../client';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

describe('AI-Paths API Client Utilities', () => {
  describe('extractAiPathRunIdFromEnqueueResponseData', () => {
    it('extracts ID from a direct string', () => {
      expect(extractAiPathRunIdFromEnqueueResponseData('run-123')).toBe('run-123');
    });

    it('extracts ID from an object with id field', () => {
      expect(extractAiPathRunIdFromEnqueueResponseData({ id: 'run-123' })).toBe('run-123');
    });

    it('extracts ID from an object with runId field', () => {
      expect(extractAiPathRunIdFromEnqueueResponseData({ runId: 'run-123' })).toBe('run-123');
    });

    it('extracts ID from a nested run object', () => {
      expect(extractAiPathRunIdFromEnqueueResponseData({ run: { id: 'run-123' } })).toBe('run-123');
    });

    it('returns null for invalid data', () => {
      expect(extractAiPathRunIdFromEnqueueResponseData(null)).toBeNull();
      expect(extractAiPathRunIdFromEnqueueResponseData({})).toBeNull();
      expect(extractAiPathRunIdFromEnqueueResponseData(123)).toBeNull();
    });
  });

  describe('extractAiPathRunRecordFromEnqueueResponseData', () => {
    it('extracts record from run field', () => {
      const data = {
        run: {
          id: 'run-123',
          status: 'running',
          pathId: 'path-1',
        },
      };
      const result = extractAiPathRunRecordFromEnqueueResponseData(data);
      expect(result).toMatchObject({
        id: 'run-123',
        status: 'running',
        pathId: 'path-1',
      });
    });

    it('handles legacy envelope with ID on wrapper', () => {
      const data = {
        runId: 'run-123',
        run: {
          status: 'pending',
        },
      };
      const result = extractAiPathRunRecordFromEnqueueResponseData(data);
      expect(result).toMatchObject({
        id: 'run-123',
        status: 'pending',
      });
    });

    it('returns null for ID-only string response', () => {
      // Logic returns null for strings to preserve legacy behavior (caller uses extractId)
      expect(extractAiPathRunRecordFromEnqueueResponseData('run-123')).toBeNull();
    });
  });

  describe('mergeEnqueuedAiPathRunForCache', () => {
    const fallbackRun: AiPathRunRecord = {
      id: 'old-id',
      status: 'queued',
      pathId: 'path-1',
      createdAt: '2026-01-01',
      updatedAt: '2026-01-01',
      meta: { foo: 'bar' },
    } as any;

    it('merges new run record into fallback', () => {
      const runRecord: AiPathRunRecord = {
        status: 'running',
        pathName: 'Updated Path',
        meta: { new: 'meta' },
      } as any;

      const result = mergeEnqueuedAiPathRunForCache({
        fallbackRun,
        runId: 'run-123',
        runRecord,
      });

      expect(result.id).toBe('run-123');
      expect(result.status).toBe('running');
      expect(result.pathName).toBe('Updated Path');
      // Deep merge for meta
      expect(result.meta).toEqual({ foo: 'bar', new: 'meta' });
    });

    it('uses fallback values when runRecord fields are missing', () => {
      const result = mergeEnqueuedAiPathRunForCache({
        fallbackRun,
        runId: 'run-123',
        runRecord: null,
      });

      expect(result.id).toBe('run-123');
      expect(result.status).toBe('queued');
      expect(result.pathId).toBe('path-1');
    });
  });
});
