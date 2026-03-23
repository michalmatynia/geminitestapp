import { describe, it, expect } from 'vitest';
import { aggregateTraceNodes, aggregateHistoryNodes } from '../aggregation';
import type { RuntimeTraceSummary } from '../types';
import type { AiPathRunRecord } from '@/shared/contracts/ai-paths';

describe('Run Trace Aggregation', () => {
  describe('aggregateTraceNodes', () => {
    it('aggregates multiple spans for the same node', () => {
      const summary: RuntimeTraceSummary = {
        spans: [
          {
            nodeId: 'node-1',
            nodeType: 'model',
            nodeTitle: 'GPT',
            status: 'completed',
            durationMs: 100,
            startedAt: '2026-01-01T10:00:00Z',
            finishedAt: '2026-01-01T10:00:00.100Z',
          },
          {
            nodeId: 'node-1',
            nodeType: 'model',
            nodeTitle: 'GPT Updated',
            status: 'completed',
            durationMs: 200,
            startedAt: '2026-01-01T10:01:00Z',
            finishedAt: '2026-01-01T10:01:00.200Z',
          },
        ],
      } as any;

      const result = aggregateTraceNodes(summary);
      expect(result).toHaveLength(1);
      const node = result[0]!;
      expect(node.nodeId).toBe('node-1');
      expect(node.spanCount).toBe(2);
      expect(node.totalMs).toBe(300);
      expect(node.avgMs).toBe(150);
      expect(node.maxMs).toBe(200);
      // Latest title should be picked
      expect(node.nodeTitle).toBe('GPT Updated');
    });

    it('handles empty spans', () => {
      expect(aggregateTraceNodes({ spans: [] } as any)).toHaveLength(0);
    });
  });

  describe('aggregateHistoryNodes', () => {
    it('aggregates history entries by node ID', () => {
      const run: AiPathRunRecord = {
        runtimeState: {
          history: {
            'node-1': [
              {
                nodeId: 'node-1',
                nodeType: 'trigger',
                status: 'completed',
                timestamp: '2026-01-01T10:00:00Z',
                durationMs: 50,
              },
            ],
            'node-2': [
              {
                nodeId: 'node-2',
                nodeType: 'model',
                status: 'running',
                timestamp: '2026-01-01T10:01:00Z',
              },
            ],
          },
        },
      } as any;

      const result = aggregateHistoryNodes(run);
      expect(result).toHaveLength(2);
      const n1 = result.find(r => r.nodeId === 'node-1')!;
      expect(n1.status).toBe('completed');
      expect(n1.totalMs).toBe(50);
    });
  });
});
