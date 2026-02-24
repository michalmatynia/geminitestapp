import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  AiNode,
  DataContractNodeIssueSummary,
  RuntimeState,
} from '@/features/ai/ai-paths/lib';

import {
  CanvasBoardUIProvider,
  type CanvasBoardUIContextValue,
} from '../CanvasBoardUIContext';
import { renderNodeDiagnosticsTooltipContent } from '../canvas-board';
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
  }
): CanvasBoardUIContextValue => {
  const node = buildNode({});
  return {
    view: { x: 0, y: 0, scale: 1 },
    viewportSize: { width: 1200, height: 800 },
    detailLevel: 'full',
    nodes: [node],
    edges: [],
    edgeMetaMap: new Map(),
    nodeById: new Map([[node.id, node]]),
    selectedNodeId: null,
    selectedNodeIdSet: new Set(),
    selectedEdgeId: null,
    runtimeState: baseRuntimeState,
    runtimeNodeStatuses: {},
    runtimeRunStatus: 'idle',
    nodeDurations: {},
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
    openNodeConfigOnSingleClick: false,
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
    onSelectNode: vi.fn(),
    onOpenNodeConfig: vi.fn(),
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
});
