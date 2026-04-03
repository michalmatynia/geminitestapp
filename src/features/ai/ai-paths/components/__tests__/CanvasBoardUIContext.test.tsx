// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  CanvasBoardUIProvider,
  useCanvasBoardUI,
  useCanvasBoardUIActions,
  useCanvasBoardUIState,
  type CanvasBoardUIContextValue,
} from '../CanvasBoardUIContext';

const createCanvasBoardUIValue = (): CanvasBoardUIContextValue =>
  ({
    view: { x: 0, y: 0, scale: 1 },
    dragState: null,
    viewportSize: { width: 1200, height: 800 },
    detailLevel: 'full',
    nodes: [],
    edges: [],
    edgePaths: [],
    edgeMetaMap: new Map(),
    nodeById: new Map(),
    edgeRoutingMode: 'bezier',
    connecting: null,
    connectingPos: null,
    selectedNodeId: null,
    selectedNodeIdSet: new Set<string>(),
    selectedEdgeId: null,
    runtimeState: {} as never,
    runtimeNodeStatuses: {} as never,
    runtimeRunStatus: 'idle',
    nodeDurations: {},
    nodeDiagnosticsById: {},
    triggerPreflightById: new Map(),
    inputPulseNodes: new Set<string>(),
    outputPulseNodes: new Set<string>(),
    activeEdgeIds: new Set<string>(),
    triggerConnected: new Set<string>(),
    wireFlowEnabled: false,
    flowingIntensity: 'low',
    reduceVisualEffects: false,
    launchingTriggerIds: new Set<string>(),
    enableNodeAnimations: true,
    connectorHitTargetPx: 24,
    openNodeConfigOnSingleClick: false,
    zoomTo: vi.fn(),
    fitToNodes: vi.fn(),
    fitToSelection: vi.fn(),
    resetView: vi.fn(),
    centerOnCanvasPoint: vi.fn(),
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
    consumeSuppressedNodeClick: vi.fn().mockReturnValue(false),
    onSelectNode: vi.fn(),
    onOpenNodeConfig: vi.fn(),
    onStartConnection: vi.fn(),
    onCompleteConnection: vi.fn(),
    onReconnectInput: vi.fn(),
    onDisconnectPort: vi.fn(),
    onFireTrigger: vi.fn(),
    onRemoveEdge: vi.fn(),
    onSelectEdge: vi.fn(),
  }) as CanvasBoardUIContextValue;

describe('CanvasBoardUIContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useCanvasBoardUI())).toThrow(
      'useCanvasBoardUI must be used within CanvasBoardUIProvider'
    );
  });

  it('returns the provided value through all hook aliases', () => {
    const value = createCanvasBoardUIValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CanvasBoardUIProvider value={value}>{children}</CanvasBoardUIProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useCanvasBoardUIActions(),
        state: useCanvasBoardUIState(),
        ui: useCanvasBoardUI(),
      }),
      { wrapper }
    );

    expect(result.current.ui).toBe(value);
    expect(result.current.state).toBe(value);
    expect(result.current.actions).toBe(value);
  });
});
