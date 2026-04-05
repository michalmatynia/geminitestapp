import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const listingSettingsProviderMock = vi.fn();

vi.mock('@/features/integrations/context/ListingSettingsContext', () => ({
  ListingSettingsProvider: (props: {
    children: React.ReactNode;
    initialIntegrationId?: string | null;
    initialConnectionId?: string | null;
  }) => {
    listingSettingsProviderMock(props);
    return <div data-testid='listing-settings-provider'>{props.children}</div>;
  },
}));

import { ListingSettingsModalProvider } from './ListingSettingsModalProvider';

describe('ListingSettingsModalProvider', () => {
  it('normalizes missing ids to null', () => {
    render(
      <ListingSettingsModalProvider>
        <div>Child content</div>
      </ListingSettingsModalProvider>
    );

    expect(screen.getByTestId('listing-settings-provider')).toHaveTextContent('Child content');
    expect(listingSettingsProviderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        initialIntegrationId: null,
        initialConnectionId: null,
      })
    );
  });

  it('forwards explicit ids unchanged', () => {
    render(
      <ListingSettingsModalProvider
        initialIntegrationId='integration-1'
        initialConnectionId='connection-2'
      >
        <div>Child content</div>
      </ListingSettingsModalProvider>
    );

    expect(listingSettingsProviderMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        initialIntegrationId: 'integration-1',
        initialConnectionId: 'connection-2',
      })
    );
  });
});
