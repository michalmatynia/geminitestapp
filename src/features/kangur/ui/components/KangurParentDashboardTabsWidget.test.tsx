/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const runtimeState = vi.hoisted(() => ({
  value: {
    activeTab: 'progress',
    canAccessDashboard: true,
    setActiveTab: vi.fn<(tabId: string) => void>(),
  },
}));

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  useKangurParentDashboardRuntimeShellActions: () => ({
    setActiveTab: runtimeState.value.setActiveTab,
  }),
  useKangurParentDashboardRuntimeShellState: () => ({
    activeTab: runtimeState.value.activeTab,
    canAccessDashboard: runtimeState.value.canAccessDashboard,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import { KangurParentDashboardTabsWidget } from './KangurParentDashboardTabsWidget';

describe('KangurParentDashboardTabsWidget', () => {
  beforeEach(() => {
    runtimeState.value = {
      activeTab: 'progress',
      canAccessDashboard: true,
      setActiveTab: vi.fn<(tabId: string) => void>(),
    };
  });

  it('prevents pointer focus on tab buttons while still switching tabs', () => {
    const onBeforeTabChange = vi.fn<(tabId: string) => void>();
    runtimeState.value = {
      activeTab: 'assign',
      canAccessDashboard: true,
      setActiveTab: vi.fn<(tabId: string) => void>(),
    };

    render(<KangurParentDashboardTabsWidget onBeforeTabChange={onBeforeTabChange} />);

    const progressTab = screen.getByRole('tab', { name: /postęp/i });
    const mouseDown = createEvent.mouseDown(progressTab);

    fireEvent(progressTab, mouseDown);
    fireEvent.click(progressTab);

    expect(progressTab).toHaveClass('min-h-12', 'min-w-[5rem]', 'px-4', 'touch-manipulation');
    expect(mouseDown.defaultPrevented).toBe(true);
    expect(onBeforeTabChange).toHaveBeenCalledWith('progress');
    expect(runtimeState.value.setActiveTab).toHaveBeenCalledWith('progress');
  });

  it('calls the pre-switch hook only when the user picks a different tab', () => {
    const onBeforeTabChange = vi.fn<(tabId: string) => void>();

    render(<KangurParentDashboardTabsWidget onBeforeTabChange={onBeforeTabChange} />);

    fireEvent.click(screen.getByRole('tab', { name: /postęp/i }));
    fireEvent.click(screen.getByRole('tab', { name: /zadania/i }));

    expect(onBeforeTabChange).toHaveBeenCalledTimes(1);
    expect(onBeforeTabChange).toHaveBeenCalledWith('assign');
  });

  it('does not render for viewers without dashboard access', () => {
    runtimeState.value = {
      activeTab: 'progress',
      canAccessDashboard: false,
      setActiveTab: vi.fn<(tabId: string) => void>(),
    };

    render(<KangurParentDashboardTabsWidget />);

    expect(screen.queryByRole('tab', { name: /postęp/i })).not.toBeInTheDocument();
  });

  it('renders only the tab strip without the dashboard tabs intro copy', () => {
    render(<KangurParentDashboardTabsWidget />);

    expect(screen.queryByText('Zakładki panelu')).not.toBeInTheDocument();
    expect(
      screen.queryByText('Przełączaj między wynikami, postępem, zadaniami, monitoringiem i ustawieniami Tutor-AI.')
    ).not.toBeInTheDocument();
  });
});
