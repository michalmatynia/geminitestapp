export const resolveProductListingsModalTitle = ({
  productName,
  integrationScopeLabel,
}: {
  productName: string;
  integrationScopeLabel: string | null;
}): string =>
  integrationScopeLabel ? `${integrationScopeLabel} - ${productName}` : `Integrations - ${productName}`;

export const resolveListProductModalCopy = ({
  productName,
  isBaseComIntegration,
  isTraderaIntegration,
  selectedIntegrationName,
}: {
  productName: string;
  isBaseComIntegration: boolean;
  isTraderaIntegration: boolean;
  selectedIntegrationName: string | null;
}): {
  modalTitle: string;
  saveText: string;
} => {
  if (isBaseComIntegration) {
    return {
      modalTitle: `Export to Base.com - ${productName}`,
      saveText: 'Export to Base.com',
    };
  }

  if (isTraderaIntegration) {
    return {
      modalTitle: `List on Tradera - ${productName}`,
      saveText: 'List on Tradera',
    };
  }

  if (selectedIntegrationName) {
    return {
      modalTitle: `List on ${selectedIntegrationName} - ${productName}`,
      saveText: 'List Product',
    };
  }

  return {
    modalTitle: `List Product - ${productName}`,
    saveText: 'List Product',
  };
};

export const resolveMassListProductModalCopy = ({
  productCount,
  selectedIntegrationName,
  isBaseComIntegration,
}: {
  productCount: number;
  selectedIntegrationName: string | null;
  isBaseComIntegration: boolean;
}): {
  modalTitle: string;
  saveText: string;
} => ({
  modalTitle: `List ${productCount} Products to ${selectedIntegrationName || 'Marketplace'}`,
  saveText: isBaseComIntegration ? 'Export to Base.com' : 'List Products',
});

export const resolveSelectProductForListingModalCopy = (): {
  modalTitle: string;
  saveText: string;
} => ({
  modalTitle: 'List Product on Marketplace',
  saveText: 'List Product',
});

export const resolveSelectIntegrationModalCopy = (): {
  modalTitle: string;
  saveText: string;
} => ({
  modalTitle: 'Select Marketplace / Integration',
  saveText: 'Continue',
});

export const resolveIntegrationSelectionEmptyStateCopy = ({
  isScopedMarketplaceFlow,
  statusTargetLabel,
}: {
  isScopedMarketplaceFlow: boolean;
  statusTargetLabel: string;
}): {
  message: string;
  setupLabel: string;
} =>
  isScopedMarketplaceFlow
    ? {
        message: `No connected ${statusTargetLabel} accounts.`,
        setupLabel: `Set up ${statusTargetLabel} integration`,
      }
    : {
        message: 'No connected integrations.',
        setupLabel: 'Set up an integration',
      };

export const resolveIntegrationSelectionLoadingMessage = (): string =>
  'Loading integrations...';

export const resolveIntegrationSelectionConfiguredAccountsEmptyStateCopy = (): {
  message: string;
  detail: string;
} => ({
  message: 'No integrations with configured accounts found.',
  detail: 'Please set up an integration with at least one account first.',
});

export const resolveListProductIntegrationSelectionCopy = ({
  selectedIntegrationName,
}: {
  selectedIntegrationName: string | null;
}): {
  sectionTitle: string;
  marketplaceLabel: string;
  marketplacePlaceholder: string;
  accountLabel: string;
  accountPlaceholder: string;
  accountDescription: string | null;
} => ({
  sectionTitle: 'Integration Target',
  marketplaceLabel: 'Marketplace / Integration',
  marketplacePlaceholder: 'Select a marketplace...',
  accountLabel: 'Account',
  accountPlaceholder: 'Select an account...',
  accountDescription: selectedIntegrationName
    ? `Choose which account to use for listing this product on ${selectedIntegrationName}.`
    : null,
});

export const resolveSelectProductIntegrationSettingsCopy = (): {
  sectionTitle: string;
  marketplaceLabel: string;
  marketplacePlaceholder: string;
  accountLabel: string;
  accountPlaceholder: string;
} => ({
  sectionTitle: '2. Integration Settings',
  marketplaceLabel: 'Marketplace',
  marketplacePlaceholder: 'Select marketplace...',
  accountLabel: 'Account',
  accountPlaceholder: 'Select account...',
});
