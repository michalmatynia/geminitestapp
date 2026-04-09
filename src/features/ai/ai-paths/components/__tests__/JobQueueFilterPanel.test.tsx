import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  jobQueueState: null as Record<string, unknown> | null,
  setPathFilter: vi.fn(),
  setStatusFilter: vi.fn(),
  setPageSize: vi.fn(),
  setSearchQuery: vi.fn(),
  filterPanelProps: null as Record<string, unknown> | null,
}));

vi.mock('../JobQueueContext', () => ({
  useJobQueueState: () => mockState.jobQueueState,
  useJobQueueActions: () => ({
    setPathFilter: mockState.setPathFilter,
    setStatusFilter: mockState.setStatusFilter,
    setPageSize: mockState.setPageSize,
    setSearchQuery: mockState.setSearchQuery,
  }),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  FilterPanel: (props: Record<string, unknown>) => {
    mockState.filterPanelProps = props;
    return <div data-testid='filter-panel' />;
  },
}));

import { JobQueueFilterPanel } from '../JobQueueFilterPanel';

describe('JobQueueFilterPanel', () => {
  beforeEach(() => {
    mockState.jobQueueState = {
      pathFilter: 'path-1',
      statusFilter: 'running',
      pageSize: 50,
      searchQuery: 'run-123',
    };

    mockState.filterPanelProps = null;
    mockState.setPathFilter.mockReset();
    mockState.setStatusFilter.mockReset();
    mockState.setPageSize.mockReset();
    mockState.setSearchQuery.mockReset();
  });

  it('passes filter definitions, current values, and panel metadata into FilterPanel', () => {
    render(<JobQueueFilterPanel />);

    expect(screen.getByTestId('filter-panel')).toBeInTheDocument();
    expect(mockState.filterPanelProps).toMatchObject({
      values: {
        pathId: 'path-1',
        status: 'running',
        pageSize: '50',
      },
      search: 'run-123',
      headerTitle: 'Job Queue Filters',
      searchPlaceholder: 'Run ID, path name, entity, error...',
      onSearchChange: mockState.setSearchQuery,
    });

    expect(mockState.filterPanelProps?.['filters']).toEqual([
      {
        key: 'pathId',
        label: 'Path ID',
        type: 'text',
        placeholder: 'All paths',
        width: '20rem',
      },
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { value: 'all', label: 'All' },
          { value: 'queued', label: 'Queued' },
          { value: 'running', label: 'Running' },
          { value: 'paused', label: 'Paused' },
          { value: 'completed', label: 'Completed' },
          { value: 'failed', label: 'Failed' },
          { value: 'canceled', label: 'Canceled' },
          { value: 'dead_lettered', label: 'Dead-lettered' },
        ],
        width: '14rem',
      },
      {
        key: 'pageSize',
        label: 'Page Size',
        type: 'select',
        options: [
          { value: '10', label: '10' },
          { value: '25', label: '25' },
          { value: '50', label: '50' },
        ],
        width: '10rem',
      },
    ]);
  });

  it('routes filter changes and reset actions to the queue actions', () => {
    render(<JobQueueFilterPanel />);

    const onFilterChange = mockState.filterPanelProps?.[
      'onFilterChange'
    ] as ((key: string, value: unknown) => void);
    const onReset = mockState.filterPanelProps?.['onReset'] as (() => void);

    onFilterChange('pathId', 'path-2');
    onFilterChange('status', 'failed');
    onFilterChange('pageSize', '10');
    onFilterChange('unknown', 'ignored');
    onReset();

    expect(mockState.setPathFilter).toHaveBeenNthCalledWith(1, 'path-2');
    expect(mockState.setPathFilter).toHaveBeenNthCalledWith(2, '');
    expect(mockState.setStatusFilter).toHaveBeenNthCalledWith(1, 'failed');
    expect(mockState.setStatusFilter).toHaveBeenNthCalledWith(2, 'all');
    expect(mockState.setPageSize).toHaveBeenNthCalledWith(1, 10);
    expect(mockState.setPageSize).toHaveBeenNthCalledWith(2, 25);
    expect(mockState.setSearchQuery).toHaveBeenCalledWith('');
  });
});
