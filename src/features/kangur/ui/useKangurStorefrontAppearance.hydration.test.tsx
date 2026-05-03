/**
 * @vitest-environment jsdom
 */

import type { CSSProperties } from 'react';
import { act, waitFor } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { KANGUR_DAILY_THEME_SETTINGS_KEY } from '@/features/kangur/appearance/theme-settings';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';

const settingsMapRef = { current: new Map<string, string>() };
const settingsQueryStub = () => ({
  data: settingsMapRef.current,
  isLoading: false,
  isFetching: false,
  error: null,
  refetch: vi.fn(),
});
const useLiteSettingsMapMock = vi.fn(settingsQueryStub);
const useSettingsMapMock = vi.fn(settingsQueryStub);

const originalPersistEnv = process.env['NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST'];
const setEnvValue = (key: string, value: string | undefined): void => {
  if (value === undefined) {
    delete process.env[key];
    return;
  }
  process.env[key] = value;
};

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock('nextjs-toploader/app', () => ({
  usePathname: () => '/',
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
}));

vi.mock('@/shared/hooks/use-settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/hooks/use-settings')>();
  return {
    ...actual,
    useLiteSettingsMap: () => useLiteSettingsMapMock(),
    useSettingsMap: () => useSettingsMapMock(),
  };
});

function AppearanceStyleProbe(): React.JSX.Element {
  const appearance = useKangurStorefrontAppearance();
  const style: CSSProperties & Record<string, string> = {
    '--probe-background': appearance.theme.backgroundColor,
    ...appearance.vars,
  };

  return (
    <div data-testid='appearance-style-probe' style={style}>
      appearance
    </div>
  );
}

function TestTree({ initialThemeRaw }: { initialThemeRaw: string }): React.JSX.Element {
  return (
    <SettingsStoreProvider mode='lite'>
      <KangurStorefrontAppearanceProvider initialThemeSettings={{ default: initialThemeRaw }}>
        <AppearanceStyleProbe />
      </KangurStorefrontAppearanceProvider>
    </SettingsStoreProvider>
  );
}

describe('useKangurStorefrontAppearance hydration', () => {
  beforeEach(() => {
    settingsMapRef.current = new Map();
    setEnvValue('NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST', 'false');
    useLiteSettingsMapMock.mockClear();
    useSettingsMapMock.mockClear();
  });

  afterEach(() => {
    setEnvValue('NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST', originalPersistEnv);
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('hydrates without attribute mismatches when persisted theme settings differ from the server snapshot', async () => {
    const serverThemeRaw = serializeSetting({
      backgroundColor: '#123456',
      primaryColor: '#4f46e5',
    });
    const persistedThemeRaw = serializeSetting({
      backgroundColor: '#abcdef',
      primaryColor: '#f97316',
    });

    settingsMapRef.current = new Map();
    const serverMarkup = renderToString(<TestTree initialThemeRaw={serverThemeRaw} />);

    const container = document.createElement('div');
    document.body.appendChild(container);
    container.innerHTML = serverMarkup;

    const probeBeforeHydration = container.querySelector<HTMLElement>('[data-testid="appearance-style-probe"]');
    expect(probeBeforeHydration?.style.getPropertyValue('--probe-background')).toBe('#123456');

    settingsMapRef.current = new Map([[KANGUR_DAILY_THEME_SETTINGS_KEY, persistedThemeRaw]]);

    const recoverableErrors: string[] = [];
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let root: ReturnType<typeof hydrateRoot> | null = null;

    await act(async () => {
      root = hydrateRoot(container, <TestTree initialThemeRaw={serverThemeRaw} />, {
        onRecoverableError: (error) => {
          recoverableErrors.push(error.message);
        },
      });
      await Promise.resolve();
    });

    await waitFor(() => {
      const probeAfterHydration = container.querySelector<HTMLElement>(
        '[data-testid="appearance-style-probe"]'
      );
      expect(probeAfterHydration?.style.getPropertyValue('--probe-background')).toBe('#abcdef');
    });

    expect(recoverableErrors).toEqual([]);
    expect(
      consoleErrorSpy.mock.calls.some(([message]) =>
        String(message).includes("A tree hydrated but some attributes of the server rendered HTML didn't match")
      )
    ).toBe(false);

    await act(async () => {
      root?.unmount();
    });
    container.remove();
  });
});
