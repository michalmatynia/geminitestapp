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

  it('ignores stale queued updates after node is already completed', () => {
    const { result } = renderHook(() => useAiPathsRuntimeState());

    act(() => {
      result.current.setNodeStatus({
        nodeId: 'node-trigger',
        status: 'completed',
        source: 'server',
      });
    });

    act(() => {
      result.current.setNodeStatus({
        nodeId: 'node-trigger',
        status: 'queued',
        source: 'server',
      });
    });

    expect(result.current.runtimeNodeStatuses['node-trigger']).toBe('completed');
  });

  it('accepts pending and processing runtime statuses', () => {
    const { result } = renderHook(() => useAiPathsRuntimeState());

    act(() => {
      result.current.setNodeStatus({
        nodeId: 'node-fetcher',
        status: 'pending',
        source: 'server',
      });
    });

    act(() => {
      result.current.setNodeStatus({
        nodeId: 'node-fetcher',
        status: 'processing',
        source: 'server',
      });
    });

    expect(result.current.runtimeNodeStatuses['node-fetcher']).toBe('processing');
  });

  it('maps blocked missing-input metadata to waiting_callback status', () => {
    const { result } = renderHook(() => useAiPathsRuntimeState());

    act(() => {
      result.current.setNodeStatus({
        nodeId: 'node-db',
        status: 'blocked',
        source: 'server',
        metadata: {
          reason: 'missing_inputs',
        },
      });
    });

    expect(result.current.runtimeNodeStatuses['node-db']).toBe('waiting_callback');
  });

  it('maps blocked status with waiting ports metadata and no reason to waiting_callback', () => {
    const { result } = renderHook(() => useAiPathsRuntimeState());

    act(() => {
      result.current.setNodeStatus({
        nodeId: 'node-model',
        status: 'blocked',
        source: 'server',
        metadata: {
          waitingOnPorts: ['prompt'],
        },
      });
    });

    expect(result.current.runtimeNodeStatuses['node-model']).toBe('waiting_callback');
  });

  it('keeps blocked status when blocked reason is not missing_inputs', () => {
    const { result } = renderHook(() => useAiPathsRuntimeState());

    act(() => {
      result.current.setNodeStatus({
        nodeId: 'node-model',
        status: 'blocked',
        source: 'server',
        metadata: {
          reason: 'missing_prompt',
          waitingOnPorts: ['prompt'],
        },
      });
    });

    expect(result.current.runtimeNodeStatuses['node-model']).toBe('blocked');
  });

  it('does not settle blocked or skipped node statuses', () => {
    const { result } = renderHook(() => useAiPathsRuntimeState());

    act(() => {
      result.current.setNodeStatus({
        nodeId: 'node-blocked',
        status: 'blocked',
        source: 'server',
      });
      result.current.setNodeStatus({
        nodeId: 'node-skipped',
        status: 'skipped',
        source: 'server',
      });
    });

    act(() => {
      result.current.settleTransientNodeStatuses('completed', {}, { settleQueued: true });
    });

    expect(result.current.runtimeNodeStatuses['node-blocked']).toBe('blocked');
    expect(result.current.runtimeNodeStatuses['node-skipped']).toBe('skipped');
  });
});
