/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useProductFormCoreMock,
  useProductFormMetadataStateMock,
  useProductFormValidatorMock,
  registerContextRegistryPageSourceMock,
} = vi.hoisted(() => ({
  useProductFormCoreMock: vi.fn(),
  useProductFormMetadataStateMock: vi.fn(),
  useProductFormValidatorMock: vi.fn(),
  registerContextRegistryPageSourceMock: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () =>
    function DynamicTabStub(): React.JSX.Element {
      return <div data-testid='dynamic-tab-stub' />;
    },
}));

vi.mock('@/features/products/context/ProductFormCoreContext', () => ({
  useProductFormCore: () => useProductFormCoreMock(),
}));

vi.mock('@/features/products/context/ProductFormMetadataContext', () => ({
  useProductFormMetadataState: () => useProductFormMetadataStateMock(),
}));

vi.mock('@/features/products/context-registry/workspace', () => ({
  PRODUCT_EDITOR_CONTEXT_ROOT_IDS: ['product-root'],
  buildProductEditorWorkspaceContextBundle: () => ({
    nodes: [],
    edges: [],
  }),
  buildProductLeafCategoriesContextBundle: () => ({
    nodes: [],
    edges: [],
  }),
}));

vi.mock('@/shared/lib/ai-context-registry/page-context', () => ({
  ContextRegistryPageProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useRegisterContextRegistryPageSource: (...args: unknown[]) =>
    registerContextRegistryPageSourceMock(...args),
}));

vi.mock('./form/ProductFormFooter', () => ({
  ProductFormFooter: ({ entityId }: { entityId?: string | null }) => (
    <div data-testid='product-form-footer'>{entityId ?? 'no-entity'}</div>
  ),
}));

vi.mock('./form/ProductFormGeneral', () => ({
  default: () => <div data-testid='product-form-general'>general tab</div>,
}));

vi.mock('../hooks/useProductFormValidator', () => ({
  useProductFormValidator: (...args: unknown[]) => useProductFormValidatorMock(...args),
}));

import ProductForm from './ProductForm';
import { alignDraftStructuredNameToSelectedCategory } from './ProductForm';

describe('ProductForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/admin/products');

    useProductFormCoreMock.mockReturnValue({
      handleSubmit: vi.fn().mockResolvedValue(undefined),
      product: undefined,
      draft: null,
      ConfirmationModal: () => <div data-testid='confirmation-modal' />,
      methods: {
        getValues: vi.fn(() => ''),
        getFieldState: vi.fn(() => ({ isDirty: false })),
        setValue: vi.fn(),
      },
    });

    useProductFormMetadataStateMock.mockReturnValue({
      categories: [],
      selectedCatalogIds: [],
      selectedCategoryId: null,
      selectedTagIds: [],
      selectedProducerIds: [],
    });

    useProductFormValidatorMock.mockReturnValue({
      validationInstanceScope: 'product_create',
      validatorEnabled: true,
      formatterEnabled: true,
      setValidatorEnabled: vi.fn(),
      setFormatterEnabled: vi.fn(),
      validationDenyBehavior: 'deny',
      setValidationDenyBehavior: vi.fn(),
      denyActionLabel: 'Deny',
      getDenyActionLabel: vi.fn(() => 'Deny'),
      isIssueDenied: vi.fn(() => false),
      denyIssue: vi.fn(),
      isIssueAccepted: vi.fn(() => false),
      acceptIssue: vi.fn(),
      validatorPatterns: [],
      latestProductValues: null,
      visibleFieldIssues: {},
    });
  });

  it('renders icon-first tab triggers including Marketplace Copy and activates it from the draft state', () => {
    useProductFormCoreMock.mockReturnValue({
      handleSubmit: vi.fn().mockResolvedValue(undefined),
      product: undefined,
      draft: {
        id: 'draft-1',
        openProductFormTab: 'marketplace-copy',
      },
      ConfirmationModal: () => <div data-testid='confirmation-modal' />,
      methods: {
        getValues: vi.fn(() => ''),
        getFieldState: vi.fn(() => ({ isDirty: false })),
        setValue: vi.fn(),
      },
    });

    render(<ProductForm submitButtonText='Save' validatorSessionKey='validator-session-1' />);

    const marketplaceCopyTab = screen.getByRole('tab', { name: 'Marketplace Copy' });
    const marketplaceCopyLabel = within(marketplaceCopyTab).getByText('Marketplace Copy');

    expect(marketplaceCopyTab).toHaveAttribute('title', 'Marketplace Copy');
    expect(marketplaceCopyTab).toHaveClass('cursor-pointer');
    expect(marketplaceCopyTab.querySelector('svg')).not.toBeNull();
    expect(marketplaceCopyTab).toHaveAttribute('data-state', 'active');
    expect(marketplaceCopyLabel.className).not.toContain('max-w-0');
    expect(marketplaceCopyLabel.className).not.toContain('opacity-0');
    expect(screen.getByRole('tab', { name: 'Scans' })).toBeInTheDocument();
    expect(screen.getAllByTestId('dynamic-tab-stub').length).toBeGreaterThan(0);
  });

  it('renders product form tabs in the requested order', () => {
    render(<ProductForm submitButtonText='Save' validatorSessionKey='validator-session-order' />);

    const tabs = screen.getAllByRole('tab');
    const labels = tabs.map((tab) => tab.getAttribute('aria-label'));

    expect(labels).toEqual([
      'General',
      'Other',
      'Parameters',
      'Images',
      'Studio',
      'Marketplace Copy',
      'Custom Fields',
      'Scans',
      'Import Info',
      'Note Link',
      'Validation',
    ]);
  });

  it('prefers the openProductTab query param when deciding the active tab', () => {
    window.history.replaceState({}, '', '/admin/products?openProductTab=marketplace-copy');

    render(<ProductForm submitButtonText='Save' validatorSessionKey='validator-session-2' />);

    const generalTab = screen.getByRole('tab', { name: 'General' });

    expect(generalTab).toHaveAttribute('data-state', 'inactive');
    expect(screen.getByRole('tab', { name: 'Marketplace Copy' })).toHaveAttribute(
      'data-state',
      'active'
    );
  });

  it('auto-aligns stale draft structured names to the currently selected category before create', () => {
    const setValue = vi.fn();

    useProductFormCoreMock.mockReturnValue({
      handleSubmit: vi.fn().mockResolvedValue(undefined),
      product: undefined,
      draft: {
        id: 'draft-1',
        name_en: 'Name | X cm | Metal | Pin | Lore',
      },
      ConfirmationModal: () => <div data-testid='confirmation-modal' />,
      methods: {
        getValues: vi.fn((field: string) =>
          field === 'name_en' ? 'Name | X cm | Metal | Pin | Lore' : ''
        ),
        getFieldState: vi.fn(() => ({ isDirty: false })),
        setValue,
      },
    });

    useProductFormMetadataStateMock.mockReturnValue({
      categories: [{ id: 'category-1', name: 'Pins' }],
      selectedCatalogIds: [],
      selectedCategoryId: 'category-1',
      selectedTagIds: [],
      selectedProducerIds: [],
    });

    render(<ProductForm submitButtonText='Save' validatorSessionKey='validator-session-3' />);

    expect(setValue).toHaveBeenCalledWith(
      'name_en',
      'Name | X cm | Metal | Pins | Lore',
      expect.objectContaining({
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      })
    );
  });

  it('keeps the categoryId form value synchronized with the selected metadata category', () => {
    const setValue = vi.fn();

    useProductFormCoreMock.mockReturnValue({
      handleSubmit: vi.fn().mockResolvedValue(undefined),
      product: undefined,
      draft: null,
      ConfirmationModal: () => <div data-testid='confirmation-modal' />,
      methods: {
        getValues: vi.fn((field: string) => (field === 'categoryId' ? '' : '')),
        getFieldState: vi.fn(() => ({ isDirty: false })),
        setValue,
      },
    });

    useProductFormMetadataStateMock.mockReturnValue({
      categories: [{ id: 'category-1', name: 'Pins' }],
      selectedCatalogIds: [],
      selectedCategoryId: 'category-1',
      selectedTagIds: [],
      selectedProducerIds: [],
    });

    render(<ProductForm submitButtonText='Save' validatorSessionKey='validator-session-4' />);

    expect(setValue).toHaveBeenCalledWith(
      'categoryId',
      'category-1',
      expect.objectContaining({
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      })
    );
  });
});

describe('alignDraftStructuredNameToSelectedCategory', () => {
  it('replaces the structured category segment when the selected category name changed', () => {
    expect(
      alignDraftStructuredNameToSelectedCategory({
        nameEn: 'Name | X cm | Metal | Pin | Lore',
        categoryName: 'Pins',
      })
    ).toBe('Name | X cm | Metal | Pins | Lore');
  });

  it('returns null when the structured name already matches the selected category', () => {
    expect(
      alignDraftStructuredNameToSelectedCategory({
        nameEn: 'Name | X cm | Metal | Pins | Lore',
        categoryName: 'Pins',
      })
    ).toBeNull();
  });

  it('returns null for non-structured product names', () => {
    expect(
      alignDraftStructuredNameToSelectedCategory({
        nameEn: 'Plain Name',
        categoryName: 'Pins',
      })
    ).toBeNull();
  });
});
