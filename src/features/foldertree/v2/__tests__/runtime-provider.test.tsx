import { useEffect } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, waitFor } from '@testing-library/react';

import {
  MasterFolderTreeRuntimeProvider,
  useMasterFolderTreeRuntime,
} from '@/features/foldertree/v2/runtime/MasterFolderTreeRuntimeProvider';

const RuntimeProbe = ({ onSnapshot }: { onSnapshot: (value: Record<string, number>) => void }) => {
  const runtime = useMasterFolderTreeRuntime();

  useEffect(() => {
    const unregister = runtime.registerInstance({
      id: 'probe',
      getNodeCount: () => 3,
    });

    runtime.recordMetric('row_rerender', 2);
    runtime.recordMetric('frame_budget_miss', 1);
    runtime.setFocusedInstance('probe');
    onSnapshot(runtime.getMetricsSnapshot());

    return unregister;
  }, [onSnapshot, runtime]);

  return null;
};

describe('MasterFolderTreeRuntimeProvider', () => {
  it('tracks instances and metrics', async () => {
    let snapshot: Record<string, number> | null = null;

    render(
      <MasterFolderTreeRuntimeProvider>
        <RuntimeProbe
          onSnapshot={(value) => {
            snapshot = value;
          }}
        />
      </MasterFolderTreeRuntimeProvider>
    );

    await waitFor(() => {
      expect(snapshot).not.toBeNull();
      expect((snapshot?.['row_rerender'] ?? 0) >= 2).toBe(true);
      expect((snapshot?.['frame_budget_miss'] ?? 0) >= 1).toBe(true);
    });
  });

  it('forwards Cmd/Ctrl+Z to focused instance undo handler', async () => {
    const undoCalls: string[] = [];
    const UndoProbe = () => {
      const runtime = useMasterFolderTreeRuntime();
      useEffect(() => {
        const unregister = runtime.registerInstance({
          id: 'undo-target',
          getNodeCount: () => 1,
          canUndo: () => true,
          undo: () => {
            undoCalls.push('undo');
          },
        });
        runtime.setFocusedInstance('undo-target');
        return unregister;
      }, [runtime]);
      return null;
    };

    render(
      <MasterFolderTreeRuntimeProvider>
        <UndoProbe />
      </MasterFolderTreeRuntimeProvider>
    );

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    await waitFor(() => {
      expect(undoCalls).toEqual(['undo']);
    });
  });

  it('does not hijack undo shortcut while typing in input', async () => {
    const undoCalls: string[] = [];
    const InputProbe = () => {
      const runtime = useMasterFolderTreeRuntime();
      useEffect(() => {
        const unregister = runtime.registerInstance({
          id: 'undo-input-target',
          getNodeCount: () => 1,
          canUndo: () => true,
          undo: () => {
            undoCalls.push('undo');
          },
        });
        runtime.setFocusedInstance('undo-input-target');
        return unregister;
      }, [runtime]);
      return <input data-testid='undo-input' defaultValue='abc' />;
    };

    const { getByTestId } = render(
      <MasterFolderTreeRuntimeProvider>
        <InputProbe />
      </MasterFolderTreeRuntimeProvider>
    );

    const input = getByTestId('undo-input');
    input.focus();
    fireEvent.keyDown(input, { key: 'z', ctrlKey: true });

    await waitFor(() => {
      expect(undoCalls).toEqual([]);
    });
  });
});
