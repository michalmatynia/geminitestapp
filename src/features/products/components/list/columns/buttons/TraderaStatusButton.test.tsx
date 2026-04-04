import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

import { TraderaStatusButton } from './TraderaStatusButton';

describe('TraderaStatusButton', () => {
  it('reuses persisted quick-export recovery context for auth_required statuses', () => {
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'failed',
          expiresAt: Date.now() + 60_000,
          runId: 'run-tradera-1',
          requestId: 'job-tradera-1',
          integrationId: 'integration-tradera-1',
          connectionId: 'conn-tradera-1',
        },
      })
    );

    const onOpenListings = vi.fn();

    render(
      <TraderaStatusButton
        productId='product-1'
        status='auth_required'
        prefetchListings={vi.fn()}
        onOpenListings={onOpenListings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Tradera recovery options (auth_required).' }));

    expect(onOpenListings).toHaveBeenCalledWith({
      source: 'tradera_quick_export_auth_required',
      integrationSlug: 'tradera',
      status: 'auth_required',
      runId: 'run-tradera-1',
      requestId: 'job-tradera-1',
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
  });

  it('opens Tradera recovery context for auth_required statuses', () => {
    const onOpenListings = vi.fn();

    render(
      <TraderaStatusButton
        productId='product-1'
        status='auth_required'
        prefetchListings={vi.fn()}
        onOpenListings={onOpenListings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Tradera recovery options (auth_required).' }));

    expect(onOpenListings).toHaveBeenCalledWith({
      source: 'tradera_quick_export_auth_required',
      integrationSlug: 'tradera',
      status: 'auth_required',
      runId: null,
      requestId: null,
      integrationId: null,
      connectionId: null,
    });
  });

  it('opens the normal listing flow without recovery context for active statuses', () => {
    const onOpenListings = vi.fn();

    render(
      <TraderaStatusButton
        productId='product-1'
        status='active'
        prefetchListings={vi.fn()}
        onOpenListings={onOpenListings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Manage Tradera listing (active).' }));

    expect(onOpenListings).toHaveBeenCalledWith(undefined);
  });
});
