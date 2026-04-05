import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { DataContractNodeIssueSummary } from '@/shared/lib/ai-paths/core/utils/data-contract-preflight';
import type { AiNode, RuntimeState } from '@/shared/lib/ai-paths';

import { CanvasBoardUIProvider, type CanvasBoardUIContextValue } from '../CanvasBoardUIContext';
import { renderNodeDiagnosticsTooltipContent } from '../CanvasBoard.utils';
import { CanvasMinimap } from '../canvas-minimap';
import { CanvasSvgNodeLayer } from '../canvas-svg-node-layer';

const baseRuntimeState: RuntimeState = {
  status: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  variables: {},
  events: [],
  inputs: {},
  outputs: {},
};

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: 'node-1',
    type: 'template',
    title: 'Node 1',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 20, y: 20 },
    data: {},
    ...patch,
  }) as AiNode;

const buildContextValue = (
  nodeDiagnosticsById: Record<string, DataContractNodeIssueSummary>,
  handlers?: {
    onNodeDiagnosticsHover?: CanvasBoardUIContextValue['onNodeDiagnosticsHover'];
    onNodeDiagnosticsLeave?: CanvasBoardUIContextValue['onNodeDiagnosticsLeave'];
    onSelectNode?: CanvasBoardUIContextValue['onSelectNode'];
    onOpenNodeConfig?: CanvasBoardUIContextValue['onOpenNodeConfig'];
    consumeSuppressedNodeClick?: CanvasBoardUIContextValue['consumeSuppressedNodeClick'];
    openNodeConfigOnSingleClick?: boolean;
    node?: AiNode;
  }
): CanvasBoardUIContextValue => {
  const node = handlers?.node ?? buildNode({});
  return {
    view: { x: 0, y: 0, scale: 1 },
    viewportSize: { width: 1200, height: 800 },
    detailLevel: 'full',
    nodes: [node],
    edges: [],
    edgePaths: [],
    edgeMetaMap: new Map(),
    nodeById: new Map([[node.id, node]]),
    edgeRoutingMode: 'bezier',
    connecting: null,
    connectingPos: null,
    selectedNodeId: null,
    selectedNodeIdSet: new Set(),
    selectedEdgeId: null,
    runtimeState: baseRuntimeState,
    runtimeNodeStatuses: {},
    runtimeRunStatus: 'idle',
    nodeDurations: {},
    zoomTo: vi.fn(),
    fitToNodes: vi.fn(),
    fitToSelection: vi.fn(),
    resetView: vi.fn(),
    centerOnCanvasPoint: vi.fn(),
    nodeDiagnosticsById,
    inputPulseNodes: new Set(),
    outputPulseNodes: new Set(),
    activeEdgeIds: new Set(),
    triggerConnected: new Set(),
    wireFlowEnabled: false,
    flowingIntensity: 'low',
    reduceVisualEffects: false,
    enableNodeAnimations: false,
    connectorHitTargetPx: 14,
    openNodeConfigOnSingleClick: handlers?.openNodeConfigOnSingleClick ?? false,
    hoveredConnectorKey: null,
    pinnedConnectorKey: null,
    setHoveredConnectorKey: vi.fn(),
    setPinnedConnectorKey: vi.fn(),
    onConnectorHover: vi.fn(),
    onConnectorLeave: vi.fn(),
    onNodeDiagnosticsHover: handlers?.onNodeDiagnosticsHover,
    onNodeDiagnosticsLeave: handlers?.onNodeDiagnosticsLeave,
    onFocusNodeDiagnostics: vi.fn(),
    onPointerDownNode: vi.fn(),
    onPointerMoveNode: vi.fn(),
    onPointerUpNode: vi.fn(),
    consumeSuppressedNodeClick: handlers?.consumeSuppressedNodeClick ?? vi.fn(() => false),
    onSelectNode: handlers?.onSelectNode ?? vi.fn(),
    onOpenNodeConfig: handlers?.onOpenNodeConfig ?? vi.fn(),
    onStartConnection: vi.fn(),
    onCompleteConnection: vi.fn(),
    onReconnectInput: vi.fn(),
    onDisconnectPort: vi.fn(),
    onFireTrigger: vi.fn(),
    onRemoveEdge: vi.fn(),
    onSelectEdge: vi.fn(),
  };
};

describe('Canvas node diagnostics badges', () => {
  it('renders severity badge and emits tooltip hover payload', () => {
    const hoverSpy = vi.fn();
    const summary: DataContractNodeIssueSummary = {
      errors: 1,
      warnings: 0,
      issues: [
        {
          id: 'issue-1',
          nodeId: 'node-1',
          nodeType: 'template',
          nodeTitle: 'Node 1',
          severity: 'error',
          code: 'database_scalar_identity_expected',
          message: 'Expected scalar entityId but got object.',
          recommendation: 'Map bundle.EntityID to entityId.',
          port: 'entityId',
        },
      ],
    };

    const value = buildContextValue({ 'node-1': summary }, { onNodeDiagnosticsHover: hoverSpy });

    const { container } = render(
      <svg>
        <CanvasBoardUIProvider value={value}>
          <CanvasSvgNodeLayer />
        </CanvasBoardUIProvider>
      </svg>
    );

    expect(screen.getByText('E1')).toBeTruthy();
    const badge = container.querySelector('[data-node-diagnostics-badge="node-1"]');
    expect(badge).toBeTruthy();

    const badgeRect = badge?.querySelector('rect');
    expect(badgeRect).toBeTruthy();
    if (badgeRect) {
      fireEvent.pointerEnter(badgeRect);
    }

    expect(hoverSpy).toHaveBeenCalled();

    const tooltip = renderNodeDiagnosticsTooltipContent({
      summary,
      nodeLabel: 'Node 1',
    });
    const { getByText } = render(tooltip);
    expect(getByText('Expected scalar entityId but got object.')).toBeTruthy();
    expect(getByText('Fix: Map bundle.EntityID to entityId.')).toBeTruthy();
  });

  it('hides diagnostics badge when node has no issues', () => {
    const value = buildContextValue({});
    const { container } = render(
      <svg>
        <CanvasBoardUIProvider value={value}>
          <CanvasSvgNodeLayer />
        </CanvasBoardUIProvider>
      </svg>
    );

    const badge = container.querySelector('[data-node-diagnostics-badge="node-1"]');
    expect(badge).toBeNull();
  });

  it('renders duplicate node ids only once', () => {
    const firstNode = buildNode({
      id: 'node-duplicate',
      title: 'First Duplicate',
      position: { x: 20, y: 20 },
    });
    const secondNode = buildNode({
      id: 'node-duplicate',
      title: 'Second Duplicate',
      position: { x: 260, y: 20 },
    });
    const value: CanvasBoardUIContextValue = {
      ...buildContextValue({}, { node: firstNode }),
      nodes: [firstNode, secondNode],
      nodeById: new Map([[firstNode.id, firstNode]]),
    };

    const { container } = render(
      <svg>
        <CanvasBoardUIProvider value={value}>
          <CanvasSvgNodeLayer />
        </CanvasBoardUIProvider>
      </svg>
    );

    expect(container.querySelectorAll('[data-node-root="node-duplicate"]')).toHaveLength(1);
  });

  it('renders duplicate node ids only once in the minimap', () => {
    const firstNode = buildNode({
      id: 'node-duplicate',
      title: 'First Duplicate',
      position: { x: 20, y: 20 },
    });
    const secondNode = buildNode({
      id: 'node-duplicate',
      title: 'Second Duplicate',
      position: { x: 260, y: 20 },
    });
    const value: CanvasBoardUIContextValue = {
      ...buildContextValue({}, { node: firstNode }),
      nodes: [firstNode, secondNode],
      nodeById: new Map([[firstNode.id, firstNode]]),
    };

    const { container } = render(
      <CanvasBoardUIProvider value={value}>
        <CanvasMinimap />
      </CanvasBoardUIProvider>
    );

    expect(container.querySelectorAll('[data-minimap-node-id="node-duplicate"]')).toHaveLength(1);
  });

  it('selects node on single click and does not open config when single-click-open is disabled', () => {
    const selectSpy = vi.fn();
    const openConfigSpy = vi.fn();
    const value = buildContextValue(
      {},
      {
        onSelectNode: selectSpy,
        onOpenNodeConfig: openConfigSpy,
        openNodeConfigOnSingleClick: false,
      }
    );

    const { container } = render(
      <svg>
        <CanvasBoardUIProvider value={value}>
          <CanvasSvgNodeLayer />
        </CanvasBoardUIProvider>
      </svg>
    );

    const nodeBody = container.querySelector('[data-node-body="node-1"]');
    expect(nodeBody).toBeTruthy();
    if (nodeBody) {
      fireEvent.click(nodeBody);
    }

    expect(selectSpy).toHaveBeenCalledTimes(1);
    expect(selectSpy.mock.calls[0]?.[0]).toBe('node-1');
    expect(selectSpy.mock.calls[0]?.[1]).toEqual({ toggle: false });
    expect(openConfigSpy).not.toHaveBeenCalled();
  });

  it('opens node config on double click', () => {
    const selectSpy = vi.fn();
    const openConfigSpy = vi.fn();
    const value = buildContextValue(
      {},
      {
        onSelectNode: selectSpy,
        onOpenNodeConfig: openConfigSpy,
        openNodeConfigOnSingleClick: false,
      }
    );

    const { container } = render(
      <svg>
        <CanvasBoardUIProvider value={value}>
          <CanvasSvgNodeLayer />
        </CanvasBoardUIProvider>
      </svg>
    );

    const nodeBody = container.querySelector('[data-node-body="node-1"]');
    expect(nodeBody).toBeTruthy();
    if (nodeBody) {
      fireEvent.doubleClick(nodeBody);
    }

    expect(selectSpy).toHaveBeenCalled();
    expect(selectSpy.mock.calls[0]?.[0]).toBe('node-1');
    expect(openConfigSpy).toHaveBeenCalledTimes(1);
  });

  it('suppresses node click selection immediately after a drag interaction', () => {
    const selectSpy = vi.fn();
    const consumeSuppressedNodeClick = vi.fn(() => true);
    const value = buildContextValue(
      {},
      {
        onSelectNode: selectSpy,
        consumeSuppressedNodeClick,
      }
    );

    const { container } = render(
      <svg>
        <CanvasBoardUIProvider value={value}>
          <CanvasSvgNodeLayer />
        </CanvasBoardUIProvider>
      </svg>
    );

    const nodeBody = container.querySelector('[data-node-body="node-1"]');
    expect(nodeBody).toBeTruthy();
    if (nodeBody) {
      fireEvent.click(nodeBody);
    }

    expect(consumeSuppressedNodeClick).toHaveBeenCalledWith('node-1');
    expect(selectSpy).not.toHaveBeenCalled();
  });
});
