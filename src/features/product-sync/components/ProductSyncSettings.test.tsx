/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useProductSyncProfilesMock,
  useProductSyncRunsMock,
  useCreateProductSyncProfileMutationMock,
  useUpdateProductSyncProfileMutationMock,
  useDeleteProductSyncProfileMutationMock,
  useRunProductSyncProfileMutationMock,
  useRelinkBaseProductsMutationMock,
  usePriceGroupsMock,
  useIntegrationsWithConnectionsMock,
  useBaseWarehousesMock,
  useDefaultExportConnectionMock,
  useDefaultExportInventoryMock,
  toastMock,
  confirmMock,
} = vi.hoisted(() => ({
  useProductSyncProfilesMock: vi.fn(),
  useProductSyncRunsMock: vi.fn(),
  useCreateProductSyncProfileMutationMock: vi.fn(),
  useUpdateProductSyncProfileMutationMock: vi.fn(),
  useDeleteProductSyncProfileMutationMock: vi.fn(),
  useRunProductSyncProfileMutationMock: vi.fn(),
  useRelinkBaseProductsMutationMock: vi.fn(),
  usePriceGroupsMock: vi.fn(),
  useIntegrationsWithConnectionsMock: vi.fn(),
  useBaseWarehousesMock: vi.fn(),
  useDefaultExportConnectionMock: vi.fn(),
  useDefaultExportInventoryMock: vi.fn(),
  toastMock: vi.fn(),
  confirmMock: vi.fn(),
}));

vi.mock('@/features/product-sync/hooks/useProductSyncSettings', () => ({
  useProductSyncProfiles: () => useProductSyncProfilesMock(),
  useProductSyncRuns: (...args: unknown[]) => useProductSyncRunsMock(...args),
  useCreateProductSyncProfileMutation: () => useCreateProductSyncProfileMutationMock(),
  useUpdateProductSyncProfileMutation: () => useUpdateProductSyncProfileMutationMock(),
  useDeleteProductSyncProfileMutation: () => useDeleteProductSyncProfileMutationMock(),
  useRunProductSyncProfileMutation: () => useRunProductSyncProfileMutationMock(),
  useRelinkBaseProductsMutation: () => useRelinkBaseProductsMutationMock(),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  usePriceGroups: (...args: unknown[]) => usePriceGroupsMock(...args),
}));

vi.mock('@/shared/hooks/useIntegrationQueries', () => ({
  useIntegrationsWithConnections: () => useIntegrationsWithConnectionsMock(),
  useBaseWarehouses: (...args: unknown[]) => useBaseWarehousesMock(...args),
  useDefaultExportConnection: () => useDefaultExportConnectionMock(),
  useDefaultExportInventory: () => useDefaultExportInventoryMock(),
}));

vi.mock('@/shared/hooks/ui/useConfirm', () => ({
  useConfirm: () => ({
    confirm: (...args: unknown[]) => confirmMock(...args),
    ConfirmationModal: () => null,
  }),
}));

vi.mock('@/shared/ui/primitives.public', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui/primitives.public')>(
    '@/shared/ui/primitives.public'
  );
  return {
    ...actual,
    useToast: () => ({
      toast: (...args: unknown[]) => toastMock(...args),
    }),
  };
});

import { ProductSyncSettings } from './ProductSyncSettings';

describe('ProductSyncSettings', () => {
  const createMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    useProductSyncProfilesMock.mockReturnValue({
      data: [],
      refetch: vi.fn(),
    });
    useProductSyncRunsMock.mockReturnValue({
      data: [],
      refetch: vi.fn(),
    });
    useCreateProductSyncProfileMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: createMutateAsync,
    });
    useUpdateProductSyncProfileMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    useDeleteProductSyncProfileMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    useRunProductSyncProfileMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    useRelinkBaseProductsMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    });
    useIntegrationsWithConnectionsMock.mockReturnValue({
      data: [
        {
          id: 'integration-1',
          slug: 'base-com',
          connections: [{ id: 'connection-1', name: 'Main Base Connection' }],
        },
      ],
    });
    usePriceGroupsMock.mockReturnValue({
      data: [
        {
          id: 'pg-pln',
          groupId: 'PLN_STANDARD',
          name: 'Standard PLN',
          currencyId: 'PLN',
          currencyCode: 'PLN',
          isDefault: true,
          type: 'standard',
          basePriceField: 'price',
          sourceGroupId: null,
          priceMultiplier: 1,
          addToPrice: 0,
        },
        {
          id: 'pg-eur',
          groupId: 'EUR_RETAIL',
          name: 'Retail EUR',
          currencyId: 'EUR',
          currencyCode: 'EUR',
          isDefault: false,
          type: 'standard',
          basePriceField: 'price',
          sourceGroupId: null,
          priceMultiplier: 1,
          addToPrice: 0,
        },
      ],
      isLoading: false,
    });
    useBaseWarehousesMock.mockReturnValue({
      data: {
        warehouses: [
          { id: '1', name: 'Main Warehouse', is_default: true, typedId: 'bl_1' },
        ],
        allWarehouses: [
          { id: '1', name: 'Main Warehouse', is_default: true, typedId: 'bl_1' },
        ],
      },
      isLoading: false,
    });
    useDefaultExportConnectionMock.mockReturnValue({
      data: { connectionId: 'connection-1' },
      refetch: vi.fn(),
    });
    useDefaultExportInventoryMock.mockReturnValue({
      data: { inventoryId: 'inventory-1' },
    });
    createMutateAsync.mockResolvedValue({
      id: 'profile-1',
      name: 'Base Product Sync',
      isDefault: true,
      enabled: true,
      connectionId: 'connection-1',
      inventoryId: 'inventory-1',
      catalogId: null,
      scheduleIntervalMinutes: 30,
      batchSize: 100,
      conflictPolicy: 'skip',
      fieldRules: [],
      lastRunAt: null,
      createdAt: '2026-04-11T12:00:00.000Z',
      updatedAt: '2026-04-11T12:00:00.000Z',
    });
  });

  it('defaults the first saved profile to the BL modal profile', async () => {
    render(<ProductSyncSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('inventory-1')).toBeInTheDocument();
    });

    expect(
      screen.getByLabelText('Use this profile in the BL modal and manual Base.com sync')
    ).toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          isDefault: true,
          connectionId: 'connection-1',
          inventoryId: 'inventory-1',
        })
      );
    });
  });

  it('shows labeled Base.com field options instead of a raw path input for standard rules', async () => {
    render(<ProductSyncSettings />);

    await waitFor(() => {
    expect(screen.getByText('Product name (text_fields.name)')).toBeInTheDocument();
    });

    expect(screen.queryByLabelText('Custom Base field path for Name (EN)')).not.toBeInTheDocument();
  });

  it('includes inventory warehouse stock targets in the Base field dropdown', async () => {
    render(<ProductSyncSettings />);

    await screen.findByLabelText('Base field for Stock');

    expect(screen.getByRole('option', { name: 'Main Warehouse (1)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Main Warehouse (bl_1)' })).toBeInTheDocument();
    expect(
      screen.getByText('2 warehouse stock targets loaded, 2 price-group targets loaded.')
    ).toBeInTheDocument();
  });

  it('includes catalog price-group targets in the Base field dropdown for price rules', async () => {
    render(<ProductSyncSettings />);

    fireEvent.click(screen.getByRole('button', { name: 'Add Rule' }));

    const appFieldSelects = screen.getAllByLabelText(/App field for sync rule/i);
    const lastAppFieldSelect = appFieldSelects[appFieldSelects.length - 1];
    fireEvent.change(lastAppFieldSelect, { target: { value: 'price' } });

    expect(await screen.findByRole('option', { name: 'Standard PLN (PLN_STANDARD)' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Retail EUR (EUR_RETAIL)' })).toBeInTheDocument();
  });

  it('keeps unknown persisted Base.com paths editable as custom values', async () => {
    useProductSyncProfilesMock.mockReturnValue({
      data: [
        {
          id: 'profile-1',
          name: 'Manual Base Sync',
          isDefault: true,
          enabled: true,
          connectionId: 'connection-1',
          inventoryId: 'inventory-1',
          catalogId: null,
          scheduleIntervalMinutes: 30,
          batchSize: 100,
          conflictPolicy: 'skip',
          fieldRules: [
            {
              id: 'rule-1',
              appField: 'name_en',
              baseField: 'text_fields.name|custom_shop',
              direction: 'app_to_base',
            },
          ],
          lastRunAt: null,
          createdAt: '2026-04-11T12:00:00.000Z',
          updatedAt: '2026-04-11T12:00:00.000Z',
        },
      ],
      refetch: vi.fn(),
    });

    render(<ProductSyncSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Custom Base field path for Name (EN)')).toHaveValue(
        'text_fields.name|custom_shop'
      );
    });

    expect(screen.getByText('Custom path')).toBeInTheDocument();
  });

  it('shows the BL modal badge for the selected default profile', () => {
    useProductSyncProfilesMock.mockReturnValue({
      data: [
        {
          id: 'profile-1',
          name: 'Manual Base Sync',
          isDefault: true,
          enabled: true,
          connectionId: 'connection-1',
          inventoryId: 'inventory-1',
          catalogId: null,
          scheduleIntervalMinutes: 30,
          batchSize: 100,
          conflictPolicy: 'skip',
          fieldRules: [],
          lastRunAt: null,
          createdAt: '2026-04-11T12:00:00.000Z',
          updatedAt: '2026-04-11T12:00:00.000Z',
        },
      ],
      refetch: vi.fn(),
    });

    render(<ProductSyncSettings />);

    expect(screen.getByRole('button', { name: /Manual Base Sync/i })).toBeInTheDocument();
    expect(screen.getByText('BL modal')).toBeInTheDocument();
  });
});
