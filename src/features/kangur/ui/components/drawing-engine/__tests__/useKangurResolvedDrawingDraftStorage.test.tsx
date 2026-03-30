/**
 * @vitest-environment jsdom
 */

'use client';

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { KangurDrawingDraftStorageController } from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingDraftStorage';
import {
  KANGUR_DRAWING_DRAFT_PERSIST_DELAY_MS,
  useKangurDrawingDraftStorage,
} from '@/features/kangur/ui/components/drawing-engine/useKangurDrawingDraftStorage';
import { useKangurResolvedDrawingDraftStorage } from '@/features/kangur/ui/components/drawing-engine/useKangurResolvedDrawingDraftStorage';

describe('useKangurResolvedDrawingDraftStorage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('falls back to the shared storage-backed draft hook when no external controller is provided', () => {
    window.sessionStorage.setItem(
      'kangur-drawing-draft-v1:resolved-draft:test',
      'stored-draft'
    );

    const { result } = renderHook(() =>
      useKangurResolvedDrawingDraftStorage({
        storageKey: 'resolved-draft:test',
      })
    );

    expect(result.current.draftSnapshot).toBe('stored-draft');
  });

  it('prefers an injected external draft controller over the storage-backed controller', () => {
    const externalDraftStorage: KangurDrawingDraftStorageController = {
      clearDraftSnapshot: vi.fn(),
      draftSnapshot: 'external-draft',
      setDraftSnapshot: vi.fn(),
    };

    const { result } = renderHook(() =>
      useKangurResolvedDrawingDraftStorage({
        draftStorage: externalDraftStorage,
        storageKey: 'resolved-draft:test',
      })
    );

    expect(result.current).toBe(externalDraftStorage);
  });

  it('keeps the shared storage-backed controller behavior intact when delegated through the resolver', () => {
    const { result } = renderHook(() =>
      useKangurResolvedDrawingDraftStorage({
        storageKey: 'resolved-draft:test',
      })
    );

    act(() => {
      result.current.setDraftSnapshot('draft-snapshot-1');
      vi.advanceTimersByTime(KANGUR_DRAWING_DRAFT_PERSIST_DELAY_MS);
    });

    const { result: storageResult, unmount } = renderHook(() =>
      useKangurDrawingDraftStorage('resolved-draft:test')
    );

    expect(storageResult.current.draftSnapshot).toBe('draft-snapshot-1');
    unmount();
  });
});
