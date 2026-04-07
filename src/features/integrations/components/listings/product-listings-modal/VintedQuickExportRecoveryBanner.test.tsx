import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./VintedRecoveryContinueButton', () => ({
  VintedRecoveryContinueButton: ({
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

import { VintedQuickExportRecoveryBanner } from './VintedQuickExportRecoveryBanner';

describe('VintedQuickExportRecoveryBanner', () => {
  it('renders empty-state recovery copy in full mode', () => {
    render(
      <VintedQuickExportRecoveryBanner
        mode='empty'
        variant='full'
        status='auth_required'
        requestId='job-vinted-1'
        integrationId='integration-vinted-1'
        connectionId='conn-vinted-1'
      />
    );

    expect(screen.getByText('Vinted.pl quick export needs recovery')).toBeInTheDocument();
    expect(
      screen.getByText(
        'The Vinted.pl one-click export did not leave behind a usable listing record yet. Refresh the Vinted browser session if needed, then retry from this modal.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('auth_required')).toBeInTheDocument();
    expect(screen.getByText('job-vinted-1')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Continue integration-vinted-1 conn-vinted-1',
      })
    ).toBeInTheDocument();
  });

  it('renders content-state recovery copy with a continue action when login recovery is possible', () => {
    render(
      <VintedQuickExportRecoveryBanner
        mode='content'
        status='auth_required'
        requestId='job-vinted-2'
        runId='run-vinted-2'
        integrationId='integration-vinted-2'
        connectionId='conn-vinted-2'
      />
    );

    expect(screen.getByText('Vinted.pl quick export requires recovery')).toBeInTheDocument();
    expect(screen.getByText(/Review the Vinted listing below and use/i)).toBeInTheDocument();
    expect(screen.getByText('Login to Vinted.pl')).toBeInTheDocument();
    expect(screen.getByText('job-vinted-2')).toBeInTheDocument();
    expect(screen.getByText('run-vinted-2')).toBeInTheDocument();
  });

  it('renders failure details without a continue action for non-login failures', () => {
    render(
      <VintedQuickExportRecoveryBanner
        mode='content'
        status='failed'
        requestId='job-vinted-3'
        failureReason='Vinted listing failed because the item title selector changed.'
        canContinue={false}
      />
    );

    expect(screen.getByText('Vinted.pl quick export requires attention')).toBeInTheDocument();
    expect(
      screen.getByText('Vinted listing failed because the item title selector changed.')
    ).toBeInTheDocument();
    expect(screen.queryByText('Login to Vinted.pl')).toBeNull();
  });
});
