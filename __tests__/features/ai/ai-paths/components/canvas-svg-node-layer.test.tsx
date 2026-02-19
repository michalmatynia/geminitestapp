import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CanvasSvgNodeLayer } from '@/features/ai/ai-paths/components/canvas-svg-node-layer';
import type {
  AiNode,
  RuntimeHistoryEntry,
  RuntimePortValues,
  RuntimeState,
} from '@/features/ai/ai-paths/lib';

const createNode = (): AiNode => ({
  id: 'node-db-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: null,
  type: 'database',
  title: 'Database',
  description: '',
  position: { x: 120, y: 80 },
  data: {},
  config: {},
  inputs: ['query'],
  outputs: ['result'],
});

const createHistoryEntry = (): RuntimeHistoryEntry => ({
  timestamp: '2026-01-01T00:00:10.000Z',
  runId: 'run-1',
  runStartedAt: '2026-01-01T00:00:00.000Z',
  pathId: null,
  pathName: null,
  nodeId: 'node-db-1',
  nodeType: 'database',
  nodeTitle: 'Database',
  status: 'completed',
  iteration: 1,
  inputs: {
    query: { id: 'history-id' },
  },
  outputs: {
    result: { id: 'history-id', source: 'history' },
    bundle: { collection: 'products', provider: 'mongodb' },
  },
  inputHash: null,
  inputsFrom: [],
  outputsTo: [],
  delayMs: null,
  durationMs: 12,
});

const baseProps = (runtimeState: RuntimeState) => {
  const node = createNode();
  return {
    nodes: [node],
    edges: [],
    view: { x: 0, y: 0, scale: 1 },
    viewportSize: { width: 1200, height: 800 },
    selectedNodeId: null,
    selectedNodeIdSet: new Set<string>(),
    runtimeState,
    runtimeNodeStatuses: {},
    runtimeRunStatus: 'idle' as const,
    nodeDurations: {},
    inputPulseNodes: new Set<string>(),
    outputPulseNodes: new Set<string>(),
    triggerConnected: new Set<string>(),
    connecting: null,
    connectingFromNode: null,
    hoveredConnectorKey: null,
    pinnedConnectorKey: null,
    setHoveredConnectorKey: vi.fn(),
    setPinnedConnectorKey: vi.fn(),
    onPointerDownNode: vi.fn(),
    onPointerMoveNode: vi.fn(),
    onPointerUpNode: vi.fn(),
    onSelectNode: vi.fn(),
    onOpenNodeConfig: vi.fn(),
    onStartConnection: vi.fn(),
    onCompleteConnection: vi.fn(),
    onReconnectInput: vi.fn(),
    onDisconnectPort: vi.fn(),
    onFireTrigger: vi.fn(),
    onConnectorHover: vi.fn(),
    onConnectorLeave: vi.fn(),
  };
};

const getOutputHitTarget = (container: HTMLElement): SVGCircleElement => {
  const targets = container.querySelectorAll('circle[data-port="output"]');
  expect(targets.length).toBeGreaterThan(0);
  return targets[0] as SVGCircleElement;
};

describe('CanvasSvgNodeLayer', () => {
  it('includes node runtime input/output payloads in connector hover info', () => {
    const historyEntry = createHistoryEntry();
    const runtimeState: RuntimeState = {
      inputs: {},
      outputs: {},
      history: {
        'node-db-1': [historyEntry],
      },
    };
    const props = baseProps(runtimeState);
    const onConnectorHover = props.onConnectorHover;

    const { container } = render(
      <svg>
        <CanvasSvgNodeLayer {...props} />
      </svg>
    );

    fireEvent.pointerEnter(getOutputHitTarget(container), {
      clientX: 200,
      clientY: 120,
    });

    expect(onConnectorHover).toHaveBeenCalled();
    const hoverPayload = onConnectorHover.mock.calls[0]?.[0] as {
      info: {
        value: unknown;
        nodeInputs: RuntimePortValues | undefined;
        nodeOutputs: RuntimePortValues | undefined;
      };
    };
    expect(hoverPayload.info.value).toEqual({
      id: 'history-id',
      source: 'history',
    });
    expect(hoverPayload.info.nodeInputs).toEqual({
      query: { id: 'history-id' },
    });
    expect(hoverPayload.info.nodeOutputs).toMatchObject({
      result: { id: 'history-id', source: 'history' },
      bundle: { collection: 'products' },
    });
  });

  it('keeps connector hover payload stable after rerender with updated view and runtime values', () => {
    const historyEntry = createHistoryEntry();
    const initialState: RuntimeState = {
      inputs: {},
      outputs: {},
      history: {
        'node-db-1': [historyEntry],
      },
    };
    const initialProps = baseProps(initialState);
    const onConnectorHover = initialProps.onConnectorHover;

    const { container, rerender } = render(
      <svg>
        <CanvasSvgNodeLayer {...initialProps} />
      </svg>
    );

    fireEvent.pointerEnter(getOutputHitTarget(container), {
      clientX: 200,
      clientY: 120,
    });
    onConnectorHover.mockClear();

    const updatedState: RuntimeState = {
      ...initialState,
      inputs: {
        'node-db-1': { query: { id: 'live-id' } },
      },
      outputs: {
        'node-db-1': {
          result: { id: 'live-id', source: 'live' },
          status: 'completed',
        },
      },
    };
    const updatedProps = {
      ...initialProps,
      runtimeState: updatedState,
      view: { x: 60, y: 40, scale: 1.25 },
    };

    rerender(
      <svg>
        <CanvasSvgNodeLayer {...updatedProps} />
      </svg>
    );

    fireEvent.pointerMove(getOutputHitTarget(container), {
      clientX: 240,
      clientY: 160,
    });

    expect(onConnectorHover).toHaveBeenCalled();
    const hoverPayload = onConnectorHover.mock.calls[0]?.[0] as {
      info: {
        value: unknown;
        nodeInputs: RuntimePortValues | undefined;
        nodeOutputs: RuntimePortValues | undefined;
      };
    };
    expect(hoverPayload.info.value).toEqual({ id: 'live-id', source: 'live' });
    expect(hoverPayload.info.nodeInputs).toEqual({ query: { id: 'live-id' } });
    expect(hoverPayload.info.nodeOutputs).toMatchObject({
      result: { id: 'live-id', source: 'live' },
      bundle: { collection: 'products' },
      status: 'completed',
    });
  });
});
