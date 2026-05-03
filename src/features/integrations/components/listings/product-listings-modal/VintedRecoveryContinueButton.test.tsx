/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { handleOpenVintedLoginMock, useProductListingsUIStateMock } = vi.hoisted(() => ({
  handleOpenVintedLoginMock: vi.fn(),
  useProductListingsUIStateMock: vi.fn(),
}));

vi.mock('@/features/integrations/context/ProductListingsContext', () => ({
  useProductListingsActions: () => ({
    handleOpenVintedLogin: handleOpenVintedLoginMock,
  }),
  useProductListingsUIState: () => useProductListingsUIStateMock(),
}));

import { VintedRecoveryContinueButton } from './VintedRecoveryContinueButton';

describe('VintedRecoveryContinueButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useProductListingsUIStateMock.mockReturnValue({
      openingVintedLogin: null,
    });
  });

  it('opens Vinted recovery login from the recovery banner action', () => {
    render(
      <VintedRecoveryContinueButton
        integrationId='integration-vinted-1'
        connectionId='conn-vinted-1'
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Login to Vinted.pl' }));

    expect(handleOpenVintedLoginMock).toHaveBeenCalledWith(
      'recovery',
      'integration-vinted-1',
      'conn-vinted-1'
    );
  });

  it('shows a Vinted.pl waiting label while the recovery login is already opening', () => {
    useProductListingsUIStateMock.mockReturnValue({
      openingVintedLogin: 'recovery',
    });

    render(
      <VintedRecoveryContinueButton
        integrationId='integration-vinted-1'
        connectionId='conn-vinted-1'
      />
    );

    expect(screen.getByRole('button', { name: 'Waiting for Vinted.pl login...' })).toBeDisabled();
  });
});
