// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  AdminFilemakerPageProvider,
  useAdminFilemakerPageActionsContext,
  useAdminFilemakerPageStateContext,
} from './AdminFilemakerPageContext';

const mocks = vi.hoisted(() => ({
  useAdminFilemakerPageState: vi.fn(),
}));

vi.mock('../hooks/useAdminFilemakerPageState', () => ({
  useAdminFilemakerPageState: () => mocks.useAdminFilemakerPageState(),
}));

describe('AdminFilemakerPageContext', () => {
  beforeEach(() => {
    mocks.useAdminFilemakerPageState.mockReturnValue({
      activeTab: 'persons',
      emailDraft: {},
      eventDraft: {},
      isEmailModalOpen: false,
      isEventModalOpen: false,
      isOrgModalOpen: false,
      isPersonModalOpen: false,
      openCreateEmail: vi.fn(),
      openCreateEvent: vi.fn(),
      openCreateOrg: vi.fn(),
      openCreatePerson: vi.fn(),
      orgDraft: {},
      personDraft: {},
      searchQuery: '',
      setActiveTab: vi.fn(),
      setEmailDraft: vi.fn(),
      setEventDraft: vi.fn(),
      setIsEmailModalOpen: vi.fn(),
      setIsEventModalOpen: vi.fn(),
      setIsOrgModalOpen: vi.fn(),
      setIsPersonModalOpen: vi.fn(),
      setOrgDraft: vi.fn(),
      setPersonDraft: vi.fn(),
      setSearchQuery: vi.fn(),
      handleCreateEvent: vi.fn(),
      handleDeleteEmail: vi.fn(),
      handleDeleteEvent: vi.fn(),
      handleDeleteOrganization: vi.fn(),
      handleDeletePerson: vi.fn(),
      handleStartEditEmail: vi.fn(),
      handleStartEditEvent: vi.fn(),
      handleStartEditOrg: vi.fn(),
      handleStartEditPerson: vi.fn(),
    });
  });

  it('throws when state hook is used outside the provider', () => {
    expect(() => renderHook(() => useAdminFilemakerPageStateContext())).toThrow(
      'useAdminFilemakerPageStateContext must be used within AdminFilemakerPageProvider'
    );
  });

  it('throws when actions hook is used outside the provider', () => {
    expect(() => renderHook(() => useAdminFilemakerPageActionsContext())).toThrow(
      'useAdminFilemakerPageActionsContext must be used within AdminFilemakerPageProvider'
    );
  });

  it('splits state and actions inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdminFilemakerPageProvider>{children}</AdminFilemakerPageProvider>
    );

    const { result } = renderHook(
      () => ({
        actions: useAdminFilemakerPageActionsContext(),
        state: useAdminFilemakerPageStateContext(),
      }),
      { wrapper }
    );

    expect(result.current.state).toMatchObject({
      activeTab: 'persons',
      searchQuery: '',
    });
    expect(result.current.actions.setActiveTab).toBeTypeOf('function');
    expect(result.current.actions.openCreatePerson).toBeTypeOf('function');
    expect(result.current.actions.handleDeletePerson).toBeTypeOf('function');
  });
});
