import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { AiNode, RuntimeState } from '@/shared/lib/ai-paths';

import { CanvasBoardUIProvider, type CanvasBoardUIContextValue } from '../CanvasBoardUIContext';
import { CanvasSvgNodeLayer } from '../canvas-svg-node-layer';

const baseRuntimeState: RuntimeState = {
  status: 'idle',
  nodeStatuses: {},
  nodeOutputs: {},
  variables: {},
  events: [],
  inputs: {},
  outputs: {},
};

const buildModelNode = (modelId?: string): AiNode =>
  ({
    id: 'node-model-1',
    type: 'model',
    title: 'Model Node',
    description: '',
    inputs: [],
    outputs: [],
    position: { x: 24, y: 24 },
    data: {},
    config: {
      model: {
        ...(typeof modelId === 'string' ? { modelId } : {}),
        temperature: 0.7,
        maxTokens: 800,
        systemPrompt: '',
        vision: false,
        waitForResult: true,
      },
    },
  }) as AiNode;

const buildContextValue = (
  node: AiNode,
  overrides: Partial<Pick<CanvasBoardUIContextValue, 'runtimeNodeStatuses'>> = {}
): CanvasBoardUIContextValue => ({
  view: { x: 0, y: 0, scale: 1 },
  viewportSize: { width: 1200, height: 800 },
  detailLevel: 'full',
  nodes: [node],
  edges: [],
  edgePaths: [],
  edgeMetaMap: new Map(),
  nodeById: new Map([[node.id, node]]),
  edgeRoutingMode: 'bezier',
  connecting: null,
  connectingPos: null,
  selectedNodeId: null,
  selectedNodeIdSet: new Set(),
  selectedEdgeId: null,
  runtimeState: baseRuntimeState,
  runtimeNodeStatuses: overrides.runtimeNodeStatuses ?? {},
  runtimeRunStatus: 'idle',
  nodeDurations: {},
  zoomTo: vi.fn(),
  fitToNodes: vi.fn(),
  fitToSelection: vi.fn(),
  resetView: vi.fn(),
  centerOnCanvasPoint: vi.fn(),
  nodeDiagnosticsById: {},
  inputPulseNodes: new Set(),
  outputPulseNodes: new Set(),
  activeEdgeIds: new Set(),
  triggerConnected: new Set(),
  wireFlowEnabled: false,
  flowingIntensity: 'low',
  reduceVisualEffects: false,
  enableNodeAnimations: false,
  connectorHitTargetPx: 14,
  openNodeConfigOnSingleClick: false,
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
});

const buildFetcherNode = (): AiNode =>
  ({
    id: 'node-fetcher-1',
    type: 'fetcher',
    title: 'Fetcher Node',
    description: '',
    inputs: ['trigger'],
    outputs: ['bundle'],
    position: { x: 24, y: 24 },
    data: {},
  }) as AiNode;

describe('Canvas model selection badge', () => {
  it('shows NODE MODEL when a model node has an explicit model selection', () => {
    const node = buildModelNode('gpt-4o-mini');
    const { container } = render(
      <svg>
        <CanvasBoardUIProvider value={buildContextValue(node)}>
          <CanvasSvgNodeLayer />
        </CanvasBoardUIProvider>
      </svg>
    );

    expect(screen.getByText('NODE MODEL')).toBeTruthy();
    expect(
      container.querySelector('[data-node-model-selection-badge="node-model-1"]')
    ).toBeTruthy();
  });

  it('shows BRAIN DEFAULT when a model node inherits the Brain fallback model', () => {
    const node = buildModelNode();

    render(
      <svg>
        <CanvasBoardUIProvider value={buildContextValue(node)}>
          <CanvasSvgNodeLayer />
        </CanvasBoardUIProvider>
      </svg>
    );

    expect(screen.getByText('BRAIN DEFAULT')).toBeTruthy();
  });

  it('renders Processing badge for pulsating model nodes with waiting_callback status', () => {
    const node = buildModelNode('gpt-4o-mini');
    const { container } = render(
      <svg>
        <CanvasBoardUIProvider
          value={buildContextValue(node, { runtimeNodeStatuses: { [node.id]: 'waiting_callback' } })}
        >
          <CanvasSvgNodeLayer />
        </CanvasBoardUIProvider>
      </svg>
    );

    expect(screen.getByText('Processing')).toBeTruthy();
    expect(container.querySelector('.ai-paths-node-halo')).toBeTruthy();
  });

  it('keeps Waiting badge for non-processing nodes with waiting_callback status', () => {
    const node = buildFetcherNode();

    const { container } = render(
      <svg>
        <CanvasBoardUIProvider
          value={buildContextValue(node, { runtimeNodeStatuses: { [node.id]: 'waiting_callback' } })}
        >
          <CanvasSvgNodeLayer />
        </CanvasBoardUIProvider>
      </svg>
    );

    expect(screen.getByText('Waiting')).toBeTruthy();
    expect(container.querySelector('.ai-paths-node-halo')).toBeFalsy();
  });

  it('renders Blocked badge without halo for model nodes in blocked status', () => {
    const node = buildModelNode('gpt-4o-mini');
    const { container } = render(
      <svg>
        <CanvasBoardUIProvider
          value={buildContextValue(node, { runtimeNodeStatuses: { [node.id]: 'blocked' } })}
        >
          <CanvasSvgNodeLayer />
        </CanvasBoardUIProvider>
      </svg>
    );

    expect(screen.getByText('Blocked')).toBeTruthy();
    expect(container.querySelector('.ai-paths-node-halo')).toBeFalsy();
  });

  it('renders Skipped badge without halo for model nodes in skipped status', () => {
    const node = buildModelNode('gpt-4o-mini');
    const { container } = render(
      <svg>
        <CanvasBoardUIProvider
          value={buildContextValue(node, { runtimeNodeStatuses: { [node.id]: 'skipped' } })}
        >
          <CanvasSvgNodeLayer />
        </CanvasBoardUIProvider>
      </svg>
    );

    expect(screen.getByText('Skipped')).toBeTruthy();
    expect(container.querySelector('.ai-paths-node-halo')).toBeFalsy();
  });
});
