import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/lib/ai-paths';
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
});
