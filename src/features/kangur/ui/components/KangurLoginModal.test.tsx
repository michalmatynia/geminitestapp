/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JSX } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type KangurLoginModalState = {
  authMode: 'sign-in' | 'create-account';
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
    parentAuthMode?: 'sign-in' | 'create-account';
  }): JSX.Element => {
    kangurLoginPageMock(props);
    return (
      <div data-testid='kangur-login-page'>
        <div data-testid='kangur-login-page-callback'>{props.defaultCallbackUrl}</div>
        <div data-testid='kangur-login-page-auth-mode'>{props.parentAuthMode ?? 'sign-in'}</div>
        <button data-testid='kangur-login-page-dismiss' onClick={() => props.onClose?.()} type='button'>
          Zamknij z formularza
        </button>
      </div>
    );
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
      authMode: 'sign-in',
      callbackUrl: '/kangur/tests?focus=division',
      closeLoginModal: closeLoginModalMock,
      dismissLoginModal: dismissLoginModalMock,
      isOpen: true,
    });
  });

  it('renders an accessible dialog and passes sign-in props into the shared login page', () => {
    render(<KangurLoginModal />);

    const dialog = screen.getByRole('dialog', { name: 'Zaloguj się' });

    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAccessibleDescription(
      'Zaloguj rodzica emailem albo ucznia nickiem bez opuszczania strony.'
    );
    expect(screen.getByTestId('kangur-login-modal')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-page')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-login-page-callback')).toHaveTextContent(
      '/kangur/tests?focus=division'
    );
    expect(screen.getByTestId('kangur-login-page-auth-mode')).toHaveTextContent('sign-in');

    const loginPageProps = kangurLoginPageMock.mock.calls[0]?.[0] as {
      defaultCallbackUrl: string;
      onClose?: () => void;
      parentAuthMode?: 'sign-in' | 'create-account';
    };

    expect(loginPageProps.defaultCallbackUrl).toBe('/kangur/tests?focus=division');
    expect(loginPageProps.onClose).toBe(dismissLoginModalMock);
    expect(loginPageProps.parentAuthMode).toBe('sign-in');
    expect(screen.getByRole('button', { name: 'Zamknij logowanie' })).toHaveClass('cursor-pointer');
  });

  it('passes create-account mode through to the shared login page', () => {
    modalStateMock.mockReturnValue({
      authMode: 'create-account',
      callbackUrl: '/kangur/tests?focus=training',
      closeLoginModal: closeLoginModalMock,
      dismissLoginModal: dismissLoginModalMock,
      isOpen: true,
    });

    render(<KangurLoginModal />);

    expect(screen.getByTestId('kangur-login-page-callback')).toHaveTextContent(
      '/kangur/tests?focus=training'
    );
    expect(screen.getByTestId('kangur-login-page-auth-mode')).toHaveTextContent('create-account');
  });

  it('does not render the dialog shell when the modal is closed', () => {
    modalStateMock.mockReturnValue({
      authMode: 'sign-in',
      callbackUrl: '/kangur/tests?focus=division',
      closeLoginModal: closeLoginModalMock,
      dismissLoginModal: dismissLoginModalMock,
      isOpen: false,
    });

    render(<KangurLoginModal />);

    expect(screen.queryByRole('dialog', { name: 'Zaloguj się' })).not.toBeInTheDocument();
    expect(screen.queryByTestId('kangur-login-page')).not.toBeInTheDocument();
    expect(kangurLoginPageMock).not.toHaveBeenCalled();
  });

  it('uses the shell close button to close the modal', async () => {
    const user = userEvent.setup();

    render(<KangurLoginModal />);

    await user.click(screen.getByRole('button', { name: 'Zamknij logowanie' }));

    expect(closeLoginModalMock).toHaveBeenCalledTimes(1);
  });

  it('lets the embedded login page dismiss the modal through its onClose prop', async () => {
    const user = userEvent.setup();

    render(<KangurLoginModal />);

    await user.click(screen.getByTestId('kangur-login-page-dismiss'));

    expect(dismissLoginModalMock).toHaveBeenCalledTimes(1);
  });

  it('closes the modal when the user presses Escape', async () => {
    const user = userEvent.setup();

    render(<KangurLoginModal />);

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(closeLoginModalMock).toHaveBeenCalledTimes(1);
    });
  });
});
