import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import { CanvasSvgNode } from '@/features/ai/ai-paths/components/CanvasSvgNode';
import type { CanvasBoardUIContextValue } from '@/features/ai/ai-paths/components/CanvasBoardUIContext';

const buildTriggerNode = (): AiNode => ({
  id: 'node-trigger-1',
  type: 'trigger',
  title: 'Trigger: Description',
  description: 'Runs from product modal.',
  nodeTypeId: 'trigger:description',
  inputs: [],
  outputs: ['trigger', 'triggerName'],
  position: { x: 120, y: 240 },
});

const buildUi = (
  overrides?: Partial<CanvasBoardUIContextValue>
): CanvasBoardUIContextValue =>
  ({
    view: { x: 0, y: 0, scale: 1 },
    dragState: null,
    viewportSize: { width: 1200, height: 800 },
    detailLevel: 'full',
    nodes: [buildTriggerNode()],
    edges: [],
    edgePaths: [],
    edgeMetaMap: new Map(),
    nodeById: new Map(),
    edgeRoutingMode: 'bezier',
    connecting: null,
    connectingPos: null,
    selectedNodeId: null,
    selectedNodeIdSet: new Set(),
    selectedEdgeId: null,
    runtimeState: { inputs: {}, outputs: {}, history: {} },
    runtimeNodeStatuses: {},
    runtimeRunStatus: 'idle',
    nodeDurations: {},
    nodeDiagnosticsById: {},
    inputPulseNodes: new Set(),
    outputPulseNodes: new Set(),
    activeEdgeIds: new Set(),
    triggerConnected: new Set(),
    wireFlowEnabled: true,
    flowingIntensity: 'medium',
    reduceVisualEffects: false,
    enableNodeAnimations: false,
    connectorHitTargetPx: 24,
    openNodeConfigOnSingleClick: false,
    zoomTo: vi.fn(),
    fitToNodes: vi.fn(),
    fitToSelection: vi.fn(),
    resetView: vi.fn(),
    centerOnCanvasPoint: vi.fn(),
    hoveredConnectorKey: null,
    pinnedConnectorKey: null,
    setHoveredConnectorKey: vi.fn(),
    setPinnedConnectorKey: vi.fn(),
    onPointerDownNode: vi.fn(),
    onPointerMoveNode: vi.fn(),
    onPointerUpNode: vi.fn(),
    consumeSuppressedNodeClick: vi.fn(() => false),
    onSelectNode: vi.fn(),
    onOpenNodeConfig: vi.fn(),
    onStartConnection: vi.fn(),
    onCompleteConnection: vi.fn(),
    onReconnectInput: vi.fn(),
    onDisconnectPort: vi.fn(),
    onFireTrigger: vi.fn(),
    onRemoveEdge: vi.fn(),
    onSelectEdge: vi.fn(),
    ...overrides,
  }) as CanvasBoardUIContextValue;

describe('CanvasSvgNode trigger regression interactions', () => {
  it('renders fire trigger chip with pointer cursor', () => {
    const node = buildTriggerNode();
    const ui = buildUi({ nodes: [node] });

    const { container } = render(
      <svg>
        <CanvasSvgNode node={node} ui={ui} />
      </svg>
    );

    const triggerActionRect = container.querySelector(
      '[data-node-action="fire-trigger"]'
    ) as SVGRectElement | null;
    expect(triggerActionRect).toBeTruthy();
    if (!triggerActionRect) return;

    expect(triggerActionRect.style.cursor).toBe('pointer');
  });

  it('keeps node click selection separate from trigger quick action', () => {
    const onSelectNode = vi.fn();
    const onFireTrigger = vi.fn();
    const node = buildTriggerNode();
    const ui = buildUi({
      nodes: [node],
      onSelectNode,
      onFireTrigger,
    });

    const { container } = render(
      <svg>
        <CanvasSvgNode node={node} ui={ui} />
      </svg>
    );

    const nodeBody = container.querySelector(`[data-node-body="${node.id}"]`) as SVGRectElement | null;
    expect(nodeBody).toBeTruthy();
    if (!nodeBody) return;

    fireEvent.click(nodeBody);

    expect(onSelectNode).toHaveBeenCalledWith(node.id, { toggle: false });
    expect(onFireTrigger).not.toHaveBeenCalled();
  });

  it('fires trigger action only on chip click without drag suppression', () => {
    const onFireTrigger = vi.fn();
    const consumeSuppressedNodeClick = vi.fn(() => false);
    const node = buildTriggerNode();
    const ui = buildUi({
      nodes: [node],
      onFireTrigger,
      consumeSuppressedNodeClick,
    });

    const { container } = render(
      <svg>
        <CanvasSvgNode node={node} ui={ui} />
      </svg>
    );

    const triggerActionRect = container.querySelector(
      '[data-node-action="fire-trigger"]'
    ) as SVGRectElement | null;
    expect(triggerActionRect).toBeTruthy();
    if (!triggerActionRect) return;

    fireEvent.click(triggerActionRect);

    expect(consumeSuppressedNodeClick).toHaveBeenCalledWith(node.id);
    expect(onFireTrigger).toHaveBeenCalledWith(node, expect.any(Object));
  });
});
