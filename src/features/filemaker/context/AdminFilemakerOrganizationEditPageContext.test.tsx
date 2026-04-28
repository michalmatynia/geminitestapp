// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminFilemakerOrganizationEditPageProvider,
  useAdminFilemakerOrganizationEditPageActionsContext,
  useAdminFilemakerOrganizationEditPageStateContext,
} from './AdminFilemakerOrganizationEditPageContext';

const mocks = vi.hoisted(() => ({
  useAdminFilemakerOrganizationEditPageState: vi.fn(),
}));

vi.mock('../hooks/useAdminFilemakerOrganizationEditPageState', () => ({
  useAdminFilemakerOrganizationEditPageState: () =>
    mocks.useAdminFilemakerOrganizationEditPageState(),
}));

describe('AdminFilemakerOrganizationEditPageContext', () => {
  beforeEach(() => {
    mocks.useAdminFilemakerOrganizationEditPageState.mockReturnValue({
      editableAddresses: [],
      emailExtractionText: '',
      handleExtractEmails: vi.fn(),
      handleSave: vi.fn(),
      handleWebsiteSocialScrape: vi.fn(),
      isWebsiteSocialScrapeRunning: false,
      linkedEventIds: [],
      orgDraft: {},
      phoneNumberExtractionText: '',
      setEditableAddresses: vi.fn(),
      setEmailExtractionText: vi.fn(),
      setLinkedEventIds: vi.fn(),
      setOrgDraft: vi.fn(),
      setPhoneNumberExtractionText: vi.fn(),
    });
  });

  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useAdminFilemakerOrganizationEditPageStateContext())).toThrow(
      'useAdminFilemakerOrganizationEditPageStateContext must be used within AdminFilemakerOrganizationEditPageProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useAdminFilemakerOrganizationEditPageActionsContext())).toThrow(
      'useAdminFilemakerOrganizationEditPageActionsContext must be used within AdminFilemakerOrganizationEditPageProvider'
    );
  });

  it('splits state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdminFilemakerOrganizationEditPageProvider>{children}</AdminFilemakerOrganizationEditPageProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useAdminFilemakerOrganizationEditPageActionsContext(),
        state: useAdminFilemakerOrganizationEditPageStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      editableAddresses: [],
      emailExtractionText: '',
      linkedEventIds: [],
      phoneNumberExtractionText: '',
    });
    expect(result.current.actions.setOrgDraft).toBeTypeOf('function');
    expect(result.current.actions.setLinkedEventIds).toBeTypeOf('function');
    expect(result.current.actions.handleSave).toBeTypeOf('function');
    expect(result.current.actions.handleWebsiteSocialScrape).toBeTypeOf('function');
  });
});
