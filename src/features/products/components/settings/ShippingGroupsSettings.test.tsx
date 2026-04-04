// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useProductSettingsShippingGroupsContextMock,
  useSaveShippingGroupMutationMock,
  useDeleteShippingGroupMutationMock,
  useProductMetadataCategoriesMock,
  useProductMetadataShippingGroupsMock,
  toastMock,
  mutateAsyncMock,
} = vi.hoisted(() => ({
  useProductSettingsShippingGroupsContextMock: vi.fn(),
  useSaveShippingGroupMutationMock: vi.fn(),
  useDeleteShippingGroupMutationMock: vi.fn(),
  useProductMetadataCategoriesMock: vi.fn(),
  useProductMetadataShippingGroupsMock: vi.fn(),
  toastMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
}));

vi.mock('@/features/products/components/settings/ProductSettingsContext', () => ({
  useProductSettingsShippingGroupsContext: () => useProductSettingsShippingGroupsContextMock(),
}));

vi.mock('@/features/products/hooks/useProductSettingsQueries', () => ({
  useSaveShippingGroupMutation: () => useSaveShippingGroupMutationMock(),
  useDeleteShippingGroupMutation: () => useDeleteShippingGroupMutationMock(),
}));

vi.mock('@/features/products/hooks/useProductMetadataQueries', () => ({
  useCategories: (...args: unknown[]) => useProductMetadataCategoriesMock(...args),
  useShippingGroups: (...args: unknown[]) => useProductMetadataShippingGroupsMock(...args),
}));

vi.mock('@/shared/ui/alert', () => ({
  Alert: ({ children }: { children: React.ReactNode }) => <div role='alert'>{children}</div>,
}));

vi.mock('@/shared/ui/button', () => ({
  Button: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type='button' onClick={onClick}>
      {children}
    </button>
  ),
}));

vi.mock('@/shared/ui/empty-state', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
}));

vi.mock('@/shared/ui/form-section', () => ({
  FormField: ({
    children,
    label,
    description,
  }: {
    children: React.ReactNode;
    label: string;
    description?: string;
  }) => (
    <label>
      <span>{label}</span>
      {description ? <small>{description}</small> : null}
      {children}
    </label>
  ),
  FormSection: ({
    children,
    title,
  }: {
    children: React.ReactNode;
    title: string;
  }) => (
    <section aria-label={title}>
      {children}
    </section>
  ),
}));

vi.mock('@/shared/ui/FormModal', () => ({
  FormModal: ({
    open,
    children,
    onSave,
    onClose,
    title,
  }: {
    open: boolean;
    children: React.ReactNode;
    onSave: () => void;
    onClose: () => void;
    title: string;
  }) =>
    open ? (
      <div>
        <h1>{title}</h1>
        {children}
        <button type='button' onClick={onSave}>
          Save
        </button>
        <button type='button' onClick={onClose}>
          Close
        </button>
      </div>
    ) : null,
}));

vi.mock('@/shared/ui/input', () => ({
  Input: ({
    value,
    onChange,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input value={value ?? ''} onChange={onChange} {...props} />
  ),
}));

vi.mock('@/shared/ui/multi-select', () => ({
  MultiSelect: ({
    options,
    selected,
    onChange,
  }: {
    options: Array<{ value: string; label: string }>;
    selected: string[];
    onChange: (values: string[]) => void;
  }) => (
    <select
      aria-label='Auto-assign from Categories'
      multiple
      value={selected}
      onChange={(event) =>
        onChange(Array.from(event.currentTarget.selectedOptions, (option) => option.value))
      }
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/select-simple', () => ({
  SelectSimple: ({
    value,
    onValueChange,
    options,
    ariaLabel,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: Array<{ value: string; label: string }>;
    ariaLabel?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      value={value}
      onChange={(event) => onValueChange(event.target.value)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

vi.mock('@/shared/ui/templates/SimpleSettingsList', () => ({
  SimpleSettingsList: ({
    items,
    onEdit,
  }: {
    items: Array<{ id: string; title: string; subtitle?: string }>;
    onEdit?: (item: { id: string; title: string; subtitle?: string }) => void;
  }) => (
    <div>
      {items.map((item) => (
        <div key={item.id}>
          <div>{item.title}</div>
          {item.subtitle ? <div>{item.subtitle}</div> : null}
          {onEdit ? (
            <button type='button' onClick={() => onEdit(item)}>
              Edit {item.title}
            </button>
          ) : null}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/shared/ui/textarea', () => ({
  Textarea: ({
    value,
    onChange,
    ...props
  }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea value={value ?? ''} onChange={onChange} {...props} />
  ),
}));

vi.mock('@/shared/ui/toast', () => ({
  useToast: () => ({
    toast: toastMock,
  }),
}));

vi.mock('@/shared/ui/templates/modals/ConfirmModal', () => ({
  ConfirmModal: () => null,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: vi.fn(),
}));

import { ShippingGroupsSettings } from './ShippingGroupsSettings';

describe('ShippingGroupsSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateAsyncMock.mockResolvedValue({ id: 'shipping-group-1' });
    useSaveShippingGroupMutationMock.mockReturnValue({
      mutateAsync: mutateAsyncMock,
      isPending: false,
    });
    useDeleteShippingGroupMutationMock.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    });
    useProductSettingsShippingGroupsContextMock.mockReturnValue({
      loadingShippingGroups: false,
      shippingGroups: [],
      catalogs: [{ id: 'catalog-1', name: 'Main Catalog', isDefault: true }],
      selectedShippingGroupCatalogId: 'catalog-1',
      onShippingGroupCatalogChange: vi.fn(),
      onRefreshShippingGroups: vi.fn(),
    });
    useProductMetadataCategoriesMock.mockReturnValue({
      data: [
        { id: 'category-jewellery', name: 'Jewellery', parentId: null },
        { id: 'category-rings', name: 'Rings', parentId: 'category-jewellery' },
        { id: 'category-keychains', name: 'Keychains', parentId: 'category-jewellery' },
      ],
      isLoading: false,
    });
    useProductMetadataShippingGroupsMock.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('saves category auto-assignment rules with the shipping group', async () => {
    render(<ShippingGroupsSettings />);

    fireEvent.click(screen.getByRole('button', { name: /add shipping group/i }));
    fireEvent.change(screen.getByLabelText(/shipping group name/i), {
      target: { value: 'Jewellery 7 EUR' },
    });
    const autoAssignSelect = screen.getByLabelText(/auto-assign from categories/i);
    const jewelleryOption = screen.getByRole('option', { name: 'Jewellery' });
    (jewelleryOption as HTMLOptionElement).selected = true;
    fireEvent.change(autoAssignSelect);
    fireEvent.change(screen.getByLabelText(/tradera shipping condition/i), {
      target: { value: 'Buyer pays shipping' },
    });
    fireEvent.change(screen.getByLabelText(/tradera shipping price in eur/i), {
      target: { value: '7.00' },
    });
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        id: undefined,
        data: {
          name: 'Jewellery 7 EUR',
          description: null,
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: ['category-jewellery'],
        },
      });
    });
  });

  it('omits redundant descendant categories on save', async () => {
    render(<ShippingGroupsSettings />);

    fireEvent.click(screen.getByRole('button', { name: /add shipping group/i }));
    fireEvent.change(screen.getByLabelText(/shipping group name/i), {
      target: { value: 'Jewellery 7 EUR' },
    });
    const autoAssignSelect = screen.getByLabelText(/auto-assign from categories/i);
    const jewelleryOption = screen.getByRole('option', { name: 'Jewellery' });
    const ringsOption = screen.getByRole('option', { name: 'Jewellery / Rings' });
    (jewelleryOption as HTMLOptionElement).selected = true;
    (ringsOption as HTMLOptionElement).selected = true;
    fireEvent.change(autoAssignSelect);

    expect(screen.queryByText(/redundant descendant categories will be omitted on save/i)).not.toBeInTheDocument();
    expect(screen.getByText(/this rule also matches descendant categories/i)).toHaveTextContent(
      /jewellery \/ rings|rings/i
    );

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        id: undefined,
        data: expect.objectContaining({
          autoAssignCategoryIds: ['category-jewellery'],
        }),
      });
    });
  });

  it('shows multi-category guidance and selected category summaries in the modal', () => {
    render(<ShippingGroupsSettings />);

    fireEvent.click(screen.getByRole('button', { name: /add shipping group/i }));

    expect(
      screen.getByText(
        /3 categories are available in this catalog\. You can attach more than one category to the same shipping group\./i
      )
    ).toBeInTheDocument();

    const autoAssignSelect = screen.getByLabelText(/auto-assign from categories/i);
    const ringsOption = screen.getByRole('option', { name: 'Jewellery / Rings' });
    const keychainsOption = screen.getByRole('option', { name: 'Jewellery / Keychains' });
    (ringsOption as HTMLOptionElement).selected = true;
    (keychainsOption as HTMLOptionElement).selected = true;
    fireEvent.change(autoAssignSelect);

    expect(screen.getByText('Selected categories (2)')).toBeInTheDocument();
    expect(
      screen.getByText(/Jewellery \/ Rings, Jewellery \/ Keychains/i)
    ).toBeInTheDocument();
  });

  it('shows explicit category counts for saved multi-category rules', () => {
    useProductSettingsShippingGroupsContextMock.mockReturnValue({
      loadingShippingGroups: false,
      shippingGroups: [
        {
          id: 'shipping-group-1',
          name: 'Pins 7 EUR',
          description: null,
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: ['category-rings', 'category-keychains'],
        },
      ],
      catalogs: [{ id: 'catalog-1', name: 'Main Catalog', isDefault: true }],
      selectedShippingGroupCatalogId: 'catalog-1',
      onShippingGroupCatalogChange: vi.fn(),
      onRefreshShippingGroups: vi.fn(),
    });

    render(<ShippingGroupsSettings />);

    expect(
      screen.getByText(/Categories \(2\): Jewellery \/ Rings, Jewellery \/ Keychains/i)
    ).toBeInTheDocument();
  });

  it('warns when shipping-group category rules overlap', () => {
    useProductSettingsShippingGroupsContextMock.mockReturnValue({
      loadingShippingGroups: false,
      shippingGroups: [
        {
          id: 'shipping-group-1',
          name: 'Jewellery 7 EUR',
          description: null,
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: ['category-jewellery'],
        },
        {
          id: 'shipping-group-2',
          name: 'Rings 5 EUR',
          description: null,
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 5,
          autoAssignCategoryIds: ['category-rings'],
        },
      ],
      catalogs: [{ id: 'catalog-1', name: 'Main Catalog', isDefault: true }],
      selectedShippingGroupCatalogId: 'catalog-1',
      onShippingGroupCatalogChange: vi.fn(),
      onRefreshShippingGroups: vi.fn(),
    });

    render(<ShippingGroupsSettings />);

    expect(screen.getByRole('alert')).toHaveTextContent(/conflicting auto-assign rules detected/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/jewellery 7 eur/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/rings 5 eur/i);
    expect(screen.getByRole('alert')).toHaveTextContent(/jewellery \/ rings|rings/i);
  });

  it('warns inside the modal when the drafted category rule overlaps', () => {
    useProductMetadataShippingGroupsMock.mockReturnValue({
      data: [
        {
          id: 'shipping-group-1',
          name: 'Jewellery 7 EUR',
          description: null,
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: ['category-jewellery'],
        },
      ],
      isLoading: false,
    });

    render(<ShippingGroupsSettings />);

    fireEvent.click(screen.getByRole('button', { name: /add shipping group/i }));
    fireEvent.change(screen.getByLabelText(/shipping group name/i), {
      target: { value: 'Rings 5 EUR' },
    });
    const autoAssignSelect = screen.getByLabelText(/auto-assign from categories/i);
    const ringsOption = screen.getByRole('option', { name: 'Jewellery / Rings' });
    (ringsOption as HTMLOptionElement).selected = true;
    fireEvent.change(autoAssignSelect);

    const alerts = screen.getAllByRole('alert');
    const modalAlert = alerts.at(-1);
    expect(modalAlert).toHaveTextContent(/this auto-assign rule overlaps/i);
    expect(modalAlert).toHaveTextContent(/jewellery 7 eur/i);
    expect(modalAlert).toHaveTextContent(/jewellery \/ rings|rings/i);
  });

  it('shows descendant coverage for saved category rules', () => {
    useProductSettingsShippingGroupsContextMock.mockReturnValue({
      loadingShippingGroups: false,
      shippingGroups: [
        {
          id: 'shipping-group-1',
          name: 'Jewellery 7 EUR',
          description: null,
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: ['category-jewellery'],
        },
      ],
      catalogs: [{ id: 'catalog-1', name: 'Main Catalog', isDefault: true }],
      selectedShippingGroupCatalogId: 'catalog-1',
      onShippingGroupCatalogChange: vi.fn(),
      onRefreshShippingGroups: vi.fn(),
    });

    render(<ShippingGroupsSettings />);

    expect(screen.getByText(/auto: jewellery \(\+ descendants\)/i)).toBeInTheDocument();
  });

  it('warns when a saved shipping group still contains redundant descendant categories', () => {
    useProductSettingsShippingGroupsContextMock.mockReturnValue({
      loadingShippingGroups: false,
      shippingGroups: [
        {
          id: 'shipping-group-1',
          name: 'Jewellery 7 EUR',
          description: null,
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: ['category-jewellery', 'category-rings'],
        },
      ],
      catalogs: [{ id: 'catalog-1', name: 'Main Catalog', isDefault: true }],
      selectedShippingGroupCatalogId: 'catalog-1',
      onShippingGroupCatalogChange: vi.fn(),
      onRefreshShippingGroups: vi.fn(),
    });

    render(<ShippingGroupsSettings />);

    expect(screen.getByText(/some auto-assign rules include descendant categories already covered by parent categories/i)).toBeInTheDocument();
    expect(screen.getAllByText(/jewellery 7 eur/i)).toHaveLength(3);
    expect(screen.getByText(/auto: jewellery \(\+ descendants\)/i)).toBeInTheDocument();
    expect(screen.getByText(/redundant: jewellery \/ rings|redundant: rings/i)).toBeInTheDocument();
  });

  it('warns when a saved shipping group references missing categories', () => {
    useProductSettingsShippingGroupsContextMock.mockReturnValue({
      loadingShippingGroups: false,
      shippingGroups: [
        {
          id: 'shipping-group-1',
          name: 'Legacy Shipping Group',
          description: null,
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: ['category-missing'],
        },
      ],
      catalogs: [{ id: 'catalog-1', name: 'Main Catalog', isDefault: true }],
      selectedShippingGroupCatalogId: 'catalog-1',
      onShippingGroupCatalogChange: vi.fn(),
      onRefreshShippingGroups: vi.fn(),
    });

    render(<ShippingGroupsSettings />);

    expect(screen.getByText(/some auto-assign rules reference categories that no longer exist in this catalog/i)).toBeInTheDocument();
    expect(screen.getByText(/missing: category-missing/i)).toBeInTheDocument();
  });

  it('shows the effective normalized rule when editing a legacy auto-assign rule', async () => {
    useProductSettingsShippingGroupsContextMock.mockReturnValue({
      loadingShippingGroups: false,
      shippingGroups: [
        {
          id: 'shipping-group-1',
          name: 'Legacy Shipping Group',
          description: null,
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: [
            'category-jewellery',
            'category-rings',
            'category-missing',
          ],
        },
      ],
      catalogs: [{ id: 'catalog-1', name: 'Main Catalog', isDefault: true }],
      selectedShippingGroupCatalogId: 'catalog-1',
      onShippingGroupCatalogChange: vi.fn(),
      onRefreshShippingGroups: vi.fn(),
    });

    render(<ShippingGroupsSettings />);

    fireEvent.click(screen.getByRole('button', { name: /edit legacy shipping group/i }));

    expect(screen.getByText(/missing categories will be removed on save/i)).toHaveTextContent(
      /category-missing/i
    );
    expect(
      screen.getByText(/effective auto-assign rule after save/i)
    ).toHaveTextContent(/jewellery/i);

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        id: 'shipping-group-1',
        data: expect.objectContaining({
          autoAssignCategoryIds: ['category-jewellery'],
        }),
      });
    });
  });

  it('shows descendant coverage inside the modal for drafted category rules', () => {
    render(<ShippingGroupsSettings />);

    fireEvent.click(screen.getByRole('button', { name: /add shipping group/i }));
    const autoAssignSelect = screen.getByLabelText(/auto-assign from categories/i);
    const jewelleryOption = screen.getByRole('option', { name: 'Jewellery' });
    (jewelleryOption as HTMLOptionElement).selected = true;
    fireEvent.change(autoAssignSelect);

    const alerts = screen.getAllByRole('alert');
    const modalAlert = alerts.at(-1);
    expect(modalAlert).toHaveTextContent(/also matches descendant categories/i);
    expect(modalAlert).toHaveTextContent(/jewellery \/ rings|rings/i);
  });

  it('blocks save when the drafted category rule overlaps locally', async () => {
    useProductMetadataShippingGroupsMock.mockReturnValue({
      data: [
        {
          id: 'shipping-group-1',
          name: 'Jewellery 7 EUR',
          description: null,
          catalogId: 'catalog-1',
          traderaShippingCondition: 'Buyer pays shipping',
          traderaShippingPriceEur: 7,
          autoAssignCategoryIds: ['category-jewellery'],
        },
      ],
      isLoading: false,
    });

    render(<ShippingGroupsSettings />);

    fireEvent.click(screen.getByRole('button', { name: /add shipping group/i }));
    fireEvent.change(screen.getByLabelText(/shipping group name/i), {
      target: { value: 'Rings 5 EUR' },
    });
    const autoAssignSelect = screen.getByLabelText(/auto-assign from categories/i);
    const ringsOption = screen.getByRole('option', { name: 'Jewellery / Rings' });
    (ringsOption as HTMLOptionElement).selected = true;
    fireEvent.change(autoAssignSelect);
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }));

    await waitFor(() => {
      expect(mutateAsyncMock).not.toHaveBeenCalled();
    });
    expect(toastMock).toHaveBeenCalledWith(
      'This auto-assign rule overlaps with Jewellery 7 EUR on Jewellery / Rings.',
      { variant: 'error' }
    );
  });
});
