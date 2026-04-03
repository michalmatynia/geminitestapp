import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useListingSelectionMock, useSelectProductForListingModalContextMock } = vi.hoisted(() => ({
  useListingSelectionMock: vi.fn(),
  useSelectProductForListingModalContextMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ListingSettingsContext', () => ({
  useListingSelection: () => useListingSelectionMock(),
}));

vi.mock('./context/SelectProductForListingModalContext', () => ({
  useSelectProductForListingModalContext: () => useSelectProductForListingModalContextMock(),
}));

vi.mock('../BaseListingSettings', () => ({
  BaseListingSettings: () => <div data-testid='base-listing-settings' />,
}));

vi.mock('@/shared/ui', () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  LoadingState: ({ message }: { message?: string }) => <div>{message}</div>,
  FormField: ({
    label,
    children,
  }: {
    label?: React.ReactNode;
    children?: React.ReactNode;
  }) => (
    <div>
      {label && <div>{label}</div>}
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

import { IntegrationSettingsSection } from './IntegrationSettingsSection';

describe('IntegrationSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSelectProductForListingModalContextMock.mockReturnValue({ error: null });
    useListingSelectionMock.mockReturnValue({
      integrations: [],
      loadingIntegrations: false,
      selectedIntegrationId: null,
      selectedConnectionId: null,
      selectedIntegration: null,
      isBaseComIntegration: false,
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
      isBaseComIntegration: false,
      setSelectedIntegrationId: vi.fn(),
      setSelectedConnectionId: vi.fn(),
    });

    render(<IntegrationSettingsSection />);

    expect(screen.getByText('Loading integrations...')).toBeInTheDocument();
  });

  it('renders shared field copy for the select-product integration settings', () => {
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
      isBaseComIntegration: false,
      setSelectedIntegrationId: vi.fn(),
      setSelectedConnectionId: vi.fn(),
    });

    render(<IntegrationSettingsSection />);

    expect(screen.getByText('2. Integration Settings')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getAllByText('Select marketplace...').length).toBeGreaterThan(0);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getAllByText('Select account...').length).toBeGreaterThan(0);
  });
});
