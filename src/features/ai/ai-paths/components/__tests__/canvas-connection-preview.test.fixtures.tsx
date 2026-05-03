import { render } from '@testing-library/react';
import { vi } from 'vitest';

import type { AiNode } from '@/shared/contracts/ai-paths';
import type { PortDataType } from '@/shared/lib/ai-paths/core/utils/port-types';

import { CanvasBoardUIProvider, type CanvasBoardUIContextValue } from '../CanvasBoardUIContext';
import { CanvasSvgNodePorts } from '../canvas/node/CanvasSvgNodePorts';

export const buildNode = (patch: Partial<AiNode> = {}): AiNode =>
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

export const buildContextValue = (): CanvasBoardUIContextValue => {
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

const buildConnectorInfo = (nodeId: string) => ({
  direction: 'output' as 'output' | 'input',
  nodeId,
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
});

export const renderNodePorts = (input?: {
  node?: AiNode;
  contextOverrides?: Partial<CanvasBoardUIContextValue>;
}) => {
  const node = input?.node ?? buildNode();
  const value = buildContextValue();
  value.nodes = [node];
  value.nodeById = new Map([[node.id, node]]);
  if (input?.contextOverrides) {
    Object.assign(value, input.contextOverrides);
  }
  const getConnectorInfo = vi.fn(() => buildConnectorInfo(node.id));

  const renderResult = render(
    <svg>
      <CanvasBoardUIProvider value={value}>
        <CanvasSvgNodePorts
          node={node}
          incomingEdgePortSet={new Set<string>()}
          connectorHitRadius={16}
          showPortLabels={false}
          buildConnectorKey={(
            direction: 'input' | 'output',
            nodeId: string,
            port: string
          ): string => `${direction}:${nodeId}:${port}`}
          getConnectorInfo={getConnectorInfo}
        />
      </CanvasBoardUIProvider>
    </svg>
  );

  return { ...renderResult, node, value, getConnectorInfo };
};
