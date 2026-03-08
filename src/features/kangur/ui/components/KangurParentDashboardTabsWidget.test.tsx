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
  useKangurParentDashboardRuntime: () => runtimeState.value,
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

    render(<KangurParentDashboardTabsWidget onBeforeTabChange={onBeforeTabChange} />);

    const scoresTab = screen.getByRole('button', { name: /wyniki gier/i });
    const mouseDown = createEvent.mouseDown(scoresTab);

    fireEvent(scoresTab, mouseDown);
    fireEvent.click(scoresTab);

    expect(mouseDown.defaultPrevented).toBe(true);
    expect(onBeforeTabChange).toHaveBeenCalledWith('scores');
    expect(runtimeState.value.setActiveTab).toHaveBeenCalledWith('scores');
  });

  it('calls the pre-switch hook only when the user picks a different tab', () => {
    const onBeforeTabChange = vi.fn<(tabId: string) => void>();

    render(<KangurParentDashboardTabsWidget onBeforeTabChange={onBeforeTabChange} />);

    fireEvent.click(screen.getByRole('button', { name: /postep/i }));
    fireEvent.click(screen.getByRole('button', { name: /zadania/i }));

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

    expect(screen.queryByRole('button', { name: /postep/i })).not.toBeInTheDocument();
  });
});
