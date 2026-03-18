import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge } from '@/shared/lib/ai-paths';

import { CanvasBoardUIProvider } from '../CanvasBoardUIContext';
import { CanvasSvgEdgeLayer } from '../canvas-svg-edge-layer';
import {
  buildContextValue,
  buildNode,
  renderNodePorts,
} from './canvas-connection-preview.test.fixtures';

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
    const edge: Edge = {
      id: 'edge-pending-status',
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
      [targetNode.id]: 'pending',
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

  it('animates only the edge into a processing model node in a fetched-db-model-dbquery chain', () => {
    const fetchedNode = buildNode({
      id: 'node-fetched',
      type: 'fetcher',
      outputs: ['bundle'],
      inputs: [],
      position: { x: 40, y: 120 },
    });
    const databaseNode = buildNode({
      id: 'node-database',
      type: 'database',
      inputs: ['bundle'],
      outputs: ['result'],
      position: { x: 260, y: 120 },
    });
    const modelNode = buildNode({
      id: 'node-model',
      type: 'model',
      inputs: ['prompt'],
      outputs: ['result'],
      position: { x: 480, y: 120 },
    });
    const dbQueryNode = buildNode({
      id: 'node-db-query',
      type: 'database',
      inputs: ['query'],
      outputs: ['result'],
      position: { x: 700, y: 120 },
    });

    const edgeFetchedToDb: Edge = {
      id: 'edge-fetched-db',
      from: fetchedNode.id,
      to: databaseNode.id,
      fromPort: 'bundle',
      toPort: 'bundle',
    };
    const edgeDbToModel: Edge = {
      id: 'edge-db-model',
      from: databaseNode.id,
      to: modelNode.id,
      fromPort: 'result',
      toPort: 'prompt',
    };
    const edgeModelToDbQuery: Edge = {
      id: 'edge-model-db-query',
      from: modelNode.id,
      to: dbQueryNode.id,
      fromPort: 'result',
      toPort: 'query',
    };

    const value = buildContextValue();
    value.nodes = [fetchedNode, databaseNode, modelNode, dbQueryNode];
    value.edges = [edgeFetchedToDb, edgeDbToModel, edgeModelToDbQuery];
    value.nodeById = new Map([
      [fetchedNode.id, fetchedNode],
      [databaseNode.id, databaseNode],
      [modelNode.id, modelNode],
      [dbQueryNode.id, dbQueryNode],
    ]);
    value.edgeMetaMap = new Map([
      [edgeFetchedToDb.id, edgeFetchedToDb],
      [edgeDbToModel.id, edgeDbToModel],
      [edgeModelToDbQuery.id, edgeModelToDbQuery],
    ]);
    value.edgePaths = [
      {
        id: edgeFetchedToDb.id,
        path: 'M 180 140 C 210 140 230 140 250 140',
        fromNodeId: fetchedNode.id,
        toNodeId: databaseNode.id,
        bounds: { minX: 180, minY: 140, maxX: 250, maxY: 140 },
      },
      {
        id: edgeDbToModel.id,
        path: 'M 400 140 C 430 140 450 140 470 140',
        fromNodeId: databaseNode.id,
        toNodeId: modelNode.id,
        bounds: { minX: 400, minY: 140, maxX: 470, maxY: 140 },
      },
      {
        id: edgeModelToDbQuery.id,
        path: 'M 620 140 C 650 140 670 140 690 140',
        fromNodeId: modelNode.id,
        toNodeId: dbQueryNode.id,
        bounds: { minX: 620, minY: 140, maxX: 690, maxY: 140 },
      },
    ];
    value.runtimeNodeStatuses = {
      [databaseNode.id]: 'completed',
      [modelNode.id]: 'running',
      [dbQueryNode.id]: 'queued',
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
    expect(flowingPaths).toHaveLength(1);
    expect(flowingPaths[0]?.getAttribute('d')).toBe('M 400 140 C 430 140 450 140 470 140');
  });

  it('does not animate chain edges while the model node is waiting_callback', () => {
    const fetchedNode = buildNode({
      id: 'node-fetched-waiting',
      type: 'fetcher',
      outputs: ['bundle'],
      inputs: [],
      position: { x: 40, y: 220 },
    });
    const databaseNode = buildNode({
      id: 'node-database-waiting',
      type: 'database',
      inputs: ['bundle'],
      outputs: ['result'],
      position: { x: 260, y: 220 },
    });
    const modelNode = buildNode({
      id: 'node-model-waiting',
      type: 'model',
      inputs: ['prompt'],
      outputs: ['result'],
      position: { x: 480, y: 220 },
    });
    const dbQueryNode = buildNode({
      id: 'node-db-query-waiting',
      type: 'database',
      inputs: ['query'],
      outputs: ['result'],
      position: { x: 700, y: 220 },
    });

    const edgeFetchedToDb: Edge = {
      id: 'edge-fetched-db-waiting',
      from: fetchedNode.id,
      to: databaseNode.id,
      fromPort: 'bundle',
      toPort: 'bundle',
    };
    const edgeDbToModel: Edge = {
      id: 'edge-db-model-waiting',
      from: databaseNode.id,
      to: modelNode.id,
      fromPort: 'result',
      toPort: 'prompt',
    };
    const edgeModelToDbQuery: Edge = {
      id: 'edge-model-db-query-waiting',
      from: modelNode.id,
      to: dbQueryNode.id,
      fromPort: 'result',
      toPort: 'query',
    };

    const value = buildContextValue();
    value.nodes = [fetchedNode, databaseNode, modelNode, dbQueryNode];
    value.edges = [edgeFetchedToDb, edgeDbToModel, edgeModelToDbQuery];
    value.nodeById = new Map([
      [fetchedNode.id, fetchedNode],
      [databaseNode.id, databaseNode],
      [modelNode.id, modelNode],
      [dbQueryNode.id, dbQueryNode],
    ]);
    value.edgeMetaMap = new Map([
      [edgeFetchedToDb.id, edgeFetchedToDb],
      [edgeDbToModel.id, edgeDbToModel],
      [edgeModelToDbQuery.id, edgeModelToDbQuery],
    ]);
    value.edgePaths = [
      {
        id: edgeFetchedToDb.id,
        path: 'M 180 240 C 210 240 230 240 250 240',
        fromNodeId: fetchedNode.id,
        toNodeId: databaseNode.id,
        bounds: { minX: 180, minY: 240, maxX: 250, maxY: 240 },
      },
      {
        id: edgeDbToModel.id,
        path: 'M 400 240 C 430 240 450 240 470 240',
        fromNodeId: databaseNode.id,
        toNodeId: modelNode.id,
        bounds: { minX: 400, minY: 240, maxX: 470, maxY: 240 },
      },
      {
        id: edgeModelToDbQuery.id,
        path: 'M 620 240 C 650 240 670 240 690 240',
        fromNodeId: modelNode.id,
        toNodeId: dbQueryNode.id,
        bounds: { minX: 620, minY: 240, maxX: 690, maxY: 240 },
      },
    ];
    value.runtimeNodeStatuses = {
      [databaseNode.id]: 'completed',
      [modelNode.id]: 'waiting_callback',
      [dbQueryNode.id]: 'queued',
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

  it('does not animate chain edges while the model node is blocked', () => {
    const fetchedNode = buildNode({
      id: 'node-fetched-blocked',
      type: 'fetcher',
      outputs: ['bundle'],
      inputs: [],
      position: { x: 40, y: 280 },
    });
    const databaseNode = buildNode({
      id: 'node-database-blocked',
      type: 'database',
      inputs: ['bundle'],
      outputs: ['result'],
      position: { x: 260, y: 280 },
    });
    const modelNode = buildNode({
      id: 'node-model-blocked',
      type: 'model',
      inputs: ['prompt'],
      outputs: ['result'],
      position: { x: 480, y: 280 },
    });
    const dbQueryNode = buildNode({
      id: 'node-db-query-blocked',
      type: 'database',
      inputs: ['query'],
      outputs: ['result'],
      position: { x: 700, y: 280 },
    });

    const edgeFetchedToDb: Edge = {
      id: 'edge-fetched-db-blocked',
      from: fetchedNode.id,
      to: databaseNode.id,
      fromPort: 'bundle',
      toPort: 'bundle',
    };
    const edgeDbToModel: Edge = {
      id: 'edge-db-model-blocked',
      from: databaseNode.id,
      to: modelNode.id,
      fromPort: 'result',
      toPort: 'prompt',
    };
    const edgeModelToDbQuery: Edge = {
      id: 'edge-model-db-query-blocked',
      from: modelNode.id,
      to: dbQueryNode.id,
      fromPort: 'result',
      toPort: 'query',
    };

    const value = buildContextValue();
    value.nodes = [fetchedNode, databaseNode, modelNode, dbQueryNode];
    value.edges = [edgeFetchedToDb, edgeDbToModel, edgeModelToDbQuery];
    value.nodeById = new Map([
      [fetchedNode.id, fetchedNode],
      [databaseNode.id, databaseNode],
      [modelNode.id, modelNode],
      [dbQueryNode.id, dbQueryNode],
    ]);
    value.edgeMetaMap = new Map([
      [edgeFetchedToDb.id, edgeFetchedToDb],
      [edgeDbToModel.id, edgeDbToModel],
      [edgeModelToDbQuery.id, edgeModelToDbQuery],
    ]);
    value.edgePaths = [
      {
        id: edgeFetchedToDb.id,
        path: 'M 180 300 C 210 300 230 300 250 300',
        fromNodeId: fetchedNode.id,
        toNodeId: databaseNode.id,
        bounds: { minX: 180, minY: 300, maxX: 250, maxY: 300 },
      },
      {
        id: edgeDbToModel.id,
        path: 'M 400 300 C 430 300 450 300 470 300',
        fromNodeId: databaseNode.id,
        toNodeId: modelNode.id,
        bounds: { minX: 400, minY: 300, maxX: 470, maxY: 300 },
      },
      {
        id: edgeModelToDbQuery.id,
        path: 'M 620 300 C 650 300 670 300 690 300',
        fromNodeId: modelNode.id,
        toNodeId: dbQueryNode.id,
        bounds: { minX: 620, minY: 300, maxX: 690, maxY: 300 },
      },
    ];
    value.runtimeNodeStatuses = {
      [databaseNode.id]: 'completed',
      [modelNode.id]: 'blocked',
      [dbQueryNode.id]: 'queued',
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

  it('does not render status-based wire flow for skipped nodes', () => {
    const upstreamNode = buildNode({
      id: 'node-upstream-skipped',
      outputs: ['result'],
      inputs: [],
      position: { x: 40, y: 220 },
    });
    const skippedNode = buildNode({
      id: 'node-skipped',
      inputs: ['input'],
      outputs: ['result'],
      position: { x: 320, y: 220 },
    });
    const downstreamNode = buildNode({
      id: 'node-downstream-skipped',
      inputs: ['input'],
      outputs: [],
      position: { x: 620, y: 220 },
    });

    const incomingEdge: Edge = {
      id: 'edge-incoming-skipped',
      from: upstreamNode.id,
      to: skippedNode.id,
      fromPort: 'result',
      toPort: 'input',
    };
    const outgoingEdge: Edge = {
      id: 'edge-outgoing-skipped',
      from: skippedNode.id,
      to: downstreamNode.id,
      fromPort: 'result',
      toPort: 'input',
    };

    const value = buildContextValue();
    value.nodes = [upstreamNode, skippedNode, downstreamNode];
    value.edges = [incomingEdge, outgoingEdge];
    value.nodeById = new Map([
      [upstreamNode.id, upstreamNode],
      [skippedNode.id, skippedNode],
      [downstreamNode.id, downstreamNode],
    ]);
    value.edgeMetaMap = new Map([
      [incomingEdge.id, incomingEdge],
      [outgoingEdge.id, outgoingEdge],
    ]);
    value.edgePaths = [
      {
        id: incomingEdge.id,
        path: 'M 180 240 C 220 240 260 240 300 240',
        fromNodeId: upstreamNode.id,
        toNodeId: skippedNode.id,
        bounds: { minX: 180, minY: 240, maxX: 300, maxY: 240 },
      },
      {
        id: outgoingEdge.id,
        path: 'M 460 240 C 500 240 540 240 580 240',
        fromNodeId: skippedNode.id,
        toNodeId: downstreamNode.id,
        bounds: { minX: 460, minY: 240, maxX: 580, maxY: 240 },
      },
    ];
    value.runtimeNodeStatuses = {
      [skippedNode.id]: 'skipped',
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
