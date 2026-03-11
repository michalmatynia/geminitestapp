import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge } from '@/shared/lib/ai-paths';

import type { CanvasBoardState } from '../CanvasBoard.types';
import type { ConnectorInfo } from '../canvas-board-connectors';
import { CanvasBoard } from '../canvas-board';

const useCanvasBoardStateMock = vi.hoisted(() => vi.fn());

vi.mock('../useCanvasBoardState', () => ({
  useCanvasBoardState: (...args: unknown[]) => useCanvasBoardStateMock(...args),
}));

vi.mock('../CanvasControlPanel', () => ({
  CanvasControlPanel: () => null,
}));

vi.mock('../canvas-minimap', () => ({
  CanvasMinimap: () => null,
}));

const noop = (): void => {};

const connectorInfoStub: ConnectorInfo = {
  direction: 'output',
  nodeId: 'node-1',
  port: 'result',
  expectedTypes: ['string'],
  expectedLabel: 'string',
  rawValue: undefined,
  value: undefined,
  isHistory: false,
  historyLength: 0,
  actualType: null,
  runtimeMismatch: false,
  connectionMismatches: [],
  hasMismatch: false,
  nodeInputs: undefined,
  nodeOutputs: undefined,
};

const buildNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-1',
    type: 'template',
    title: 'Node 1',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 24, y: 24 },
    data: {},
    ...patch,
  }) as AiNode;

const buildState = (): CanvasBoardState =>
  ({
    view: { x: 128, y: -64, scale: 1.25 },
    panState: null,
    dragState: null,
    lastDrop: null,
    connecting: null,
    connectingPos: null,
    isPanning: false,
    isDraggingNode: false,
    isConnecting: false,
    viewportRef: { current: null },
    canvasRef: { current: null },
    nodes: [],
    edges: [],
    flowIntensity: 'medium',
    nodeById: new Map(),
    edgePaths: [],
    runtimeState: {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      inputs: {},
      outputs: {},
      history: {},
    },
    runtimeNodeStatuses: {},
    runtimeEvents: [],
    runtimeRunStatus: 'idle',
    nodeDurations: {},
    fireTrigger: async () => {},
    selectedNodeId: null,
    selectedNodeIds: [],
    selectedEdgeId: null,
    selectionToolMode: 'pan',
    selectedNodeIdSet: new Set<string>(),
    selectEdge: noop,
    clearNodeSelection: noop,
    setConfigOpen: noop,
    setEdgeRoutingMode: noop,
    handlePointerDownNode: noop,
    handlePointerMoveNode: noop,
    handlePointerUpNode: noop,
    consumeSuppressedNodeClick: () => false,
    handlePanStart: noop,
    handlePanMove: noop,
    handlePanEnd: noop,
    handleWheel: noop,
    handleRemoveEdge: noop,
    handleDisconnectPort: noop,
    handleStartConnection: noop,
    handleCompleteConnection: noop,
    handleReconnectInput: noop,
    handleSelectNode: noop,
    handleDrop: noop,
    handleDragOver: noop,
    zoomTo: noop,
    fitToNodes: noop,
    fitToSelection: noop,
    resetView: noop,
    centerOnCanvasPoint: noop,
    selectionMarqueeRect: null,
    touchLongPressIndicator: null,
    ConfirmationModal: () => null,
    hoveredConnectorKey: null,
    setHoveredConnectorKey: noop,
    pinnedConnectorKey: null,
    setPinnedConnectorKey: noop,
    svgConnectorTooltip: null,
    setSvgConnectorTooltip: noop,
    svgNodeDiagnosticsTooltip: null,
    setSvgNodeDiagnosticsTooltip: noop,
    rendererMode: 'svg',
    showMinimap: false,
    setShowMinimap: noop,
    viewportSize: { width: 1200, height: 800 },
    prefersReducedMotion: false,
    svgPerf: { fps: 60, avgFrameMs: 16.6, slowFrameRatio: 0 },
    effectiveFlowIntensity: 'medium',
    isSvgRenderer: true,
    getConnectorInfo: () => connectorInfoStub,
    getPortValue: noop,
    activeShapeId: null,
    edgeRoutingMode: 'bezier',
    nodeDiagnosticsById: {},
  }) as CanvasBoardState;

describe('CanvasBoard world transform', () => {
  beforeEach(() => {
    useCanvasBoardStateMock.mockReset();
    useCanvasBoardStateMock.mockReturnValue(buildState());
  });

  it('renders a world group with translate+scale from the current canvas view', () => {
    const { container } = render(<CanvasBoard />);
    const worldGroup = container.querySelector('[data-canvas-world="true"]');
    expect(worldGroup).toBeTruthy();
    expect(worldGroup?.getAttribute('transform')).toBe('translate(128 -64) scale(1.25)');
  });

  it('does not start canvas pan when node body pointer events bubble to the canvas root', () => {
    const handlePanStart = vi.fn();
    const handlePointerDownNode = vi.fn();
    const node = buildNode();
    useCanvasBoardStateMock.mockReturnValue({
      ...buildState(),
      nodes: [node],
      nodeById: new Map([[node.id, node]]),
      handlePanStart,
      handlePointerDownNode,
    });

    const { container } = render(<CanvasBoard />);
    const nodeBody = container.querySelector('[data-node-body="node-1"]');
    expect(nodeBody).toBeTruthy();
    if (!nodeBody) return;

    fireEvent.pointerDown(nodeBody, { clientX: 180, clientY: 120 });

    expect(handlePointerDownNode).toHaveBeenCalledTimes(1);
    expect(handlePanStart).not.toHaveBeenCalled();
  });

  it('does not start canvas pan when edge hit pointer events bubble to the canvas root', () => {
    const handlePanStart = vi.fn();
    const clearNodeSelection = vi.fn();
    const selectEdge = vi.fn();
    const source = buildNode({
      id: 'node-a',
      outputs: ['result'],
      position: { x: 24, y: 24 },
    });
    const target = buildNode({
      id: 'node-b',
      inputs: ['value'],
      position: { x: 420, y: 24 },
    });
    const edge: Edge = {
      id: 'edge-a-b',
      from: 'node-a',
      to: 'node-b',
      fromPort: 'result',
      toPort: 'value',
    };
    useCanvasBoardStateMock.mockReturnValue({
      ...buildState(),
      nodes: [source, target],
      edges: [edge],
      nodeById: new Map([
        [source.id, source],
        [target.id, target],
      ]),
      edgePaths: [
        {
          id: edge.id,
          path: 'M 284 116 C 340 116 380 116 420 116',
          fromNodeId: source.id,
          toNodeId: target.id,
          bounds: { minX: 284, minY: 116, maxX: 420, maxY: 116 },
        },
      ],
      handlePanStart,
      clearNodeSelection,
      selectEdge,
    });

    const { container } = render(<CanvasBoard />);
    const edgeHit = container.querySelector('[data-canvas-edge-hit="true"]');
    expect(edgeHit).toBeTruthy();
    if (!edgeHit) return;

    fireEvent.pointerDown(edgeHit, { clientX: 320, clientY: 116 });

    expect(handlePanStart).not.toHaveBeenCalled();
    expect(clearNodeSelection).not.toHaveBeenCalled();
    expect(selectEdge).not.toHaveBeenCalled();
  });

  it('selects edge when clicking the edge hit target', () => {
    const selectEdge = vi.fn();
    const source = buildNode({
      id: 'node-a',
      outputs: ['result'],
      position: { x: 24, y: 24 },
    });
    const target = buildNode({
      id: 'node-b',
      inputs: ['value'],
      position: { x: 420, y: 24 },
    });
    const edge: Edge = {
      id: 'edge-a-b',
      from: 'node-a',
      to: 'node-b',
      fromPort: 'result',
      toPort: 'value',
    };
    useCanvasBoardStateMock.mockReturnValue({
      ...buildState(),
      nodes: [source, target],
      edges: [edge],
      nodeById: new Map([
        [source.id, source],
        [target.id, target],
      ]),
      edgePaths: [
        {
          id: edge.id,
          path: 'M 284 116 C 340 116 380 116 420 116',
          fromNodeId: source.id,
          toNodeId: target.id,
          bounds: { minX: 284, minY: 116, maxX: 420, maxY: 116 },
        },
      ],
      selectEdge,
    });

    const { container } = render(<CanvasBoard />);
    const edgeHit = container.querySelector('[data-canvas-edge-hit="true"]');
    expect(edgeHit).toBeTruthy();
    if (!edgeHit) return;

    fireEvent.click(edgeHit);

    expect(selectEdge).toHaveBeenCalledWith(edge.id);
  });

  it('forwards pointer move and up events to canvas pan handlers with the event payload', () => {
    const handlePanMove = vi.fn();
    const handlePanEnd = vi.fn();
    useCanvasBoardStateMock.mockReturnValue({
      ...buildState(),
      handlePanMove,
      handlePanEnd,
    });

    const { container } = render(<CanvasBoard />);
    const canvasHost = container.querySelector('div.touch-none.select-none.overscroll-none');
    expect(canvasHost).toBeTruthy();
    if (!canvasHost) return;

    fireEvent.pointerMove(canvasHost, { clientX: 222, clientY: 333 });
    fireEvent.pointerUp(canvasHost, { clientX: 222, clientY: 333 });

    expect(handlePanMove).toHaveBeenCalledTimes(1);
    expect(handlePanMove.mock.calls[0]?.[0]).toBeTruthy();
    expect(handlePanEnd).toHaveBeenCalledTimes(1);
    expect(handlePanEnd.mock.calls[0]?.[0]).toBeTruthy();
  });

  it('clears node and edge selection when pointer down starts on empty canvas', () => {
    const clearNodeSelection = vi.fn();
    const selectEdge = vi.fn();
    useCanvasBoardStateMock.mockReturnValue({
      ...buildState(),
      clearNodeSelection,
      selectEdge,
    });

    const { container } = render(<CanvasBoard />);
    const canvasHost = container.querySelector('div.touch-none.select-none.overscroll-none');
    expect(canvasHost).toBeTruthy();
    if (!canvasHost) return;

    fireEvent.pointerDown(canvasHost, { clientX: 200, clientY: 200 });

    expect(clearNodeSelection).toHaveBeenCalledTimes(1);
    expect(selectEdge).toHaveBeenCalledWith(null);
  });
});
