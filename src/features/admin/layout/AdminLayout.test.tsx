// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const settingsStoreProviderPropsMock = vi.fn();
const mutateAsyncMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/products',
}));

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

vi.mock('lucide-react', () => ({
  ChevronLeftIcon: () => <svg data-testid='chevron-left-icon' />,
  Menu: () => <svg data-testid='menu-icon' />,
  X: () => <svg data-testid='close-icon' />,
}));

vi.mock('@/features/admin/components/AiInsightsNotificationsDrawer', () => ({
  AiInsightsNotificationsDrawer: () => null,
}));

vi.mock('@/features/admin/components/Menu', () => ({
  default: () => <nav data-testid='admin-menu' />,
}));

vi.mock('@/features/admin/components/UserNav', () => ({
  UserNav: () => <div data-testid='user-nav' />,
}));

vi.mock('@/features/admin/context/AdminLayoutContext', () => ({
  AdminLayoutProvider: ({
    children,
  }: {
    children: React.ReactNode;
    initialMenuCollapsed?: boolean;
  }) => <>{children}</>,
  useAdminLayoutState: () => ({
    isMenuCollapsed: false,
    isMenuHidden: false,
    isProgrammaticallyCollapsed: false,
  }),
  useAdminLayoutActions: () => ({
    setIsMenuCollapsed: vi.fn(),
    setIsMenuHidden: vi.fn(),
    setIsProgrammaticallyCollapsed: vi.fn(),
  }),
}));

vi.mock('@/shared/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({ data: null }),
  useUpdateUserPreferences: () => ({ mutateAsync: mutateAsyncMock }),
}));

vi.mock('@/shared/lib/browser/client-cookies', () => ({
  setClientCookie: vi.fn(),
}));

vi.mock('@/shared/providers/NoteSettingsProvider', () => ({
  NoteSettingsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/providers/QueryProvider', () => ({
  QueryProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='query-provider'>{children}</div>
  ),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => ({
  SettingsStoreProvider: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    mode?: 'admin' | 'lite';
    canReadAdminSettings?: boolean;
  }) => {
    settingsStoreProviderPropsMock(props);
    return <div data-testid='settings-store-provider'>{children}</div>;
  },
}));

vi.mock('@/shared/ui', () => ({
  Button: ({
    children,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
    <button type='button' {...props}>
      {children}
    </button>
  ),
  ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/ui/QueryErrorBoundary', () => ({
  QueryErrorBoundary: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: vi.fn(),
  logClientError: vi.fn(),
}));

import { AdminLayout } from './AdminLayout';

describe('AdminLayout', () => {
  beforeEach(() => {
    settingsStoreProviderPropsMock.mockClear();
    mutateAsyncMock.mockReset();
    mutateAsyncMock.mockResolvedValue(undefined);
  });

  it('mounts the admin settings store under QueryProvider', () => {
    render(
      <AdminLayout canReadAdminSettings={false}>
        <div data-testid='content'>content</div>
      </AdminLayout>
    );

    expect(screen.getByTestId('query-provider')).toContainElement(
      screen.getByTestId('settings-store-provider')
    );
    expect(settingsStoreProviderPropsMock).toHaveBeenCalledWith({
      mode: 'admin',
      canReadAdminSettings: false,
    });
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });
});
