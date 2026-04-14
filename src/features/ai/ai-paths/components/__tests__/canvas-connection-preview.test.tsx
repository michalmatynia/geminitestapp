import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge } from '@/shared/contracts/ai-paths';

import { CanvasBoardUIProvider } from '../CanvasBoardUIContext';
import { CanvasSvgEdgeLayer } from '../canvas-svg-edge-layer';
import {
  buildContextValue,
  buildNode,
  renderNodePorts,
} from './canvas-connection-preview.test.fixtures';

type EdgeLayerContextValue = ReturnType<typeof buildContextValue>;
type EdgePathValue = EdgeLayerContextValue['edgePaths'][number];

const renderEdgeLayer = (value: EdgeLayerContextValue) =>
  render(
    <svg>
      <g data-canvas-world='true' transform='translate(0 0) scale(1)'>
        <CanvasBoardUIProvider value={value}>
          <CanvasSvgEdgeLayer />
        </CanvasBoardUIProvider>
      </g>
    </svg>
  );

const buildEdgePathValue = (
  edge: Edge,
  path: string,
  bounds: EdgePathValue['bounds']
): EdgePathValue => ({
  id: edge.id,
  path,
  fromNodeId: edge.from,
  toNodeId: edge.to,
  bounds,
});

const buildEdgeLayerValue = ({
  nodes,
  edges,
  edgePaths,
  runtimeNodeStatuses,
}: {
  nodes: AiNode[];
  edges: Edge[];
  edgePaths: EdgePathValue[];
  runtimeNodeStatuses: EdgeLayerContextValue['runtimeNodeStatuses'];
}): EdgeLayerContextValue => {
  const value = buildContextValue();
  value.nodes = nodes;
  value.edges = edges;
  value.nodeById = new Map(nodes.map((node): [string, AiNode] => [node.id, node]));
  value.edgeMetaMap = new Map(edges.map((edge): [string, Edge] => [edge.id, edge]));
  value.edgePaths = edgePaths;
  value.runtimeNodeStatuses = runtimeNodeStatuses;
  value.wireFlowEnabled = true;
  value.activeEdgeIds = new Set<string>();
  return value;
};

const renderSingleEdgeWireFlow = ({
  edgeId,
  path,
  sourceNode,
  statusByNodeId,
  targetNode,
}: {
  edgeId: string;
  path: string;
  sourceNode: AiNode;
  statusByNodeId: EdgeLayerContextValue['runtimeNodeStatuses'];
  targetNode: AiNode;
}) => {
  const edge: Edge = {
    id: edgeId,
    from: sourceNode.id,
    to: targetNode.id,
    fromPort: 'result',
    toPort: 'input',
  };

  return renderEdgeLayer(
    buildEdgeLayerValue({
      nodes: [sourceNode, targetNode],
      edges: [edge],
      edgePaths: [
        buildEdgePathValue(edge, path, { minX: 380, minY: 162, maxX: 540, maxY: 244 }),
      ],
      runtimeNodeStatuses: statusByNodeId,
    })
  );
};

const renderDatabaseModelChainWireFlow = ({
  dbToModelPath,
  fetchedToDbPath,
  modelStatus,
  modelToDbQueryPath,
  suffix,
  y,
}: {
  dbToModelPath: string;
  fetchedToDbPath: string;
  modelStatus: 'blocked' | 'running' | 'waiting_callback';
  modelToDbQueryPath: string;
  suffix: string;
  y: number;
}) => {
  const fetchedNode = buildNode({
    id: `node-fetched-${suffix}`,
    type: 'fetcher',
    outputs: ['bundle'],
    inputs: [],
    position: { x: 40, y },
  });
  const databaseNode = buildNode({
    id: `node-database-${suffix}`,
    type: 'database',
    inputs: ['bundle'],
    outputs: ['result'],
    position: { x: 260, y },
  });
  const modelNode = buildNode({
    id: `node-model-${suffix}`,
    type: 'model',
    inputs: ['prompt'],
    outputs: ['result'],
    position: { x: 480, y },
  });
  const dbQueryNode = buildNode({
    id: `node-db-query-${suffix}`,
    type: 'database',
    inputs: ['query'],
    outputs: ['result'],
    position: { x: 700, y },
  });
  const edgeFetchedToDb: Edge = {
    id: `edge-fetched-db-${suffix}`,
    from: fetchedNode.id,
    to: databaseNode.id,
    fromPort: 'bundle',
    toPort: 'bundle',
  };
  const edgeDbToModel: Edge = {
    id: `edge-db-model-${suffix}`,
    from: databaseNode.id,
    to: modelNode.id,
    fromPort: 'result',
    toPort: 'prompt',
  };
  const edgeModelToDbQuery: Edge = {
    id: `edge-model-db-query-${suffix}`,
    from: modelNode.id,
    to: dbQueryNode.id,
    fromPort: 'result',
    toPort: 'query',
  };

  return renderEdgeLayer(
    buildEdgeLayerValue({
      nodes: [fetchedNode, databaseNode, modelNode, dbQueryNode],
      edges: [edgeFetchedToDb, edgeDbToModel, edgeModelToDbQuery],
      edgePaths: [
        buildEdgePathValue(edgeFetchedToDb, fetchedToDbPath, {
          minX: 180,
          minY: y + 20,
          maxX: 250,
          maxY: y + 20,
        }),
        buildEdgePathValue(edgeDbToModel, dbToModelPath, {
          minX: 400,
          minY: y + 20,
          maxX: 470,
          maxY: y + 20,
        }),
        buildEdgePathValue(edgeModelToDbQuery, modelToDbQueryPath, {
          minX: 620,
          minY: y + 20,
          maxX: 690,
          maxY: y + 20,
        }),
      ],
      runtimeNodeStatuses: {
        [databaseNode.id]: 'completed',
        [modelNode.id]: modelStatus,
        [dbQueryNode.id]: 'queued',
      },
    })
  );
};

const renderStatusNodeWireFlow = ({
  incomingPath,
  outgoingPath,
  status,
  suffix,
  y,
}: {
  incomingPath: string;
  outgoingPath: string;
  status: 'skipped' | 'waiting_callback';
  suffix: string;
  y: number;
}) => {
  const upstreamNode = buildNode({
    id: `node-upstream-${suffix}`,
    outputs: ['result'],
    inputs: [],
    position: { x: 40, y },
  });
  const statusNode = buildNode({
    id: `node-${suffix}`,
    inputs: ['input'],
    outputs: ['result'],
    position: { x: 320, y },
  });
  const downstreamNode = buildNode({
    id: `node-downstream-${suffix}`,
    inputs: ['input'],
    outputs: [],
    position: { x: 620, y },
  });
  const incomingEdge: Edge = {
    id: `edge-incoming-${suffix}`,
    from: upstreamNode.id,
    to: statusNode.id,
    fromPort: 'result',
    toPort: 'input',
  };
  const outgoingEdge: Edge = {
    id: `edge-outgoing-${suffix}`,
    from: statusNode.id,
    to: downstreamNode.id,
    fromPort: 'result',
    toPort: 'input',
  };

  return renderEdgeLayer(
    buildEdgeLayerValue({
      nodes: [upstreamNode, statusNode, downstreamNode],
      edges: [incomingEdge, outgoingEdge],
      edgePaths: [
        buildEdgePathValue(incomingEdge, incomingPath, {
          minX: 180,
          minY: y + 20,
          maxX: 300,
          maxY: y + 20,
        }),
        buildEdgePathValue(outgoingEdge, outgoingPath, {
          minX: 460,
          minY: y + 20,
          maxX: 580,
          maxY: y + 20,
        }),
      ],
      runtimeNodeStatuses: {
        [statusNode.id]: status,
      },
    })
  );
};

describe('canvas connection preview', () => {
  it('renders transient connecting preview path while dragging a connection', () => {
    const value = buildContextValue();
    const { container } = renderEdgeLayer(value);

    const previewPath = container.querySelector('[data-connecting-preview="true"]');
    expect(previewPath).toBeTruthy();
    expect(previewPath?.closest('[data-canvas-world="true"]')).toBeTruthy();
  });

  it('forwards real pointer events from output connector start handlers', () => {
    const onStartConnection = vi.fn();
    const { container, node } = renderNodePorts({
      contextOverrides: {
        onStartConnection,
      },
    });

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

  it('pins output connector tooltip on pointer tap without drag movement', () => {
    const onStartConnection = vi.fn();
    const onCompleteConnection = vi.fn();
    const setPinnedConnectorKey = vi.fn();
    const { container } = renderNodePorts({
      contextOverrides: {
        onStartConnection,
        onCompleteConnection,
        setPinnedConnectorKey,
      },
    });

    const outputPort = container.querySelector('circle[data-port="output"]');
    expect(outputPort).toBeTruthy();
    if (!outputPort) return;

    fireEvent.pointerDown(outputPort, {
      pointerId: 21,
      clientX: 240,
      clientY: 180,
      button: 0,
      buttons: 1,
    });
    fireEvent.pointerUp(outputPort, {
      pointerId: 21,
      clientX: 240,
      clientY: 180,
      button: 0,
      buttons: 0,
    });

    expect(onStartConnection).toHaveBeenCalledTimes(1);
    expect(onCompleteConnection).toHaveBeenCalledTimes(1);
    expect(setPinnedConnectorKey).toHaveBeenCalledWith('output:node-preview:result');
  });

  it('does not pin output connector tooltip when pointer drag movement exceeds threshold', () => {
    const onCompleteConnection = vi.fn();
    const setPinnedConnectorKey = vi.fn();
    const { container } = renderNodePorts({
      contextOverrides: {
        onCompleteConnection,
        setPinnedConnectorKey,
      },
    });

    const outputPort = container.querySelector('circle[data-port="output"]');
    expect(outputPort).toBeTruthy();
    if (!outputPort) return;

    fireEvent.pointerDown(outputPort, {
      pointerId: 22,
      clientX: 240,
      clientY: 180,
      button: 0,
      buttons: 1,
    });
    fireEvent.pointerMove(outputPort, {
      pointerId: 22,
      clientX: 260,
      clientY: 205,
      button: 0,
      buttons: 1,
    });
    fireEvent.pointerUp(outputPort, {
      pointerId: 22,
      clientX: 260,
      clientY: 205,
      button: 0,
      buttons: 0,
    });

    expect(onCompleteConnection).toHaveBeenCalledTimes(1);
    expect(setPinnedConnectorKey).not.toHaveBeenCalled();
  });

  it('freezes connector hover payload updates while a connector is pinned', () => {
    const onConnectorHover = vi.fn();
    const { container } = renderNodePorts({
      contextOverrides: {
        pinnedConnectorKey: 'output:node-preview:result',
        onConnectorHover,
      },
    });

    const outputPort = container.querySelector('circle[data-port="output"]');
    expect(outputPort).toBeTruthy();
    if (!outputPort) return;

    fireEvent.pointerEnter(outputPort, {
      pointerId: 23,
      clientX: 240,
      clientY: 180,
      button: 0,
      buttons: 0,
    });
    fireEvent.pointerMove(outputPort, {
      pointerId: 23,
      clientX: 268,
      clientY: 208,
      button: 0,
      buttons: 0,
    });

    expect(onConnectorHover).not.toHaveBeenCalled();
  });

  it('captures a fresh tooltip payload when tapping a new connector while another is pinned', () => {
    const onConnectorHover = vi.fn();
    const setPinnedConnectorKey = vi.fn();
    const { container } = renderNodePorts({
      contextOverrides: {
        pinnedConnectorKey: 'output:node-other:result',
        onConnectorHover,
        setPinnedConnectorKey,
      },
    });

    const outputPort = container.querySelector('circle[data-port="output"]');
    expect(outputPort).toBeTruthy();
    if (!outputPort) return;

    fireEvent.pointerDown(outputPort, {
      pointerId: 24,
      clientX: 240,
      clientY: 180,
      button: 0,
      buttons: 1,
    });
    fireEvent.pointerUp(outputPort, {
      pointerId: 24,
      clientX: 240,
      clientY: 180,
      button: 0,
      buttons: 0,
    });

    expect(onConnectorHover).toHaveBeenCalledTimes(1);
    expect(setPinnedConnectorKey).toHaveBeenCalledWith('output:node-preview:result');
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
    const { container } = renderSingleEdgeWireFlow({
      edgeId: 'edge-running-status',
      path: 'M 380 162 C 420 162 470 244 540 244',
      sourceNode,
      targetNode,
      statusByNodeId: {
        [targetNode.id]: 'running',
      },
    });

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
    const { container } = renderSingleEdgeWireFlow({
      edgeId: 'edge-processing-status',
      path: 'M 380 162 C 420 162 470 244 540 244',
      sourceNode,
      targetNode,
      statusByNodeId: {
        [targetNode.id]: 'processing',
      },
    });

    expect(container.querySelector('.ai-paths-wire-flow')).toBeTruthy();
  });

  it('does not render wire flow when the target node is only pending', () => {
    const sourceNode = buildNode({
      id: 'node-pending-source',
      outputs: ['result'],
      inputs: [],
      position: { x: 120, y: 80 },
    });
    const targetNode = buildNode({
      id: 'node-pending-target',
      inputs: ['input'],
      outputs: [],
      position: { x: 420, y: 220 },
    });
    const { container } = renderSingleEdgeWireFlow({
      edgeId: 'edge-pending-status',
      path: 'M 380 162 C 420 162 470 244 540 244',
      sourceNode,
      targetNode,
      statusByNodeId: {
        [targetNode.id]: 'pending',
      },
    });

    expect(container.querySelector('.ai-paths-wire-flow')).toBeFalsy();
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
    const { container } = renderSingleEdgeWireFlow({
      edgeId: 'edge-queued-status',
      path: 'M 380 162 C 420 162 470 244 540 244',
      sourceNode,
      targetNode,
      statusByNodeId: {
        [sourceNode.id]: 'queued',
      },
    });

    expect(container.querySelector('.ai-paths-wire-flow')).toBeFalsy();
  });

  it('animates only the edge into a processing model node in a fetched-db-model-dbquery chain', () => {
    const { container } = renderDatabaseModelChainWireFlow({
      suffix: 'running',
      y: 120,
      fetchedToDbPath: 'M 180 140 C 210 140 230 140 250 140',
      dbToModelPath: 'M 400 140 C 430 140 450 140 470 140',
      modelToDbQueryPath: 'M 620 140 C 650 140 670 140 690 140',
      modelStatus: 'running',
    });

    const flowingPaths = Array.from(container.querySelectorAll('.ai-paths-wire-flow'));
    expect(flowingPaths).toHaveLength(1);
    expect(flowingPaths[0]?.getAttribute('d')).toBe('M 400 140 C 430 140 450 140 470 140');
  });

  it('does not animate chain edges while the model node is waiting_callback', () => {
    const { container } = renderDatabaseModelChainWireFlow({
      suffix: 'waiting',
      y: 220,
      fetchedToDbPath: 'M 180 240 C 210 240 230 240 250 240',
      dbToModelPath: 'M 400 240 C 430 240 450 240 470 240',
      modelToDbQueryPath: 'M 620 240 C 650 240 670 240 690 240',
      modelStatus: 'waiting_callback',
    });

    const flowingPaths = Array.from(container.querySelectorAll('.ai-paths-wire-flow'));
    expect(flowingPaths).toHaveLength(0);
  });

  it('does not animate chain edges while the model node is blocked', () => {
    const { container } = renderDatabaseModelChainWireFlow({
      suffix: 'blocked',
      y: 280,
      fetchedToDbPath: 'M 180 300 C 210 300 230 300 250 300',
      dbToModelPath: 'M 400 300 C 430 300 450 300 470 300',
      modelToDbQueryPath: 'M 620 300 C 650 300 670 300 690 300',
      modelStatus: 'blocked',
    });

    const flowingPaths = Array.from(container.querySelectorAll('.ai-paths-wire-flow'));
    expect(flowingPaths).toHaveLength(0);
  });

  it('does not render status-based wire flow for waiting_callback nodes', () => {
    const { container } = renderStatusNodeWireFlow({
      suffix: 'waiting',
      y: 120,
      status: 'waiting_callback',
      incomingPath: 'M 180 140 C 220 140 260 140 300 140',
      outgoingPath: 'M 460 140 C 500 140 540 140 580 140',
    });

    const flowingPaths = Array.from(container.querySelectorAll('.ai-paths-wire-flow'));
    expect(flowingPaths).toHaveLength(0);
  });

  it('does not render status-based wire flow for skipped nodes', () => {
    const { container } = renderStatusNodeWireFlow({
      suffix: 'skipped',
      y: 220,
      status: 'skipped',
      incomingPath: 'M 180 240 C 220 240 260 240 300 240',
      outgoingPath: 'M 460 240 C 500 240 540 240 580 240',
    });

    const flowingPaths = Array.from(container.querySelectorAll('.ai-paths-wire-flow'));
    expect(flowingPaths).toHaveLength(0);
  });
});
