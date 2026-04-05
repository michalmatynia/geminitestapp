import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/case-resolver/../ai-paths-core';
import type { CaseResolverNodeFileSnapshot } from '@/shared/contracts/case-resolver/graph';
import type {
  CaseResolverPageActionsValue,
  CaseResolverPageStateValue,
} from '@/features/case-resolver/context/CaseResolverPageContext';
import { parseCaseResolverWorkspace } from '@/features/case-resolver/settings';
import { useNodeFileWorkspaceState } from '@/features/case-resolver/hooks/useNodeFileWorkspaceState';

let graphNodes: AiNode[] = [];
let graphEdges: Array<Record<string, unknown>> = [];

const addNodeMock = vi.fn();
const setNodesMock = vi.fn((next: AiNode[]) => {
  graphNodes = next;
});
const updateNodeMock = vi.fn();
const setEdgesMock = vi.fn((next: Array<Record<string, unknown>>) => {
  graphEdges = next;
});
const selectNodeMock = vi.fn();
const setConfigOpenMock = vi.fn();
const setViewMock = vi.fn();
const logCaseResolverWorkspaceEventMock = vi.fn();
const graphActionsMock = {
  addNode: addNodeMock,
  setNodes: setNodesMock,
  updateNode: updateNodeMock,
  setEdges: setEdgesMock,
};

vi.mock('@/features/case-resolver/workspace-persistence', () => ({
  logCaseResolverWorkspaceEvent: (...args: unknown[]) =>
    void logCaseResolverWorkspaceEventMock(...args),
}));

vi.mock('@/features/case-resolver/context/CaseResolverPageContext', () => ({
  useCaseResolverPageState: (): Partial<CaseResolverPageStateValue> => ({
    workspace: parseCaseResolverWorkspace(null),
    activeCaseId: null,
    caseResolverIdentifiers: [],
  }),
  useCaseResolverPageActions: (): Partial<CaseResolverPageActionsValue> => ({
    onSelectFile: vi.fn(),
  }),
}));

vi.mock('@/features/case-resolver/relation-search/hooks/useDocumentRelationSearch', () => ({
  useDocumentRelationSearch: () => ({
    documentSearchScope: 'case_scope',
    setDocumentSearchScope: vi.fn(),
    documentSearchQuery: '',
    setDocumentSearchQuery: vi.fn(),
    caseIdentifierLabelById: new Map(),
    documentSearchRows: [],
    visibleDocumentSearchRows: [],
    relationTreeNodes: [],
    relationTreeLookup: {
      fileRowByNodeId: new Map(),
      fileNodeIdByFileId: new Map(),
      caseMetaByNodeId: new Map(),
      folderMetaByNodeId: new Map(),
    },
  }),
}));

vi.mock('@/features/ai/public', () => ({
  useCanvasRefs: () => ({
    viewportRef: { current: null },
    canvasRef: { current: null },
  }),
  useCanvasState: () => ({
    view: { x: 0, y: 0, scale: 1 },
  }),
  useCanvasActions: () => {
    const canvasActions = {
      setView: setViewMock,
    };
    return canvasActions;
  },
  useGraphState: () => ({
    nodes: graphNodes,
    edges: graphEdges,
  }),
  useGraphActions: () => graphActionsMock,
  useSelectionState: () => ({
    selectedNodeId: null,
    selectedEdgeId: null,
    configOpen: false,
  }),
  useSelectionActions: () => ({
    selectNode: selectNodeMock,
    setConfigOpen: setConfigOpenMock,
  }),
}));

const createPromptNode = (id: string, x: number): AiNode => ({
  id,
  type: 'prompt',
  title: 'Prompt',
  description: '',
  inputs: ['input'],
  outputs: ['output'],
  position: { x, y: 0 },
  config: {
    prompt: {
      template: 'Test',
    },
  },
});

const createSnapshot = (): CaseResolverNodeFileSnapshot => ({
  kind: 'case_resolver_node_file_snapshot_v2',
  nodes: [createPromptNode('node-1', 0)],
  edges: [],
  nodeMeta: {},
  edgeMeta: {},
  nodeFileMeta: {},
});

describe('useNodeFileWorkspaceState manual snapshot persistence', () => {
  beforeEach(() => {
    graphNodes = [createPromptNode('node-1', 0)];
    graphEdges = [];
    addNodeMock.mockReset();
    setNodesMock.mockReset();
    updateNodeMock.mockReset();
    setEdgesMock.mockReset();
    selectNodeMock.mockReset();
    setConfigOpenMock.mockReset();
    setViewMock.mockReset();
    logCaseResolverWorkspaceEventMock.mockReset();
  });

  it('does not autosave on graph mutation and only persists on manual save', async () => {
    const onSnapshotChange = vi.fn(async () => true);
    const snapshot = createSnapshot();

    const { result, rerender } = renderHook(() =>
      useNodeFileWorkspaceState({
        assetId: 'asset-1',
        assetName: 'Node File',
        snapshot,
        onSnapshotChange,
      })
    );

    expect(onSnapshotChange).not.toHaveBeenCalled();
    expect(result.current.hasPendingSnapshotChanges).toBe(false);

    graphNodes = [createPromptNode('node-1', 120)];
    rerender();

    expect(onSnapshotChange).not.toHaveBeenCalled();
    expect(result.current.hasPendingSnapshotChanges).toBe(true);

    await act(async () => {
      result.current.handleManualSave();
      await Promise.resolve();
    });

    expect(onSnapshotChange).toHaveBeenCalledTimes(1);
  });

  it('keeps pending snapshot changes when manual save fails', async () => {
    const onSnapshotChange = vi.fn(async () => false);
    const snapshot = createSnapshot();

    const { result, rerender } = renderHook(() =>
      useNodeFileWorkspaceState({
        assetId: 'asset-1',
        assetName: 'Node File',
        snapshot,
        onSnapshotChange,
      })
    );

    graphNodes = [createPromptNode('node-1', 120)];
    rerender();

    await act(async () => {
      result.current.handleManualSave();
      await Promise.resolve();
    });

    expect(onSnapshotChange).toHaveBeenCalledTimes(1);
    expect(result.current.hasPendingSnapshotChanges).toBe(true);
  });

  it('clears pending snapshot changes after successful manual save', async () => {
    const onSnapshotChange = vi.fn(async () => true);
    const snapshot = createSnapshot();

    const { result, rerender } = renderHook(() =>
      useNodeFileWorkspaceState({
        assetId: 'asset-1',
        assetName: 'Node File',
        snapshot,
        onSnapshotChange,
      })
    );

    graphNodes = [createPromptNode('node-1', 120)];
    rerender();

    await act(async () => {
      result.current.handleManualSave();
      await Promise.resolve();
    });

    expect(onSnapshotChange).toHaveBeenCalledTimes(1);
    expect(onSnapshotChange.mock.calls[0]?.[1]).toEqual({
      persistNow: true,
      persistToast: 'Node file updated.',
      source: 'node_file_manual_save',
    });

    expect(result.current.canvasHostRef).not.toBe(result.current.viewportRef);
    expect(result.current.canvasHostRef.current).toBeNull();

    rerender();
    expect(result.current.hasPendingSnapshotChanges).toBe(false);
  });
});
