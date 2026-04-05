// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setAiDrawerOpenMock = vi.fn();
const settingsStoreGetMock = vi.fn();
const updateSettingsMutateMock = vi.fn();
const signInMock = vi.fn();
const signOutMock = vi.fn();

type DropdownState = {
  open: boolean;
  onOpenChange?: ((open: boolean) => void) | undefined;
};

const DropdownMenuContext = React.createContext<DropdownState | null>(null);

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        name: 'Admin User',
        email: 'admin@example.com',
        image: '',
      },
    },
  }),
  signIn: () => signInMock(),
  signOut: () => signOutMock(),
}));

vi.mock('lucide-react', () => ({
  LogOut: () => <svg data-testid='logout-icon' />,
  LogIn: () => <svg data-testid='login-icon' />,
  SparklesIcon: () => <svg data-testid='sparkles-icon' />,
}));

vi.mock('@/features/admin/context/AdminLayoutContext', () => ({
  useAdminLayoutActions: () => ({
    setAiDrawerOpen: setAiDrawerOpenMock,
  }),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSettingsBulk: () => ({
    mutate: updateSettingsMutateMock,
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => ({
    get: settingsStoreGetMock,
  }),
}));

vi.mock('@/shared/ui', () => ({
  Avatar: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarFallback: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  AvatarImage: ({ alt }: { alt: string }) => <img alt={alt} />,
  Button: ({
    children,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' onClick={onClick} {...props}>
      {children}
    </button>
  ),
  DropdownMenu: ({
    children,
    open = false,
    onOpenChange,
  }: {
    children: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <DropdownMenuContext.Provider value={{ open, onOpenChange }}>
      <div>{children}</div>
    </DropdownMenuContext.Provider>
  ),
  DropdownMenuTrigger: ({
    children,
  }: {
    children: React.ReactElement<{ onClick?: React.MouseEventHandler<HTMLElement> }>;
    asChild?: boolean;
  }) => {
    const context = React.useContext(DropdownMenuContext);
    return React.cloneElement(children, {
      onClick: (event: React.MouseEvent<HTMLElement>) => {
        children.props.onClick?.(event);
        context?.onOpenChange?.(!context.open);
      },
    });
  },
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='user-nav-content'>{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    onSelect,
  }: {
    children: React.ReactNode;
    onClick?: React.MouseEventHandler<HTMLDivElement>;
    onSelect?: (event: Event) => void;
    className?: string;
  }) => (
    <div
      role='menuitem'
      tabIndex={0}
      onClick={(event) => {
        onSelect?.(event.nativeEvent);
        onClick?.(event);
      }}
    >
      {children}
    </div>
  ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  ToggleRow: ({
    label,
    checked,
  }: {
    label: string;
    checked: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
    labelClassName?: string;
  }) => <div>{`${label}:${checked ? 'on' : 'off'}`}</div>,
  ThemeToggle: () => <div data-testid='theme-toggle'>theme</div>,
}));

import { UserNav } from './UserNav';

describe('UserNav', () => {
  beforeEach(() => {
    setAiDrawerOpenMock.mockReset();
    settingsStoreGetMock.mockReset();
    settingsStoreGetMock.mockImplementation((key: string) => {
      if (key === 'query_status_panel_enabled') return 'true';
      if (key === 'query_status_panel_open') return 'false';
      return undefined;
    });
    updateSettingsMutateMock.mockReset();
    signInMock.mockReset();
    signOutMock.mockReset();
  });

  it('keeps the dropdown content and settings reads deferred until the menu opens', () => {
    render(<UserNav />);

    expect(screen.queryByTestId('user-nav-content')).not.toBeInTheDocument();
    expect(settingsStoreGetMock).not.toHaveBeenCalled();
  });

  it('reads dropdown settings and mounts the menu content only after opening the menu', () => {
    render(<UserNav />);

    fireEvent.click(screen.getByRole('button', { name: 'Avatar' }));

    expect(screen.getByTestId('user-nav-content')).toBeInTheDocument();
    expect(screen.getByText('Enable Panel:on')).toBeInTheDocument();
    expect(screen.getByText('Open Panel:off')).toBeInTheDocument();
    expect(screen.getByTestId('theme-toggle')).toBeInTheDocument();
    expect(settingsStoreGetMock).toHaveBeenCalledWith('query_status_panel_enabled');
    expect(settingsStoreGetMock).toHaveBeenCalledWith('query_status_panel_open');
  });
});
