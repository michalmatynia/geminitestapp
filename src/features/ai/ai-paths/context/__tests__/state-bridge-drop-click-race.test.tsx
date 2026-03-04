import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  AiPathsProvider,
  useGraphActions,
  useGraphState,
} from '@/features/ai/ai-paths/context';
import { useStateBridgeGraph } from '@/features/ai/ai-paths/context/__tests__/helpers/useStateBridge';
import { normalizeNodes, type AiNode, type Edge } from '@/shared/lib/ai-paths';

const buildNode = (id: string, x: number, y: number): AiNode =>
  normalizeNodes([
    {
      id,
      type: 'template',
      title: id,
      description: '',
      inputs: [],
      outputs: [],
      position: { x, y },
      data: {},
    } as AiNode,
  ])[0] as AiNode;

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

function BridgePathSwitchHarness(): React.JSX.Element {
  const [sourceActivePathId, setSourceActivePathId] = React.useState<string | null>('path-a');
  const [sourceNodes, setSourceNodes] = React.useState<AiNode[]>([buildNode('path-a-node-1', 80, 96)]);
  const [sourceEdges, setSourceEdges] = React.useState<Edge[]>([]);
  const pendingNodesRef = React.useRef<AiNode[] | null>(null);
  const pendingEdgesRef = React.useRef<Edge[] | null>(null);
  const { nodes: contextNodes } = useGraphState();
  const { setNodes } = useGraphActions();

  useStateBridgeGraph({
    nodes: sourceNodes,
    edges: sourceEdges,
    activePathId: sourceActivePathId,
    onNodesChangeFromContext: (nextNodes) => {
      pendingNodesRef.current = nextNodes;
    },
    onEdgesChangeFromContext: (nextEdges) => {
      pendingEdgesRef.current = nextEdges;
    },
  });

  return (
    <div>
      <output data-testid='switch-source-path'>{sourceActivePathId ?? 'none'}</output>
      <output data-testid='switch-source-nodes'>{serializeNodes(sourceNodes)}</output>
      <output data-testid='switch-context-nodes'>{serializeNodes(contextNodes)}</output>
      <button
        type='button'
        onClick={() =>
          setNodes((prev: AiNode[]) => [...prev, buildNode('path-a-node-2', 240, 220)], {
            reason: 'drop',
            source: 'test.path-switch.context-drop',
          })
        }
      >
        context-add-path-a-node
      </button>
      <button
        type='button'
        onClick={() => {
          setSourceActivePathId('path-b');
          setSourceNodes([buildNode('path-b-node-1', 640, 420)]);
          setSourceEdges([]);
          pendingNodesRef.current = null;
          pendingEdgesRef.current = null;
        }}
      >
        source-switch-to-path-b
      </button>
    </div>
  );
}

function BridgePathSwitchImmediateEchoHarness(): React.JSX.Element {
  const [sourceActivePathId, setSourceActivePathId] = React.useState<string | null>('path-a');
  const [sourceNodes, setSourceNodes] = React.useState<AiNode[]>([buildNode('path-a-node-1', 80, 96)]);
  const [sourceEdges, setSourceEdges] = React.useState<Edge[]>([]);
  const [legacyTick, setLegacyTick] = React.useState(0);
  const { nodes: contextNodes } = useGraphState();
  const { setNodes } = useGraphActions();

  useStateBridgeGraph({
    nodes: sourceNodes,
    edges: sourceEdges,
    activePathId: sourceActivePathId,
    onNodesChangeFromContext: setSourceNodes,
    onEdgesChangeFromContext: setSourceEdges,
  });

  return (
    <div data-testid='immediate-legacy-tick' data-value={legacyTick}>
      <output data-testid='immediate-source-path'>{sourceActivePathId ?? 'none'}</output>
      <output data-testid='immediate-source-nodes'>{serializeNodes(sourceNodes)}</output>
      <output data-testid='immediate-context-nodes'>{serializeNodes(contextNodes)}</output>
      <button
        type='button'
        onClick={() =>
          setNodes((prev: AiNode[]) => [...prev, buildNode('path-a-node-2', 240, 220)], {
            reason: 'drop',
            source: 'test.path-switch-immediate.context-drop',
          })
        }
      >
        immediate-context-add-path-a-node
      </button>
      <button
        type='button'
        onClick={() => {
          setSourceActivePathId('path-b');
          setSourceNodes([buildNode('path-b-node-1', 640, 420)]);
          setSourceEdges([]);
        }}
      >
        immediate-source-switch-to-path-b
      </button>
      <button type='button' onClick={() => setLegacyTick((prev) => prev + 1)}>
        immediate-legacy-rerender
      </button>
    </div>
  );
}

function BridgePathSwitchDelayedGraphHarness(): React.JSX.Element {
  const [sourceActivePathId, setSourceActivePathId] = React.useState<string | null>('path-a');
  const [sourceNodes, setSourceNodes] = React.useState<AiNode[]>([buildNode('path-a-node-1', 80, 96)]);
  const [sourceEdges, setSourceEdges] = React.useState<Edge[]>([]);
  const { nodes: contextNodes } = useGraphState();

  useStateBridgeGraph({
    nodes: sourceNodes,
    edges: sourceEdges,
    activePathId: sourceActivePathId,
    onNodesChangeFromContext: setSourceNodes,
    onEdgesChangeFromContext: setSourceEdges,
  });

  return (
    <div>
      <output data-testid='delayed-source-path'>{sourceActivePathId ?? 'none'}</output>
      <output data-testid='delayed-source-nodes'>{serializeNodes(sourceNodes)}</output>
      <output data-testid='delayed-context-nodes'>{serializeNodes(contextNodes)}</output>
      <button type='button' onClick={() => setSourceActivePathId('path-b')}>
        delayed-source-switch-path-only
      </button>
      <button
        type='button'
        onClick={() => {
          setSourceNodes([buildNode('path-b-node-1', 640, 420)]);
          setSourceEdges([]);
        }}
      >
        delayed-source-apply-path-b-graph
      </button>
    </div>
  );
}

function BridgeTransitionGateDropProtectionHarness(): React.JSX.Element {
  const [sourceActivePathId, setSourceActivePathId] = React.useState<string | null>('path-a');
  const [sourceNodes, setSourceNodes] = React.useState<AiNode[]>([buildNode('path-a-node-1', 80, 96)]);
  const [sourceEdges, setSourceEdges] = React.useState<Edge[]>([]);
  const { nodes: contextNodes } = useGraphState();
  const { setNodes } = useGraphActions();

  useStateBridgeGraph({
    nodes: sourceNodes,
    edges: sourceEdges,
    activePathId: sourceActivePathId,
    onNodesChangeFromContext: setSourceNodes,
    onEdgesChangeFromContext: setSourceEdges,
  });

  return (
    <div>
      <output data-testid='transition-source-path'>{sourceActivePathId ?? 'none'}</output>
      <output data-testid='transition-source-nodes'>{serializeNodes(sourceNodes)}</output>
      <output data-testid='transition-context-nodes'>{serializeNodes(contextNodes)}</output>
      <button type='button' onClick={() => setSourceActivePathId('path-b')}>
        transition-switch-path-only
      </button>
      <button
        type='button'
        onClick={() =>
          setNodes((prev: AiNode[]) => [...prev, buildNode('path-b-node-2', 240, 220)], {
            reason: 'drop',
            source: 'test.transition-gate.drop',
          })
        }
      >
        transition-context-add-node
      </button>
      <button
        type='button'
        onClick={() =>
          setNodes(
            (prev: AiNode[]) =>
              prev.map((node: AiNode): AiNode =>
                node.id === 'path-b-node-2' ? { ...node, position: { x: 360, y: 300 } } : node
              ),
            {
              reason: 'drag',
              source: 'test.transition-gate.drag',
            }
          )
        }
      >
        transition-context-move-node
      </button>
      <button
        type='button'
        onClick={() => {
          setSourceNodes([buildNode('path-b-node-1', 640, 420)]);
          setSourceEdges([]);
        }}
      >
        transition-apply-path-b-graph
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

  it('applies path switch source graph immediately even with unresolved pending sync from previous path', async () => {
    const { getByRole, getByTestId } = render(
      <AiPathsProvider initialNodes={[buildNode('path-a-node-1', 80, 96)]} initialEdges={[]}>
        <BridgePathSwitchHarness />
      </AiPathsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('switch-source-path')).toHaveTextContent('path-a');
      expect(getByTestId('switch-source-nodes')).toHaveTextContent('path-a-node-1:80,96');
      expect(getByTestId('switch-context-nodes')).toHaveTextContent('path-a-node-1:80,96');
    });

    fireEvent.click(getByRole('button', { name: 'context-add-path-a-node' }));

    await waitFor(() => {
      expect(getByTestId('switch-context-nodes')).toHaveTextContent(
        'path-a-node-1:80,96|path-a-node-2:240,220'
      );
      expect(getByTestId('switch-source-nodes')).toHaveTextContent('path-a-node-1:80,96');
    });

    fireEvent.click(getByRole('button', { name: 'source-switch-to-path-b' }));

    await waitFor(() => {
      expect(getByTestId('switch-source-path')).toHaveTextContent('path-b');
      expect(getByTestId('switch-source-nodes')).toHaveTextContent('path-b-node-1:640,420');
      expect(getByTestId('switch-context-nodes')).toHaveTextContent('path-b-node-1:640,420');
    });
  });

  it('keeps path switch authoritative when context->source callbacks apply immediately', async () => {
    const { getByRole, getByTestId } = render(
      <AiPathsProvider initialNodes={[buildNode('path-a-node-1', 80, 96)]} initialEdges={[]}>
        <BridgePathSwitchImmediateEchoHarness />
      </AiPathsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('immediate-source-path')).toHaveTextContent('path-a');
      expect(getByTestId('immediate-source-nodes')).toHaveTextContent('path-a-node-1:80,96');
      expect(getByTestId('immediate-context-nodes')).toHaveTextContent('path-a-node-1:80,96');
    });

    fireEvent.click(getByRole('button', { name: 'immediate-context-add-path-a-node' }));

    await waitFor(() => {
      expect(getByTestId('immediate-source-nodes')).toHaveTextContent(
        'path-a-node-1:80,96|path-a-node-2:240,220'
      );
      expect(getByTestId('immediate-context-nodes')).toHaveTextContent(
        'path-a-node-1:80,96|path-a-node-2:240,220'
      );
    });

    fireEvent.click(getByRole('button', { name: 'immediate-source-switch-to-path-b' }));

    await waitFor(() => {
      expect(getByTestId('immediate-source-path')).toHaveTextContent('path-b');
      expect(getByTestId('immediate-source-nodes')).toHaveTextContent('path-b-node-1:640,420');
      expect(getByTestId('immediate-context-nodes')).toHaveTextContent('path-b-node-1:640,420');
    });

    fireEvent.click(getByRole('button', { name: 'immediate-legacy-rerender' }));

    await waitFor(() => {
      expect(getByTestId('immediate-source-path')).toHaveTextContent('path-b');
      expect(getByTestId('immediate-source-nodes')).toHaveTextContent('path-b-node-1:640,420');
      expect(getByTestId('immediate-context-nodes')).toHaveTextContent('path-b-node-1:640,420');
    });
  });

  it('keeps transition gate active when path id changes before source graph payload arrives', async () => {
    const { getByRole, getByTestId } = render(
      <AiPathsProvider initialNodes={[buildNode('path-a-node-1', 80, 96)]} initialEdges={[]}>
        <BridgePathSwitchDelayedGraphHarness />
      </AiPathsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('delayed-source-path')).toHaveTextContent('path-a');
      expect(getByTestId('delayed-source-nodes')).toHaveTextContent('path-a-node-1:80,96');
      expect(getByTestId('delayed-context-nodes')).toHaveTextContent('path-a-node-1:80,96');
    });

    fireEvent.click(getByRole('button', { name: 'delayed-source-switch-path-only' }));

    await waitFor(() => {
      expect(getByTestId('delayed-source-path')).toHaveTextContent('path-b');
      expect(getByTestId('delayed-source-nodes')).toHaveTextContent('path-a-node-1:80,96');
      expect(getByTestId('delayed-context-nodes')).toHaveTextContent('path-a-node-1:80,96');
    });

    fireEvent.click(getByRole('button', { name: 'delayed-source-apply-path-b-graph' }));

    await waitFor(() => {
      expect(getByTestId('delayed-source-path')).toHaveTextContent('path-b');
      expect(getByTestId('delayed-source-nodes')).toHaveTextContent('path-b-node-1:640,420');
      expect(getByTestId('delayed-context-nodes')).toHaveTextContent('path-b-node-1:640,420');
    });
  });

  it('does not drop context-added nodes during a stalled path transition gate', async () => {
    const { getByRole, getByTestId } = render(
      <AiPathsProvider initialNodes={[buildNode('path-a-node-1', 80, 96)]} initialEdges={[]}>
        <BridgeTransitionGateDropProtectionHarness />
      </AiPathsProvider>
    );

    await waitFor(() => {
      expect(getByTestId('transition-source-path')).toHaveTextContent('path-a');
      expect(getByTestId('transition-source-nodes')).toHaveTextContent('path-a-node-1:80,96');
      expect(getByTestId('transition-context-nodes')).toHaveTextContent('path-a-node-1:80,96');
    });

    fireEvent.click(getByRole('button', { name: 'transition-switch-path-only' }));

    await waitFor(() => {
      expect(getByTestId('transition-source-path')).toHaveTextContent('path-b');
      expect(getByTestId('transition-source-nodes')).toHaveTextContent('path-a-node-1:80,96');
      expect(getByTestId('transition-context-nodes')).toHaveTextContent('path-a-node-1:80,96');
    });

    fireEvent.click(getByRole('button', { name: 'transition-context-add-node' }));

    await waitFor(() => {
      expect(getByTestId('transition-context-nodes')).toHaveTextContent(
        'path-a-node-1:80,96|path-b-node-2:240,220'
      );
      expect(getByTestId('transition-source-nodes')).toHaveTextContent('path-a-node-1:80,96');
    });

    fireEvent.click(getByRole('button', { name: 'transition-context-move-node' }));

    await waitFor(() => {
      expect(getByTestId('transition-context-nodes')).toHaveTextContent(
        'path-a-node-1:80,96|path-b-node-2:360,300'
      );
    });

    fireEvent.click(getByRole('button', { name: 'transition-apply-path-b-graph' }));

    await waitFor(() => {
      expect(getByTestId('transition-source-nodes')).toHaveTextContent('path-b-node-1:640,420');
      expect(getByTestId('transition-context-nodes')).toHaveTextContent('path-b-node-1:640,420');
    });
  });
});
