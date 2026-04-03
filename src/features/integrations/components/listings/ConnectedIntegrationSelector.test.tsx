import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui', () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  FormSection: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
  IntegrationSelector: () => <div data-testid='integration-selector' />,
  LoadingState: ({ message }: { message?: string }) => <div>{message}</div>,
}));

import { ConnectedIntegrationSelector } from './ConnectedIntegrationSelector';

const baseProps = {
  integrations: [
    {
      id: 'integration-tradera-1',
      name: 'Tradera',
      slug: 'tradera',
      connections: [{ id: 'conn-tradera-1', name: 'Browser', integrationId: 'integration-tradera-1' }],
    },
  ],
  loading: false,
  selectedIntegrationId: 'integration-tradera-1',
  selectedConnectionId: 'conn-tradera-1',
  setSelectedIntegrationId: vi.fn(),
  setSelectedConnectionId: vi.fn(),
  emptyStateVariant: 'card-link' as const,
  emptyStateMessage: 'No connected integrations.',
  emptyStateSetupLabel: 'Set up an integration',
  loadingVariant: 'inline-text' as const,
};

describe('ConnectedIntegrationSelector', () => {
  it('renders loading state when integrations are loading', () => {
    render(
      <ConnectedIntegrationSelector
        {...baseProps}
        loading={true}
      />
    );

    expect(screen.getByText('Loading integrations...')).toBeInTheDocument();
  });

  it('renders empty state when there are no connected integrations', () => {
    render(
      <ConnectedIntegrationSelector
        {...baseProps}
        integrations={[]}
      />
    );

    expect(screen.getByText('No connected integrations')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up an integration first' })).toBeInTheDocument();
  });

  it('renders integration selector when integrations are available', () => {
    render(<ConnectedIntegrationSelector {...baseProps} />);

    expect(screen.getByTestId('integration-selector')).toBeInTheDocument();
  });
});
