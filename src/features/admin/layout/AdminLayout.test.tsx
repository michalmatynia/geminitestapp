// @vitest-environment jsdom

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

const settingsStoreProviderPropsMock = vi.fn();
const adminFavoritesRuntimeProviderPropsMock = vi.fn();
const noteSettingsProviderPropsMock = vi.fn();
const useUserPreferencesMock = vi.fn();
const aiInsightsDrawerRenderMock = vi.fn();
const apiPatchMock = vi.fn();
const queryClientSetQueryDataMock = vi.fn();
let pathnameMock = '/admin/products';
let adminLayoutStateMock = {
  isMenuCollapsed: false,
  isMenuHidden: false,
  isProgrammaticallyCollapsed: false,
  aiDrawerOpen: false,
};
let adminLayoutActionsMock = {
  setIsMenuCollapsed: vi.fn(),
  setIsMenuHidden: vi.fn(),
  setIsProgrammaticallyCollapsed: vi.fn(),
};

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueryClient: () => ({
      setQueryData: queryClientSetQueryDataMock,
      getQueryCache: () => ({
        subscribe: vi.fn(() => vi.fn()),
        findAll: vi.fn(() => []),
        getAll: vi.fn(() => []),
        find: vi.fn(),
      }),
      getDefaultOptions: () => ({}),
      getMutationCache: () => ({
        subscribe: vi.fn(() => vi.fn()),
      }),
    }),
  };
});

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock,
}));

vi.mock('nextjs-toploader/app', () => ({
  usePathname: () => pathnameMock,
}));

vi.mock('next-auth/react', () => ({
  SessionProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useSession: () => ({ data: null, status: 'unauthenticated' }),
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal<typeof import('lucide-react')>();
  return {
    ...actual,
    ChevronLeftIcon: () => <svg data-testid='chevron-left-icon' />,
    Menu: () => <svg data-testid='menu-icon' />,
    X: () => <svg data-testid='close-icon' />,
    AlertCircle: () => <svg data-testid='alert-circle-icon' />,
    GitBranch: () => <svg data-testid='git-branch-icon' />,
  };
});

vi.mock('@/features/admin/components/AiInsightsNotificationsDrawer', () => ({
  AiInsightsNotificationsDrawer: () => {
    aiInsightsDrawerRenderMock({ mounted: true });
    return <div data-testid='ai-insights-drawer' />;
  },
}));

vi.mock('@/features/admin/components/Menu', () => ({
  default: () => <nav data-testid='admin-menu' />,
}));

vi.mock('@/features/admin/components/UserNav', () => ({
  UserNav: () => <div data-testid='user-nav' />,
}));

vi.mock('@/features/admin/components/AdminFavoritesRuntimeProvider', () => ({
  AdminFavoritesRuntimeProvider: ({ children }: { children: React.ReactNode }) => {
    adminFavoritesRuntimeProviderPropsMock({ mounted: true });
    return <div data-testid='admin-favorites-runtime-provider'>{children}</div>;
  },
}));

vi.mock('@/features/admin/context/AdminLayoutContext', () => ({
  AdminLayoutProvider: ({
    children,
  }: {
    children: React.ReactNode;
    initialMenuCollapsed?: boolean;
  }) => <>{children}</>,
  useAdminLayoutState: () => adminLayoutStateMock,
  useAdminLayoutActions: () => adminLayoutActionsMock,
}));

vi.mock('@/shared/hooks/useUserPreferences', () => ({
  useUserPreferences: (...args: unknown[]) => useUserPreferencesMock(...args),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    patch: (...args: unknown[]) => apiPatchMock(...args),
  },
}));

vi.mock('@/shared/lib/browser/client-cookies', () => ({
  setClientCookie: vi.fn(),
}));

vi.mock('@/shared/providers/NoteSettingsProvider', () => ({
  NoteSettingsProvider: ({ children }: { children: React.ReactNode }) => {
    noteSettingsProviderPropsMock({ mounted: true });
    return <>{children}</>;
  },
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

vi.mock('@/shared/ui/primitives.public', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/ui/primitives.public')>();
  return {
    ...actual,
    Button: ({
      children,
      ...props
    }: React.ButtonHTMLAttributes<HTMLButtonElement> & { children?: React.ReactNode }) => (
      <button type='button' {...props}>
        {children}
      </button>
    ),
    ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    useToast: () => ({
      toast: vi.fn(),
      dismiss: vi.fn(),
      toasts: [],
    }),
  };
});

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
    vi.useFakeTimers();
    pathnameMock = '/admin/products';
    adminLayoutStateMock = {
      isMenuCollapsed: false,
      isMenuHidden: false,
      isProgrammaticallyCollapsed: false,
      aiDrawerOpen: false,
    };
    adminLayoutActionsMock = {
      setIsMenuCollapsed: vi.fn(),
      setIsMenuHidden: vi.fn(),
      setIsProgrammaticallyCollapsed: vi.fn(),
    };
    settingsStoreProviderPropsMock.mockClear();
    adminFavoritesRuntimeProviderPropsMock.mockClear();
    noteSettingsProviderPropsMock.mockClear();
    aiInsightsDrawerRenderMock.mockClear();
    apiPatchMock.mockReset();
    apiPatchMock.mockResolvedValue({ adminMenuCollapsed: true });
    queryClientSetQueryDataMock.mockClear();
    useUserPreferencesMock.mockReset();
    useUserPreferencesMock.mockReturnValue({ data: null });
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  it('mounts the admin settings store around the admin runtime', () => {
    render(
      <AdminLayout canReadAdminSettings={false}>
        <div data-testid='content'>content</div>
      </AdminLayout>
    );

    expect(screen.getByTestId('settings-store-provider')).toContainElement(
      screen.getByTestId('admin-favorites-runtime-provider')
    );
    expect(adminFavoritesRuntimeProviderPropsMock).toHaveBeenCalledWith({
      mounted: true,
    });
    expect(aiInsightsDrawerRenderMock).not.toHaveBeenCalled();
    expect(noteSettingsProviderPropsMock).not.toHaveBeenCalled();
    expect(settingsStoreProviderPropsMock).toHaveBeenCalledWith({
      mode: 'admin',
      canReadAdminSettings: false,
    });
    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('mounts note settings only for admin notes routes', () => {
    pathnameMock = '/admin/notes/settings';

    render(
      <AdminLayout>
        <div data-testid='content'>content</div>
      </AdminLayout>
    );

    expect(noteSettingsProviderPropsMock).toHaveBeenCalledWith({
      mounted: true,
    });
  });

  it('defers the remote admin menu preference lookup until after initial mount when no seed preference exists', async () => {
    render(
      <AdminLayout>
        <div data-testid='content'>content</div>
      </AdminLayout>
    );

    expect(useUserPreferencesMock).toHaveBeenCalled();
    expect(useUserPreferencesMock.mock.calls[0]?.[0]).toEqual({ enabled: false });

    await act(async () => {
      vi.runOnlyPendingTimers();
    });

    const lastCall = useUserPreferencesMock.mock.calls.at(-1);
    expect(lastCall?.[0]).toEqual({ enabled: true });
  });

  it('skips the remote menu preference lookup when an initial server preference exists', () => {
    render(
      <AdminLayout initialMenuCollapsed={true} hasInitialMenuPreference={true}>
        <div data-testid='content'>content</div>
      </AdminLayout>
    );

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(
      useUserPreferencesMock.mock.calls.every((call) => call[0]?.enabled === false)
    ).toBe(true);
  });

  it('persists the collapse preference without using the shared mutation hook', async () => {
    render(
      <AdminLayout>
        <div data-testid='content'>content</div>
      </AdminLayout>
    );

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Collapse admin sidebar' }));
      await Promise.resolve();
    });

    expect(adminLayoutActionsMock.setIsMenuCollapsed).toHaveBeenCalledWith(true);
    expect(adminLayoutActionsMock.setIsProgrammaticallyCollapsed).toHaveBeenCalledWith(false);
    expect(apiPatchMock).toHaveBeenCalledWith('/api/user/preferences', {
      adminMenuCollapsed: true,
    });
    expect(queryClientSetQueryDataMock).toHaveBeenCalledWith(QUERY_KEYS.userPreferences.all, {
      adminMenuCollapsed: true,
    });
  });
});
