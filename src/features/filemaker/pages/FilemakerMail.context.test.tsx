// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { MailPageProvider, useMailPageContext } from './FilemakerMail.context';

const mocks = vi.hoisted(() => ({
  useAdminFilemakerMailPageState: vi.fn(),
}));

vi.mock('./AdminFilemakerMailPage.hooks', () => ({
  useAdminFilemakerMailPageState: () => mocks.useAdminFilemakerMailPageState(),
}));

describe('FilemakerMail.context', () => {
  beforeEach(() => {
    mocks.useAdminFilemakerMailPageState.mockReturnValue({
      activeTab: 'campaigns',
      campaigns: [],
      setActiveTab: vi.fn(),
    });
  });

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useMailPageContext())).toThrow(
      'useMailPageContext must be used within a MailPageProvider'
    );
  });

  it('returns the page state inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <MailPageProvider>{children}</MailPageProvider>
    );

    const { result } = renderHook(() => useMailPageContext(), { wrapper });

    expect(result.current).toMatchObject({
      activeTab: 'campaigns',
      campaigns: [],
    });
    expect(result.current.setActiveTab).toBeTypeOf('function');
  });
});
