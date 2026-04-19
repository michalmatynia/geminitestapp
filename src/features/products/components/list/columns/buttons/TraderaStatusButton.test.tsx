import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

const { useCustomFieldsMock } = vi.hoisted(() => ({
  useCustomFieldsMock: vi.fn(),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useCustomFields: (...args: unknown[]) => useCustomFieldsMock(...args),
}));

import { TraderaStatusButton } from './TraderaStatusButton';

describe('TraderaStatusButton', () => {
  it('disables the Tradera status action when Market Exclusion includes Tradera', () => {
    useCustomFieldsMock.mockReturnValue({
      data: [
        {
          id: 'market-exclusion',
          name: 'Market Exclusion',
          type: 'checkbox_set',
          options: [
            { id: 'opt-allegro', label: 'Allegro' },
            { id: 'opt-tradera', label: 'Tradera' },
          ],
          createdAt: '2026-04-01T00:00:00.000Z',
          updatedAt: '2026-04-01T00:00:00.000Z',
        },
      ],
      isLoading: false,
    });

    const onOpenListings = vi.fn();
    const prefetchListings = vi.fn();

    render(
      <TraderaStatusButton
        productId='product-1'
        status='ended'
        prefetchListings={prefetchListings}
        onOpenListings={onOpenListings}
        customFieldValues={[
          {
            fieldId: 'market-exclusion',
            selectedOptionIds: ['opt-tradera'],
          },
        ]}
      />
    );

    const button = screen.getByRole('button', {
      name: 'Tradera listing disabled by Market Exclusion (ended).',
    });

    expect(button).toBeDisabled();
    expect(button.className).toContain('disabled:opacity-40');
    expect(button.className).toContain('disabled:border-slate-700/35');
    expect(button.className).toContain('bg-slate-950/40');
    expect(button.className).toContain('text-slate-500');

    fireEvent.mouseEnter(button);
    fireEvent.focus(button);
    fireEvent.click(button);

    expect(prefetchListings).not.toHaveBeenCalled();
    expect(onOpenListings).not.toHaveBeenCalled();
  });

  it('reuses persisted quick-export recovery context for auth_required statuses', () => {
    useCustomFieldsMock.mockReturnValue({ data: [], isLoading: false });
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
      failureReason: null,
      requestId: 'job-tradera-1',
      integrationId: 'integration-tradera-1',
      connectionId: 'conn-tradera-1',
    });
  });

  it('opens Tradera recovery context for auth_required statuses', () => {
    useCustomFieldsMock.mockReturnValue({ data: [], isLoading: false });
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
      failureReason: null,
      requestId: null,
      integrationId: null,
      connectionId: null,
    });
  });

  it('opens the normal listing flow without recovery context for active statuses', () => {
    useCustomFieldsMock.mockReturnValue({ data: [], isLoading: false });
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

  it('suppresses stale recovery mode when persisted Tradera feedback is already completed', () => {
    useCustomFieldsMock.mockReturnValue({ data: [], isLoading: false });
    window.sessionStorage.setItem(
      'tradera-quick-list-feedback',
      JSON.stringify({
        'product-1': {
          productId: 'product-1',
          status: 'completed',
          expiresAt: Date.now() + 60_000,
          runId: 'run-tradera-1',
          requestId: 'job-tradera-1',
          integrationId: 'integration-tradera-1',
          connectionId: 'conn-tradera-1',
          duplicateMatchStrategy: 'exact-title-single-candidate',
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

    fireEvent.click(screen.getByRole('button', { name: 'Manage Tradera listing (active).' }));

    expect(onOpenListings).toHaveBeenCalledWith(undefined);
  });
});
