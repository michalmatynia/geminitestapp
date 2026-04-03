// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { NoteFormRuntimeContext, useNoteFormRuntime } from './NoteFormRuntimeContext';

describe('NoteFormRuntimeContext', () => {
  it('throws outside the provider', () => {
    expect(() => renderHook(() => useNoteFormRuntime())).toThrow(
      'useNoteFormRuntime must be used within NoteFormProvider'
    );
  });

  it('returns the runtime value inside the provider', () => {
    const handleSubmit = vi.fn();
    const setIsCreating = vi.fn();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NoteFormRuntimeContext.Provider
        value={{
          handleSubmit,
          note: null,
          setIsCreating,
        }}
      >
        {children}
      </NoteFormRuntimeContext.Provider>
    );

    const { result } = renderHook(() => useNoteFormRuntime(), { wrapper });

    expect(result.current.note).toBeNull();
    expect(result.current.setIsCreating).toBe(setIsCreating);
    expect(result.current.handleSubmit).toBe(handleSubmit);
  });
});
