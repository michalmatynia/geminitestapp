// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  toastMock,
  useCatalogsMock,
  useCategoriesMock,
  useCustomFieldsMock,
  useDeleteCatalogMutationMock,
  useDeletePriceGroupMutationMock,
  useParametersMock,
  usePriceGroupsMock,
  useSearchParamsMock,
  useShippingGroupsMock,
  useTagsMock,
  useUpdatePriceGroupMutationMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  useCatalogsMock: vi.fn(),
  useCategoriesMock: vi.fn(),
  useCustomFieldsMock: vi.fn(),
  useDeleteCatalogMutationMock: vi.fn(),
  useDeletePriceGroupMutationMock: vi.fn(),
  useParametersMock: vi.fn(),
  usePriceGroupsMock: vi.fn(),
  useSearchParamsMock: vi.fn(),
  useShippingGroupsMock: vi.fn(),
  useTagsMock: vi.fn(),
  useUpdatePriceGroupMutationMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  useCatalogs: (...args: unknown[]) => useCatalogsMock(...args),
  useCategories: (...args: unknown[]) => useCategoriesMock(...args),
  useCustomFields: (...args: unknown[]) => useCustomFieldsMock(...args),
  useDeleteCatalogMutation: () => useDeleteCatalogMutationMock(),
  useDeletePriceGroupMutation: () => useDeletePriceGroupMutationMock(),
  useParameters: (...args: unknown[]) => useParametersMock(...args),
  usePriceGroups: (...args: unknown[]) => usePriceGroupsMock(...args),
  useShippingGroups: (...args: unknown[]) => useShippingGroupsMock(...args),
  useTags: (...args: unknown[]) => useTagsMock(...args),
  useUpdatePriceGroupMutation: () => useUpdatePriceGroupMutationMock(),
}));

vi.mock('@/features/products/components/settings/ProductSettingsContext', () => ({
  ProductSettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/products/components/settings/CategoriesSettings', () => ({
  CategoriesSettings: () => <div data-testid='categories-settings' />,
}));

vi.mock('@/features/products/components/settings/TagsSettings', () => ({
  TagsSettings: () => <div data-testid='tags-settings' />,
}));

vi.mock('@/features/products/components/settings/CustomFieldsSettings', () => ({
  CustomFieldsSettings: () => <div data-testid='custom-fields-settings' />,
}));

vi.mock('@/features/products/components/settings/ShippingGroupsSettings', () => ({
  ShippingGroupsSettings: () => <div data-testid='shipping-groups-settings' />,
}));

vi.mock('@/features/products/components/constructor/ParametersSettings', () => ({
  ParametersSettings: () => <div data-testid='parameters-settings' />,
}));

vi.mock('@/features/products/components/settings/pricing/PriceGroupsSettings', () => ({
  PriceGroupsSettings: () => <div data-testid='price-groups-settings' />,
}));

vi.mock('@/features/products/components/settings/catalogs/CatalogsSettings', () => ({
  CatalogsSettings: () => <div data-testid='catalogs-settings' />,
}));

vi.mock('@/features/products/components/settings/ProductImageRoutingSettings', () => ({
  ProductImageRoutingSettings: () => <div data-testid='product-image-routing-settings' />,
}));

vi.mock('@/features/products/components/settings/validator-settings/ValidatorDefaultPanel', () => ({
  ValidatorDefaultPanel: () => <div data-testid='validator-default-panel' />,
}));

vi.mock('@/features/products/components/settings/ValidatorSettings', () => ({
  ValidatorSettings: () => <div data-testid='validator-settings' />,
}));

vi.mock(
  '@/features/products/components/settings/validator-settings/ValidatorDocsTooltips',
  () => ({
    ValidatorDocsTooltipsProvider: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
  })
);

vi.mock('@/features/products/components/settings/modals/catalog-modal/CatalogModal', () => ({
  CatalogModal: () => <div data-testid='catalog-modal' />,
}));

vi.mock(
  '@/features/products/components/settings/modals/price-group-modal/PriceGroupModal',
  () => ({
    PriceGroupModal: () => <div data-testid='price-group-modal' />,
  })
);

vi.mock('@/shared/ui/templates/modals/ConfirmModal', () => ({
  ConfirmModal: () => null,
}));

vi.mock('@/shared/ui/admin-products-page-layout', () => ({
  AdminProductsPageLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    onClick,
    asChild,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    children?: React.ReactNode;
    asChild?: boolean;
  }) =>
    asChild ? (
      <span {...props}>{children}</span>
    ) : (
      <button type='button' onClick={onClick} {...props}>
        {children}
      </button>
    ),
}));

vi.mock('@/shared/ui/card', () => ({
  Card: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/ui/layout', () => ({
  UI_GRID_ROOMY_CLASSNAME: 'grid',
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({ toast: toastMock }),
}));

import { ProductSettingsPage } from './ProductSettingsPage';

const buildQueryResult = (overrides: Record<string, unknown> = {}) => ({
  data: [],
  isLoading: false,
  refetch: vi.fn(),
  ...overrides,
});

describe('ProductSettingsPage metadata gating', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSearchParamsMock.mockReturnValue({
      get: () => null,
    });

    usePriceGroupsMock.mockReturnValue(buildQueryResult());
    useCatalogsMock.mockReturnValue(
      buildQueryResult({
        data: [
          {
            id: 'catalog-default',
            name: 'Main catalog',
            isDefault: true,
          },
        ],
      })
    );
    useCategoriesMock.mockReturnValue(buildQueryResult());
    useShippingGroupsMock.mockReturnValue(buildQueryResult());
    useTagsMock.mockReturnValue(buildQueryResult());
    useCustomFieldsMock.mockReturnValue(buildQueryResult());
    useParametersMock.mockReturnValue(buildQueryResult());
    useUpdatePriceGroupMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useDeletePriceGroupMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useDeleteCatalogMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
  });

  it('loads only the active categories metadata on first render', async () => {
    render(<ProductSettingsPage />);

    await waitFor(() => {
      expect(useCategoriesMock).toHaveBeenLastCalledWith('catalog-default', { enabled: true });
    });

    expect(useCatalogsMock).toHaveBeenLastCalledWith({ enabled: true });
    expect(usePriceGroupsMock).toHaveBeenLastCalledWith({ enabled: false });
    expect(useShippingGroupsMock).toHaveBeenLastCalledWith(null, { enabled: false });
    expect(useTagsMock).toHaveBeenLastCalledWith(null, { enabled: false });
    expect(useCustomFieldsMock).toHaveBeenLastCalledWith({ enabled: false });
    expect(useParametersMock).toHaveBeenLastCalledWith(null, { enabled: false });
    expect(screen.getByTestId('categories-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('catalog-modal')).not.toBeInTheDocument();
    expect(screen.queryByTestId('price-group-modal')).not.toBeInTheDocument();
  });

  it('switches metadata loading to the newly active section instead of preloading all sections', async () => {
    render(<ProductSettingsPage />);

    await waitFor(() => {
      expect(useCategoriesMock).toHaveBeenLastCalledWith('catalog-default', { enabled: true });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Tags' }));

    await waitFor(() => {
      expect(useTagsMock).toHaveBeenLastCalledWith('catalog-default', { enabled: true });
    });

    expect(useCategoriesMock).toHaveBeenLastCalledWith('catalog-default', { enabled: false });
    expect(useCatalogsMock).toHaveBeenLastCalledWith({ enabled: true });
    expect(usePriceGroupsMock).toHaveBeenLastCalledWith({ enabled: false });

    fireEvent.click(screen.getByRole('button', { name: 'Shipping Groups' }));

    await waitFor(() => {
      expect(useShippingGroupsMock).toHaveBeenLastCalledWith('catalog-default', {
        enabled: true,
      });
    });

    expect(useCategoriesMock).toHaveBeenLastCalledWith('catalog-default', { enabled: false });
    expect(useTagsMock).toHaveBeenLastCalledWith('catalog-default', { enabled: false });
    expect(screen.getByTestId('shipping-groups-settings')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Custom Fields' }));

    await waitFor(() => {
      expect(useCustomFieldsMock).toHaveBeenLastCalledWith({ enabled: true });
    });

    expect(useShippingGroupsMock).toHaveBeenLastCalledWith('catalog-default', {
      enabled: false,
    });
    expect(useParametersMock).toHaveBeenLastCalledWith(null, { enabled: false });
    expect(screen.getByTestId('custom-fields-settings')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Price Groups' }));

    await waitFor(() => {
      expect(usePriceGroupsMock).toHaveBeenLastCalledWith({ enabled: true });
    });

    expect(useCatalogsMock).toHaveBeenLastCalledWith({ enabled: false });
    expect(useShippingGroupsMock).toHaveBeenLastCalledWith('catalog-default', {
      enabled: false,
    });
    expect(useTagsMock).toHaveBeenLastCalledWith('catalog-default', { enabled: false });
    expect(useParametersMock).toHaveBeenLastCalledWith(null, { enabled: false });
    expect(screen.getByTestId('price-groups-settings')).toBeInTheDocument();
  });

  it('opens the requested settings section from the url search params', async () => {
    useSearchParamsMock.mockReturnValue({
      get: (key: string) => (key === 'section' ? 'shipping-groups' : null),
    });

    render(<ProductSettingsPage />);

    await waitFor(() => {
      expect(useShippingGroupsMock).toHaveBeenLastCalledWith('catalog-default', {
        enabled: true,
      });
    });

    expect(useCategoriesMock).toHaveBeenLastCalledWith(null, { enabled: false });
    expect(screen.getByTestId('shipping-groups-settings')).toBeInTheDocument();
  });
});
