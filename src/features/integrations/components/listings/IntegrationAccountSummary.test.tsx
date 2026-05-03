import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useOptionalListingSelectionMock } = vi.hoisted(() => ({
  useOptionalListingSelectionMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ListingSettingsContext', () => ({
  useOptionalListingSelection: () => useOptionalListingSelectionMock(),
}));

import { IntegrationAccountSummary } from './IntegrationAccountSummary';

describe('IntegrationAccountSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useOptionalListingSelectionMock.mockReturnValue({
      selectedIntegration: {
        id: 'integration-vinted-1',
        name: 'Vinted',
        slug: 'vinted',
        connections: [{ id: 'conn-vinted-1', name: 'Vinted Browser' }],
      },
      selectedConnectionId: 'conn-vinted-1',
    });
  });

  it('normalizes the Vinted integration label to Vinted.pl in listing summaries', () => {
    render(<IntegrationAccountSummary />);

    expect(screen.getByText('Vinted.pl')).toBeInTheDocument();
    expect(screen.getByText('Vinted Browser')).toBeInTheDocument();
  });

  it('preserves explicit override props for integration and connection names', () => {
    render(
      <IntegrationAccountSummary integrationName='Custom Marketplace' connectionName='Manual' />
    );

    expect(screen.getByText('Custom Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });
});
