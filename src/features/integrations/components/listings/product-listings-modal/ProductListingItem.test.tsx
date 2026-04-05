/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderProductListingItem } from './ProductListingItem';

type MockListing = {
  id: string;
  integration: {
    name: string;
    slug: string;
  };
};

let latestDetailsListing: MockListing | null = null;
let latestActionsListing: MockListing | null = null;
let latestCardClassName = '';

vi.mock('@/shared/ui/primitives.public', () => ({
  Card: ({
    children,
    className,
  }: {
    children?: React.ReactNode;
    className?: string;
  }) => {
    latestCardClassName = className ?? '';
    return <div data-testid='listing-card'>{children}</div>;
  },
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

describe('renderProductListingItem', () => {
  beforeEach(() => {
    latestDetailsListing = null;
    latestActionsListing = null;
    latestCardClassName = '';
  });

  it('passes the listing directly into details and actions without a runtime provider', () => {
    const listing = {
      id: 'listing-1',
      integration: {
        name: 'Base.com',
        slug: 'base',
      },
    } as MockListing;

    render(renderProductListingItem({ listing: listing as never }));

    expect(screen.getByTestId('listing-card')).toBeInTheDocument();
    expect(screen.getByTestId('listing-details')).toHaveTextContent('Base.com');
    expect(screen.getByTestId('listing-actions')).toHaveTextContent('base');
    expect(latestDetailsListing).toBe(listing);
    expect(latestActionsListing).toBe(listing);
    expect(latestCardClassName).toContain('flex-col');
    expect(latestCardClassName).toContain('sm:flex-row');
  });
});
