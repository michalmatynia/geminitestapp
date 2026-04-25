/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getProductSyncBaseFieldOptions,
  PRODUCT_SYNC_APP_FIELDS,
} from '@/shared/contracts/product-sync';

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
  useBaseInventoriesMock,
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
  useBaseInventoriesMock: vi.fn(),
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
  useBaseInventories: (...args: unknown[]) => useBaseInventoriesMock(...args),
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
  const updateMutateAsync = vi.fn();

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
      mutateAsync: updateMutateAsync,
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
    useBaseInventoriesMock.mockReturnValue({
      data: [{ id: 'inventory-1', name: 'Main inventory', is_default: true }],
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
    updateMutateAsync.mockResolvedValue({
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

  it('creates a new profile instead of updating the selected existing profile', async () => {
    useProductSyncProfilesMock.mockReturnValue({
      data: [
        {
          id: 'profile-existing',
          name: 'Existing Sync Profile',
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

    await screen.findByRole('button', { name: /Existing Sync Profile/i });
    await waitFor(() => {
      expect(screen.getByLabelText('Name')).toHaveValue('Existing Sync Profile');
    });
    fireEvent.click(screen.getByRole('button', { name: 'New Profile' }));
    expect(await screen.findByRole('button', { name: /New sync profile/i })).toHaveTextContent(
      'Draft'
    );
    expect(screen.getByLabelText('Name')).toHaveValue('');
    fireEvent.change(screen.getByLabelText('Name'), {
      target: { value: 'Second Sync Profile' },
    });
    expect(screen.getByRole('button', { name: /Second Sync Profile/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Second Sync Profile',
          connectionId: 'connection-1',
          inventoryId: 'inventory-1',
        })
      );
    });
    expect(updateMutateAsync).not.toHaveBeenCalled();
  });

  it('uses the default Base.com inventory when no saved inventory preference exists', async () => {
    useDefaultExportInventoryMock.mockReturnValue({
      data: { inventoryId: null },
    });
    useBaseInventoriesMock.mockReturnValue({
      data: [
        { id: 'inventory-secondary', name: 'Secondary inventory', is_default: false },
        { id: 'inventory-default', name: 'Default inventory', is_default: true },
      ],
      isLoading: false,
    });

    render(<ProductSyncSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('inventory-default')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionId: 'connection-1',
          inventoryId: 'inventory-default',
        })
      );
    });
  });

  it('uses the connection last inventory when inventory preferences are unavailable', async () => {
    useDefaultExportInventoryMock.mockReturnValue({
      data: { inventoryId: null },
    });
    useBaseInventoriesMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
    useIntegrationsWithConnectionsMock.mockReturnValue({
      data: [
        {
          id: 'integration-1',
          slug: 'base-com',
          connections: [
            {
              id: 'connection-1',
              name: 'Main Base Connection',
              baseLastInventoryId: 'inventory-from-connection',
            },
          ],
        },
      ],
    });

    render(<ProductSyncSettings />);

    await waitFor(() => {
      expect(screen.getByDisplayValue('inventory-from-connection')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          connectionId: 'connection-1',
          inventoryId: 'inventory-from-connection',
        })
      );
    });
  });

  it('lets the API resolve inventory when the client has no inventory fallback', async () => {
    useDefaultExportInventoryMock.mockReturnValue({
      data: { inventoryId: null },
    });
    useBaseInventoriesMock.mockReturnValue({
      data: [],
      isLoading: false,
    });

    render(<ProductSyncSettings />);

    await waitFor(() => {
      expect(screen.getByLabelText('Inventory ID')).toHaveValue('');
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() => {
      expect(createMutateAsync).toHaveBeenCalledWith(
        expect.not.objectContaining({
          inventoryId: expect.any(String),
        })
      );
    });
    expect(toastMock).not.toHaveBeenCalledWith(
      'Inventory ID is required.',
      expect.objectContaining({ variant: 'error' })
    );
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

  it('does not save duplicate app-field rules', async () => {
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
              appField: 'stock',
              baseField: 'stock',
              direction: 'base_to_app',
            },
            {
              id: 'rule-2',
              appField: 'stock',
              baseField: 'stock.bl_1',
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

    fireEvent.click(screen.getByRole('button', { name: 'Save Profile' }));

    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        'Only one sync rule is allowed for Stock.',
        expect.objectContaining({ variant: 'error' })
      );
    });
    expect(updateMutateAsync).not.toHaveBeenCalled();
  });

  it('disables adding another rule when every app field is already configured', () => {
    useProductSyncProfilesMock.mockReturnValue({
      data: [
        {
          id: 'profile-1',
          name: 'Complete Base Sync',
          isDefault: true,
          enabled: true,
          connectionId: 'connection-1',
          inventoryId: 'inventory-1',
          catalogId: null,
          scheduleIntervalMinutes: 30,
          batchSize: 100,
          conflictPolicy: 'skip',
          fieldRules: PRODUCT_SYNC_APP_FIELDS.map((appField, index) => ({
            id: `rule-${index + 1}`,
            appField,
            baseField: getProductSyncBaseFieldOptions(appField)[0]?.value ?? appField,
            direction: appField === 'stock' ? 'base_to_app' : 'disabled',
          })),
          lastRunAt: null,
          createdAt: '2026-04-11T12:00:00.000Z',
          updatedAt: '2026-04-11T12:00:00.000Z',
        },
      ],
      refetch: vi.fn(),
    });

    render(<ProductSyncSettings />);

    expect(screen.getByRole('button', { name: 'Add Rule' })).toBeDisabled();
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
