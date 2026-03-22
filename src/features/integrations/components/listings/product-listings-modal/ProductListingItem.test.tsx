/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductListingItem } from './ProductListingItem';

type MockListing = {
  id: string;
  integration: {
    name: string;
    slug: string;
  };
};

let latestDetailsListing: MockListing | null = null;
let latestActionsListing: MockListing | null = null;

vi.mock('@/shared/ui', () => ({
  Card: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid='listing-card'>{children}</div>
  ),
}));

vi.mock(
  '@/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingDetails',
  () => ({
    ProductListingDetails: ({ listing }: { listing: MockListing }) => {
      latestDetailsListing = listing;
      return <div data-testid='listing-details'>{listing.integration.name}</div>;
    },
  })
);

vi.mock(
  '@/features/integrations/components/listings/product-listings-modal/listing-item/ProductListingActions',
  () => ({
    ProductListingActions: ({ listing }: { listing: MockListing }) => {
      latestActionsListing = listing;
      return <div data-testid='listing-actions'>{listing.integration.slug}</div>;
    },
  })
);

describe('ProductListingItem', () => {
  beforeEach(() => {
    latestDetailsListing = null;
    latestActionsListing = null;
  });

  it('passes the listing directly into details and actions without a runtime provider', () => {
    const listing = {
      id: 'listing-1',
      integration: {
        name: 'Base.com',
        slug: 'base',
      },
    } as MockListing;

    render(<ProductListingItem listing={listing as never} />);

    expect(screen.getByTestId('listing-card')).toBeInTheDocument();
    expect(screen.getByTestId('listing-details')).toHaveTextContent('Base.com');
    expect(screen.getByTestId('listing-actions')).toHaveTextContent('base');
    expect(latestDetailsListing).toBe(listing);
    expect(latestActionsListing).toBe(listing);
  });
});
