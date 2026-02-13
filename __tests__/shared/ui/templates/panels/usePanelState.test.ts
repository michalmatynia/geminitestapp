import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { usePanelState } from '@/shared/ui/templates/panels/usePanelState';

describe('usePanelState', () => {
  it('initializes with default values', () => {
    const { result } = renderHook(() => usePanelState());

    expect(result.current.state.page).toBe(1);
    expect(result.current.state.pageSize).toBe(10);
    expect(result.current.state.filters).toEqual({});
    expect(result.current.state.search).toBe('');
  });

  it('initializes with custom values', () => {
    const { result } = renderHook(() =>
      usePanelState({
        initialPage: 2,
        initialPageSize: 20,
        initialFilters: { status: 'active' },
      })
    );

    expect(result.current.state.page).toBe(2);
    expect(result.current.state.pageSize).toBe(20);
    expect(result.current.state.filters).toEqual({ status: 'active' });
  });

  it('setPage updates page number', () => {
    const { result } = renderHook(() => usePanelState());

    act(() => {
      result.current.setPage(3);
    });

    expect(result.current.state.page).toBe(3);
  });

  it('setPageSize updates page size and resets to page 1', () => {
    const { result } = renderHook(() =>
      usePanelState({ initialPage: 5 })
    );

    act(() => {
      result.current.setPageSize(25);
    });

    expect(result.current.state.pageSize).toBe(25);
    expect(result.current.state.page).toBe(1);
  });

  it('setFilter updates single filter and resets page', () => {
    const { result } = renderHook(() =>
      usePanelState({ initialPage: 3, initialFilters: { status: 'active' } })
    );

    act(() => {
      result.current.setFilter('type', 'premium');
    });

    expect(result.current.state.filters).toEqual({
      status: 'active',
      type: 'premium',
    });
    expect(result.current.state.page).toBe(1);
  });

  it('reset restores initial values', () => {
    const { result } = renderHook(() =>
      usePanelState({
        initialPage: 2,
        initialPageSize: 20,
        initialFilters: { status: 'active' },
      })
    );

    act(() => {
      result.current.setPage(5);
      result.current.setPageSize(50);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.state.page).toBe(2);
    expect(result.current.state.pageSize).toBe(20);
  });

  it('calls onStateChange callback when state changes', () => {
    const onStateChange = vi.fn();
    const { result } = renderHook(() => usePanelState({ onStateChange }));

    act(() => {
      result.current.setPage(2);
    });

    expect(onStateChange).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        pageSize: 10,
      })
    );
  });
});
