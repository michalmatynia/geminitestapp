import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  useCategoryMapperConfig: vi.fn(),
  useCategoryMapperUIState: vi.fn(),
  useCategoryMapperActions: vi.fn(),
}));

vi.mock('@/features/integrations/context/CategoryMapperContext', () => ({
  useCategoryMapperConfig: mocks.useCategoryMapperConfig,
  useCategoryMapperUIState: mocks.useCategoryMapperUIState,
  useCategoryMapperActions: mocks.useCategoryMapperActions,
}));

vi.mock('@/shared/ui/feedback.public', () => ({
  AppModal: ({
    isOpen,
    title,
    subtitle,
    children,
    footer,
  }: {
    isOpen?: boolean;
    title: React.ReactNode;
    subtitle?: React.ReactNode;
    children: React.ReactNode;
    footer?: React.ReactNode;
  }) =>
    isOpen ? (
      <div data-testid='app-modal'>
        <h2>{title}</h2>
        {subtitle ? <div>{subtitle}</div> : null}
        <div>{children}</div>
        <div>{footer}</div>
      </div>
    ) : null,
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  Button: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
  }) => (
    <button type='button' onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

import { TraderaCategoryFetchRecoveryModal } from './TraderaCategoryFetchRecoveryModal';

describe('TraderaCategoryFetchRecoveryModal', () => {
  it('renders nothing when recovery is closed', () => {
    mocks.useCategoryMapperConfig.mockReturnValue({
      connectionName: 'Tradera Connection',
    });
    mocks.useCategoryMapperUIState.mockReturnValue({
      showTraderaLoginRecoveryModal: false,
      traderaLoginRecoveryReason: null,
      openingTraderaLoginRecovery: false,
    });
    mocks.useCategoryMapperActions.mockReturnValue({
      closeTraderaLoginRecoveryModal: vi.fn(),
      handleOpenTraderaLoginRecovery: vi.fn(),
    });

    render(<TraderaCategoryFetchRecoveryModal />);

    expect(screen.queryByTestId('app-modal')).not.toBeInTheDocument();
  });

  it('shows the recovery reason and triggers manual login', async () => {
    const user = userEvent.setup();
    const closeModal = vi.fn();
    const openLogin = vi.fn();

    mocks.useCategoryMapperConfig.mockReturnValue({
      connectionName: 'Tradera Connection',
    });
    mocks.useCategoryMapperUIState.mockReturnValue({
      showTraderaLoginRecoveryModal: true,
      traderaLoginRecoveryReason:
        'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.',
      openingTraderaLoginRecovery: false,
    });
    mocks.useCategoryMapperActions.mockReturnValue({
      closeTraderaLoginRecoveryModal: closeModal,
      handleOpenTraderaLoginRecovery: openLogin,
    });

    render(<TraderaCategoryFetchRecoveryModal />);

    expect(screen.getByText('Tradera login required')).toBeInTheDocument();
    expect(screen.getByText('Tradera Connection')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Tradera browser session is missing or expired. Reconnect the browser Tradera connection and retry category fetch.'
      )
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Login to Tradera' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(openLogin).toHaveBeenCalledTimes(1);
    expect(closeModal).toHaveBeenCalledTimes(1);
  });
});
