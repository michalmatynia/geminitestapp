/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSX } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type KangurLoginModalState = {
  callbackUrl: string;
  closeLoginModal: () => void;
  dismissLoginModal: () => void;
  isOpen: boolean;
};

const { closeLoginModalMock, dismissLoginModalMock, kangurLoginPageMock, modalStateMock } =
  vi.hoisted(() => ({
    closeLoginModalMock: vi.fn(),
    dismissLoginModalMock: vi.fn(),
    kangurLoginPageMock: vi.fn(),
    modalStateMock: vi.fn<() => KangurLoginModalState>(),
  }));

vi.mock('@/features/kangur/ui/KangurLoginPage', () => ({
  KangurLoginPage: (props: {
    callbackUrl?: string;
    defaultCallbackUrl: string;
    onClose?: () => void;
  }): JSX.Element => {
    kangurLoginPageMock(props);
    return <div data-testid='kangur-login-page' />;
  },
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: () => modalStateMock(),
}));

import { KangurLoginModal } from '@/features/kangur/ui/components/KangurLoginModal';

describe('KangurLoginModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modalStateMock.mockReturnValue({
      callbackUrl: '/kangur/tests?focus=division',
      closeLoginModal: closeLoginModalMock,
      dismissLoginModal: dismissLoginModalMock,
      isOpen: true,
    });
  });

  it('renders the shared Kangur login page inside the modal and wires close handlers', async () => {
    const user = userEvent.setup();

    render(<KangurLoginModal />);

    expect(screen.getByTestId('kangur-login-modal')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-page')).toBeInTheDocument();

    const loginPageProps = kangurLoginPageMock.mock.calls[0]?.[0] as {
      defaultCallbackUrl: string;
      onClose?: () => void;
    };

    expect(loginPageProps.defaultCallbackUrl).toBe('/kangur/tests?focus=division');
    expect(loginPageProps.onClose).toBe(dismissLoginModalMock);

    await user.click(screen.getByRole('button', { name: 'Zamknij logowanie' }));

    expect(closeLoginModalMock).toHaveBeenCalledTimes(1);
  });
});
