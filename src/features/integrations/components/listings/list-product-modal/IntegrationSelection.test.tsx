import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useListingSelectionMock } = vi.hoisted(() => ({
  useListingSelectionMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ListingSettingsContext', () => ({
  useListingSelection: () => useListingSelectionMock(),
}));

vi.mock('@/shared/ui', () => ({
  FormField: ({
    label,
    description,
    children,
  }: {
    label?: React.ReactNode;
    description?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      {label && <div>{label}</div>}
      {description && <div>{description}</div>}
      {children}
    </div>
  ),
  FormSection: ({
    title,
    children,
  }: {
    title?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <section>
      {title && <div>{title}</div>}
      {children}
    </section>
  ),
  SelectSimple: ({
    placeholder,
    ariaLabel,
    title,
  }: {
    placeholder?: string;
    ariaLabel?: string;
    title?: string;
  }) => (
    <div>
      <span>{placeholder}</span>
      <span>{ariaLabel}</span>
      <span>{title}</span>
    </div>
  ),
}));

import { IntegrationSelection } from './IntegrationSelection';

describe('IntegrationSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useListingSelectionMock.mockReturnValue({
      integrations: [],
      loadingIntegrations: false,
      selectedIntegrationId: null,
      selectedConnectionId: null,
      selectedIntegration: null,
      setSelectedIntegrationId: vi.fn(),
      setSelectedConnectionId: vi.fn(),
    });
  });

  it('renders shared loading copy while integrations load', () => {
    useListingSelectionMock.mockReturnValue({
      integrations: [],
      loadingIntegrations: true,
      selectedIntegrationId: null,
      selectedConnectionId: null,
      selectedIntegration: null,
      setSelectedIntegrationId: vi.fn(),
      setSelectedConnectionId: vi.fn(),
    });

    render(<IntegrationSelection />);

    expect(screen.getByText('Loading integrations...')).toBeInTheDocument();
  });

  it('renders shared configured-account empty-state copy', () => {
    render(<IntegrationSelection />);

    expect(screen.getByText('No integrations with configured accounts found.')).toBeInTheDocument();
    expect(
      screen.getByText('Please set up an integration with at least one account first.')
    ).toBeInTheDocument();
  });

  it('renders shared field copy for list-product integration selection', () => {
    useListingSelectionMock.mockReturnValue({
      integrations: [
        {
          id: 'integration-tradera-1',
          name: 'Tradera',
          slug: 'tradera',
          connections: [{ id: 'conn-tradera-1', name: 'Browser' }],
        },
      ],
      loadingIntegrations: false,
      selectedIntegrationId: 'integration-tradera-1',
      selectedConnectionId: 'conn-tradera-1',
      selectedIntegration: {
        id: 'integration-tradera-1',
        name: 'Tradera',
        slug: 'tradera',
        connections: [{ id: 'conn-tradera-1', name: 'Browser' }],
      },
      setSelectedIntegrationId: vi.fn(),
      setSelectedConnectionId: vi.fn(),
    });

    render(<IntegrationSelection />);

    expect(screen.getByText('Integration Target')).toBeInTheDocument();
    expect(screen.getByText('Marketplace / Integration')).toBeInTheDocument();
    expect(screen.getByText('Select a marketplace...')).toBeInTheDocument();
    expect(
      screen.getByText('Choose which account to use for listing this product on Tradera.')
    ).toBeInTheDocument();
    expect(screen.getByText('Select an account...')).toBeInTheDocument();
  });
});
