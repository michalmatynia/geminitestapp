// @vitest-environment jsdom

import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AiPathsProvider,
  useGraphActions,
  useGraphActionsBase,
  useGraphDataState,
  useGraphState,
  usePathConfigActions,
  usePathConfigState,
  usePathMetadataState,
  useRuntimeActions,
  useRuntimeState,
} from '../index';

describe('AiPathsProvider integration (post Phase 1A/1B split)', () => {
  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <AiPathsProvider initialNodes={[]} initialEdges={[]}>
      {children}
    </AiPathsProvider>
  );

  it('mounts the full provider tree and exposes all consumer hooks', () => {
    const { result } = renderHook(
      () => ({
        graphData: useGraphDataState(),
        pathConfig: usePathConfigState(),
        graphActionsBase: useGraphActionsBase(),
        pathConfigActions: usePathConfigActions(),
        graphActions: useGraphActions(),
        runtimeState: useRuntimeState(),
        runtimeActions: useRuntimeActions(),
      }),
      { wrapper }
    );

    expect(result.current.graphData.nodes).toEqual([]);
    expect(result.current.graphData.edges).toEqual([]);
    expect(result.current.pathConfig.pathName).toBe('Description Inference Path');
    expect(result.current.pathConfig.executionMode).toBe('server');
    expect(result.current.pathConfig.isPathActive).toBe(true);
    expect(result.current.runtimeState.runtimeRunStatus).toBe('idle');

    // Combined actions hook merges both sources.
    expect(typeof result.current.graphActions.setNodes).toBe('function');
    expect(typeof result.current.graphActions.setExecutionMode).toBe('function');
  });

  it('routes path-config writes through PathConfigContext only', () => {
    const { result } = renderHook(
      () => ({
        graphData: useGraphDataState(),
        pathConfig: usePathConfigState(),
        actions: usePathConfigActions(),
      }),
      { wrapper }
    );

    const initialGraphData = result.current.graphData;

    act(() => {
      result.current.actions.setExecutionMode('local');
      result.current.actions.setPathName('Renamed Path');
    });

    expect(result.current.pathConfig.executionMode).toBe('local');
    expect(result.current.pathConfig.pathName).toBe('Renamed Path');

    // GraphDataState reference unchanged — no spurious re-render of graph data.
    expect(result.current.graphData).toBe(initialGraphData);
  });

  it('applyPathConfig dispatches a single multi-field merge', () => {
    const { result } = renderHook(
      () => ({
        pathConfig: usePathConfigState(),
        actions: usePathConfigActions(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.actions.applyPathConfig({
        executionMode: 'local',
        runMode: 'autopilot',
        flowIntensity: 'high',
        strictFlowMode: false,
      });
    });

    expect(result.current.pathConfig.executionMode).toBe('local');
    expect(result.current.pathConfig.runMode).toBe('autopilot');
    expect(result.current.pathConfig.flowIntensity).toBe('high');
    expect(result.current.pathConfig.strictFlowMode).toBe(false);
    // Untouched fields keep defaults.
    expect(result.current.pathConfig.blockedRunPolicy).toBe('fail_run');
  });

  it('legacy useGraphState / usePathMetadataState merges both contexts', () => {
    const { result } = renderHook(
      () => ({
        legacyGraphState: useGraphState(),
        legacyPathMeta: usePathMetadataState(),
        configActions: usePathConfigActions(),
      }),
      { wrapper }
    );

    expect(result.current.legacyGraphState.pathName).toBe('Description Inference Path');
    expect(result.current.legacyPathMeta.pathName).toBe('Description Inference Path');
    expect(result.current.legacyGraphState.nodes).toEqual([]);

    act(() => {
      result.current.configActions.setPathName('via legacy');
    });

    expect(result.current.legacyGraphState.pathName).toBe('via legacy');
    expect(result.current.legacyPathMeta.pathName).toBe('via legacy');
  });

  it('runtime status reducer single-dispatches via inlined reducer', () => {
    const { result } = renderHook(
      () => ({
        state: useRuntimeState(),
        actions: useRuntimeActions(),
      }),
      { wrapper }
    );

    act(() => {
      result.current.actions.setRuntimeRunStatus('running');
      result.current.actions.setLastRunAt('2026-04-30T00:00:00.000Z');
      result.current.actions.setCurrentRunId('run-42');
    });

    expect(result.current.state.runtimeRunStatus).toBe('running');
    expect(result.current.state.lastRunAt).toBe('2026-04-30T00:00:00.000Z');
    expect(result.current.state.currentRunId).toBe('run-42');
  });
});
