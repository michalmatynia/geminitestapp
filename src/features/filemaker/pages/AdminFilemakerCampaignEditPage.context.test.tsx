// @vitest-environment jsdom

import React from 'react';
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  CampaignEditProvider,
  useCampaignEditContext,
} from './AdminFilemakerCampaignEditPage.context';

const mocks = vi.hoisted(() => ({
  useAdminFilemakerCampaignEditState: vi.fn(),
}));

vi.mock('./AdminFilemakerCampaignEditPage.hooks', () => ({
  useAdminFilemakerCampaignEditState: () => mocks.useAdminFilemakerCampaignEditState(),
}));

describe('AdminFilemakerCampaignEditPage.context', () => {
  beforeEach(() => {
    mocks.useAdminFilemakerCampaignEditState.mockReturnValue({
      campaign: { id: 'campaign-1', title: 'Spring' },
      isSaving: false,
      saveCampaign: vi.fn(),
      setCampaignName: vi.fn(),
    });
  });

  it('throws outside the provider', () => {
    expect(() => renderHook(() => useCampaignEditContext())).toThrow(
      'useCampaignEditContext must be used within a CampaignEditProvider'
    );
  });

  it('returns the edit state inside the provider', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <CampaignEditProvider>{children}</CampaignEditProvider>
    );

    const { result } = renderHook(() => useCampaignEditContext(), { wrapper });

    expect(result.current).toMatchObject({
      campaign: { id: 'campaign-1', title: 'Spring' },
      isSaving: false,
    });
    expect(result.current.saveCampaign).toBeTypeOf('function');
    expect(result.current.setCampaignName).toBeTypeOf('function');
  });
});
