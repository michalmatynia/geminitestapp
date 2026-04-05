import React from 'react';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { formModalPropsMock } = vi.hoisted(() => ({
  formModalPropsMock: vi.fn(),
}));

vi.mock('@/features/integrations/hooks/useIntegrationProductQueries', () => ({
  useIntegrationProductsWithCount: () => ({
    isLoading: false,
    products: [],
  }),
}));

vi.mock('../../context/ListingSettingsContext', () => ({
  ListingSettingsProvider: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('./hooks/useProductSelectionForm', () => ({
  useProductSelectionForm: () => ({
    productSearch: '',
    setProductSearch: vi.fn(),
    selectedProductId: null,
    setSelectedProductId: vi.fn(),
    error: null,
    submitting: false,
    handleSubmit: vi.fn(),
  }),
}));

vi.mock('./select-product-modal/context/SelectProductForListingModalContext', () => ({
  SelectProductForListingModalProvider: ({ children }: { children?: React.ReactNode }) => (
    <>{children}</>
  ),
}));

vi.mock('./select-product-modal/context/SelectProductForListingModalViewContext', async () => {
  const ReactModule = await import('react');

  type ViewValue = {
    onClose: () => void;
    onSuccess: () => void;
  };

  const Context = ReactModule.createContext<ViewValue | null>(null);

  return {
    SelectProductForListingModalViewProvider: ({
      value,
      children,
    }: {
      value: ViewValue;
      children: React.ReactNode;
    }) => <Context.Provider value={value}>{children}</Context.Provider>,
    useSelectProductForListingModalView: () => {
      const value = ReactModule.useContext(Context);
      if (!value) throw new Error('Missing SelectProductForListingModalViewContext');
      return value;
    },
  };
});

vi.mock('./select-product-modal/IntegrationSettingsSection', () => ({
  IntegrationSettingsSection: () => <div data-testid='integration-settings-section' />,
}));

vi.mock('./select-product-modal/ProductListSection', () => ({
  ProductListSection: () => <div data-testid='product-list-section' />,
}));

vi.mock('@/shared/ui/navigation-and-layout.public', () => ({
  UI_GRID_ROOMY_CLASSNAME: 'grid gap-4',
}));

vi.mock('@/shared/ui/forms-and-actions.public', () => ({
  FormModal: ({
    children,
    open,
    title,
    saveText,
  }: {
    children?: React.ReactNode;
    open?: boolean;
    title?: string;
    saveText?: string;
  }) => {
    formModalPropsMock({ title, saveText });
    return open ? <div data-testid='form-modal'>{children}</div> : null;
  },
}));

import { SelectProductForListingModal } from './SelectProductForListingModal';

describe('SelectProductForListingModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses shared select-product modal copy', () => {
    render(
      <SelectProductForListingModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        initialIntegrationId='integration-tradera-1'
        initialConnectionId='conn-tradera-1'
      />
    );

    expect(formModalPropsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'List Product on Marketplace',
        saveText: 'List Product',
      })
    );
  });
});
