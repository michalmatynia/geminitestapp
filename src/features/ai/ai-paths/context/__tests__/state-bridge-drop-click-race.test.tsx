import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  AiPathsProvider,
  useGraphActions,
  useGraphState,
} from '@/features/ai/ai-paths/context';
import { useStateBridgeGraph } from '@/features/ai/ai-paths/context/hooks/useStateBridge';
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

function BridgeDropClickRaceHarness(): React.JSX.Element {
  const [sourceNodes, setSourceNodes] = React.useState<AiNode[]>([buildNode('node-1', 120, 140)]);
  const [sourceEdges, setSourceEdges] = React.useState<Edge[]>([]);
  const [legacyTick, setLegacyTick] = React.useState(0);
  const pendingNodesRef = React.useRef<AiNode[] | null>(null);
  const { nodes: contextNodes } = useGraphState();
  const { setNodes } = useGraphActions();

  useStateBridgeGraph({
    nodes: sourceNodes,
    edges: sourceEdges,
    onNodesChangeFromContext: (nextNodes) => {
      pendingNodesRef.current = nextNodes;
    },
    onEdgesChangeFromContext: setSourceEdges,
  });

  return (
    <div data-testid='legacy-tick' data-value={legacyTick}>
      <output data-testid='source-nodes'>{serializeNodes(sourceNodes)}</output>
      <output data-testid='context-nodes'>{serializeNodes(contextNodes)}</output>
      <button
        type='button'
        onClick={() =>
          setNodes((prev: AiNode[]) => [...prev, buildNode('node-2', 320, 260)], {
            reason: 'drop',
            source: 'test.bridge-race.drop',
          })
        }
      >
        context-add-node
      </button>
      <button type='button' onClick={() => setLegacyTick((prev) => prev + 1)}>
        legacy-rerender
      </button>
      <button
        type='button'
        onClick={() => {
          if (pendingNodesRef.current) {
            setSourceNodes(pendingNodesRef.current);
            pendingNodesRef.current = null;
          }
        }}
      >
        apply-pending-context-to-source
      </button>
    </div>
  );
}

function GraphMutationGuardHarness(): React.JSX.Element {
  const { nodes } = useGraphState();
  const { setNodes } = useGraphActions();

  return (
    <div>
      <output data-testid='node-count'>{String(nodes.length)}</output>
      <button
        type='button'
        onClick={() => {
          setNodes(
            (prev: AiNode[]): AiNode[] => prev.filter((node: AiNode) => node.id !== 'node-2'),
            {
              reason: 'drag',
              source: 'test.non-destructive-drag',
            }
          );
        }}
      >
        non-destructive-shrink
      </button>
      <button
        type='button'
        onClick={() => {
          setNodes(
            (prev: AiNode[]): AiNode[] => prev.filter((node: AiNode) => node.id !== 'node-2'),
            {
              reason: 'delete',
              source: 'test.delete',
              allowNodeCountDecrease: true,
            }
          );
        }}
      >
        delete-shrink
      </button>
    </div>
  );
}

describe('AI Paths state bridge drop/click race protections', () => {
  it('prevents stale source->context sync from dropping a freshly added node', async () => {
    const { getByRole, getByTestId } = render(
      <AiPathsProvider initialNodes={[buildNode('node-1', 120, 140)]} initialEdges={[]}>
        <BridgeDropClickRaceHarness />
      </AiPathsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('source-nodes')).toHaveTextContent('node-1:120,140');
      expect(getByTestId('context-nodes')).toHaveTextContent('node-1:120,140');
    });

    fireEvent.click(getByRole('button', { name: 'context-add-node' }));
    fireEvent.click(getByRole('button', { name: 'legacy-rerender' }));

    await waitFor(() => {
      expect(getByTestId('source-nodes')).toHaveTextContent('node-1:120,140');
      expect(getByTestId('context-nodes')).toHaveTextContent('node-1:120,140|node-2:320,260');
    });

    fireEvent.click(getByRole('button', { name: 'apply-pending-context-to-source' }));

    await waitFor(() => {
      expect(getByTestId('source-nodes')).toHaveTextContent('node-1:120,140|node-2:320,260');
      expect(getByTestId('context-nodes')).toHaveTextContent('node-1:120,140|node-2:320,260');
    });
  });

  it('blocks node-count shrink for non-destructive mutations and allows explicit delete', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { getByRole, getByTestId } = render(
      <AiPathsProvider
        initialNodes={[buildNode('node-1', 120, 140), buildNode('node-2', 320, 260)]}
        initialEdges={[]}
      >
        <GraphMutationGuardHarness />
      </AiPathsProvider>
    );

    expect(getByTestId('node-count')).toHaveTextContent('2');

    fireEvent.click(getByRole('button', { name: 'non-destructive-shrink' }));
    await waitFor(() => {
      expect(getByTestId('node-count')).toHaveTextContent('2');
    });
    expect(warnSpy).toHaveBeenCalled();

    fireEvent.click(getByRole('button', { name: 'delete-shrink' }));
    await waitFor(() => {
      expect(getByTestId('node-count')).toHaveTextContent('1');
    });

    warnSpy.mockRestore();
  });
});
