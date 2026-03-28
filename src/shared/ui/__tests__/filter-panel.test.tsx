// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui/templates/panels/PanelFilters', async () => {
  const ReactModule = await import('react');
  const PanelFiltersSearchPlaceholderRuntimeContext =
    ReactModule.createContext<string | undefined>(undefined);
  type PanelFiltersMockProps = {
    actions?: React.ReactNode;
    activeValues?: Record<string, unknown>;
    collapsible?: boolean;
    compact?: boolean;
    defaultExpanded?: boolean;
    filters: Array<{ key: string }>;
    onFilterChange: (key: string, value: unknown) => void;
    onReset?: () => void;
    onSearchChange?: (search: string) => void;
    search?: string;
    toggleButtonAlignment?: 'start' | 'end';
    values: Record<string, unknown>;
  };

  function MockPanelFilters(props: PanelFiltersMockProps): React.JSX.Element {
    const {
      actions,
      activeValues,
      collapsible,
      compact,
      defaultExpanded,
      filters,
      onFilterChange,
      onReset,
      onSearchChange,
      search,
      toggleButtonAlignment,
      values,
    } = props;
    const placeholder = ReactModule.useContext(PanelFiltersSearchPlaceholderRuntimeContext);

    return (
      <div
        data-testid='panel-filters'
        data-filters={filters.map((filter) => filter.key).join(',')}
        data-values={JSON.stringify(values)}
        data-active-values={JSON.stringify(activeValues ?? null)}
        data-search={search ?? ''}
        data-compact={String(compact)}
        data-collapsible={String(collapsible)}
        data-default-expanded={String(defaultExpanded)}
        data-toggle-alignment={toggleButtonAlignment}
        data-placeholder={placeholder}
      >
        <button type='button' onClick={() => onFilterChange('status', 'published')}>
          change-filter
        </button>
        <button type='button' onClick={() => onSearchChange?.('queued')}>
          change-search
        </button>
        <button type='button' onClick={() => onReset?.()}>
          reset
        </button>
        {actions}
      </div>
    );
  }

  return {
    PanelFiltersSearchPlaceholderRuntimeContext,
    PanelFilters: MockPanelFilters,
  };
});

import { FilterPanel } from '@/shared/ui/templates/FilterPanel';

describe('FilterPanel', () => {
  it('composes header, main filters, children, presets, and active count without a local runtime context', () => {
    const onFilterChange = vi.fn();
    const onSearchChange = vi.fn();
    const onReset = vi.fn();
    const onApplyPreset = vi.fn();

    render(
      <FilterPanel
        filters={[{ key: 'status', label: 'Status', type: 'text' }]}
        values={{ status: 'draft' }}
        activeValues={{ status: 'draft' }}
        search='draft'
        searchPlaceholder='Search statuses...'
        onFilterChange={onFilterChange}
        onSearchChange={onSearchChange}
        onReset={onReset}
        presets={[{ label: 'Published', values: { status: 'published' } }]}
        onApplyPreset={onApplyPreset}
        compact
        collapsible
        defaultExpanded
        toggleButtonAlignment='start'
        headerTitle='Content filters'
        headerAction={<button type='button'>header-action</button>}
        actions={<button type='button'>extra-action</button>}
        className='filter-panel'
      >
        <div>children-slot</div>
      </FilterPanel>
    );

    expect(screen.getByText('Content filters')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'header-action' })).toBeInTheDocument();

    const panelFilters = screen.getByTestId('panel-filters');
    expect(panelFilters.dataset.filters).toBe('status');
    expect(panelFilters.dataset.values).toBe(JSON.stringify({ status: 'draft' }));
    expect(panelFilters.dataset.activeValues).toBe(JSON.stringify({ status: 'draft' }));
    expect(panelFilters.dataset.search).toBe('draft');
    expect(panelFilters.dataset.compact).toBe('true');
    expect(panelFilters.dataset.collapsible).toBe('true');
    expect(panelFilters.dataset.defaultExpanded).toBe('true');
    expect(panelFilters.dataset.toggleAlignment).toBe('start');

    expect(screen.getByText('children-slot')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Published' })).toBeInTheDocument();
    expect(screen.getByText('1 filter active')).toBeInTheDocument();

    screen.getByRole('button', { name: 'change-filter' }).click();
    screen.getByRole('button', { name: 'change-search' }).click();
    screen.getByRole('button', { name: 'reset' }).click();
    screen.getByRole('button', { name: 'Published' }).click();

    expect(onFilterChange).toHaveBeenCalledWith('status', 'published');
    expect(onSearchChange).toHaveBeenCalledWith('queued');
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onApplyPreset).toHaveBeenCalledWith({ status: 'published' });
  });
});
