// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FileUploadEventsProvider,
  useFileUploadEventsActions,
  useFileUploadEventsState,
} from './FileUploadEventsContext';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  useFileUploadEvents: vi.fn(),
}));

vi.mock('@/features/files/hooks/useFileUploadEvents', () => ({
  useFileUploadEvents: (filters: unknown) => mocks.useFileUploadEvents(filters),
}));

vi.mock('@/shared/ui', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

describe('FileUploadEventsContext', () => {
  beforeEach(() => {
    mocks.toast.mockReset();
    mocks.useFileUploadEvents.mockReturnValue({
      data: {
        events: [{ id: 'event-1', category: 'uploads', status: 'success' }],
        total: 1,
      },
      error: null,
      isFetching: false,
      refetch: vi.fn(),
    });
  });

  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useFileUploadEventsState())).toThrow(
      'useFileUploadEventsState must be used within a FileUploadEventsProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useFileUploadEventsActions())).toThrow(
      'useFileUploadEventsActions must be used within a FileUploadEventsProvider'
    );
  });

  it('provides state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <FileUploadEventsProvider>{children}</FileUploadEventsProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useFileUploadEventsActions(),
        state: useFileUploadEventsState(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      events: [{ id: 'event-1', category: 'uploads', status: 'success' }],
      isFetching: false,
      page: 1,
      status: 'all',
      total: 1,
      totalPages: 1,
    });
    expect(result.current.actions.handleResetFilters).toBeTypeOf('function');
    expect(result.current.actions.refetch).toBeTypeOf('function');
    expect(result.current.actions.setStatus).toBeTypeOf('function');
  });
});
