// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  StudioImportProvider,
  useStudioImportContext,
  type StudioImportContextValue,
} from './StudioImportContext';

const createStudioImportValue = (): StudioImportContextValue => ({
  driveImportMode: 'create',
  driveImportOpen: false,
  driveImportTargetId: null,
  handleCreateEmptySlot: vi.fn().mockResolvedValue(undefined),
  handleDriveSelection: vi.fn().mockResolvedValue(undefined),
  handleLocalUpload: vi.fn().mockResolvedValue(undefined),
  projectId: 'project-alpha',
  selectedSlot: null,
  setDriveImportMode: vi.fn(),
  setDriveImportOpen: vi.fn(),
  setDriveImportTargetId: vi.fn(),
  setLocalUploadMode: vi.fn(),
  setLocalUploadTargetId: vi.fn(),
  setSlotCreateOpen: vi.fn(),
  slotCreateOpen: false,
  triggerLocalUpload: vi.fn(),
  uploadPending: false,
});

describe('StudioImportContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useStudioImportContext())).toThrow(
      'useStudioImportContext must be used within StudioImportProvider'
    );
  });

  it('returns the provided import runtime', () => {
    const value = createStudioImportValue();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <StudioImportProvider value={value}>{children}</StudioImportProvider>
    );

    const { result } = renderHook(() => useStudioImportContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
