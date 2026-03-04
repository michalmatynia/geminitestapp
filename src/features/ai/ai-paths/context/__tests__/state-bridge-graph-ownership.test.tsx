import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { useStateBridgeGraph } from '@/features/ai/ai-paths/context/hooks/useStateBridge';
import {
  AiPathsProvider,
  useGraphActions,
  useGraphState,
} from '@/features/ai/ai-paths/context';
import type { AiNode, Edge } from '@/shared/lib/ai-paths';

const buildNode = (id: string, x: number, y: number): AiNode =>
  ({
    id,
    type: 'template',
    title: id,
    description: '',
    inputs: [],
    outputs: [],
    position: { x, y },
    data: {},
  }) as AiNode;

const serializeNodes = (nodes: AiNode[]): string =>
  nodes
    .map((node) => `${node.id}:${node.position.x},${node.position.y}`)
    .sort()
    .join('|');

const serializeEdges = (edges: Edge[]): string =>
  edges
    .map((edge) => `${edge.id}:${edge.from}.${edge.fromPort}->${edge.to}.${edge.toPort}`)
    .sort()
    .join('|');

function GraphBridgeOwnershipHarness(): React.JSX.Element {
  const [sourceNodes, setSourceNodes] = React.useState<AiNode[]>([
    buildNode('node-1', 120, 140),
  ]);
  const [sourceEdges, setSourceEdges] = React.useState<Edge[]>([]);
  const [legacyRerenderTick, setLegacyRerenderTick] = React.useState(0);
  const { nodes: contextNodes, edges: contextEdges } = useGraphState();
  const { setNodes, setEdges } = useGraphActions();

  useStateBridgeGraph({
    nodes: sourceNodes,
    edges: sourceEdges,
    onNodesChangeFromContext: setSourceNodes,
    onEdgesChangeFromContext: setSourceEdges,
  });

  return (
    <div data-tick={legacyRerenderTick}>
      <output data-testid='source-nodes'>{serializeNodes(sourceNodes)}</output>
      <output data-testid='context-nodes'>{serializeNodes(contextNodes)}</output>
      <output data-testid='source-edges'>{serializeEdges(sourceEdges)}</output>
      <output data-testid='context-edges'>{serializeEdges(contextEdges)}</output>
      <button
        type='button'
        onClick={() => {
          setNodes((prev: AiNode[]) => [...prev, buildNode('node-2', 360, 320)]);
        }}
      >
        context-add-node
      </button>
      <button
        type='button'
        onClick={() => {
          setNodes((prev: AiNode[]) =>
            prev.map((node: AiNode): AiNode =>
              node.id === 'node-1'
                ? {
                    ...node,
                    position: { x: 640, y: 500 },
                  }
                : node
            )
          );
        }}
      >
        context-move-node
      </button>
      <button
        type='button'
        onClick={() => {
          setEdges((prev: Edge[]) => [
            ...prev.filter((edge: Edge) => edge.id !== 'edge-1'),
            {
              id: 'edge-1',
              from: 'node-1',
              fromPort: 'result',
              to: 'node-2',
              toPort: 'value',
            },
          ]);
        }}
      >
        context-add-edge
      </button>
      <button
        type='button'
        onClick={() => {
          setLegacyRerenderTick((prev) => prev + 1);
        }}
      >
        legacy-rerender
      </button>
    </div>
  );
}

describe('AI Paths state bridge graph ownership', () => {
  it('persists context-originated node and edge updates without bridge echo reverts', async () => {
    const { getByRole, getByTestId } = render(
      <AiPathsProvider initialNodes={[buildNode('node-1', 120, 140)]} initialEdges={[]}>
        <GraphBridgeOwnershipHarness />
      </AiPathsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('source-nodes')).toHaveTextContent('node-1:120,140');
      expect(getByTestId('context-nodes')).toHaveTextContent('node-1:120,140');
    });

    fireEvent.click(getByRole('button', { name: 'context-add-node' }));
    fireEvent.click(getByRole('button', { name: 'context-add-edge' }));

    await waitFor(() => {
      expect(getByTestId('source-nodes')).toHaveTextContent('node-1:120,140|node-2:360,320');
      expect(getByTestId('context-nodes')).toHaveTextContent('node-1:120,140|node-2:360,320');
      expect(getByTestId('source-edges')).toHaveTextContent('edge-1:node-1.result->node-2.value');
      expect(getByTestId('context-edges')).toHaveTextContent(
        'edge-1:node-1.result->node-2.value'
      );
    });

    fireEvent.click(getByRole('button', { name: 'context-move-node' }));
    fireEvent.click(getByRole('button', { name: 'legacy-rerender' }));

    await waitFor(() => {
      expect(getByTestId('source-nodes')).toHaveTextContent('node-1:640,500|node-2:360,320');
      expect(getByTestId('context-nodes')).toHaveTextContent('node-1:640,500|node-2:360,320');
      expect(getByTestId('source-edges')).toHaveTextContent('edge-1:node-1.result->node-2.value');
      expect(getByTestId('context-edges')).toHaveTextContent(
        'edge-1:node-1.result->node-2.value'
      );
    });
  });
});
