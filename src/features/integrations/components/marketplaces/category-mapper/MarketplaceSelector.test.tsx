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

  it('passes grouped connection options into the picker dropdown', () => {
    render(<MarketplaceSelector />);

    expect(screen.getByRole('button', { name: 'Base.com' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tradera' })).toBeInTheDocument();
    expect(mocks.genericPickerDropdown).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedKey: 'conn-base-1',
        groups: [
          expect.objectContaining({
            label: 'Base.com',
            options: [
              expect.objectContaining({
                key: 'conn-base-1',
                label: 'Base Alpha',
                description: 'From Base.com',
              }),
            ],
          }),
        ],
      })
    );
  });

  it('switches marketplace families through the selector buttons', () => {
    const setSelectedMarketplace = vi.fn();
    mocks.useCategoryMapperPageSelection.mockReturnValue({
      selectedMarketplace: 'base',
      selectedMarketplaceLabel: 'Base.com',
      selectedConnectionId: 'conn-base-1',
      setSelectedMarketplace,
      setSelectedConnectionId: vi.fn(),
    });

    render(<MarketplaceSelector />);

    fireEvent.click(screen.getByRole('button', { name: 'Tradera' }));

    expect(setSelectedMarketplace).toHaveBeenCalledWith('tradera');
  });

  it('shows the generic empty state when no connections are available', () => {
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
      screen.getByText('Configure a Tradera connection in Integrations first.')
    ).toBeInTheDocument();
  });
});
