import { useEffect, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
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

  it('routes undo shortcut to the currently focused instance across multiple registrations', async () => {
    const undoCalls: string[] = [];

    const MultiUndoProbe = () => {
      const runtime = useMasterFolderTreeRuntime();
      const runtimeRef = useRef(runtime);
      const undoCallsRef = useRef(undoCalls);

      runtimeRef.current = runtime;
      undoCallsRef.current = undoCalls;

      useEffect(() => {
        const currentRuntime = runtimeRef.current;
        const unregisterAlpha = currentRuntime.registerInstance({
          id: 'undo-alpha',
          getNodeCount: () => 1,
          canUndo: () => true,
          undo: () => {
            undoCallsRef.current.push('alpha');
          },
        });
        const unregisterBeta = currentRuntime.registerInstance({
          id: 'undo-beta',
          getNodeCount: () => 1,
          canUndo: () => true,
          undo: () => {
            undoCallsRef.current.push('beta');
          },
        });
        currentRuntime.setFocusedInstance('undo-alpha');

        return (): void => {
          unregisterAlpha();
          unregisterBeta();
        };
      }, []);

      return (
        <button
          type='button'
          data-testid='focus-beta'
          onClick={() => {
            runtime.setFocusedInstance('undo-beta');
          }}
        >
          focus beta
        </button>
      );
    };

    const { getByTestId } = render(
      <MasterFolderTreeRuntimeProvider>
        <MultiUndoProbe />
      </MasterFolderTreeRuntimeProvider>
    );

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    await waitFor(() => {
      expect(undoCalls).toEqual(['alpha']);
    });

    fireEvent.click(getByTestId('focus-beta'));
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    await waitFor(() => {
      expect(undoCalls).toEqual(['alpha', 'beta']);
    });
  });

  it('dispatches keyboard handlers only for the focused instance', async () => {
    const alphaHandler = vi.fn();
    const betaHandler = vi.fn();

    const KeyboardProbe = () => {
      const runtime = useMasterFolderTreeRuntime();
      const runtimeRef = useRef(runtime);
      const alphaHandlerRef = useRef(alphaHandler);
      const betaHandlerRef = useRef(betaHandler);

      runtimeRef.current = runtime;
      alphaHandlerRef.current = alphaHandler;
      betaHandlerRef.current = betaHandler;

      useEffect(() => {
        const currentRuntime = runtimeRef.current;
        const unregisterAlpha = currentRuntime.registerInstance({
          id: 'keyboard-alpha',
          getNodeCount: () => 1,
        });
        const unregisterBeta = currentRuntime.registerInstance({
          id: 'keyboard-beta',
          getNodeCount: () => 1,
        });
        const unregisterAlphaHandler = currentRuntime.registerKeyboardHandler(
          'keyboard-alpha',
          () => {
            alphaHandlerRef.current();
          }
        );
        const unregisterBetaHandler = currentRuntime.registerKeyboardHandler(
          'keyboard-beta',
          () => {
            betaHandlerRef.current();
          }
        );
        currentRuntime.setFocusedInstance('keyboard-alpha');

        return (): void => {
          unregisterAlphaHandler();
          unregisterBetaHandler();
          unregisterAlpha();
          unregisterBeta();
        };
      }, []);

      return (
        <button
          type='button'
          data-testid='focus-keyboard-beta'
          onClick={() => runtime.setFocusedInstance('keyboard-beta')}
        >
          focus keyboard beta
        </button>
      );
    };

    const { getByTestId } = render(
      <MasterFolderTreeRuntimeProvider>
        <KeyboardProbe />
      </MasterFolderTreeRuntimeProvider>
    );

    fireEvent.keyDown(window, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(alphaHandler).toHaveBeenCalledTimes(1);
      expect(betaHandler).toHaveBeenCalledTimes(0);
    });

    fireEvent.click(getByTestId('focus-keyboard-beta'));
    fireEvent.keyDown(window, { key: 'ArrowDown' });

    await waitFor(() => {
      expect(alphaHandler).toHaveBeenCalledTimes(1);
      expect(betaHandler).toHaveBeenCalledTimes(1);
    });
  });

  it('stores search cache per instance and clears it after unregister', async () => {
    let runtimeRef: ReturnType<typeof useMasterFolderTreeRuntime> | null = null;

    const SearchCacheProbe = () => {
      const runtime = useMasterFolderTreeRuntime();

      useEffect(() => {
        runtimeRef = runtime;
        const unregister = runtime.registerInstance({
          id: 'search-cache-instance',
          getNodeCount: () => 2,
        });
        runtime.setCachedSearchIndex('search-cache-instance', ['node-a', 'node-b']);
        return unregister;
      }, [runtime]);

      return null;
    };

    const rendered = render(
      <MasterFolderTreeRuntimeProvider>
        <SearchCacheProbe />
      </MasterFolderTreeRuntimeProvider>
    );

    await waitFor(() => {
      expect(runtimeRef?.getInstanceIds()).toContain('search-cache-instance');
      expect(runtimeRef?.getCachedSearchIndex('search-cache-instance')).toEqual([
        'node-a',
        'node-b',
      ]);
    });

    rendered.unmount();

    expect(runtimeRef?.getCachedSearchIndex('search-cache-instance')).toBeNull();
    expect(runtimeRef?.getInstanceIds()).not.toContain('search-cache-instance');
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
