// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react';
import { useEffect } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  SettingsStoreProvider,
  useSettingsStore,
  useSettingsStoreFetching,
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
const useSettingsMapMock = vi.fn((options?: { scope?: string; enabled?: boolean }) =>
  options?.enabled === false
    ? {
        ...adminQueryResultRef.current,
        data: new Map<string, string>(),
      }
    : adminQueryResultRef.current
);

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameRef.current,
}));

vi.mock('nextjs-toploader/app', () => ({
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

function SettingsProbe({
  settingKey = 'missing',
}: {
  settingKey?: string;
}): React.JSX.Element {
  const store = useSettingsStore();
  const value = store.get(settingKey) ?? 'empty';
  return (
    <div>
      <div data-testid='value'>{value}</div>
      <div data-testid='loading'>{String(store.isLoading)}</div>
    </div>
  );
}

function SettingsMapProbe({
  onMapChange,
}: {
  onMapChange: (map: Map<string, string>) => void;
}): React.JSX.Element {
  const store = useSettingsStore();

  useEffect(() => {
    onMapChange(store.map);
  }, [onMapChange, store.map]);

  return null;
}

function SettingsFetchingProbe(): React.JSX.Element {
  const isFetching = useSettingsStoreFetching();
  return <div data-testid='fetching'>{String(isFetching)}</div>;
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

  it('bootstraps admin mode from lite settings before hydrating the broader light scope', () => {
    vi.useFakeTimers();
    liteQueryResultRef.current = {
      data: new Map<string, string>([['query_status_panel_enabled', 'true']]),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };
    adminQueryResultRef.current = {
      data: new Map<string, string>([['admin_menu_favorites', '["products"]']]),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };

    render(
      <SettingsStoreProvider mode='admin'>
        <SettingsProbe settingKey='admin_menu_favorites' />
      </SettingsStoreProvider>
    );

    expect(useLiteSettingsMapMock).toHaveBeenCalledWith({ enabled: true });
    expect(useSettingsMapMock).toHaveBeenLastCalledWith({ scope: 'light', enabled: false });
    expect(screen.getByTestId('value')).toHaveTextContent('empty');

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(useSettingsMapMock).toHaveBeenLastCalledWith({ scope: 'light', enabled: true });
    expect(screen.getByTestId('value')).toHaveTextContent('["products"]');
    vi.useRealTimers();
  });

  it('reuses the parent lite settings store inside admin mode instead of issuing a second lite query', () => {
    vi.useFakeTimers();
    liteQueryResultRef.current = {
      data: new Map<string, string>([['query_status_panel_enabled', 'true']]),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };
    adminQueryResultRef.current = {
      data: new Map<string, string>([['admin_menu_favorites', '["products"]']]),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };

    render(
      <SettingsStoreProvider mode='lite'>
        <SettingsStoreProvider mode='admin'>
          <SettingsProbe settingKey='query_status_panel_enabled' />
        </SettingsStoreProvider>
      </SettingsStoreProvider>
    );

    expect(useLiteSettingsMapMock).toHaveBeenNthCalledWith(1, { enabled: true });
    expect(useLiteSettingsMapMock).toHaveBeenNthCalledWith(2, { enabled: false });
    expect(screen.getByTestId('value')).toHaveTextContent('true');

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(useSettingsMapMock).toHaveBeenLastCalledWith({ scope: 'light', enabled: true });
    vi.useRealTimers();
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

  it('returns false from useSettingsStoreFetching outside provider fallback', () => {
    render(<SettingsFetchingProbe />);
    expect(screen.getByTestId('fetching')).toHaveTextContent('false');
  });

  it('preserves the previous map reference when refetched settings are unchanged', () => {
    const onMapChange = vi.fn();
    const initialMap = new Map<string, string>([['feature_flag', 'true']]);

    liteQueryResultRef.current = {
      data: initialMap,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };

    const { rerender } = render(
      <SettingsStoreProvider mode='lite'>
        <SettingsMapProbe onMapChange={onMapChange} />
      </SettingsStoreProvider>
    );

    expect(onMapChange).toHaveBeenCalledTimes(1);
    expect(onMapChange).toHaveBeenLastCalledWith(initialMap);

    liteQueryResultRef.current = {
      data: new Map<string, string>([['feature_flag', 'true']]),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };

    rerender(
      <SettingsStoreProvider mode='lite'>
        <SettingsMapProbe onMapChange={onMapChange} />
      </SettingsStoreProvider>
    );

    expect(onMapChange).toHaveBeenCalledTimes(1);
  });

  it('publishes a new map reference when a refetch changes settings values', () => {
    const onMapChange = vi.fn();
    const initialMap = new Map<string, string>([['feature_flag', 'true']]);

    liteQueryResultRef.current = {
      data: initialMap,
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };

    const { rerender } = render(
      <SettingsStoreProvider mode='lite'>
        <SettingsMapProbe onMapChange={onMapChange} />
      </SettingsStoreProvider>
    );

    liteQueryResultRef.current = {
      data: new Map<string, string>([['feature_flag', 'false']]),
      isLoading: false,
      isFetching: false,
      error: null,
      refetch: vi.fn(),
    };

    rerender(
      <SettingsStoreProvider mode='lite'>
        <SettingsMapProbe onMapChange={onMapChange} />
      </SettingsStoreProvider>
    );

    expect(onMapChange).toHaveBeenCalledTimes(2);
    expect(onMapChange.mock.calls[0]?.[0]).toBe(initialMap);
    expect(onMapChange.mock.calls[1]?.[0]).not.toBe(initialMap);
    expect(onMapChange.mock.calls[1]?.[0].get('feature_flag')).toBe('false');
  });
});
