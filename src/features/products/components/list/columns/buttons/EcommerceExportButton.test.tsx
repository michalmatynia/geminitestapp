import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ProductWithImages } from '@/shared/contracts/products/product';

import {
  baseQuickExportTestProduct as product,
  createBaseQuickExportTestQueryClient,
} from './BaseQuickExportButton.test-support';

const {
  ecommerceExportMutationState,
  invalidateListingBadgesMock,
  logClientErrorMock,
  mutateAsyncMock,
  toastMock,
} = vi.hoisted(() => ({
  ecommerceExportMutationState: { isPending: false },
  invalidateListingBadgesMock: vi.fn(),
  logClientErrorMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () => function MockDynamicComponent(): React.JSX.Element | null {
    return null;
  },
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateListingBadges: (...args: unknown[]) =>
    invalidateListingBadgesMock(...args) as Promise<void>,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (...args: unknown[]) => logClientErrorMock(...args),
}));

vi.mock('@/features/products/hooks/useProductEcommerceExportMutations', () => ({
  useExportProductToEcommerce: () => ({
    isPending: ecommerceExportMutationState.isPending,
    mutateAsync: mutateAsyncMock,
  }),
}));

import { EcommerceExportButton } from './EcommerceExportButton';

const renderButton = (
  overrides?: Partial<React.ComponentProps<typeof EcommerceExportButton>>
) =>
  render(
    <QueryClientProvider client={createBaseQuickExportTestQueryClient()}>
      <EcommerceExportButton product={product as ProductWithImages} {...overrides} />
    </QueryClientProvider>
  );

describe('EcommerceExportButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ecommerceExportMutationState.isPending = false;
    mutateAsyncMock.mockResolvedValue({ status: 'created' });
  });

  it('renders the shared neutral idle tone before ecommerce export', () => {
    renderButton({ showEcommerceBadge: false, ecommerceStatus: 'not_started' });

    const button = screen.getByRole('button', { name: 'Export to ecommerce' });
    expect(button.className).toContain('border-gray-500/50');
    expect(button.className).toContain('text-gray-300');
    expect(button.className).toContain('bg-transparent');
    expect(button.className).not.toContain('bg-gray-500/10');
    expect(button.className).not.toContain('text-gray-400');
  });

  it('keeps the managed ecommerce tone when the product is exported', () => {
    renderButton({ showEcommerceBadge: true, ecommerceStatus: 'active' });

    const button = screen.getByRole('button', { name: 'Manage ecommerce product' });
    expect(button.className).toContain('border-emerald-400/70');
    expect(button.className).toContain('bg-emerald-500/15');
    expect(button.className).toContain('text-emerald-100');
  });
});
