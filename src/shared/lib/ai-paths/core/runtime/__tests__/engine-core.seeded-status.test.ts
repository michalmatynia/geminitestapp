import { describe, expect, it, vi } from 'vitest';

import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import { buildNodeInputHash } from '@/shared/lib/ai-paths/core/runtime/engine-modules/engine-hashing';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildNode = (): AiNode =>
  ({
    id: 'node-seeded-failure',
    type: 'custom_seeded_failure',
    title: 'Seeded Failure Node',
    description: '',
    inputs: [],
    outputs: ['value'],
    config: {},
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('engine-core seeded status classification', () => {
  it('treats seeded failed cache output as failed runtime status', async () => {
    const node = buildNode();
    const runId = 'run-seeded-status';
    const seedHash = buildNodeInputHash(node, {}, { runId });
    const handler = vi.fn(async () => ({ value: 'live-result' }));

    const runtime = await evaluateGraphInternal([node], [] satisfies Edge[], {
      runId,
      seedHashes: {
        [node.id]: seedHash,
      },
      seedOutputs: {
        [node.id]: {
          status: 'failed',
          error: 'seeded failure',
        },
      },
      resolveHandler: () => handler,
      reportAiPathsError: (): void => {},
    });

    expect(handler).not.toHaveBeenCalled();
    expect(runtime.nodeStatuses[node.id]).toBe('failed');
    expect(runtime.nodeOutputs[node.id]?.['status']).toBe('failed');
  });
});
