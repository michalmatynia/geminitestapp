// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  useDocumentActions,
  useDocumentCore,
  useDocumentMetrics,
  useDocumentParams,
  useDocumentPrompt,
  useDocumentSelection,
  useDocumentState,
} from './DocumentContext';

describe('DocumentContext', () => {
  it('throws outside the provider for all strict hooks', () => {
    expect(() => renderHook(() => useDocumentPrompt())).toThrow(
      'useDocumentPrompt must be used within DocumentProvider'
    );
    expect(() => renderHook(() => useDocumentCore())).toThrow(
      'useDocumentCore must be used within DocumentProvider'
    );
    expect(() => renderHook(() => useDocumentSelection())).toThrow(
      'useDocumentSelection must be used within DocumentProvider'
    );
    expect(() => renderHook(() => useDocumentParams())).toThrow(
      'useDocumentParams must be used within DocumentProvider'
    );
    expect(() => renderHook(() => useDocumentMetrics())).toThrow(
      'useDocumentMetrics must be used within DocumentProvider'
    );
    expect(() => renderHook(() => useDocumentActions())).toThrow(
      'useDocumentActions must be used within DocumentProvider'
    );
    expect(() => renderHook(() => useDocumentState())).toThrow(
      'useDocumentState must be used within DocumentProvider'
    );
  });
});
