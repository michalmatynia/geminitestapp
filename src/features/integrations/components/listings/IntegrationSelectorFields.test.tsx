import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

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

import { IntegrationSelectorFields } from './IntegrationSelectorFields';

describe('IntegrationSelectorFields', () => {
  it('renders marketplace and account selectors with shared copy', () => {
    render(
      <IntegrationSelectorFields
        marketplaceLabel='Marketplace / Integration'
        marketplacePlaceholder='Select a marketplace...'
        selectedIntegrationId='integration-tradera-1'
        onIntegrationChange={vi.fn()}
        integrationOptions={[{ value: 'integration-tradera-1', label: 'Tradera' }]}
        showAccountField={true}
        accountLabel='Account'
        accountPlaceholder='Select an account...'
        selectedConnectionId='conn-tradera-1'
        onConnectionChange={vi.fn()}
        connectionOptions={[{ value: 'conn-tradera-1', label: 'Browser' }]}
        accountDescription='Choose which account to use for listing this product on Tradera.'
      />
    );

    expect(screen.getByText('Marketplace / Integration')).toBeInTheDocument();
    expect(screen.getAllByText('Select a marketplace...').length).toBeGreaterThan(0);
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(
      screen.getByText('Choose which account to use for listing this product on Tradera.')
    ).toBeInTheDocument();
    expect(screen.getAllByText('Select an account...').length).toBeGreaterThan(0);
  });

  it('omits the account selector when no integration is selected yet', () => {
    render(
      <IntegrationSelectorFields
        marketplaceLabel='Marketplace'
        marketplacePlaceholder='Select marketplace...'
        selectedIntegrationId={null}
        onIntegrationChange={vi.fn()}
        integrationOptions={[]}
        showAccountField={false}
        accountLabel='Account'
        accountPlaceholder='Select account...'
        selectedConnectionId={null}
        onConnectionChange={vi.fn()}
        connectionOptions={[]}
      />
    );

    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.queryByText('Account')).not.toBeInTheDocument();
    expect(screen.queryAllByText('Select account...')).toHaveLength(0);
  });
});
