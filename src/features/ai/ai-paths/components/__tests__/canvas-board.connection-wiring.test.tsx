import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode, Edge } from '@/shared/lib/ai-paths';
import { AiPathsProvider, useGraphState } from '@/features/ai/ai-paths/context';
import { CanvasBoard } from '@/features/ai/ai-paths/components/canvas-board';
import { ToastProvider } from '@/shared/ui/toast';

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

function EdgeSummaryProbe(): React.JSX.Element {
  const { edges } = useGraphState();
  const summary = edges
    .map(
      (edge: Edge): string => `${edge.from ?? ''}:${edge.fromPort ?? ''}->${edge.to ?? ''}:${edge.toPort ?? ''}`
    )
    .sort();
  return <output data-testid='edge-summary'>{summary.join('|')}</output>;
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

  it('updates connection preview on pointer move and clears it on canvas release', async () => {
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

    const { container } = render(
      <ToastProvider>
        <AiPathsProvider initialNodes={[source, target]} initialEdges={[]}>
          <CanvasBoard confirmNodeSwitch={() => true} />
        </AiPathsProvider>
      </ToastProvider>
    );

    const canvasHost = container.querySelector('div.touch-none.select-none.overscroll-none');
    const outputPort = container.querySelector(
      'circle[data-port="output"][data-node-id="node-a"][data-port-name="result"]'
    );
    expect(canvasHost).toBeTruthy();
    expect(outputPort).toBeTruthy();
    if (!canvasHost || !outputPort) return;

    fireEvent.pointerDown(outputPort, {
      pointerId: 6,
      clientX: 380,
      clientY: 220,
      buttons: 1,
    });

    let initialPath = '';
    await waitFor(() => {
      const preview = container.querySelector('[data-connecting-preview="true"]');
      expect(preview).toBeTruthy();
      initialPath = preview?.getAttribute('d') ?? '';
      expect(initialPath.length).toBeGreaterThan(0);
    });

    fireEvent.pointerMove(canvasHost, {
      pointerId: 6,
      clientX: 760,
      clientY: 320,
      buttons: 1,
    });

    await waitFor(() => {
      const preview = container.querySelector('[data-connecting-preview="true"]');
      expect(preview).toBeTruthy();
      const movedPath = preview?.getAttribute('d') ?? '';
      expect(movedPath.length).toBeGreaterThan(0);
      expect(movedPath).not.toBe(initialPath);
    });

    fireEvent.pointerUp(canvasHost, {
      pointerId: 6,
      clientX: 760,
      clientY: 320,
      buttons: 0,
    });

    await waitFor(() => {
      expect(container.querySelector('[data-connecting-preview="true"]')).toBeNull();
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

  it('keeps wiring for API request ports (url/body/params)', async () => {
    const valueSource = buildNode({
      id: 'node-value-source',
      title: 'Value Source',
      type: 'constant',
      outputs: ['value'],
      position: { x: 120, y: 120 },
    });
    const resultSource = buildNode({
      id: 'node-result-source',
      title: 'Result Source',
      type: 'model',
      outputs: ['result'],
      position: { x: 120, y: 260 },
    });
    const apiTarget = buildNode({
      id: 'node-api-target',
      title: 'API Target',
      type: 'api_advanced',
      inputs: ['url', 'body', 'params'],
      position: { x: 560, y: 180 },
    });

    const { container, getByTestId } = render(
      <ToastProvider>
        <AiPathsProvider initialNodes={[valueSource, resultSource, apiTarget]} initialEdges={[]}>
          <CanvasBoard confirmNodeSwitch={() => true} />
          <EdgeCountProbe />
        </AiPathsProvider>
      </ToastProvider>
    );

    const valueOutputPort = container.querySelector(
      'circle[data-port="output"][data-node-id="node-value-source"][data-port-name="value"]'
    );
    const resultOutputPort = container.querySelector(
      'circle[data-port="output"][data-node-id="node-result-source"][data-port-name="result"]'
    );
    const urlInputPort = container.querySelector(
      'circle[data-port="input"][data-node-id="node-api-target"][data-port-name="url"]'
    );
    const bodyInputPort = container.querySelector(
      'circle[data-port="input"][data-node-id="node-api-target"][data-port-name="body"]'
    );
    const paramsInputPort = container.querySelector(
      'circle[data-port="input"][data-node-id="node-api-target"][data-port-name="params"]'
    );

    expect(valueOutputPort).toBeTruthy();
    expect(resultOutputPort).toBeTruthy();
    expect(urlInputPort).toBeTruthy();
    expect(bodyInputPort).toBeTruthy();
    expect(paramsInputPort).toBeTruthy();
    if (
      !valueOutputPort ||
      !resultOutputPort ||
      !urlInputPort ||
      !bodyInputPort ||
      !paramsInputPort
    ) {
      return;
    }

    fireEvent.pointerDown(valueOutputPort, {
      pointerId: 10,
      clientX: 360,
      clientY: 200,
      buttons: 1,
    });
    await waitFor(() => {
      expect(container.querySelector('[data-connecting-preview="true"]')).toBeTruthy();
    });
    fireEvent.pointerUp(urlInputPort, {
      pointerId: 10,
      clientX: 560,
      clientY: 220,
      buttons: 0,
    });
    await waitFor(() => {
      expect(getByTestId('edge-count')).toHaveTextContent('1');
    });

    fireEvent.pointerDown(resultOutputPort, {
      pointerId: 11,
      clientX: 360,
      clientY: 280,
      buttons: 1,
    });
    await waitFor(() => {
      expect(container.querySelector('[data-connecting-preview="true"]')).toBeTruthy();
    });
    fireEvent.pointerUp(bodyInputPort, {
      pointerId: 11,
      clientX: 560,
      clientY: 250,
      buttons: 0,
    });
    await waitFor(() => {
      expect(getByTestId('edge-count')).toHaveTextContent('2');
    });

    fireEvent.pointerDown(resultOutputPort, {
      pointerId: 12,
      clientX: 360,
      clientY: 280,
      buttons: 1,
    });
    await waitFor(() => {
      expect(container.querySelector('[data-connecting-preview="true"]')).toBeTruthy();
    });
    fireEvent.pointerUp(paramsInputPort, {
      pointerId: 12,
      clientX: 560,
      clientY: 280,
      buttons: 0,
    });
    await waitFor(() => {
      expect(getByTestId('edge-count')).toHaveTextContent('3');
    });
  });

  it('enforces a single wire on a single-cardinality input port', async () => {
    const sourceA = buildNode({
      id: 'node-source-a',
      title: 'Source A',
      type: 'trigger',
      outputs: ['trigger'],
      position: { x: 120, y: 120 },
    });
    const sourceB = buildNode({
      id: 'node-source-b',
      title: 'Source B',
      type: 'trigger',
      outputs: ['trigger'],
      position: { x: 120, y: 280 },
    });
    const target = buildNode({
      id: 'node-target',
      title: 'Fetcher: Trigger Context',
      type: 'fetcher',
      inputs: ['trigger'],
      position: { x: 520, y: 180 },
    });
    const initialEdges: Edge[] = [
      {
        id: 'edge-initial',
        from: 'node-source-a',
        to: 'node-target',
        fromPort: 'trigger',
        toPort: 'trigger',
      },
    ];

    const { container, getByTestId } = render(
      <ToastProvider>
        <AiPathsProvider
          initialNodes={[sourceA, sourceB, target]}
          initialEdges={initialEdges}
        >
          <CanvasBoard confirmNodeSwitch={() => true} />
          <EdgeCountProbe />
          <EdgeSummaryProbe />
        </AiPathsProvider>
      </ToastProvider>
    );

    const outputPort = container.querySelector(
      'circle[data-port="output"][data-node-id="node-source-b"][data-port-name="trigger"]'
    );
    const inputPort = container.querySelector(
      'circle[data-port="input"][data-node-id="node-target"][data-port-name="trigger"]'
    );
    expect(outputPort).toBeTruthy();
    expect(inputPort).toBeTruthy();
    if (!outputPort || !inputPort) return;

    fireEvent.pointerDown(outputPort, {
      pointerId: 21,
      clientX: 360,
      clientY: 280,
      buttons: 1,
    });
    await waitFor(() => {
      expect(container.querySelector('[data-connecting-preview="true"]')).toBeTruthy();
    });

    fireEvent.pointerUp(inputPort, {
      pointerId: 21,
      clientX: 520,
      clientY: 220,
      buttons: 0,
    });

    await waitFor(() => {
      expect(getByTestId('edge-count')).toHaveTextContent('1');
      expect(getByTestId('edge-summary')).toHaveTextContent(
        /node-source-(a|b):trigger->node-target:trigger/
      );
    });
  });

  it('ignores non-canonical incoming edges when wiring a single-cardinality port', async () => {
    const sourceA = buildNode({
      id: 'node-source-a',
      title: 'Source A',
      outputs: ['result'],
      position: { x: 120, y: 120 },
    });
    const sourceB = buildNode({
      id: 'node-source-b',
      title: 'Source B',
      outputs: ['result'],
      position: { x: 120, y: 280 },
    });
    const target = buildNode({
      id: 'node-target',
      title: 'Fetcher: Trigger Context',
      type: 'fetcher',
      inputs: ['trigger'],
      position: { x: 520, y: 180 },
    });
    const initialEdges: Edge[] = [
      {
        id: 'edge-broken',
        from: 'node-source-a',
        to: 'node-target',
        toPort: 'trigger',
      },
    ];

    const { container, getByTestId } = render(
      <ToastProvider>
        <AiPathsProvider
          initialNodes={[sourceA, sourceB, target]}
          initialEdges={initialEdges}
        >
          <CanvasBoard confirmNodeSwitch={() => true} />
          <EdgeCountProbe />
          <EdgeSummaryProbe />
        </AiPathsProvider>
      </ToastProvider>
    );

    const outputPort = container.querySelector(
      'circle[data-port="output"][data-node-id="node-source-b"][data-port-name="result"]'
    );
    const inputPort = container.querySelector(
      'circle[data-port="input"][data-node-id="node-target"][data-port-name="trigger"]'
    );
    expect(outputPort).toBeTruthy();
    expect(inputPort).toBeTruthy();
    if (!outputPort || !inputPort) return;

    fireEvent.pointerDown(outputPort, {
      pointerId: 22,
      clientX: 360,
      clientY: 280,
      buttons: 1,
    });
    await waitFor(() => {
      expect(container.querySelector('[data-connecting-preview="true"]')).toBeTruthy();
    });

    fireEvent.pointerUp(inputPort, {
      pointerId: 22,
      clientX: 520,
      clientY: 220,
      buttons: 0,
    });

    await waitFor(() => {
      expect(getByTestId('edge-count')).toHaveTextContent('1');
      expect(getByTestId('edge-summary')).toHaveTextContent(
        'node-source-b:result->node-target:trigger'
      );
    });
  });
});
