import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useAiPathsNodeSwitchConfirm } from '@/features/ai/ai-paths/components/ai-paths-settings/useAiPathsNodeSwitchConfirm';

describe('useAiPathsNodeSwitchConfirm', () => {
  it('returns allow result when config is not dirty/open', async () => {
    const confirm = vi.fn();
    const toast = vi.fn();
    const setNodeConfigDirty = vi.fn();

    const { result } = renderHook(() =>
      useAiPathsNodeSwitchConfirm({
        configOpen: false,
        nodeConfigDirty: false,
        selectedNodeId: 'node-1',
        setNodeConfigDirty,
        confirm,
        toast,
      })
    );

    const decision = await result.current.confirmNodeSwitch('node-2');

    expect(decision).toBe(true);
    expect(confirm).not.toHaveBeenCalled();
    expect(setNodeConfigDirty).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('opens confirmation flow when switching away from a dirty open node config', async () => {
    const confirm = vi.fn();
    const toast = vi.fn();
    const setNodeConfigDirty = vi.fn();

    confirm.mockImplementation(
      (input: {
        onConfirm: () => void;
      }) => {
        input.onConfirm();
      }
    );

    const { result } = renderHook(() =>
      useAiPathsNodeSwitchConfirm({
        configOpen: true,
        nodeConfigDirty: true,
        selectedNodeId: 'node-1',
        setNodeConfigDirty,
        confirm,
        toast,
      })
    );

    const decision = await result.current.confirmNodeSwitch('node-2');

    expect(decision).toBe(true);
    expect(confirm).toHaveBeenCalledTimes(1);
    expect(setNodeConfigDirty).toHaveBeenCalledWith(false);
  });
});
