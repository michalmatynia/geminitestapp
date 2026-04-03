// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SlotTreeContext, useSlotTreeContext } from './SlotTreeContext';

const createSlotTreeContextValue = () =>
  ({
    controller: {} as never,
    slotById: new Map(),
    onSelectFolder: vi.fn(),
    onDeleteFolder: vi.fn(),
    onMoveFolder: vi.fn().mockResolvedValue(undefined),
    onRenameFolder: vi.fn().mockResolvedValue(undefined),
    onDeleteSlot: vi.fn(),
    onMoveSlot: vi.fn(),
    updateSlot: vi.fn().mockResolvedValue(undefined),
    setSelectedSlotId: vi.fn(),
    selectedSlotId: null,
    clearSelection: vi.fn(),
    startFolderRename: vi.fn(),
    commitFolderRename: vi.fn(),
    startCardRename: vi.fn(),
    commitCardRename: vi.fn(),
    onSelectCardNode: vi.fn(),
    stickySelectionMode: false,
    clearSelectionOnAwayClick: true,
    profile: {} as never,
    placeholderClasses: {} as never,
    icons: {
      FolderClosedIcon: () => null,
      FolderOpenIcon: () => null,
      FileIcon: () => null,
      DragHandleIcon: () => null,
    },
    deleteSlotMutationPending: false,
  }) satisfies React.ComponentProps<typeof SlotTreeContext.Provider>['value'];

describe('SlotTreeContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useSlotTreeContext())).toThrow(
      'useSlotTreeContext must be used within SlotTree'
    );
  });

  it('returns the provided slot tree runtime', () => {
    const value = createSlotTreeContextValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SlotTreeContext.Provider value={value}>{children}</SlotTreeContext.Provider>
    );

    const { result } = renderHook(() => useSlotTreeContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
