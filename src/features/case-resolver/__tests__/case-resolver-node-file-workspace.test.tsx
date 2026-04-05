import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CaseResolverNodeFileWorkspace } from '@/features/case-resolver/components/CaseResolverNodeFileWorkspace';
import type { CaseResolverNodeFileSnapshot } from '@/shared/contracts/case-resolver/graph';

const setIsNodeInspectorOpenMock = vi.fn();
const setConfigOpenMock = vi.fn();
const handleManualSaveMock = vi.fn();
const onUpdateSelectedAssetMock = vi.fn();
const fetchCaseResolverNodeFileSnapshotMock = vi.fn(async () => null);
const persistCaseResolverNodeFileSnapshotMock = vi.fn(async () => true);

const snapshot: CaseResolverNodeFileSnapshot = {
  kind: 'case_resolver_node_file_snapshot_v2',
  nodes: [],
  edges: [],
  nodeMeta: {},
  edgeMeta: {},
  nodeFileMeta: {},
};

let workspaceStateMock: Record<string, unknown>;
let lastUseNodeFileWorkspaceStateProps: Record<string, unknown> | null = null;

vi.mock('@/features/case-resolver/context/CaseResolverPageContext', () => ({
  useCaseResolverPageState: () => ({
    selectedAsset: {
      id: 'asset-node-file',
      kind: 'node_file',
      name: 'Node File',
      textContent: 'snapshot',
    },
  }),
  useCaseResolverPageActions: () => ({
    onUpdateSelectedAsset: onUpdateSelectedAssetMock,
  }),
}));

vi.mock('@/features/case-resolver/settings', () => ({
  createEmptyNodeFileSnapshot: () => snapshot,
}));

vi.mock('@/features/case-resolver/workspace-persistence', () => ({
  fetchCaseResolverNodeFileSnapshot: (...args: unknown[]) =>
    fetchCaseResolverNodeFileSnapshotMock(...args),
  persistCaseResolverNodeFileSnapshot: (...args: unknown[]) =>
    persistCaseResolverNodeFileSnapshotMock(...args),
}));

vi.mock('@/features/ai/public', () => ({
  CanvasBoard: () => <div data-testid='canvas-board'>Canvas</div>,
  AiPathsProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/case-resolver/hooks/useNodeFileWorkspaceState', () => ({
  useNodeFileWorkspaceState: (props: Record<string, unknown>) => {
    lastUseNodeFileWorkspaceStateProps = props;
    return workspaceStateMock;
  },
}));

vi.mock('@/features/case-resolver/components/NodeFileDocumentSearchPanel', () => ({
  NodeFileDocumentSearchPanel: () => <div data-testid='node-file-document-search-panel' />,
}));

vi.mock('@/features/case-resolver/components/NodeFilePanel', () => ({
  NodeFilePanel: () => <div data-testid='node-file-panel' />,
}));

vi.mock('@/features/case-resolver/components/CaseResolverNodeInspectorModal', () => ({
  CaseResolverNodeInspectorModal: () => <div data-testid='node-inspector-modal' />,
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) => (
    <button {...props}>{children}</button>
  ),
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  ),
  EmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  ),
  CompactEmptyState: ({ title, description }: { title: string; description?: string }) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  ),
  Badge: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Chip: ({ label, onClick }: { label: React.ReactNode; onClick?: () => void }) => (
    <button type='button' onClick={onClick}>
      {label}
    </button>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useToast: () => ({ toast: vi.fn() }),
}));

const createWorkspaceState = (
  overrides: Partial<Record<string, unknown>> = {}
): Record<string, unknown> => ({
  assetId: 'asset-node-file',
  assetName: 'Node File',
  nodes: [
    {
      id: 'node-1',
      type: 'prompt',
      title: 'Prompt Node',
      description: '',
      inputs: [],
      outputs: [],
      position: { x: 0, y: 0 },
      config: {},
    },
  ],
  edges: [],
  selectedNodeId: 'node-1',
  selectedEdgeId: null,
  configOpen: false,
  newNodeType: 'prompt',
  setNewNodeType: vi.fn(),
  isSidePanelVisible: false,
  setIsSidePanelVisible: vi.fn(),
  isNodeInspectorOpen: false,
  setIsNodeInspectorOpen: setIsNodeInspectorOpenMock,
  isLinkedPreviewOpen: false,
  setIsLinkedPreviewOpen: vi.fn(),
  showNodeSelectorUnderCanvas: true,
  setShowNodeSelectorUnderCanvas: vi.fn(),
  documentSearchScope: 'case_scope',
  setDocumentSearchScope: vi.fn(),
  documentSearchQuery: '',
  setDocumentSearchQuery: vi.fn(),
  nodeMetaByNode: {},
  edgeMetaByEdge: {},
  filesById: new Map(),
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
  compiled: {
    segments: [],
    combinedContent: '',
    prompt: '',
    outputsByNode: {},
    warnings: [],
  },
  selectedNode: null,
  selectedNodeMeta: null,
  selectedNodeFileMeta: null,
  selectedFile: null,
  handleManualSave: handleManualSaveMock,
  selectNode: vi.fn(),
  setConfigOpen: setConfigOpenMock,
  addNode: vi.fn(),
  updateNode: vi.fn(),
  setNodeFileMeta: vi.fn(),
  setNodes: vi.fn(),
  setEdges: vi.fn(),
  setView: vi.fn(),
  view: { x: 0, y: 0, scale: 1 },
  canvasHostRef: { current: null },
  viewportRef: { current: null },
  canvasRef: { current: null },
  onSelectFile: vi.fn(),
  documentSearchRef: { current: null },
  hasPendingSnapshotChanges: false,
  ...overrides,
});

describe('CaseResolverNodeFileWorkspace', () => {
  beforeEach(() => {
    setIsNodeInspectorOpenMock.mockReset();
    setConfigOpenMock.mockReset();
    handleManualSaveMock.mockReset();
    onUpdateSelectedAssetMock.mockReset();
    fetchCaseResolverNodeFileSnapshotMock.mockReset();
    fetchCaseResolverNodeFileSnapshotMock.mockResolvedValue(null);
    persistCaseResolverNodeFileSnapshotMock.mockReset();
    persistCaseResolverNodeFileSnapshotMock.mockResolvedValue(true);
    lastUseNodeFileWorkspaceStateProps = null;
    workspaceStateMock = createWorkspaceState();
  });

  it('bridges shared config-open state into the node inspector modal flow', async () => {
    workspaceStateMock = createWorkspaceState({ configOpen: true });

    render(<CaseResolverNodeFileWorkspace />);

    await waitFor(() => {
      expect(setIsNodeInspectorOpenMock).toHaveBeenCalledWith(true);
      expect(setConfigOpenMock).toHaveBeenCalledWith(false);
    });
  });

  it('renders nodefile controls and preserves manual save behavior', async () => {
    workspaceStateMock = createWorkspaceState({ hasPendingSnapshotChanges: true });

    render(<CaseResolverNodeFileWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
    const saveButton = screen.getByRole('button', { name: /save map/i });
    const inspectorButton = screen.getByRole('button', { name: /open inspector/i });

    expect(saveButton).toBeEnabled();
    expect(inspectorButton).toBeEnabled();

    fireEvent.click(saveButton);
    fireEvent.click(inspectorButton);

    expect(handleManualSaveMock).toHaveBeenCalledTimes(1);
    expect(setIsNodeInspectorOpenMock).toHaveBeenCalledWith(true);
  });

  it('keeps the canvas visible and shows the empty-state guidance without hiding the board', async () => {
    workspaceStateMock = createWorkspaceState({ nodes: [], selectedNodeId: null });

    render(<CaseResolverNodeFileWorkspace />);

    await waitFor(() => {
      expect(screen.getByTestId('canvas-board')).toBeInTheDocument();
      expect(screen.getByText('Empty canvas')).toBeInTheDocument();
      expect(screen.getByText('All changes saved')).toBeInTheDocument();
    });
  });

  it('prefers a keyed snapshot when one is available', async () => {
    fetchCaseResolverNodeFileSnapshotMock.mockResolvedValueOnce({
      ...snapshot,
      nodes: [],
      edges: [{ id: 'edge-1' }],
    });

    render(<CaseResolverNodeFileWorkspace />);

    await waitFor(() => {
      expect(fetchCaseResolverNodeFileSnapshotMock).toHaveBeenCalledWith(
        'asset-node-file',
        8_000,
        'node_file_workspace_load'
      );
      expect(lastUseNodeFileWorkspaceStateProps?.snapshot).toMatchObject({
        edges: [{ id: 'edge-1' }],
      });
    });
  });

  it('does not fall back to inline node-file snapshot text when keyed storage is empty', async () => {
    render(<CaseResolverNodeFileWorkspace />);

    await waitFor(() => {
      expect(fetchCaseResolverNodeFileSnapshotMock).toHaveBeenCalledWith(
        'asset-node-file',
        8_000,
        'node_file_workspace_load'
      );
      expect(lastUseNodeFileWorkspaceStateProps?.snapshot).toEqual(snapshot);
    });
  });

  it('surfaces keyed snapshot validation failures instead of silently loading defaults', async () => {
    fetchCaseResolverNodeFileSnapshotMock.mockRejectedValueOnce(
      new Error('Case Resolver node-file snapshot payload includes unsupported fields.')
    );

    render(<CaseResolverNodeFileWorkspace />);

    await waitFor(() => {
      expect(screen.getByText('Invalid node file snapshot')).toBeInTheDocument();
      expect(
        screen.getByText('Case Resolver node-file snapshot payload includes unsupported fields.')
      ).toBeInTheDocument();
      expect(screen.queryByTestId('canvas-board')).not.toBeInTheDocument();
    });
  });
});
