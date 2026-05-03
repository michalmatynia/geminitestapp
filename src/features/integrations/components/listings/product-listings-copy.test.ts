import { describe, expect, it } from 'vitest';

import {
  resolveIntegrationSelectionEmptyStateCopy,
  resolveIntegrationSelectionLoadingMessage,
  resolveIntegrationSelectionConfiguredAccountsEmptyStateCopy,
  resolveListProductModalCopy,
  resolveListProductIntegrationSelectionCopy,
  resolveMassListProductModalCopy,
  resolveProductListingsModalTitle,
  resolveSelectProductIntegrationSettingsCopy,
  resolveSelectIntegrationModalCopy,
  resolveSelectProductForListingModalCopy,
} from './product-listings-copy';

describe('product-listings-copy', () => {
  it('resolves the scoped listings modal title', () => {
    expect(
      resolveProductListingsModalTitle({
        productName: 'Vintage Chair',
        integrationScopeLabel: 'Tradera',
      })
    ).toBe('Tradera - Vintage Chair');

    expect(
      resolveProductListingsModalTitle({
        productName: 'Vintage Chair',
        integrationScopeLabel: null,
      })
    ).toBe('Integrations - Vintage Chair');
  });

  it('resolves Base.com, Tradera, and Vinted list-product modal copy', () => {
    expect(
      resolveListProductModalCopy({
        productName: 'Vintage Chair',
        isBaseComIntegration: true,
        isTraderaIntegration: false,
        selectedIntegrationName: 'Base.com',
        selectedIntegrationSlug: 'baselinker',
      })
    ).toEqual({
      modalTitle: 'Export to Base.com - Vintage Chair',
      saveText: 'Export to Base.com',
    });

    expect(
      resolveListProductModalCopy({
        productName: 'Vintage Chair',
        isBaseComIntegration: false,
        isTraderaIntegration: true,
        selectedIntegrationName: 'Tradera',
        selectedIntegrationSlug: 'tradera',
      })
    ).toEqual({
      modalTitle: 'List on Tradera - Vintage Chair',
      saveText: 'List on Tradera',
    });

    expect(
      resolveListProductModalCopy({
        productName: 'Vintage Chair',
        isBaseComIntegration: false,
        isTraderaIntegration: false,
        selectedIntegrationName: 'Vinted',
        selectedIntegrationSlug: 'vinted',
      })
    ).toEqual({
      modalTitle: 'List on Vinted.pl - Vintage Chair',
      saveText: 'List on Vinted.pl',
    });
  });

  it('falls back to integration-specific or generic list-product copy', () => {
    expect(
      resolveListProductModalCopy({
        productName: 'Vintage Chair',
        isBaseComIntegration: false,
        isTraderaIntegration: false,
        selectedIntegrationName: 'Playwright programmable',
        selectedIntegrationSlug: 'playwright-programmable',
      })
    ).toEqual({
      modalTitle: 'List on Playwright programmable - Vintage Chair',
      saveText: 'List Product',
    });

    expect(
      resolveListProductModalCopy({
        productName: 'Vintage Chair',
        isBaseComIntegration: false,
        isTraderaIntegration: false,
        selectedIntegrationName: null,
        selectedIntegrationSlug: null,
      })
    ).toEqual({
      modalTitle: 'List Product - Vintage Chair',
      saveText: 'List Product',
    });
  });

  it('resolves mass-list modal copy for Base.com and generic integrations', () => {
    expect(
      resolveMassListProductModalCopy({
        productCount: 3,
        selectedIntegrationName: 'Base.com',
        selectedIntegrationSlug: 'baselinker',
        isBaseComIntegration: true,
      })
    ).toEqual({
      modalTitle: 'List 3 Products to Base.com',
      saveText: 'Export to Base.com',
    });

    expect(
      resolveMassListProductModalCopy({
        productCount: 3,
        selectedIntegrationName: 'Tradera',
        selectedIntegrationSlug: 'tradera',
        isBaseComIntegration: false,
      })
    ).toEqual({
      modalTitle: 'List 3 Products to Tradera',
      saveText: 'List Products',
    });

    expect(
      resolveMassListProductModalCopy({
        productCount: 2,
        selectedIntegrationName: 'Vinted',
        selectedIntegrationSlug: 'vinted',
        isBaseComIntegration: false,
      })
    ).toEqual({
      modalTitle: 'List 2 Products to Vinted.pl',
      saveText: 'List Products',
    });
  });

  it('resolves select-product and select-integration modal copy', () => {
    expect(resolveSelectProductForListingModalCopy()).toEqual({
      modalTitle: 'List Product on Marketplace',
      saveText: 'List Product',
    });

    expect(resolveSelectIntegrationModalCopy()).toEqual({
      modalTitle: 'Select Marketplace / Integration',
      saveText: 'Continue',
    });
  });

  it('resolves integration-selection empty-state copy for scoped and generic flows', () => {
    expect(
      resolveIntegrationSelectionEmptyStateCopy({
        isScopedMarketplaceFlow: true,
        statusTargetLabel: 'Tradera',
      })
    ).toEqual({
      message: 'No connected Tradera accounts.',
      setupLabel: 'Set up Tradera integration',
    });

    expect(
      resolveIntegrationSelectionEmptyStateCopy({
        isScopedMarketplaceFlow: false,
        statusTargetLabel: 'integration',
      })
    ).toEqual({
      message: 'No connected integrations.',
      setupLabel: 'Set up an integration',
    });
  });

  it('resolves shared integration-selection loading and field copy', () => {
    expect(resolveIntegrationSelectionLoadingMessage()).toBe('Loading integrations...');

    expect(resolveIntegrationSelectionConfiguredAccountsEmptyStateCopy()).toEqual({
      message: 'No integrations with configured accounts found.',
      detail: 'Please set up an integration with at least one account first.',
    });

    expect(
      resolveListProductIntegrationSelectionCopy({
        selectedIntegrationName: 'Tradera',
        selectedIntegrationSlug: 'tradera',
      })
    ).toEqual({
      sectionTitle: 'Integration Target',
      marketplaceLabel: 'Marketplace / Integration',
      marketplacePlaceholder: 'Select a marketplace...',
      accountLabel: 'Account',
      accountPlaceholder: 'Select an account...',
      accountDescription: 'Choose which account to use for listing this product on Tradera.',
    });

    expect(
      resolveListProductIntegrationSelectionCopy({
        selectedIntegrationName: 'Vinted',
        selectedIntegrationSlug: 'vinted',
      })
    ).toEqual({
      sectionTitle: 'Integration Target',
      marketplaceLabel: 'Marketplace / Integration',
      marketplacePlaceholder: 'Select a marketplace...',
      accountLabel: 'Account',
      accountPlaceholder: 'Select an account...',
      accountDescription: 'Choose which account to use for listing this product on Vinted.pl.',
    });

    expect(resolveSelectProductIntegrationSettingsCopy()).toEqual({
      sectionTitle: '2. Integration Settings',
      marketplaceLabel: 'Marketplace',
      marketplacePlaceholder: 'Select marketplace...',
      accountLabel: 'Account',
      accountPlaceholder: 'Select account...',
    });
  });
});
