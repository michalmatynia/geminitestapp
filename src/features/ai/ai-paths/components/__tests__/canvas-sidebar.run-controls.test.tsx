import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useGraphStateMock,
  usePersistenceActionsMock,
  useRuntimeStateMock,
  useRuntimeActionsMock,
  usePresetsStateMock,
  usePresetsActionsMock,
  useSelectionStateMock,
  useSelectionActionsMock,
  usePaletteWithTriggerButtonsMock,
  useCanvasSidebarActionsMock,
} = vi.hoisted(() => ({
  useGraphStateMock: vi.fn(),
  usePersistenceActionsMock: vi.fn(),
  useRuntimeStateMock: vi.fn(),
  useRuntimeActionsMock: vi.fn(),
  usePresetsStateMock: vi.fn(),
  usePresetsActionsMock: vi.fn(),
  useSelectionStateMock: vi.fn(),
  useSelectionActionsMock: vi.fn(),
  usePaletteWithTriggerButtonsMock: vi.fn(),
  useCanvasSidebarActionsMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  useGraphState: useGraphStateMock,
  usePersistenceActions: usePersistenceActionsMock,
  usePresetsState: usePresetsStateMock,
  usePresetsActions: usePresetsActionsMock,
  useSelectionState: useSelectionStateMock,
  useSelectionActions: useSelectionActionsMock,
  useRuntimeState: useRuntimeStateMock,
  useRuntimeActions: useRuntimeActionsMock,
}));

vi.mock(
  '@/features/ai/ai-paths/components/ai-paths-settings/hooks/usePaletteWithTriggerButtons',
  () => ({
    usePaletteWithTriggerButtons: usePaletteWithTriggerButtonsMock,
  })
);

vi.mock('@/features/ai/ai-paths/components/hooks/useCanvasSidebarActions', () => ({
  useCanvasSidebarActions: useCanvasSidebarActionsMock,
}));

import { CanvasSidebar } from '../canvas-sidebar';

const buildRuntimeActions = () => ({
  fireTrigger: vi.fn(),
  fireTriggerPersistent: vi.fn(),
  pauseActiveRun: vi.fn(),
  resumeActiveRun: vi.fn(),
  stepActiveRun: vi.fn(),
  cancelActiveRun: vi.fn(),
  clearWires: vi.fn(),
});

describe('CanvasSidebar run control coordination states', () => {
  beforeEach(() => {
    useGraphStateMock.mockReset().mockReturnValue({
      nodes: [],
      edges: [],
      executionMode: 'local',
    });
    usePersistenceActionsMock.mockReset().mockReturnValue({
      savePathConfig: vi.fn(),
    });
    useRuntimeActionsMock.mockReset().mockReturnValue(buildRuntimeActions());
    usePresetsStateMock.mockReset().mockReturnValue({
      paletteCollapsed: false,
      expandedPaletteGroups: new Set<string>(),
    });
    usePresetsActionsMock.mockReset().mockReturnValue({
      setPaletteCollapsed: vi.fn(),
      togglePaletteGroup: vi.fn(),
    });
    useSelectionStateMock.mockReset().mockReturnValue({
      selectedNodeId: null,
      selectedEdgeId: null,
    });
    useSelectionActionsMock.mockReset().mockReturnValue({
      selectEdge: vi.fn(),
      setConfigOpen: vi.fn(),
      setSimulationOpenNodeId: vi.fn(),
    });
    usePaletteWithTriggerButtonsMock.mockReset().mockReturnValue([]);
    useCanvasSidebarActionsMock.mockReset().mockReturnValue({
      handleDragStart: vi.fn(),
      updateSelectedNode: vi.fn(),
      handleDeleteSelectedNode: vi.fn(),
      handleRemoveEdge: vi.fn(),
      ConfirmationModal: () => null,
    });
  });

  it('renders blocked-on-lease guidance and suppresses active-run controls', () => {
    useRuntimeStateMock.mockReset().mockReturnValue({
      runtimeRunStatus: 'blocked_on_lease',
      runtimeState: {},
    });

    render(<CanvasSidebar />);

    expect(screen.getByText('Execution lease blocked')).toBeTruthy();
    expect(
      screen.getByText(
        'This run is waiting on another execution owner. Use the run history or run detail panel to inspect ownership and mark the run handoff-ready if work should change hands.'
      )
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Step Run' })).toBeNull();
  });

  it('renders handoff-ready guidance and suppresses active-run controls', () => {
    useRuntimeStateMock.mockReset().mockReturnValue({
      runtimeRunStatus: 'handoff_ready',
      runtimeState: {},
    });

    render(<CanvasSidebar />);

    expect(screen.getByText('Ready for delegated continuation')).toBeTruthy();
    expect(
      screen.getByText(
        'This run has been prepared for another operator or agent to continue. Resume it from the run history once the next owner is ready.'
      )
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Pause' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Step Run' })).toBeNull();
  });
});
