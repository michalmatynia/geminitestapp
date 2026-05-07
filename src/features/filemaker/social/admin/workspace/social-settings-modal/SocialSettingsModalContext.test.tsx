// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SocialSettingsModalProvider,
  useSocialSettingsModalContext,
} from './SocialSettingsModalContext';

const mocks = vi.hoisted(() => ({
  useSocialPostContext: vi.fn(),
  useSocialSettingsModalState: vi.fn(),
}));

vi.mock('../SocialPostContext', () => ({
  useSocialPostContext: () => mocks.useSocialPostContext(),
}));

vi.mock('./SocialSettingsModal.hooks', () => ({
  useSocialSettingsModalState: (context: unknown) => mocks.useSocialSettingsModalState(context),
}));

describe('SocialSettingsModalContext', () => {
  beforeEach(() => {
    mocks.useSocialPostContext.mockReturnValue({ postId: 'post-1' });
    mocks.useSocialSettingsModalState.mockReturnValue({
      closeModal: vi.fn(),
      isOpen: true,
      selectedTab: 'general',
      setSelectedTab: vi.fn(),
    });
  });

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useSocialSettingsModalContext())).toThrow(
      'useSocialSettingsModalContext must be used within a SocialSettingsModalProvider'
    );
  });

  it('returns the modal state inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <SocialSettingsModalProvider>{children}</SocialSettingsModalProvider>
    );

    const { result } = renderHook(() => useSocialSettingsModalContext(), { wrapper });

    expect(result.current).toMatchObject({
      isOpen: true,
      selectedTab: 'general',
    });
    expect(result.current.closeModal).toBeTypeOf('function');
    expect(result.current.setSelectedTab).toBeTypeOf('function');
  });
});
