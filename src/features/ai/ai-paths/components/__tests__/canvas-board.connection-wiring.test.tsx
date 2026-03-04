import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode } from '@/shared/lib/ai-paths';
import { AiPathsProvider, useGraphState } from '@/features/ai/ai-paths/context';
import { CanvasBoard } from '@/features/ai/ai-paths/components/canvas-board';
import { ToastProvider } from '@/shared/ui/toast';
import { useStateBridgeGraph } from '@/features/ai/ai-paths/context/hooks/useStateBridge';

const buildNode = (patch: Partial<AiNode>): AiNode =>
  ({
    id: patch.id ?? 'node',
    type: patch.type ?? 'template',
    title: patch.title ?? 'Node',
    description: '',
    inputs: patch.inputs ?? [],
    outputs: patch.outputs ?? [],
    position: patch.position ?? { x: 100, y: 100 },
    data: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: null,
    ...patch,
  }) as AiNode;

function EdgeCountProbe(): React.JSX.Element {
  const { edges } = useGraphState();
  return <output data-testid='edge-count'>{String(edges.length)}</output>;
}

function BridgeGraphProbe({
  initialNodes,
}: {
  initialNodes: AiNode[];
}): React.JSX.Element {
  const [sourceNodes, setSourceNodes] = React.useState<AiNode[]>(initialNodes);
  const [sourceEdges, setSourceEdges] = React.useState<never[]>([]);
  const { edges: contextEdges } = useGraphState();

  useStateBridgeGraph({
    nodes: sourceNodes,
    edges: sourceEdges,
    onNodesChangeFromContext: setSourceNodes,
    onEdgesChangeFromContext: (nextEdges) => setSourceEdges(nextEdges as never[]),
    activePathId: 'path-a',
  });

  return (
    <>
      <CanvasBoard confirmNodeSwitch={() => true} />
      <output data-testid='bridge-source-edge-count'>{String(sourceEdges.length)}</output>
      <output data-testid='bridge-context-edge-count'>{String(contextEdges.length)}</output>
    </>
  );
}

describe('CanvasBoard connector wiring', () => {
  it('creates an edge when dragging from output connector to input connector', async () => {
    const source = buildNode({
      id: 'node-a',
      title: 'Source',
      outputs: ['result'],
      position: { x: 120, y: 120 },
    });
    const target = buildNode({
      id: 'node-b',
      title: 'Target',
      inputs: ['value'],
      position: { x: 520, y: 140 },
    });

    const { container, getByTestId } = render(
      <ToastProvider>
        <AiPathsProvider initialNodes={[source, target]} initialEdges={[]}>
          <CanvasBoard confirmNodeSwitch={() => true} />
          <EdgeCountProbe />
        </AiPathsProvider>
      </ToastProvider>
    );

    const outputPort = container.querySelector(
      'circle[data-port="output"][data-node-id="node-a"][data-port-name="result"]'
    );
    const inputPort = container.querySelector(
      'circle[data-port="input"][data-node-id="node-b"][data-port-name="value"]'
    );
    expect(outputPort).toBeTruthy();
    expect(inputPort).toBeTruthy();
    if (!outputPort || !inputPort) return;

    fireEvent.pointerDown(outputPort, {
      pointerId: 1,
      clientX: 380,
      clientY: 220,
      buttons: 1,
    });

    await waitFor(() => {
      expect(container.querySelector('[data-connecting-preview="true"]')).toBeTruthy();
    });

    fireEvent.pointerUp(inputPort, {
      pointerId: 1,
      clientX: 520,
      clientY: 220,
      buttons: 0,
    });

    await waitFor(() => {
      expect(getByTestId('edge-count')).toHaveTextContent('1');
    });
  });

  it('still allows connector wiring after dragging a node first', async () => {
    const source = buildNode({
      id: 'node-a',
      title: 'Source',
      outputs: ['result'],
      position: { x: 120, y: 120 },
    });
    const target = buildNode({
      id: 'node-b',
      title: 'Target',
      inputs: ['value'],
      position: { x: 520, y: 140 },
    });

    const { container, getByTestId } = render(
      <ToastProvider>
        <AiPathsProvider initialNodes={[source, target]} initialEdges={[]}>
          <CanvasBoard confirmNodeSwitch={() => true} />
          <EdgeCountProbe />
        </AiPathsProvider>
      </ToastProvider>
    );

    const sourceBody = container.querySelector('[data-node-body="node-a"]');
    const outputPort = container.querySelector(
      'circle[data-port="output"][data-node-id="node-a"][data-port-name="result"]'
    );
    const inputPort = container.querySelector(
      'circle[data-port="input"][data-node-id="node-b"][data-port-name="value"]'
    );
    expect(sourceBody).toBeTruthy();
    expect(outputPort).toBeTruthy();
    expect(inputPort).toBeTruthy();
    if (!sourceBody || !outputPort || !inputPort) return;

    fireEvent.pointerDown(sourceBody, {
      pointerId: 3,
      clientX: 200,
      clientY: 180,
      buttons: 1,
    });
    fireEvent.pointerMove(sourceBody, {
      pointerId: 3,
      clientX: 230,
      clientY: 210,
      buttons: 1,
    });
    fireEvent.pointerUp(sourceBody, {
      pointerId: 3,
      clientX: 230,
      clientY: 210,
      buttons: 0,
    });

    fireEvent.pointerDown(outputPort, {
      pointerId: 4,
      clientX: 380,
      clientY: 220,
      buttons: 1,
    });

    await waitFor(() => {
      expect(container.querySelector('[data-connecting-preview="true"]')).toBeTruthy();
    });

    fireEvent.pointerUp(inputPort, {
      pointerId: 4,
      clientX: 520,
      clientY: 220,
      buttons: 0,
    });

    await waitFor(() => {
      expect(getByTestId('edge-count')).toHaveTextContent('1');
    });
  });

  it('can start wiring even when confirm callback resolves asynchronously', async () => {
    const source = buildNode({
      id: 'node-a',
      title: 'Source',
      outputs: ['result'],
      position: { x: 120, y: 120 },
    });
    const target = buildNode({
      id: 'node-b',
      title: 'Target',
      inputs: ['value'],
      position: { x: 520, y: 140 },
    });

    const confirmNodeSwitch = vi.fn(async (): Promise<boolean> => true);

    const { container, getByTestId } = render(
      <ToastProvider>
        <AiPathsProvider initialNodes={[source, target]} initialEdges={[]}>
          <CanvasBoard confirmNodeSwitch={confirmNodeSwitch} />
          <EdgeCountProbe />
        </AiPathsProvider>
      </ToastProvider>
    );

    const outputPort = container.querySelector(
      'circle[data-port="output"][data-node-id="node-a"][data-port-name="result"]'
    );
    const inputPort = container.querySelector(
      'circle[data-port="input"][data-node-id="node-b"][data-port-name="value"]'
    );
    expect(outputPort).toBeTruthy();
    expect(inputPort).toBeTruthy();
    if (!outputPort || !inputPort) return;

    fireEvent.pointerDown(outputPort, {
      pointerId: 5,
      clientX: 380,
      clientY: 220,
      buttons: 1,
    });

    await waitFor(() => {
      expect(confirmNodeSwitch).toHaveBeenCalled();
      expect(container.querySelector('[data-connecting-preview="true"]')).toBeTruthy();
    });

    fireEvent.pointerUp(inputPort, {
      pointerId: 5,
      clientX: 520,
      clientY: 220,
      buttons: 0,
    });

    await waitFor(() => {
      expect(getByTestId('edge-count')).toHaveTextContent('1');
    });
  });

  it('keeps wiring intact with state-bridge graph syncing enabled', async () => {
    const source = buildNode({
      id: 'node-a',
      title: 'Source',
      outputs: ['result'],
      position: { x: 120, y: 120 },
    });
    const target = buildNode({
      id: 'node-b',
      title: 'Target',
      inputs: ['value'],
      position: { x: 520, y: 140 },
    });

    const { container, getByTestId } = render(
      <ToastProvider>
        <AiPathsProvider initialNodes={[source, target]} initialEdges={[]}>
          <BridgeGraphProbe initialNodes={[source, target]} />
        </AiPathsProvider>
      </ToastProvider>
    );

    const outputPort = container.querySelector(
      'circle[data-port="output"][data-node-id="node-a"][data-port-name="result"]'
    );
    const inputPort = container.querySelector(
      'circle[data-port="input"][data-node-id="node-b"][data-port-name="value"]'
    );
    expect(outputPort).toBeTruthy();
    expect(inputPort).toBeTruthy();
    if (!outputPort || !inputPort) return;

    fireEvent.pointerDown(outputPort, {
      pointerId: 6,
      clientX: 380,
      clientY: 220,
      buttons: 1,
    });

    await waitFor(() => {
      expect(container.querySelector('[data-connecting-preview="true"]')).toBeTruthy();
    });

    fireEvent.pointerUp(inputPort, {
      pointerId: 6,
      clientX: 520,
      clientY: 220,
      buttons: 0,
    });

    await waitFor(() => {
      expect(getByTestId('bridge-context-edge-count')).toHaveTextContent('1');
      expect(getByTestId('bridge-source-edge-count')).toHaveTextContent('1');
    });
  });
});
