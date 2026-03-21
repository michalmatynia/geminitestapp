// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SettingsStoreProvider,
  useSettingsStore,
  type SettingsStoreValue,
} from '@/shared/providers/SettingsStoreProvider';

const pathnameRef = { current: '/' };
const liteQueryResultRef = {
  current: {
    data: new Map<string, string>(),
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  },
};
const adminQueryResultRef = {
  current: {
    data: new Map<string, string>(),
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  },
};

const useLiteSettingsMapMock = vi.fn(() => liteQueryResultRef.current);
const useSettingsMapMock = vi.fn(() => adminQueryResultRef.current);

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
}));

vi.mock('@/shared/hooks/use-settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/hooks/use-settings')>();
  return {
    ...actual,
    useLiteSettingsMap: (options?: { enabled?: boolean }) => useLiteSettingsMapMock(options),
    useSettingsMap: (options?: { scope?: string; enabled?: boolean }) =>
      useSettingsMapMock(options),
  };
});

function SettingsProbe(): React.JSX.Element {
  const store = useSettingsStore();
  const value = store.get('missing') ?? 'empty';
  return (
    <div>
      <div data-testid='value'>{value}</div>
      <div data-testid='loading'>{String(store.isLoading)}</div>
    </div>
  );
}

describe('SettingsStoreProvider', () => {
  beforeEach(() => {
    pathnameRef.current = '/';
    window.history.replaceState(null, '', '/');
    liteQueryResultRef.current = {
      data: new Map<string, string>(),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };
    adminQueryResultRef.current = {
      data: new Map<string, string>(),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };
    useLiteSettingsMapMock.mockClear();
    useSettingsMapMock.mockClear();
  });

  it('suppresses the root lite settings query on admin routes using the browser pathname', () => {
    window.history.replaceState(null, '', '/admin/cms/pages');

    render(
      <SettingsStoreProvider mode='lite'>
        <SettingsProbe />
      </SettingsStoreProvider>
    );

    expect(useLiteSettingsMapMock).toHaveBeenCalledWith({ enabled: false });
    expect(useSettingsMapMock).toHaveBeenCalledWith({ scope: 'light', enabled: false });
  });

  it('falls back to an empty map when hydrated query data is not a Map instance', () => {
    liteQueryResultRef.current = {
      data: {} as SettingsStoreValue['map'],
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };

    render(
      <SettingsStoreProvider mode='lite'>
        <SettingsProbe />
      </SettingsStoreProvider>
    );

    expect(screen.getByTestId('value')).toHaveTextContent('empty');
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
  });
});
