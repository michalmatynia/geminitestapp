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
  LoadingState: ({ message }: { message?: string }) => <div>{message}</div>,
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

import { ConnectedIntegrationFieldsSection } from './ConnectedIntegrationFieldsSection';

describe('ConnectedIntegrationFieldsSection', () => {
  it('renders the shared loading state inside the section', () => {
    render(
      <ConnectedIntegrationFieldsSection
        title='Integration Target'
        loading={true}
        loadingVariant='loading-state'
        loadingSize='sm'
        marketplaceLabel='Marketplace / Integration'
        marketplacePlaceholder='Select a marketplace...'
        selectedIntegrationId={null}
        onIntegrationChange={vi.fn()}
        integrationOptions={[]}
        showAccountField={false}
        accountLabel='Account'
        accountPlaceholder='Select an account...'
        selectedConnectionId={null}
        onConnectionChange={vi.fn()}
        connectionOptions={[]}
      />
    );

    expect(screen.getByText('Integration Target')).toBeInTheDocument();
    expect(screen.getByText('Loading integrations...')).toBeInTheDocument();
  });

  it('renders selector fields and footer when not loading', () => {
    render(
      <ConnectedIntegrationFieldsSection
        title='2. Integration Settings'
        loading={false}
        loadingVariant='loading-state'
        marketplaceLabel='Marketplace'
        marketplacePlaceholder='Select marketplace...'
        selectedIntegrationId='integration-tradera-1'
        onIntegrationChange={vi.fn()}
        integrationOptions={[{ value: 'integration-tradera-1', label: 'Tradera' }]}
        showAccountField={true}
        accountLabel='Account'
        accountPlaceholder='Select account...'
        selectedConnectionId='conn-tradera-1'
        onConnectionChange={vi.fn()}
        connectionOptions={[{ value: 'conn-tradera-1', label: 'Browser' }]}
        footer={<div data-testid='footer'>Footer</div>}
      />
    );

    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Account')).toBeInTheDocument();
    expect(screen.getByTestId('footer')).toBeInTheDocument();
  });
});
