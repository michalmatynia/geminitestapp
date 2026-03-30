/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  KANGUR_DRAWING_DRAFT_PERSIST_DELAY_MS,
  loadKangurDrawingDraftSnapshot,
  useKangurDrawingDraftStorage,
} from '../useKangurDrawingDraftStorage';

describe('useKangurDrawingDraftStorage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('persists draft snapshots after the shared defer window and clears them through the same hook', () => {
    const { result } = renderHook(() =>
      useKangurDrawingDraftStorage('alphabet-basics:A')
    );

    act(() => {
      result.current.setDraftSnapshot('draft-snapshot-1');
    });

    expect(loadKangurDrawingDraftSnapshot('alphabet-basics:A')).toBeNull();

    act(() => {
      vi.advanceTimersByTime(KANGUR_DRAWING_DRAFT_PERSIST_DELAY_MS);
    });

    expect(loadKangurDrawingDraftSnapshot('alphabet-basics:A')).toBe(
      'draft-snapshot-1'
    );

    act(() => {
      result.current.clearDraftSnapshot();
    });

    act(() => {
      vi.advanceTimersByTime(KANGUR_DRAWING_DRAFT_PERSIST_DELAY_MS);
    });

    expect(loadKangurDrawingDraftSnapshot('alphabet-basics:A')).toBeNull();
  });

  it('coalesces rapid draft updates and persists only the latest snapshot', () => {
    const { result } = renderHook(() =>
      useKangurDrawingDraftStorage('alphabet-basics:A')
    );

    act(() => {
      result.current.setDraftSnapshot('draft-snapshot-1');
      result.current.setDraftSnapshot('draft-snapshot-2');
      result.current.setDraftSnapshot('draft-snapshot-3');
    });

    act(() => {
      vi.advanceTimersByTime(KANGUR_DRAWING_DRAFT_PERSIST_DELAY_MS);
    });

    expect(loadKangurDrawingDraftSnapshot('alphabet-basics:A')).toBe(
      'draft-snapshot-3'
    );
  });

  it('flushes the latest draft snapshot when the hook unmounts before the defer window ends', () => {
    const { result, unmount } = renderHook(() =>
      useKangurDrawingDraftStorage('alphabet-basics:A')
    );

    act(() => {
      result.current.setDraftSnapshot('draft-snapshot-1');
    });

    expect(loadKangurDrawingDraftSnapshot('alphabet-basics:A')).toBeNull();

    unmount();

    expect(loadKangurDrawingDraftSnapshot('alphabet-basics:A')).toBe(
      'draft-snapshot-1'
    );
  });

  it('loads the persisted snapshot for the active storage key and switches drafts when the key changes', () => {
    window.sessionStorage.setItem(
      'kangur-drawing-draft-v1:alphabet-basics:A',
      'draft-a'
    );
    window.sessionStorage.setItem(
      'kangur-drawing-draft-v1:alphabet-basics:B',
      'draft-b'
    );

    const { result, rerender } = renderHook(
      ({ storageKey }) => useKangurDrawingDraftStorage(storageKey),
      {
        initialProps: {
          storageKey: 'alphabet-basics:A' as string | null,
        },
      }
    );

    expect(result.current.draftSnapshot).toBe('draft-a');

    act(() => {
      result.current.setDraftSnapshot('draft-a-updated');
    });

    rerender({ storageKey: 'alphabet-basics:B' });

    expect(loadKangurDrawingDraftSnapshot('alphabet-basics:A')).toBe(
      'draft-a-updated'
    );
    expect(result.current.draftSnapshot).toBe('draft-b');
  });
});
