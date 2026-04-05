// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminFilemakerPersonEditPageProvider,
  useAdminFilemakerPersonEditPageActionsContext,
  useAdminFilemakerPersonEditPageStateContext,
} from './AdminFilemakerPersonEditPageContext';

const mocks = vi.hoisted(() => ({
  useAdminFilemakerPersonEditPageState: vi.fn(),
}));

vi.mock('../hooks/useAdminFilemakerPersonEditPageState', () => ({
  useAdminFilemakerPersonEditPageState: () => mocks.useAdminFilemakerPersonEditPageState(),
}));

describe('AdminFilemakerPersonEditPageContext', () => {
  beforeEach(() => {
    mocks.useAdminFilemakerPersonEditPageState.mockReturnValue({
      editableAddresses: [],
      emailExtractionText: '',
      handleExtractEmails: vi.fn(),
      handleSave: vi.fn(),
      personDraft: {},
      phoneNumberExtractionText: '',
      setEditableAddresses: vi.fn(),
      setEmailExtractionText: vi.fn(),
      setPersonDraft: vi.fn(),
      setPhoneNumberExtractionText: vi.fn(),
    });
  });

  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useAdminFilemakerPersonEditPageStateContext())).toThrow(
      'useAdminFilemakerPersonEditPageStateContext must be used within AdminFilemakerPersonEditPageProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useAdminFilemakerPersonEditPageActionsContext())).toThrow(
      'useAdminFilemakerPersonEditPageActionsContext must be used within AdminFilemakerPersonEditPageProvider'
    );
  });

  it('splits state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdminFilemakerPersonEditPageProvider>{children}</AdminFilemakerPersonEditPageProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useAdminFilemakerPersonEditPageActionsContext(),
        state: useAdminFilemakerPersonEditPageStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      editableAddresses: [],
      emailExtractionText: '',
      phoneNumberExtractionText: '',
    });
    expect(result.current.actions.setPersonDraft).toBeTypeOf('function');
    expect(result.current.actions.handleSave).toBeTypeOf('function');
    expect(result.current.actions.handleExtractEmails).toBeTypeOf('function');
  });
});
