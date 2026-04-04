/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useCategoryMapperPageData: vi.fn(),
  useCategoryMapperPageSelection: vi.fn(),
  genericPickerDropdown: vi.fn(),
}));

vi.mock('@/features/integrations/context/CategoryMapperPageContext', () => ({
  useCategoryMapperPageData: mocks.useCategoryMapperPageData,
  useCategoryMapperPageSelection: mocks.useCategoryMapperPageSelection,
}));

vi.mock('@/shared/ui/templates/pickers', () => ({
  GenericPickerDropdown: (props: {
    selectedKey: string;
    groups: Array<{ label: string; options: Array<{ key: string; label: string }> }>;
  }) => {
    mocks.genericPickerDropdown(props);
    return <div data-testid='generic-picker-dropdown'>{props.selectedKey}</div>;
  },
}));

import { MarketplaceSelector } from './MarketplaceSelector';

describe('MarketplaceSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useCategoryMapperPageData.mockReturnValue({
      loading: false,
      marketplaces: [
        {
          value: 'base',
          label: 'Base.com',
          description: 'Map Base.com categories.',
        },
        {
          value: 'tradera',
          label: 'Tradera',
          description: 'Fetch live Tradera categories.',
        },
      ],
      integrations: [
        {
          id: 'integration-base-1',
          name: 'Base.com',
          connections: [{ id: 'conn-base-1', name: 'Base Alpha' }],
        },
      ],
    });
    mocks.useCategoryMapperPageSelection.mockReturnValue({
      selectedMarketplace: 'base',
      selectedMarketplaceLabel: 'Base.com',
      selectedConnectionId: 'conn-base-1',
      setSelectedMarketplace: vi.fn(),
      setSelectedConnectionId: vi.fn(),
    });
  });

  it('lets the user switch the marketplace family', () => {
    const setSelectedMarketplaceMock = vi.fn();
    mocks.useCategoryMapperPageSelection.mockReturnValue({
      selectedMarketplace: 'base',
      selectedMarketplaceLabel: 'Base.com',
      selectedConnectionId: 'conn-base-1',
      setSelectedMarketplace: setSelectedMarketplaceMock,
      setSelectedConnectionId: vi.fn(),
    });

    render(<MarketplaceSelector />);

    fireEvent.click(screen.getByRole('button', { name: 'Tradera' }));

    expect(setSelectedMarketplaceMock).toHaveBeenCalledWith('tradera');
  });

  it('shows a marketplace-specific empty state for Tradera browser connections', () => {
    mocks.useCategoryMapperPageData.mockReturnValue({
      loading: false,
      marketplaces: [
        {
          value: 'base',
          label: 'Base.com',
          description: 'Map Base.com categories.',
        },
        {
          value: 'tradera',
          label: 'Tradera',
          description: 'Fetch live Tradera categories.',
        },
      ],
      integrations: [],
    });
    mocks.useCategoryMapperPageSelection.mockReturnValue({
      selectedMarketplace: 'tradera',
      selectedMarketplaceLabel: 'Tradera',
      selectedConnectionId: null,
      setSelectedMarketplace: vi.fn(),
      setSelectedConnectionId: vi.fn(),
    });

    render(<MarketplaceSelector />);

    expect(screen.getByText('No Tradera connections found')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tradera categories are fetched live from the create-listing page through a logged-in browser Playwright session.'
      )
    ).toBeInTheDocument();
  });
});
