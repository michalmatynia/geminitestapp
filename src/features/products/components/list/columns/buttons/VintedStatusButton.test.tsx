import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

import { VintedStatusButton } from './VintedStatusButton';

describe('VintedStatusButton', () => {
  it('reuses persisted quick-export recovery context for auth_required statuses', () => {
    window.sessionStorage.setItem(
      'vinted-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'failed',
          expiresAt: Date.now() + 60_000,
          runId: 'run-vinted-1',
          requestId: 'job-vinted-1',
          integrationId: 'integration-vinted-1',
          connectionId: 'conn-vinted-1',
        },
      })
    );

    const onOpenListings = vi.fn();

    render(
      <VintedStatusButton
        productId='product-1'
        status='auth_required'
        prefetchListings={vi.fn()}
        onOpenListings={onOpenListings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Vinted recovery options (auth_required).' }));

    expect(onOpenListings).toHaveBeenCalledWith({
      source: 'vinted_quick_export_auth_required',
      integrationSlug: 'vinted',
      status: 'auth_required',
      runId: 'run-vinted-1',
      failureReason: null,
      requestId: 'job-vinted-1',
      integrationId: 'integration-vinted-1',
      connectionId: 'conn-vinted-1',
    });
  });

  it('opens Vinted recovery context for auth_required statuses', () => {
    const onOpenListings = vi.fn();

    render(
      <VintedStatusButton
        productId='product-1'
        status='auth_required'
        prefetchListings={vi.fn()}
        onOpenListings={onOpenListings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Open Vinted recovery options (auth_required).' }));

    expect(onOpenListings).toHaveBeenCalledWith({
      source: 'vinted_quick_export_auth_required',
      integrationSlug: 'vinted',
      status: 'auth_required',
      runId: null,
      failureReason: null,
      requestId: null,
      integrationId: null,
      connectionId: null,
    });
  });

  it('opens the normal listing flow without recovery context for active statuses', () => {
    const onOpenListings = vi.fn();

    render(
      <VintedStatusButton
        productId='product-1'
        status='active'
        prefetchListings={vi.fn()}
        onOpenListings={onOpenListings}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Manage Vinted listing (active).' }));

    expect(onOpenListings).toHaveBeenCalledWith(undefined);
  });
});
