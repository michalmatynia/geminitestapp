/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useAdminKangurSocialPageMock } = vi.hoisted(() => ({
  useAdminKangurSocialPageMock: vi.fn(),
}));

vi.mock('./AdminKangurSocialPage.hooks', () => ({
  useAdminKangurSocialPage: () => useAdminKangurSocialPageMock(),
}));

import { SocialPostProvider, useSocialPostContext } from './SocialPostContext';

const buildSocialPageState = (overrides?: Record<string, unknown>) => ({
  activePost: { id: 'post-1', titlePl: 'Post 1' },
  setActivePostId: vi.fn(),
  currentVisualAnalysisJob: null,
  currentGenerationJob: null,
  currentPipelineJob: null,
  missingSelectedImageAddonIds: [],
  handleRefreshMissingImageAddons: vi.fn().mockResolvedValue(undefined),
  handleRemoveMissingAddons: vi.fn().mockResolvedValue(undefined),
  missingImageAddonActionPending: null,
  missingImageAddonActionErrorMessage: null,
  ...overrides,
});

function SocialPostContextConsumer(): React.JSX.Element {
  const {
    missingSelectedImageAddonIds,
    handleRefreshMissingImageAddons,
    handleRemoveMissingAddons,
    missingImageAddonActionPending,
    missingImageAddonActionErrorMessage,
  } = useSocialPostContext();

  return (
    <div>
      <div data-testid='missing-addon-ids'>
        {missingSelectedImageAddonIds.join(',') || 'none'}
      </div>
      <div data-testid='missing-addon-action-pending'>
        {missingImageAddonActionPending ?? 'idle'}
      </div>
      <div data-testid='missing-addon-action-error'>
        {missingImageAddonActionErrorMessage ?? ''}
      </div>
      <button type='button' onClick={() => void handleRefreshMissingImageAddons()}>
        Refresh missing add-ons
      </button>
      <button type='button' onClick={() => void handleRemoveMissingAddons()}>
        Remove missing add-ons
      </button>
    </div>
  );
}

describe('SocialPostContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forwards missing-addon actions and state from the social page hook', () => {
    const handleRefreshMissingImageAddons = vi.fn().mockResolvedValue(undefined);
    const handleRemoveMissingAddons = vi.fn().mockResolvedValue(undefined);

    useAdminKangurSocialPageMock.mockReturnValue(
      buildSocialPageState({
        missingSelectedImageAddonIds: ['addon-1', 'addon-2'],
        handleRefreshMissingImageAddons,
        handleRemoveMissingAddons,
        missingImageAddonActionPending: 'remove',
        missingImageAddonActionErrorMessage: 'Failed to remove the missing image add-ons.',
      })
    );

    render(
      <SocialPostProvider>
        <SocialPostContextConsumer />
      </SocialPostProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh missing add-ons' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove missing add-ons' }));

    expect(screen.getByTestId('missing-addon-ids')).toHaveTextContent('addon-1,addon-2');
    expect(screen.getByTestId('missing-addon-action-pending')).toHaveTextContent('remove');
    expect(screen.getByTestId('missing-addon-action-error')).toHaveTextContent(
      'Failed to remove the missing image add-ons.'
    );
    expect(handleRefreshMissingImageAddons).toHaveBeenCalledTimes(1);
    expect(handleRemoveMissingAddons).toHaveBeenCalledTimes(1);
  });

  it('normalizes malformed missing-addon state from the social page hook to safe defaults', () => {
    useAdminKangurSocialPageMock.mockReturnValue(
      buildSocialPageState({
        missingSelectedImageAddonIds: 'addon-1',
        handleRefreshMissingImageAddons: null,
        handleRemoveMissingAddons: null,
        missingImageAddonActionPending: 'broken',
        missingImageAddonActionErrorMessage: { message: 'broken' },
      })
    );

    render(
      <SocialPostProvider>
        <SocialPostContextConsumer />
      </SocialPostProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Refresh missing add-ons' }));
    fireEvent.click(screen.getByRole('button', { name: 'Remove missing add-ons' }));

    expect(screen.getByTestId('missing-addon-ids')).toHaveTextContent('none');
    expect(screen.getByTestId('missing-addon-action-pending')).toHaveTextContent('idle');
    expect(screen.getByTestId('missing-addon-action-error')).toHaveTextContent('');
  });
});
