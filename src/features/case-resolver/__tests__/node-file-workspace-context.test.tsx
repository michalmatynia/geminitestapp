// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { NodeFileWorkspaceContextValue } from '@/features/case-resolver/components/NodeFileWorkspaceContext';
import {
  NodeFileWorkspaceProvider,
  useNodeFileWorkspaceActionsContext,
  useNodeFileWorkspaceStateContext,
} from '@/features/case-resolver/components/NodeFileWorkspaceContext';

const createNodeFileWorkspaceValue = (): NodeFileWorkspaceContextValue =>
  ({
    addNode: vi.fn(),
    assetId: 'asset-1',
    assetName: 'Asset One',
    canvasHostRef: { current: null },
    canvasRef: { current: null },
    compiled: {} as never,
    configOpen: false,
    documentSearchQuery: '',
    documentSearchRef: { current: null },
    documentSearchRows: [],
    documentSearchScope: 'all',
    edgeMetaByEdge: {},
    edges: [],
    filesById: new Map(),
    handleManualSave: vi.fn(),
    isLinkedPreviewOpen: false,
    isNodeInspectorOpen: false,
    isSidePanelVisible: true,
    newNodeType: 'prompt',
    nodeMetaByNode: {},
    nodes: [],
    onSelectFile: vi.fn(),
    selectedEdgeId: null,
    selectedFile: null,
    selectedNode: null,
    selectedNodeFileMeta: null,
    selectedNodeId: null,
    selectedNodeMeta: null,
    selectNode: vi.fn(),
    setConfigOpen: vi.fn(),
    setDocumentSearchQuery: vi.fn(),
    setDocumentSearchScope: vi.fn(),
    setEdges: vi.fn(),
    setIsLinkedPreviewOpen: vi.fn(),
    setIsNodeInspectorOpen: vi.fn(),
    setIsSidePanelVisible: vi.fn(),
    setNewNodeType: vi.fn(),
    setNodeFileMeta: vi.fn(),
    setNodes: vi.fn(),
    setShowNodeSelectorUnderCanvas: vi.fn(),
    setView: vi.fn(),
    showNodeSelectorUnderCanvas: false,
    updateNode: vi.fn(),
    view: { scale: 1, x: 0, y: 0 },
    viewportRef: { current: null },
    visibleDocumentSearchRows: [],
  }) as unknown as NodeFileWorkspaceContextValue;

describe('NodeFileWorkspaceContext', () => {
  it('provides split state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NodeFileWorkspaceProvider value={createNodeFileWorkspaceValue()}>
        {children}
      </NodeFileWorkspaceProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useNodeFileWorkspaceActionsContext(),
        state: useNodeFileWorkspaceStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      assetId: 'asset-1',
      assetName: 'Asset One',
      configOpen: false,
      documentSearchQuery: '',
      isSidePanelVisible: true,
      newNodeType: 'prompt',
    });
    expect(result.current.actions.addNode).toBeTypeOf('function');
    expect(result.current.actions.setView).toBeTypeOf('function');
    expect(result.current.actions.handleManualSave).toBeTypeOf('function');
  });
});
