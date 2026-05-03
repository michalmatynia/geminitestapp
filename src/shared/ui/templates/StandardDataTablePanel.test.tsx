// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MockListPanel } from '@/__tests__/mocks/MockListPanel';

vi.mock('../data-table', () => ({
  DataTable: ({
    columns,
    data,
    emptyState,
    isLoading,
  }: {
    columns: Array<{ id?: string }>;
    data: unknown[];
    emptyState?: React.ReactNode;
    isLoading?: boolean;
  }) => (
    <div
      data-testid='data-table'
      data-column-count={String(columns.length)}
      data-row-count={String(data.length)}
      data-is-loading={String(isLoading)}
    >
      {emptyState}
    </div>
  ),
}));

vi.mock('../list-panel', () => ({
  ListPanel: MockListPanel,
}));

vi.mock('../section-header', () => ({
  SectionHeader: ({
    actions,
    description,
    title,
  }: {
    actions?: React.ReactNode;
    description?: string;
    title: string;
  }) => (
    <div data-testid='section-header'>
      <span>{title}</span>
      <span>{description}</span>
      {actions}
    </div>
  ),
}));

import {
  StandardDataTablePanel,
  StandardDataTablePanelRuntimeContext,
} from './StandardDataTablePanel';

describe('StandardDataTablePanel', () => {
  it('renders the generated header and table layout directly without local runtime providers', () => {
    render(
      <StandardDataTablePanelRuntimeContext.Provider
        value={{
          alerts: <div>runtime-alert</div>,
          filters: <div>runtime-filter</div>,
          footer: <div>runtime-footer</div>,
          header: undefined,
        }}
      >
        <StandardDataTablePanel
          title='Events'
          description='Recent system events'
          headerActions={<button type='button'>header-action</button>}
          actions={<button type='button'>panel-action</button>}
          className='panel-shell'
          contentClassName='panel-content'
          variant='flat'
          columns={[{ id: 'name', accessorKey: 'name' } as never]}
          data={[{ name: 'row-1' }]}
          emptyState={<div>empty-state</div>}
          isLoading
          loadingVariant='table'
          loadingMessage='Loading events'
        />
      </StandardDataTablePanelRuntimeContext.Provider>
    );

    const listPanel = screen.getByTestId('list-panel');
    expect(listPanel.dataset.className).toBe('panel-shell');
    expect(listPanel.dataset.contentClassName).toContain('min-w-0');
    expect(listPanel.dataset.contentClassName).toContain('panel-content');
    expect(listPanel.dataset.variant).toBe('flat');
    expect(listPanel.dataset.isLoading).toBe('false');
    expect(listPanel.dataset.loadingMessage).toBe('Loading events');

    expect(screen.getByTestId('section-header')).toHaveTextContent('Events');
    expect(screen.getByTestId('section-header')).toHaveTextContent('Recent system events');
    expect(screen.getByRole('button', { name: 'header-action' })).toBeInTheDocument();
    expect(screen.getByTestId('list-panel-alerts')).toHaveTextContent('runtime-alert');
    expect(screen.getByTestId('list-panel-filters')).toHaveTextContent('runtime-filter');
    expect(screen.getByTestId('list-panel-actions')).toHaveTextContent('panel-action');
    expect(screen.getByTestId('list-panel-footer')).toHaveTextContent('runtime-footer');

    const dataTable = screen.getByTestId('data-table');
    expect(dataTable.dataset.columnCount).toBe('1');
    expect(dataTable.dataset.rowCount).toBe('1');
    expect(dataTable.dataset.isLoading).toBe('true');
    expect(dataTable).toHaveTextContent('empty-state');
  });
});
