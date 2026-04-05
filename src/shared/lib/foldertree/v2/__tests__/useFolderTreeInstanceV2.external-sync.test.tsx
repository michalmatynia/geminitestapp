import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useFolderTreeInstanceV2 } from '@/shared/lib/foldertree/v2/hooks/useFolderTreeInstanceV2';
import { createMasterFolderTreeRuntimeBus } from '@/shared/lib/foldertree/v2/runtime/createMasterFolderTreeRuntimeBus';
import type {
  FolderTreeAppliedTransaction,
  FolderTreePreparedTransaction,
  FolderTreeTransaction,
} from '@/shared/lib/foldertree/v2/types';
import type { MasterTreeNode } from '@/shared/utils/master-folder-tree-contract';

const buildNode = (id: string, name: string, parentId: string | null = null): MasterTreeNode => ({
  id,
  type: 'folder',
  kind: 'folder',
  parentId,
  name,
  path: name.toLowerCase(),
  sortOrder: 0,
});

const runtimes: Array<ReturnType<typeof createMasterFolderTreeRuntimeBus>> = [];
const createTestRuntime = () => {
  const runtime = createMasterFolderTreeRuntimeBus({ bindWindowKeydown: false });
  runtimes.push(runtime);
  return runtime;
};

describe('useFolderTreeInstanceV2 external sync replace', () => {
  afterEach(() => {
    while (runtimes.length > 0) {
      runtimes.pop()?.dispose();
    }
  });

  it('rejects adapters that do not implement the V3 transaction contract', () => {
    const initialNodes = [buildNode('folder-a', 'Folder A')];

    expect(() =>
      renderHook(() =>
        useFolderTreeInstanceV2({
          initialNodes,
          adapter: {
            prepare: vi.fn(
              async (tx: FolderTreeTransaction): Promise<FolderTreePreparedTransaction> => ({
                tx,
                preparedAt: Date.now(),
              })
            ),
            apply: vi.fn(
              async (tx: FolderTreeTransaction): Promise<FolderTreeAppliedTransaction> => ({
                tx,
                appliedAt: Date.now(),
              })
            ),
            commit: vi.fn(async () => undefined),

          } as any,
        })
      )
    ).toThrowError(/must implement v3 transaction methods/i);
  });

  it('updates nodes without adapter persistence for external_sync reason', async () => {
    const initialNodes = [buildNode('folder-a', 'Folder A')];
    const nextNodes = [buildNode('folder-b', 'Folder B')];

    const prepare = vi.fn(
      async (tx: FolderTreeTransaction): Promise<FolderTreePreparedTransaction> => ({
        tx,
        preparedAt: Date.now(),
      })
    );
    const apply = vi.fn(
      async (tx: FolderTreeTransaction): Promise<FolderTreeAppliedTransaction> => ({
        tx,
        appliedAt: Date.now(),
      })
    );
    const commit = vi.fn(async () => undefined);
    const rollback = vi.fn(async () => undefined);

    const { result } = renderHook(() =>
      useFolderTreeInstanceV2({
        initialNodes,
        adapter: {
          prepare,
          apply,
          commit,
          rollback,
        },
      })
    );

    await act(async () => {
      await result.current.replaceNodes(nextNodes, 'external_sync');
    });

    expect(result.current.nodes.map((node) => node.id)).toEqual(['folder-b']);
    expect(result.current.isApplying).toBe(false);
    expect(prepare).not.toHaveBeenCalled();
    expect(apply).not.toHaveBeenCalled();
    expect(commit).not.toHaveBeenCalled();
  });

  it('routes focused instance to runtime when selection changes', async () => {
    const initialNodes = [buildNode('folder-a', 'Folder A')];
    const runtime = createTestRuntime();

    const { result } = renderHook(() => {
      const controller = useFolderTreeInstanceV2({
        initialNodes,
        instanceId: 'focus-instance',
        runtime,
      });
      return { controller };
    });

    act(() => {
      result.current.controller.selectNode('folder-a');
    });

    await waitFor(() => {
      expect(runtime.getFocusedInstance()).toBe('focus-instance');
    });
  });

  it('records conflict metric and rolls back when adapter apply fails with conflict', async () => {
    const initialNodes = [buildNode('folder-a', 'Folder A')];
    const nextNodes = [buildNode('folder-b', 'Folder B')];
    const runtime = createTestRuntime();

    const prepare = vi.fn(
      async (tx: FolderTreeTransaction): Promise<FolderTreePreparedTransaction> => ({
        tx,
        preparedAt: Date.now(),
      })
    );
    const conflictError = Object.assign(new Error('conflict during apply'), {
      code: 'CONFLICT',
    });
    const apply = vi.fn(async () => {
      throw conflictError;
    });
    const commit = vi.fn(async () => undefined);
    const rollback = vi.fn(async () => undefined);

    const { result } = renderHook(() => {
      const controller = useFolderTreeInstanceV2({
        initialNodes,
        instanceId: 'conflict-instance',
        adapter: {
          prepare,
          apply,
          commit,
          rollback,
        },
        runtime,
      });
      return { controller };
    });

    let action: Awaited<ReturnType<(typeof result.current.controller)['replaceNodes']>> | undefined;
    await act(async () => {
      action = await result.current.controller.replaceNodes(nextNodes, 'refresh');
    });

    expect(action?.ok).toBe(false);
    expect(result.current.controller.lastError?.code).toBe('PERSIST_FAILED');
    expect(rollback).toHaveBeenCalledTimes(1);
    expect(rollback).toHaveBeenCalledWith(expect.any(Object), 'apply', conflictError);
    expect(runtime.getMetricsSnapshot()['transaction_conflict']).toBe(1);
    expect(runtime.getMetricsSnapshot()['transaction_rollback'] ?? 0).toBe(0);
  });

  it('records rollback metric and rollback stage when adapter commit fails', async () => {
    const initialNodes = [buildNode('folder-a', 'Folder A')];
    const nextNodes = [buildNode('folder-b', 'Folder B')];
    const runtime = createTestRuntime();

    const prepare = vi.fn(
      async (tx: FolderTreeTransaction): Promise<FolderTreePreparedTransaction> => ({
        tx,
        preparedAt: Date.now(),
      })
    );
    const apply = vi.fn(
      async (tx: FolderTreeTransaction): Promise<FolderTreeAppliedTransaction> => ({
        tx,
        appliedAt: Date.now(),
      })
    );
    const commitError = new Error('commit failed');
    const commit = vi.fn(async () => {
      throw commitError;
    });
    const rollback = vi.fn(async () => undefined);

    const { result } = renderHook(() => {
      const controller = useFolderTreeInstanceV2({
        initialNodes,
        instanceId: 'rollback-instance',
        adapter: {
          prepare,
          apply,
          commit,
          rollback,
        },
        runtime,
      });
      return { controller };
    });

    await act(async () => {
      await result.current.controller.replaceNodes(nextNodes, 'refresh');
    });

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(rollback).toHaveBeenCalledWith(expect.any(Object), 'commit', commitError);
    expect(runtime.getMetricsSnapshot()['transaction_rollback']).toBe(1);
    expect(runtime.getMetricsSnapshot()['transaction_conflict'] ?? 0).toBe(0);
  });

  it('cleans up runtime registrations under repeated mount and unmount churn', async () => {
    const initialNodes = [buildNode('folder-a', 'Folder A')];
    const runtime = createTestRuntime();

    for (let index = 0; index < 20; index += 1) {
      const instanceId = `churn-instance-${index}`;
      const rendered = renderHook(() =>
        useFolderTreeInstanceV2({
          initialNodes,
          instanceId,
          runtime,
        })
      );

      act(() => {
        rendered.result.current.selectNode('folder-a');
      });

      await waitFor(() => {
        expect(runtime.getInstanceIds()).toContain(instanceId);
        expect(runtime.getFocusedInstance()).toBe(instanceId);
      });

      rendered.unmount();

      await waitFor(() => {
        expect(runtime.getInstanceIds()).not.toContain(instanceId);
      });
    }

    expect(runtime.getInstanceIds()).toEqual([]);
  });
});
