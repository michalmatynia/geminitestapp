import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCaseResolverStateSelectionActions } from '@/features/case-resolver/hooks/useCaseResolverState.selection-actions';
import {
  createCaseResolverAssetFile,
  parseCaseResolverWorkspace,
} from '@/features/case-resolver/settings';
import type { CaseResolverWorkspaceDebugEvent } from '@/features/case-resolver/workspace-persistence';
import type {
  CaseResolverAssetFile,
  CaseResolverWorkspace,
} from '@/shared/contracts/case-resolver';

const logCaseResolverWorkspaceEventMock = vi.fn();

vi.mock('@/features/case-resolver/workspace-persistence', () => ({
  logCaseResolverWorkspaceEvent: (
    event: Omit<CaseResolverWorkspaceDebugEvent, 'id' | 'timestamp'>
  ) => void logCaseResolverWorkspaceEventMock(event),
}));

const createWorkspace = (): CaseResolverWorkspace => ({
  ...parseCaseResolverWorkspace(null),
  assets: [
    createCaseResolverAssetFile({
      id: 'asset-1',
      name: 'Node Asset',
      folder: '',
      kind: 'node_file',
      textContent: '{"kind":"case_resolver_node_file_snapshot_v1"}',
    }),
  ],
});

describe('useCaseResolverStateSelectionActions', () => {
  it('uses default tree toast options when no explicit options are provided', () => {
    const workspace = createWorkspace();
    const updateWorkspace = vi.fn();

    const { result } = renderHook(() =>
      useCaseResolverStateSelectionActions({
        workspace,
        selectedAssetId: 'asset-1',
        updateWorkspace,
        treeSaveToast: 'Case Resolver tree changes saved.',
      })
    );

    act(() => {
      result.current.handleUpdateSelectedAsset({ description: 'Updated description' });
    });

    expect(updateWorkspace).toHaveBeenCalledTimes(1);
    expect(updateWorkspace.mock.calls[0]?.[1]).toEqual({
      persistToast: 'Case Resolver tree changes saved.',
    });
    const updater = updateWorkspace.mock.calls[0]?.[0] as
      | ((current: CaseResolverWorkspace) => CaseResolverWorkspace)
      | undefined;
    expect(typeof updater).toBe('function');
    const updatedWorkspace = updater?.(workspace) ?? workspace;
    const updatedAsset = (updatedWorkspace.assets ?? []).find(
      (asset: CaseResolverAssetFile) => asset.id === 'asset-1'
    );
    expect(updatedAsset?.description).toBe('Updated description');
  });

  it('respects explicit persistence options for node file manual save', () => {
    const workspace = createWorkspace();
    const updateWorkspace = vi.fn();

    const { result } = renderHook(() =>
      useCaseResolverStateSelectionActions({
        workspace,
        selectedAssetId: 'asset-1',
        updateWorkspace,
        treeSaveToast: 'Case Resolver tree changes saved.',
      })
    );

    const options = {
      persistNow: true,
      persistToast: 'Node file updated.',
      source: 'node_file_manual_save',
    } as const;

    act(() => {
      result.current.handleUpdateSelectedAsset({ textContent: 'updated snapshot' }, options);
    });

    expect(updateWorkspace).toHaveBeenCalledTimes(1);
    expect(updateWorkspace.mock.calls[0]?.[1]).toEqual(options);
    expect(logCaseResolverWorkspaceEventMock).toHaveBeenCalledTimes(1);
    expect(logCaseResolverWorkspaceEventMock.mock.calls[0]?.[0]).toMatchObject({
      source: 'node_file_manual_save',
      action: 'node_file_snapshot_manual_save',
    });
  });
});
