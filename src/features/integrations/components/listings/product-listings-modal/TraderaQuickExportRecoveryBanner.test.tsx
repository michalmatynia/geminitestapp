import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./TraderaRecoveryContinueButton', () => ({
  TraderaRecoveryContinueButton: ({
    integrationId,
    connectionId,
  }: {
    integrationId: string;
    connectionId: string;
  }) => (
    <button type='button'>
      Continue {integrationId} {connectionId}
    </button>
  ),
}));

import { TraderaQuickExportRecoveryBanner } from './TraderaQuickExportRecoveryBanner';

describe('TraderaQuickExportRecoveryBanner', () => {
  it('renders empty-state recovery copy in full mode', () => {
    render(
      <TraderaQuickExportRecoveryBanner
        mode='empty'
        variant='full'
        status='auth_required'
        requestId='job-tradera-1'
        integrationId='integration-tradera-1'
        connectionId='conn-tradera-1'
      />
    );

    expect(screen.getByText('Tradera quick export needs recovery')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The one-click Tradera export did not leave behind a usable listing record yet. Open the Tradera login window if needed, then continue directly into the Tradera listing flow from this modal.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('auth_required')).toBeInTheDocument();
    expect(screen.getByText('job-tradera-1')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Continue integration-tradera-1 conn-tradera-1',
      })
    ).toBeInTheDocument();
  });

  it('renders content-state recovery copy in compact mode', () => {
    render(
      <TraderaQuickExportRecoveryBanner
        mode='content'
        status='failed'
        requestId='job-tradera-2'
        runId='run-tradera-2'
        integrationId='integration-tradera-2'
        connectionId='conn-tradera-2'
      />
    );

    expect(screen.getByText('Tradera quick export requires recovery')).toBeInTheDocument();
    expect(
      screen.getByText(/Review the Tradera listing below and use/i)
    ).toBeInTheDocument();
    expect(screen.getByText('Login and continue listing')).toBeInTheDocument();
    expect(screen.getByText('job-tradera-2')).toBeInTheDocument();
    expect(screen.getByText('run-tradera-2')).toBeInTheDocument();
  });

  it('renders failure details without continue action when recovery is not login-based', () => {
    render(
      <TraderaQuickExportRecoveryBanner
        mode='content'
        status='failed'
        requestId='job-tradera-3'
        connectionId='conn-tradera-1'
        failureReason='Tradera export requires an active Tradera category mapping for this product category.'
        canContinue={false}
      />
    );

    expect(screen.getByText('Tradera quick export needs attention')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tradera export requires an active Tradera category mapping for this product category.'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Login and continue listing')).toBeNull();
    expect(screen.getByRole('link', { name: 'Open Category Mapper' })).toHaveAttribute(
      'href',
      '/admin/integrations/marketplaces/category-mapper?connectionId=conn-tradera-1'
    );
    expect(
      screen.getByText(
        'Tradera export requires an active Tradera category mapping for this product category.'
      )
    ).toHaveClass('break-words', 'whitespace-normal');
  });
});
