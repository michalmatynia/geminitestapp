import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CanvasSvgNodeLayer } from '@/features/ai/ai-paths/components/canvas-svg-node-layer';
import {
  CanvasBoardUIProvider,
  type CanvasBoardUIContextValue,
} from '@/features/ai/ai-paths/components/CanvasBoardUIContext';
import type {
  AiNode,
  RuntimeHistoryEntry,
  RuntimePortValues,
  RuntimeState,
} from '@/shared/lib/ai-paths';

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

const createTriggerNode = (): AiNode => ({
  ...createNode(),
  id: 'node-trigger-1',
  type: 'trigger',
  title: 'Trigger',
  inputs: ['context'],
  outputs: ['trigger'],
  config: {
    trigger: {
      event: 'manual',
    },
  },
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

const defaultContextValue = (runtimeState: RuntimeState): CanvasBoardUIContextValue => {
  const node = createNode();
  return {
    nodes: [node],
    edges: [],
    edgePaths: [],
    edgeRoutingMode: 'bezier',
    view: { x: 0, y: 0, scale: 1 },
    viewportSize: { width: 1200, height: 800 },
    detailLevel: 'full',
    nodeById: new Map([[node.id, node]]),
    edgeMetaMap: new Map(),
    selectedNodeId: null,
    selectedNodeIdSet: new Set<string>(),
    selectedEdgeId: null,
    runtimeState,
    runtimeNodeStatuses: {},
    runtimeRunStatus: 'idle',
    nodeDurations: {},
    nodeDiagnosticsById: {},
    inputPulseNodes: new Set<string>(),
    outputPulseNodes: new Set<string>(),
    activeEdgeIds: new Set<string>(),
    triggerConnected: new Set<string>(),
    wireFlowEnabled: true,
    flowingIntensity: 'medium',
    reduceVisualEffects: false,
    enableNodeAnimations: false,
    connectorHitTargetPx: 8,
    openNodeConfigOnSingleClick: false,
    consumeSuppressedNodeClick: vi.fn().mockReturnValue(false),
    connecting: null,
    connectingPos: null,
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
    onRemoveEdge: vi.fn(),
    onSelectEdge: vi.fn(),
    zoomTo: vi.fn(),
    fitToNodes: vi.fn(),
    fitToSelection: vi.fn(),
    resetView: vi.fn(),
    centerOnCanvasPoint: vi.fn(),
  };
};

const getOutputHitTarget = (container: HTMLElement): SVGCircleElement => {
  const targets = container.querySelectorAll('circle[data-port="output"]');
  expect(targets.length).toBeGreaterThan(0);
  return targets[0] as SVGCircleElement;
};

const renderWithContext = (props: Partial<CanvasBoardUIContextValue> & { cullPadding?: number }) => {
  const runtimeState: RuntimeState = props.runtimeState || {
    status: 'idle',
    nodeStatuses: {},
    nodeOutputs: {},
    variables: {},
    events: [],
    inputs: {},
    outputs: {},
    history: {},
  };

  const contextValue: CanvasBoardUIContextValue = {
    ...defaultContextValue(runtimeState),
    ...props,
  };

  // Ensure nodeById is synced if nodes are provided
  if (props.nodes) {
    contextValue.nodeById = new Map(props.nodes.map((n) => [n.id, n]));
  }

  return render(
    <CanvasBoardUIProvider value={contextValue}>
      <svg>
        <CanvasSvgNodeLayer cullPadding={props.cullPadding} />
      </svg>
    </CanvasBoardUIProvider>
  );
};

describe('CanvasSvgNodeLayer', () => {
  it('includes node runtime input/output payloads in connector hover info', () => {
    const historyEntry = createHistoryEntry();
    const runtimeState: RuntimeState = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      inputs: {},
      outputs: {},
      history: {
        'node-db-1': [historyEntry],
      },
    };
    const onConnectorHover = vi.fn();

    const { container } = renderWithContext({ runtimeState, onConnectorHover });

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
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      inputs: {},
      outputs: {},
      history: {
        'node-db-1': [historyEntry],
      },
    };
    const onConnectorHover = vi.fn();

    const { container, rerender } = renderWithContext({
      runtimeState: initialState,
      onConnectorHover,
    });

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

    const nextContextValue: CanvasBoardUIContextValue = {
      ...defaultContextValue(updatedState),
      onConnectorHover,
      view: { x: 60, y: 40, scale: 1.25 },
    };

    rerender(
      <CanvasBoardUIProvider value={nextContextValue}>
        <svg>
          <CanvasSvgNodeLayer />
        </svg>
      </CanvasBoardUIProvider>
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

  it('does not fallback to stale output status while run is active', () => {
    const runtimeState: RuntimeState = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      inputs: {},
      outputs: {
        'node-db-1': {
          status: 'cached',
        },
      },
      history: {
        'node-db-1': [createHistoryEntry()],
      },
    };

    const { rerender } = renderWithContext({
      runtimeState,
      runtimeRunStatus: 'running',
      runtimeNodeStatuses: {},
    });

    expect(screen.queryByText('Cached')).toBeNull();

    const nextContextValue: CanvasBoardUIContextValue = {
      ...defaultContextValue(runtimeState),
      runtimeRunStatus: 'idle',
      runtimeNodeStatuses: {},
    };

    rerender(
      <CanvasBoardUIProvider value={nextContextValue}>
        <svg>
          <CanvasSvgNodeLayer />
        </svg>
      </CanvasBoardUIProvider>
    );

    expect(screen.getByText('Cached')).toBeDefined();
  });

  it('keeps Fire Trigger visible for trigger nodes across SVG detail levels', () => {
    const runtimeState: RuntimeState = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      inputs: {},
      outputs: {},
      history: {},
    };
    const nodes = [createTriggerNode()];

    const { container, rerender } = renderWithContext({
      runtimeState,
      nodes,
      detailLevel: 'full',
      view: { x: 0, y: 0, scale: 1 },
    });

    const assertFireControlVisible = (): void => {
      const fireControls = container.querySelectorAll('rect[data-node-action="fire-trigger"]');
      expect(fireControls).toHaveLength(1);
      expect(screen.getByText('Fire Trigger')).toBeDefined();
    };

    assertFireControlVisible();

    const nextContextValue1: CanvasBoardUIContextValue = {
      ...defaultContextValue(runtimeState),
      nodes,
      nodeById: new Map(nodes.map((n) => [n.id, n])),
      detailLevel: 'compact',
      view: { x: 0, y: 0, scale: 0.7 },
    };

    rerender(
      <CanvasBoardUIProvider value={nextContextValue1}>
        <svg>
          <CanvasSvgNodeLayer />
        </svg>
      </CanvasBoardUIProvider>
    );
    assertFireControlVisible();

    const nextContextValue2: CanvasBoardUIContextValue = {
      ...defaultContextValue(runtimeState),
      nodes,
      nodeById: new Map(nodes.map((n) => [n.id, n])),
      detailLevel: 'skeleton',
      view: { x: 0, y: 0, scale: 0.45 },
    };

    rerender(
      <CanvasBoardUIProvider value={nextContextValue2}>
        <svg>
          <CanvasSvgNodeLayer />
        </svg>
      </CanvasBoardUIProvider>
    );
    assertFireControlVisible();
  });

  it('fires trigger from SVG button in compact detail mode', () => {
    const runtimeState: RuntimeState = {
      status: 'idle',
      nodeStatuses: {},
      nodeOutputs: {},
      variables: {},
      events: [],
      inputs: {},
      outputs: {},
      history: {},
    };
    const nodes = [createTriggerNode()];
    const onFireTrigger = vi.fn();

    const { container } = renderWithContext({
      runtimeState,
      nodes,
      detailLevel: 'compact',
      view: { x: 0, y: 0, scale: 0.7 },
      onFireTrigger,
    });

    const fireButton = container.querySelector('rect[data-node-action="fire-trigger"]');
    expect(fireButton).toBeDefined();
    fireEvent.click(fireButton as SVGRectElement);

    expect(onFireTrigger).toHaveBeenCalledTimes(1);
    expect(onFireTrigger).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'node-trigger-1', type: 'trigger' })
    );
  });
});
