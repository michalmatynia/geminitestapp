import React from 'react';
import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/lib/ai-paths';

import type { CanvasBoardState } from '../CanvasBoard.types';
import type { ConnectorInfo } from '../canvas-board-connectors';
import type {
  SvgConnectorTooltipState,
  SvgNodeDiagnosticsTooltipState,
} from '../CanvasBoard.utils';
import { CanvasBoard } from '../canvas-board';

const useCanvasBoardStateMock = vi.hoisted(() => vi.fn());

vi.mock('../useCanvasBoardState', () => ({
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
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
    setConfigOpen: noop,
    setEdgeRoutingMode: noop as unknown as React.Dispatch<
      React.SetStateAction<'bezier' | 'orthogonal'>
    >,
    handlePointerDownNode: noop,
    handlePointerMoveNode: noop,
    handlePointerUpNode: noop,
    consumeSuppressedNodeClick: () => false,
    handlePanStart: noop as unknown as (event: React.PointerEvent) => void,
    handlePanMove: noop as unknown as (event: React.PointerEvent) => void,
    handlePanEnd: noop as unknown as (event: React.PointerEvent) => void,
    handleWheel: noop as unknown as (event: React.WheelEvent) => void,
    handleRemoveEdge: noop,
    handleDisconnectPort: noop as unknown as (
      direction: 'input' | 'output',
      nodeId: string,
      port: string
    ) => void,
    handleStartConnection: noop as unknown as (
      event: React.PointerEvent<Element>,
      node: AiNode,
      port: string
    ) => void,
    handleCompleteConnection: noop as unknown as (
      event: React.PointerEvent<Element>,
      node: AiNode,
      port: string
    ) => void,
    handleReconnectInput: noop as unknown as (
      event: React.PointerEvent<Element>,
      nodeId: string,
      port: string
    ) => void,
    handleSelectNode: noop,
    handleDrop: noop as unknown as (event: React.DragEvent<HTMLDivElement>) => void,
    handleDragOver: noop as unknown as (event: React.DragEvent<HTMLDivElement>) => void,
    zoomTo: noop,
    fitToNodes: noop,
    fitToSelection: noop,
    resetView: noop,
    centerOnCanvasPoint: noop,
    selectionMarqueeRect: null,
    touchLongPressIndicator: null,
    ConfirmationModal: () => null,
    hoveredConnectorKey: null,
    setHoveredConnectorKey: noop as unknown as React.Dispatch<React.SetStateAction<string | null>>,
    pinnedConnectorKey: null,
    setPinnedConnectorKey: noop as unknown as React.Dispatch<React.SetStateAction<string | null>>,
    svgConnectorTooltip: null,
    setSvgConnectorTooltip: noop as unknown as React.Dispatch<
      React.SetStateAction<SvgConnectorTooltipState | null>
    >,
    svgNodeDiagnosticsTooltip: null,
    setSvgNodeDiagnosticsTooltip: noop as unknown as React.Dispatch<
      React.SetStateAction<SvgNodeDiagnosticsTooltipState | null>
    >,
    rendererMode: 'svg',
    setRendererMode: noop as unknown as React.Dispatch<React.SetStateAction<'legacy' | 'svg'>>,
    showMinimap: false,
    setShowMinimap: noop as unknown as React.Dispatch<React.SetStateAction<boolean>>,
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
});
