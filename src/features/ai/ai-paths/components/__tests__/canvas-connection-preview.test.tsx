import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge } from '@/shared/lib/ai-paths';
import type { PortDataType } from '@/shared/lib/ai-paths/core/utils/port-types';

import { CanvasBoardUIProvider, type CanvasBoardUIContextValue } from '../CanvasBoardUIContext';
import { CanvasSvgEdgeLayer } from '../canvas-svg-edge-layer';
import { CanvasSvgNodePorts } from '../canvas/node/CanvasSvgNodePorts';

const buildNode = (patch: Partial<AiNode> = {}): AiNode =>
  ({
    id: 'node-preview',
    type: 'mapper',
    title: 'Preview Node',
    description: '',
    inputs: ['input'],
    outputs: ['result'],
    position: { x: 120, y: 80 },
    data: {},
    ...patch,
  }) as AiNode;

const buildContextValue = (): CanvasBoardUIContextValue => {
  const node = buildNode();
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
    connecting: {
      fromNodeId: node.id,
      fromPort: 'result',
      start: { x: 380, y: 162 },
    },
    connectingPos: { x: 540, y: 244 },
    selectedNodeId: null,
    selectedNodeIdSet: new Set<string>(),
    selectedEdgeId: null,
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
    runtimeRunStatus: 'idle',
    nodeDurations: {},
    nodeDiagnosticsById: {},
    inputPulseNodes: new Set<string>(),
    outputPulseNodes: new Set<string>(),
    activeEdgeIds: new Set<string>(),
    triggerConnected: new Set<string>(),
    wireFlowEnabled: false,
    flowingIntensity: 'low',
    reduceVisualEffects: false,
    enableNodeAnimations: false,
    connectorHitTargetPx: 18,
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
    onConnectorHover: vi.fn(),
    onConnectorLeave: vi.fn(),
    onNodeDiagnosticsHover: vi.fn(),
    onNodeDiagnosticsLeave: vi.fn(),
    onFocusNodeDiagnostics: vi.fn(),
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
  };
};

describe('canvas connection preview', () => {
  it('renders transient connecting preview path while dragging a connection', () => {
    const value = buildContextValue();
    const { container } = render(
      <svg>
        <g data-canvas-world='true' transform='translate(0 0) scale(1)'>
          <CanvasBoardUIProvider value={value}>
            <CanvasSvgEdgeLayer />
          </CanvasBoardUIProvider>
        </g>
      </svg>
    );

    const previewPath = container.querySelector('[data-connecting-preview="true"]');
    expect(previewPath).toBeTruthy();
    expect(previewPath?.closest('[data-canvas-world="true"]')).toBeTruthy();
  });

  it('forwards real pointer events from output connector start handlers', () => {
    const node = buildNode();
    const onStartConnection = vi.fn();
    const { container } = render(
      <svg>
        <CanvasSvgNodePorts
          node={node}
          incomingEdgePortSet={new Set<string>()}
          hoveredConnectorKey={null}
          pinnedConnectorKey={null}
          connectorHitRadius={16}
          showPortLabels={false}
          buildConnectorKey={(
            direction: 'input' | 'output',
            nodeId: string,
            port: string
          ): string => `${direction}:${nodeId}:${port}`}
          onReconnectInput={vi.fn()}
          onCompleteConnection={vi.fn()}
          onDisconnectPort={vi.fn()}
          onStartConnection={onStartConnection}
          setHoveredConnectorKey={vi.fn()}
          onConnectorHover={vi.fn()}
          onConnectorLeave={vi.fn()}
          getConnectorInfo={vi.fn(() => ({
            direction: 'output' as 'output' | 'input',
            nodeId: node.id,
            port: 'result',
            expectedTypes: ['string'] as PortDataType[],
            expectedLabel: 'string',
            rawValue: 'ok',
            value: 'ok',
            isHistory: false,
            historyLength: 0,
            actualType: 'string',
            runtimeMismatch: false,
            connectionMismatches: [],
            hasMismatch: false,
            nodeInputs: {},
            nodeOutputs: { result: 'ok' },
          }))}
          setPinnedConnectorKey={vi.fn()}
        />
      </svg>
    );

    const outputPort = container.querySelector('circle[data-port="output"]');
    expect(outputPort).toBeTruthy();
    if (!outputPort) return;

    fireEvent.pointerDown(outputPort, { clientX: 240, clientY: 180 });
    expect(onStartConnection).toHaveBeenCalledTimes(1);
    const call = onStartConnection.mock.calls[0] as [React.PointerEvent, AiNode, string];
    const calledNode = call?.[1];
    expect(calledNode?.id).toBe(node.id);
    expect(call?.[2]).toBe('result');
  });

  it('renders wire flow when the target node is in running status', () => {
    const sourceNode = buildNode({
      id: 'node-running-source',
      outputs: ['result'],
      inputs: [],
      position: { x: 120, y: 80 },
    });
    const targetNode = buildNode({
      id: 'node-running-target',
      inputs: ['input'],
      outputs: [],
      position: { x: 420, y: 220 },
    });
    const edge: Edge = {
      id: 'edge-running-status',
      from: sourceNode.id,
      to: targetNode.id,
      fromPort: 'result',
      toPort: 'input',
    };
    const value = buildContextValue();
    value.nodes = [sourceNode, targetNode];
    value.edges = [edge];
    value.nodeById = new Map([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    value.edgeMetaMap = new Map([[edge.id, edge]]);
    value.edgePaths = [
      {
        id: edge.id,
        path: 'M 380 162 C 420 162 470 244 540 244',
        fromNodeId: sourceNode.id,
        toNodeId: targetNode.id,
        bounds: { minX: 380, minY: 162, maxX: 540, maxY: 244 },
      },
    ];
    value.runtimeNodeStatuses = {
      [targetNode.id]: 'running',
    };
    value.wireFlowEnabled = true;
    value.activeEdgeIds = new Set<string>();

    const { container } = render(
      <svg>
        <g data-canvas-world='true' transform='translate(0 0) scale(1)'>
          <CanvasBoardUIProvider value={value}>
            <CanvasSvgEdgeLayer />
          </CanvasBoardUIProvider>
        </g>
      </svg>
    );

    expect(container.querySelector('.ai-paths-wire-flow')).toBeTruthy();
  });

  it('renders wire flow for edges connected to nodes in processing status', () => {
    const sourceNode = buildNode({
      id: 'node-processing-source',
      outputs: ['result'],
      inputs: [],
      position: { x: 120, y: 80 },
    });
    const targetNode = buildNode({
      id: 'node-processing-target',
      inputs: ['input'],
      outputs: [],
      position: { x: 420, y: 220 },
    });
    const edge: Edge = {
      id: 'edge-processing-status',
      from: sourceNode.id,
      to: targetNode.id,
      fromPort: 'result',
      toPort: 'input',
    };
    const value = buildContextValue();
    value.nodes = [sourceNode, targetNode];
    value.edges = [edge];
    value.nodeById = new Map([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    value.edgeMetaMap = new Map([[edge.id, edge]]);
    value.edgePaths = [
      {
        id: edge.id,
        path: 'M 380 162 C 420 162 470 244 540 244',
        fromNodeId: sourceNode.id,
        toNodeId: targetNode.id,
        bounds: { minX: 380, minY: 162, maxX: 540, maxY: 244 },
      },
    ];
    value.runtimeNodeStatuses = {
      [targetNode.id]: 'processing',
    };
    value.wireFlowEnabled = true;
    value.activeEdgeIds = new Set<string>();

    const { container } = render(
      <svg>
        <g data-canvas-world='true' transform='translate(0 0) scale(1)'>
          <CanvasBoardUIProvider value={value}>
            <CanvasSvgEdgeLayer />
          </CanvasBoardUIProvider>
        </g>
      </svg>
    );

    expect(container.querySelector('.ai-paths-wire-flow')).toBeTruthy();
  });

  it('does not render wire flow when only queued runtime status is present', () => {
    const sourceNode = buildNode({
      id: 'node-queued-source',
      outputs: ['result'],
      inputs: [],
      position: { x: 120, y: 80 },
    });
    const targetNode = buildNode({
      id: 'node-queued-target',
      inputs: ['input'],
      outputs: [],
      position: { x: 420, y: 220 },
    });
    const edge: Edge = {
      id: 'edge-queued-status',
      from: sourceNode.id,
      to: targetNode.id,
      fromPort: 'result',
      toPort: 'input',
    };
    const value = buildContextValue();
    value.nodes = [sourceNode, targetNode];
    value.edges = [edge];
    value.nodeById = new Map([
      [sourceNode.id, sourceNode],
      [targetNode.id, targetNode],
    ]);
    value.edgeMetaMap = new Map([[edge.id, edge]]);
    value.edgePaths = [
      {
        id: edge.id,
        path: 'M 380 162 C 420 162 470 244 540 244',
        fromNodeId: sourceNode.id,
        toNodeId: targetNode.id,
        bounds: { minX: 380, minY: 162, maxX: 540, maxY: 244 },
      },
    ];
    value.runtimeNodeStatuses = {
      [sourceNode.id]: 'queued',
    };
    value.wireFlowEnabled = true;
    value.activeEdgeIds = new Set<string>();

    const { container } = render(
      <svg>
        <g data-canvas-world='true' transform='translate(0 0) scale(1)'>
          <CanvasBoardUIProvider value={value}>
            <CanvasSvgEdgeLayer />
          </CanvasBoardUIProvider>
        </g>
      </svg>
    );

    expect(container.querySelector('.ai-paths-wire-flow')).toBeFalsy();
  });

  it('does not render status-based wire flow for waiting_callback nodes', () => {
    const upstreamNode = buildNode({
      id: 'node-upstream',
      outputs: ['result'],
      inputs: [],
      position: { x: 40, y: 120 },
    });
    const waitingNode = buildNode({
      id: 'node-waiting',
      inputs: ['input'],
      outputs: ['result'],
      position: { x: 320, y: 120 },
    });
    const downstreamNode = buildNode({
      id: 'node-downstream',
      inputs: ['input'],
      outputs: [],
      position: { x: 620, y: 120 },
    });

    const incomingEdge: Edge = {
      id: 'edge-incoming-waiting',
      from: upstreamNode.id,
      to: waitingNode.id,
      fromPort: 'result',
      toPort: 'input',
    };
    const outgoingEdge: Edge = {
      id: 'edge-outgoing-waiting',
      from: waitingNode.id,
      to: downstreamNode.id,
      fromPort: 'result',
      toPort: 'input',
    };

    const value = buildContextValue();
    value.nodes = [upstreamNode, waitingNode, downstreamNode];
    value.edges = [incomingEdge, outgoingEdge];
    value.nodeById = new Map([
      [upstreamNode.id, upstreamNode],
      [waitingNode.id, waitingNode],
      [downstreamNode.id, downstreamNode],
    ]);
    value.edgeMetaMap = new Map([
      [incomingEdge.id, incomingEdge],
      [outgoingEdge.id, outgoingEdge],
    ]);
    value.edgePaths = [
      {
        id: incomingEdge.id,
        path: 'M 180 140 C 220 140 260 140 300 140',
        fromNodeId: upstreamNode.id,
        toNodeId: waitingNode.id,
        bounds: { minX: 180, minY: 140, maxX: 300, maxY: 140 },
      },
      {
        id: outgoingEdge.id,
        path: 'M 460 140 C 500 140 540 140 580 140',
        fromNodeId: waitingNode.id,
        toNodeId: downstreamNode.id,
        bounds: { minX: 460, minY: 140, maxX: 580, maxY: 140 },
      },
    ];
    value.runtimeNodeStatuses = {
      [waitingNode.id]: 'waiting_callback',
    };
    value.wireFlowEnabled = true;
    value.activeEdgeIds = new Set<string>();

    const { container } = render(
      <svg>
        <g data-canvas-world='true' transform='translate(0 0) scale(1)'>
          <CanvasBoardUIProvider value={value}>
            <CanvasSvgEdgeLayer />
          </CanvasBoardUIProvider>
        </g>
      </svg>
    );

    const flowingPaths = Array.from(container.querySelectorAll('.ai-paths-wire-flow'));
    expect(flowingPaths).toHaveLength(0);
  });
});
