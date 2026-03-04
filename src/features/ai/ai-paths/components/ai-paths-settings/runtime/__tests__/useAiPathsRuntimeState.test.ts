import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useAiPathsRuntimeState } from '../useAiPathsRuntimeState';

describe('useAiPathsRuntimeState', () => {
  it('does not settle queued node statuses unless explicitly requested', () => {
    const { result } = renderHook(() => useAiPathsRuntimeState());

    act(() => {
      result.current.setNodeStatus({
        nodeId: 'node-trigger',
        status: 'queued',
        source: 'server',
      });
    });

    expect(result.current.runtimeNodeStatuses['node-trigger']).toBe('queued');

    act(() => {
      result.current.settleTransientNodeStatuses('completed');
    });

    expect(result.current.runtimeNodeStatuses['node-trigger']).toBe('queued');
  });

  it('settles queued node statuses when explicitly requested', () => {
    const { result } = renderHook(() => useAiPathsRuntimeState());

    act(() => {
      result.current.setNodeStatus({
        nodeId: 'node-trigger',
        status: 'queued',
        source: 'server',
      });
    });

    act(() => {
      result.current.settleTransientNodeStatuses('completed', {}, { settleQueued: true });
    });

    expect(result.current.runtimeNodeStatuses['node-trigger']).toBe('completed');
  });

  it('does not overwrite existing failed node status during settle', () => {
    const { result } = renderHook(() => useAiPathsRuntimeState());

    act(() => {
      result.current.setNodeStatus({
        nodeId: 'node-fetcher',
        status: 'failed',
        source: 'server',
      });
    });

    act(() => {
      result.current.settleTransientNodeStatuses('completed');
    });

    expect(result.current.runtimeNodeStatuses['node-fetcher']).toBe('failed');
  });
});
