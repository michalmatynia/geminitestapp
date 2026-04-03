import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/ui', () => ({
  Alert: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  FormSection: ({ children }: { children?: React.ReactNode }) => <section>{children}</section>,
}));

import { IntegrationSelectionEmptyState } from './IntegrationSelectionEmptyState';

describe('IntegrationSelectionEmptyState', () => {
  it('renders alert-link variant with setup CTA', () => {
    render(
      <IntegrationSelectionEmptyState
        variant='alert-link'
        message='No connected Tradera accounts.'
        setupLabel='Set up Tradera integration'
      />
    );

    const setupLink = screen.getByRole('link', { name: 'Set up Tradera integration' });

    expect(setupLink.parentElement).toHaveTextContent('No connected Tradera accounts.');
    expect(setupLink).toHaveAttribute(
      'href',
      '/admin/integrations'
    );
  });

  it('renders card-link variant with first-step CTA', () => {
    render(
      <IntegrationSelectionEmptyState
        variant='card-link'
        message='No connected integrations.'
        setupLabel='Set up an integration'
      />
    );

    expect(screen.getByText('No connected integrations')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up an integration first' })).toHaveAttribute(
      'href',
      '/admin/integrations'
    );
  });

  it('renders section-detail variant with detail text', () => {
    render(
      <IntegrationSelectionEmptyState
        variant='section-detail'
        message='No integrations with configured accounts found.'
        detail='Please set up an integration with at least one account first.'
      />
    );

    expect(
      screen.getByText('No integrations with configured accounts found.')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Please set up an integration with at least one account first.')
    ).toBeInTheDocument();
  });
});
