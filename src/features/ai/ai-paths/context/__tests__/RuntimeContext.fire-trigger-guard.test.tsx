import { act, renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/lib/ai-paths';

const logClientErrorMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
}));

import { RuntimeProvider, useRuntimeActions, useRuntimeState } from '../RuntimeContext';

const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
  <RuntimeProvider>{children}</RuntimeProvider>
);

const buildTriggerNode = (id: string): AiNode =>
  ({
    id,
    type: 'trigger',
    title: 'Trigger',
    description: '',
    inputs: [],
    outputs: ['trigger'],
    position: { x: 0, y: 0 },
    data: {},
    config: {
      trigger: {
        event: 'manual',
      },
    },
  }) as AiNode;

describe('RuntimeContext fire trigger guard', () => {
  beforeEach(() => {
    logClientErrorMock.mockReset();
  });

  it('reports an explicit error when fireTrigger handler is missing', async () => {
    const { result } = renderHook(() => ({ ...useRuntimeState(), ...useRuntimeActions() }), {
      wrapper,
    });
    const triggerNode = buildTriggerNode('node-trigger-a');

    await act(async () => {
      await result.current.fireTrigger(triggerNode);
    });

    await waitFor(() => {
      expect(result.current.lastError?.message).toMatch(/fireTrigger/i);
    });
    expect(result.current.runtimeRunStatus).toBe('failed');
    expect(logClientErrorMock).toHaveBeenCalledTimes(1);
    expect(logClientErrorMock).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        context: expect.objectContaining({
          source: 'ai-paths.runtime-context',
          action: 'fireTrigger',
          nodeId: triggerNode.id,
        }),
      })
    );
  });

  it('dispatches fireTrigger to registered runtime control handlers', async () => {
    const { result } = renderHook(() => ({ ...useRuntimeState(), ...useRuntimeActions() }), {
      wrapper,
    });
    const triggerNode = buildTriggerNode('node-trigger-b');
    const fireTrigger = vi.fn(async () => {});

    act(() => {
      result.current.setRunControlHandlers({ fireTrigger });
    });

    await act(async () => {
      await result.current.fireTrigger(triggerNode);
    });

    expect(fireTrigger).toHaveBeenCalledTimes(1);
    expect(fireTrigger).toHaveBeenCalledWith(triggerNode, undefined);
    expect(logClientErrorMock).not.toHaveBeenCalled();
  });
});
