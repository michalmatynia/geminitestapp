import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePickerSearch } from '@/shared/ui/templates/pickers/usePickerSearch';

describe('usePickerSearch', () => {
  const mockItems = [
    { id: '1', label: 'Grid Layout' },
    { id: '2', label: 'Block Section' },
    { id: '3', label: 'Text Element' },
  ];

  it('returns all items when query is empty', () => {
    const { result } = renderHook(() =>
      usePickerSearch(mockItems)
    );

    expect(result.current.filtered).toHaveLength(3);
    expect(result.current.query).toBe('');
  });

  it('filters items based on query', () => {
    const { result } = renderHook(() =>
      usePickerSearch(mockItems)
    );

    act(() => {
      result.current.setQuery('grid');
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]).toEqual(mockItems[0]);
  });

  it('performs case-insensitive search', () => {
    const { result } = renderHook(() =>
      usePickerSearch(mockItems)
    );

    act(() => {
      result.current.setQuery('BLOCK');
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]).toEqual(mockItems[1]);
  });

  it('uses custom matcher function', () => {
    const customMatcher = (query: string, item: any) =>
      item.id === query;

    const { result } = renderHook(() =>
      usePickerSearch(mockItems, { matcher: customMatcher })
    );

    act(() => {
      result.current.setQuery('2');
    });

    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0]).toEqual(mockItems[1]);
  });

  it('tracks isSearching state', () => {
    const { result } = renderHook(() =>
      usePickerSearch(mockItems)
    );

    expect(result.current.isSearching).toBe(false);

    act(() => {
      result.current.setQuery('grid');
    });

    expect(result.current.isSearching).toBe(true);
  });

  it('clears search query', () => {
    const { result } = renderHook(() =>
      usePickerSearch(mockItems)
    );

    act(() => {
      result.current.setQuery('grid');
    });

    expect(result.current.query).toBe('grid');

    act(() => {
      result.current.clearSearch();
    });

    expect(result.current.query).toBe('');
    expect(result.current.filtered).toHaveLength(3);
  });

  it('handles empty search results', () => {
    const { result } = renderHook(() =>
      usePickerSearch(mockItems)
    );

    act(() => {
      result.current.setQuery('nonexistent');
    });

    expect(result.current.filtered).toHaveLength(0);
  });

  it('supports initial query', () => {
    const { result } = renderHook(() =>
      usePickerSearch(mockItems, { initialQuery: 'block' })
    );

    expect(result.current.query).toBe('block');
    expect(result.current.filtered).toHaveLength(1);
  });

  it('updates filtered results when items change', () => {
    const { result, rerender } = renderHook(
      ({ items }) => usePickerSearch(items),
      { initialProps: { items: mockItems } }
    );

    act(() => {
      result.current.setQuery('grid');
    });

    expect(result.current.filtered).toHaveLength(1);

    const newItems = [...mockItems, { id: '4', label: 'Grid Column' }];
    rerender({ items: newItems });

    expect(result.current.filtered).toHaveLength(2);
  });
});
