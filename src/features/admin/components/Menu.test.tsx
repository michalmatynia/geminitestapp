import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const pathnameState = {
  value: '/admin/cms/pages',
};

const routerPushMock = vi.fn();
const routerReplaceMock = vi.fn();
const settingsGetMock = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: (): string => pathnameState.value,
  useRouter: () => ({
    push: routerPushMock,
    replace: routerReplaceMock,
    prefetch: vi.fn(),
  }),
}));

vi.mock('@/features/admin/context/AdminLayoutContext', () => ({
  useAdminLayoutState: () => ({
    isMenuCollapsed: false,
    isMenuHidden: false,
    isProgrammaticallyCollapsed: false,
    aiDrawerOpen: false,
  }),
  useAdminLayoutActions: () => ({
    setIsMenuCollapsed: vi.fn(),
    setIsMenuHidden: vi.fn(),
    setIsProgrammaticallyCollapsed: vi.fn(),
    setAiDrawerOpen: vi.fn(),
  }),
}));

vi.mock('@/features/ai/public', () => ({
  useChatbotSessions: () => ({
    data: [],
    refetch: vi.fn(),
  }),
  useCreateChatbotSession: () => ({
    mutateAsync: vi.fn(),
  }),
}));

vi.mock('@/shared/providers/SettingsStoreProvider', () => {
  const map = new Map<string, string>();
  return {
    useSettingsStore: () => ({
      map,
      isLoading: false,
      isFetching: false,
      error: null,
      get: settingsGetMock,
      getBoolean: vi.fn(),
      getNumber: vi.fn(),
      refetch: vi.fn(),
    }),
  };
});

vi.mock('@/shared/ui', () => ({
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type='button' {...props}>
      {children}
    </button>
  ),
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value?: string;
    onChange?: React.ChangeEventHandler<HTMLInputElement>;
    placeholder?: string;
  }) => <input value={value} onChange={onChange} placeholder={placeholder} />,
  Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  TreeHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('./admin-menu-nav', () => ({
  buildAdminNav: () => [
    {
      id: 'cms',
      label: 'CMS',
      children: [
        {
          id: 'cms/pages',
          label: 'Pages',
          href: '/admin/cms/pages',
        },
      ],
    },
    {
      id: 'products',
      label: 'Products',
      children: [
        {
          id: 'products/all',
          label: 'All products',
          href: '/admin/products',
        },
      ],
    },
  ],
}));

vi.mock('./menu/NavTree', () => ({
  NavTree: ({
    openIds,
    onToggleOpen,
  }: {
    openIds: Set<string>;
    onToggleOpen: (id: string) => void;
  }) => (
    <div>
      <div data-testid='nav-tree-open-ids'>{Array.from(openIds).sort().join(',')}</div>
      <button type='button' data-testid='toggle-cms' onClick={() => onToggleOpen('cms')}>
        Toggle CMS
      </button>
      <button
        type='button'
        data-testid='toggle-products'
        onClick={() => onToggleOpen('products')}
      >
        Toggle Products
      </button>
    </div>
  ),
}));

import Menu from './Menu';

describe('Menu', () => {
  beforeEach(() => {
    pathnameState.value = '/admin/cms/pages';
    routerPushMock.mockReset();
    routerReplaceMock.mockReset();
    settingsGetMock.mockReset();
    settingsGetMock.mockReturnValue(undefined);
  });

  it('defers menu customization settings reads until after the first idle tick', async () => {
    vi.useFakeTimers();
    try {
      render(<Menu />);

      expect(settingsGetMock).not.toHaveBeenCalled();

      await act(async () => {
        vi.advanceTimersByTime(1);
        await Promise.resolve();
      });

      expect(settingsGetMock).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('reconciles auto-closed folders after a pathname change without carrying stale closure state', async () => {
    const { rerender } = render(<Menu />);

    expect(screen.getByTestId('nav-tree-open-ids')).toHaveTextContent('cms');

    fireEvent.click(screen.getByTestId('toggle-cms'));

    await waitFor(() => {
      expect(screen.getByTestId('nav-tree-open-ids')).toHaveTextContent('');
    });

    pathnameState.value = '/admin/products';
    rerender(<Menu />);

    await waitFor(() => {
      expect(screen.getByTestId('nav-tree-open-ids')).toHaveTextContent('products');
    });
  });
});
