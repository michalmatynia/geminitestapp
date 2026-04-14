import { act, renderHook, waitFor } from '@testing-library/react';
import type React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';

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
    const errorArgs = logClientErrorMock.mock.calls[0] as
      | [Error, { context?: Record<string, unknown> }]
      | undefined;
    expect(errorArgs?.[0]).toBeInstanceOf(Error);
    expect(errorArgs?.[1].context?.['source']).toBe('ai-paths.runtime-context');
    expect(errorArgs?.[1].context?.['action']).toBe('fireTrigger');
    expect(errorArgs?.[1].context?.['nodeId']).toBe(triggerNode.id);
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
