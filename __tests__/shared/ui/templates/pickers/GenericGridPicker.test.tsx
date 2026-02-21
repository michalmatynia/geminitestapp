import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';

import type { GridPickerItem } from '@/shared/contracts/ui';
import { GenericGridPicker } from '@/shared/ui/templates/pickers/GenericGridPicker';

describe('GenericGridPicker', () => {
  const mockItems: GridPickerItem[] = [
    { id: 'item1', label: 'Item 1' },
    { id: 'item2', label: 'Item 2' },
    { id: 'item3', label: 'Item 3' },
  ];

  const defaultRender = (item: GridPickerItem, selected: boolean) => (
    <div className={selected ? 'selected' : ''}>{item.label}</div>
  );

  it('renders grid items', () => {
    const onSelect = vi.fn();
    render(
      <GenericGridPicker
        items={mockItems}
        onSelect={onSelect}
        renderItem={defaultRender}
      />
    );

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('calls onSelect when item clicked', async () => {
    const onSelect = vi.fn();
    render(
      <GenericGridPicker
        items={mockItems}
        onSelect={onSelect}
        renderItem={defaultRender}
      />
    );

    const item = screen.getByText('Item 1');
    await userEvent.click(item);

    expect(onSelect).toHaveBeenCalledWith(mockItems[0]);
  });

  it('highlights selected item', () => {
    const onSelect = vi.fn();
    render(
      <GenericGridPicker
        items={mockItems}
        selectedId='item2'
        onSelect={onSelect}
        renderItem={defaultRender}
      />
    );

    const item2 = screen.getByText('Item 2').closest('div[role="gridcell"]');
    expect(item2).toHaveClass('ring-2');
  });

  it('supports search filtering', async () => {
    const onSelect = vi.fn();
    render(
      <GenericGridPicker
        items={mockItems}
        onSelect={onSelect}
        renderItem={defaultRender}
        searchable
      />
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'item 1');

    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.queryByText('Item 2')).not.toBeInTheDocument();
  });

  it('clears search when clear button clicked', async () => {
    const onSelect = vi.fn();
    render(
      <GenericGridPicker
        items={mockItems}
        onSelect={onSelect}
        renderItem={defaultRender}
        searchable
      />
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'item');

    const clearBtn = screen.getByRole('button', { name: /clear search/i });
    await userEvent.click(clearBtn);

    expect(searchInput).toHaveValue('');
    expect(screen.getByText('Item 2')).toBeInTheDocument();
  });

  it('handles enter key to select', async () => {
    const onSelect = vi.fn();
    render(
      <GenericGridPicker
        items={mockItems}
        onSelect={onSelect}
        renderItem={defaultRender}
      />
    );

    const item = screen.getByText('Item 1').closest('div[role="gridcell"]');
    fireEvent.keyDown(item!, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith(mockItems[0]);
  });

  it('shows empty state when no results', async () => {
    const onSelect = vi.fn();
    render(
      <GenericGridPicker
        items={mockItems}
        onSelect={onSelect}
        renderItem={defaultRender}
        searchable
      />
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'nonexistent');

    expect(screen.getByText('No items found')).toBeInTheDocument();
  });

  it('supports custom empty state', () => {
    const onSelect = vi.fn();
    render(
      <GenericGridPicker
        items={[]}
        onSelect={onSelect}
        renderItem={defaultRender}
        emptyState={<div>Custom empty message</div>}
      />
    );

    expect(screen.getByText('Custom empty message')).toBeInTheDocument();
  });

  it('respects disabled state on items', async () => {
    const onSelect = vi.fn();
    const disabledItems: GridPickerItem[] = [
      { id: 'item1', label: 'Item 1', disabled: true },
      { id: 'item2', label: 'Item 2' },
    ];

    render(
      <GenericGridPicker
        items={disabledItems}
        onSelect={onSelect}
        renderItem={defaultRender}
      />
    );

    const item1 = screen.getByText('Item 1').closest('div[role="gridcell"]');
    await userEvent.click(item1!);

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('supports custom search matcher', async () => {
    const onSelect = vi.fn();
    const customMatcher = (query: string, item: GridPickerItem) =>
      item.id.includes(query);

    render(
      <GenericGridPicker
        items={mockItems}
        onSelect={onSelect}
        renderItem={defaultRender}
        searchable
        searchMatcher={customMatcher}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search...');
    await userEvent.type(searchInput, 'item2');

    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.queryByText('Item 1')).not.toBeInTheDocument();
  });

  it('configures grid columns', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <GenericGridPicker
        items={mockItems}
        onSelect={onSelect}
        renderItem={defaultRender}
        columns={2}
      />
    );

    const grid = container.querySelector('[role="grid"]');
    expect(grid).toHaveStyle({ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' });
  });

  it('disables all items when disabled prop is true', async () => {
    const onSelect = vi.fn();
    render(
      <GenericGridPicker
        items={mockItems}
        onSelect={onSelect}
        renderItem={defaultRender}
        disabled
      />
    );

    const item = screen.getByText('Item 1').closest('div[role="gridcell"]');
    await userEvent.click(item!);

    expect(onSelect).not.toHaveBeenCalled();
  });
});
