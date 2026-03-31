// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useMasterFolderTreeSearch = vi.fn();

vi.mock('./useMasterFolderTreeSearch', () => ({
  useMasterFolderTreeSearch: (...args: unknown[]) => useMasterFolderTreeSearch(...args),
}));

vi.mock('./FolderTreeSearchBar', () => ({
  FolderTreeSearchBar: ({
    onChange,
    placeholder,
    value,
  }: {
    onChange: (value: string) => void;
    placeholder?: string;
    value: string;
  }) => (
    <input
      aria-label={placeholder ?? 'tree-search'}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  ),
}));

vi.mock('../components/FolderTreeViewportV2', () => ({
  FolderTreeViewportV2: ({
    controller,
    searchState,
    selectionMode,
  }: {
    controller: { nodes: unknown[] };
    searchState?: { marker: string };
    selectionMode?: string;
  }) => (
    <div
      data-testid='folder-tree-viewport'
      data-node-count={String(controller.nodes.length)}
      data-search-state={searchState?.marker ?? 'none'}
      data-selection-mode={selectionMode ?? ''}
    />
  ),
}));

import { FolderTreeSearchViewport } from './FolderTreeSearchViewport';

describe('FolderTreeSearchViewport', () => {
  it('renders the search bar and forwards the live search state into the viewport', () => {
    useMasterFolderTreeSearch.mockImplementation(
      (_nodes: unknown[], query: string) => ({ marker: query || 'empty' })
    );

    const controller = {
      nodes: [{ id: 'root' }],
    };

    render(
      <FolderTreeSearchViewport
        controller={controller as never}
        searchPlaceholder='Search folders...'
        viewportProps={{ selectionMode: 'single' } as never}
      />
    );

    const input = screen.getByLabelText('Search folders...');
    expect(input).toHaveValue('');
    expect(screen.getByTestId('folder-tree-viewport').dataset.searchState).toBe('empty');
    expect(screen.getByTestId('folder-tree-viewport').dataset.selectionMode).toBe('single');

    fireEvent.change(input, { target: { value: 'alpha' } });

    expect(useMasterFolderTreeSearch).toHaveBeenLastCalledWith(
      controller.nodes,
      'alpha',
      expect.any(Object)
    );
    expect(screen.getByTestId('folder-tree-viewport').dataset.searchState).toBe('alpha');
  });

  it('hides the search bar and omits viewport search state when profile search is disabled', () => {
    useMasterFolderTreeSearch.mockReturnValue({ marker: 'disabled' });

    const controller = {
      nodes: [{ id: 'root' }, { id: 'child' }],
    };

    render(
      <FolderTreeSearchViewport
        controller={controller as never}
        profile={{ search: { enabled: false } } as never}
      />
    );

    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.getByTestId('folder-tree-viewport').dataset.searchState).toBe('none');
    expect(screen.getByTestId('folder-tree-viewport').dataset.nodeCount).toBe('2');
  });
});
