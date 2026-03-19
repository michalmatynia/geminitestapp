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
const useKangurPageContentEntryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  useKangurParentDashboardRuntime: () => runtimeState.value,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

import { KangurParentDashboardTabsWidget } from './KangurParentDashboardTabsWidget';

describe('KangurParentDashboardTabsWidget', () => {
  beforeEach(() => {
    runtimeState.value = {
      activeTab: 'scores',
      canAccessDashboard: true,
      setActiveTab: vi.fn<(tabId: string) => void>(),
    };
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: null,
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });
  });

  it('prevents pointer focus on tab buttons while still switching tabs', () => {
    const onBeforeTabChange = vi.fn<(tabId: string) => void>();

    render(<KangurParentDashboardTabsWidget onBeforeTabChange={onBeforeTabChange} />);

    const progressTab = screen.getByRole('tab', { name: /progress/i });
    const mouseDown = createEvent.mouseDown(progressTab);

    fireEvent(progressTab, mouseDown);
    fireEvent.click(progressTab);

    expect(mouseDown.defaultPrevented).toBe(true);
    expect(onBeforeTabChange).toHaveBeenCalledWith('progress');
    expect(runtimeState.value.setActiveTab).toHaveBeenCalledWith('progress');
  });

  it('calls the pre-switch hook only when the user picks a different tab', () => {
    const onBeforeTabChange = vi.fn<(tabId: string) => void>();

    render(<KangurParentDashboardTabsWidget onBeforeTabChange={onBeforeTabChange} />);

    fireEvent.click(screen.getByRole('tab', { name: /scores/i }));
    fireEvent.click(screen.getByRole('tab', { name: /assign/i }));

    expect(onBeforeTabChange).toHaveBeenCalledTimes(1);
    expect(onBeforeTabChange).toHaveBeenCalledWith('assign');
  });

  it('does not render for viewers without dashboard access', () => {
    runtimeState.value = {
      activeTab: 'scores',
      canAccessDashboard: false,
      setActiveTab: vi.fn<(tabId: string) => void>(),
    };

    render(<KangurParentDashboardTabsWidget />);

    expect(screen.queryByRole('tab', { name: /progress/i })).not.toBeInTheDocument();
  });

  it('renders Mongo-backed intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: {
        id: 'parent-dashboard-tabs',
        title: 'Zakładki panelu',
        summary: 'Wybierz rodzaj danych potrzebnych do kolejnej decyzji.',
      },
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });

    render(<KangurParentDashboardTabsWidget />);

    expect(screen.getByText('Zakładki panelu')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(
      screen.getByText('Wybierz rodzaj danych potrzebnych do kolejnej decyzji.')
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
  });
});
