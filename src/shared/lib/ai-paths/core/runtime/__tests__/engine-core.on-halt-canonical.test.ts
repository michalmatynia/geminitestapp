import { describe, expect, it, vi } from 'vitest';

import { evaluateGraphInternal } from '@/shared/lib/ai-paths/core/runtime/engine-core';
import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

const buildBlockedNode = (): AiNode =>
  ({
    id: 'node-blocked',
    type: 'custom_blocked',
    title: 'Blocked',
    description: '',
    inputs: ['prompt'],
    outputs: ['value'],
    config: {
      runtime: {
        waitForInputs: true,
      },
    },
    position: { x: 0, y: 0 },
  }) as AiNode;

describe('engine-core halt callback contract', () => {
  it('invokes canonical onHalt callback', async () => {
    const onHalt = vi.fn();

    const result = await evaluateGraphInternal([buildBlockedNode()], [] satisfies Edge[], {
      onHalt,
      resolveHandler: () => async () => ({ value: 'ok' }),
      reportAiPathsError: (): void => {},
    });

    expect(result.status).toBe('running');
    expect(onHalt).toHaveBeenCalledTimes(1);
    const call = onHalt.mock.calls[0] as [{ reason: string }];
    expect(call?.[0]?.reason).toBe('blocked');
  });

  it('does not invoke deprecated control.onHalt callback', async () => {
    const legacyOnHalt = vi.fn();

    await evaluateGraphInternal([buildBlockedNode()], [] satisfies Edge[], {
      resolveHandler: () => async () => ({ value: 'ok' }),
      reportAiPathsError: (): void => {},
      control: {
        onHalt: legacyOnHalt,
      },
    });

    expect(legacyOnHalt).not.toHaveBeenCalled();
  });
});
