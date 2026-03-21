/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@/__tests__/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SettingsStoreProvider } from '@/shared/providers/SettingsStoreProvider';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
  KANGUR_SUNSET_THEME_SETTINGS_KEY,
  KANGUR_DEFAULT_THEME,
} from '@/features/kangur/theme-settings';
import { KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY } from '@/features/kangur/storefront-appearance-settings';
import { KangurStorefrontAppearanceProvider } from '@/features/kangur/ui/KangurStorefrontAppearanceProvider';
import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';
import { useOptionalCmsStorefrontAppearance } from '@/features/cms/public';

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
const setEnvValue = (key: string, value: string | undefined) => {
  if (value === undefined) {
    delete process.env[key];
  } else {
    process.env[key] = value;
  }
};

vi.mock('next/navigation', () => ({
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

function AppearanceProbe(): React.JSX.Element {
  const appearance = useKangurStorefrontAppearance();
  const mode = useOptionalCmsStorefrontAppearance()?.mode ?? 'missing';

  return (
    <div>
      <div data-testid='mode'>{mode}</div>
      <div data-testid='background'>{appearance.theme.backgroundColor}</div>
    </div>
  );
}

describe('useKangurStorefrontAppearance integration', () => {
  beforeEach(() => {
    settingsMapRef.current = new Map();
    window.localStorage.clear();
    setEnvValue('NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST', 'false');
    useLiteSettingsMapMock.mockClear();
    useSettingsMapMock.mockClear();
  });

  afterEach(() => {
    setEnvValue('NEXT_PUBLIC_KANGUR_APPEARANCE_PERSIST', originalPersistEnv);
  });

  it('uses the daily slot theme when provided', async () => {
    settingsMapRef.current = new Map([
      [KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY, 'default'],
      [
        KANGUR_DAILY_THEME_SETTINGS_KEY,
        serializeSetting({
          backgroundColor: '#123456',
          primaryColor: '#4f46e5',
        }),
      ],
    ]);

    render(
      <SettingsStoreProvider mode='lite'>
        <KangurStorefrontAppearanceProvider>
          <AppearanceProbe />
        </KangurStorefrontAppearanceProvider>
      </SettingsStoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('background')).toHaveTextContent('#123456');
    });
    expect(screen.getByTestId('mode')).toHaveTextContent('default');
  });

  it('selects the sunset slot when the stored default mode is sunset', async () => {
    settingsMapRef.current = new Map([
      [KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY, 'sunset'],
      [
        KANGUR_SUNSET_THEME_SETTINGS_KEY,
        serializeSetting({
          backgroundColor: '#ff00ff',
          primaryColor: '#fb923c',
        }),
      ],
      [
        KANGUR_DAILY_THEME_SETTINGS_KEY,
        serializeSetting({
          backgroundColor: '#00ff00',
        }),
      ],
    ]);

    render(
      <SettingsStoreProvider mode='lite'>
        <KangurStorefrontAppearanceProvider>
          <AppearanceProbe />
        </KangurStorefrontAppearanceProvider>
      </SettingsStoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('sunset');
    });
    expect(screen.getByTestId('background')).toHaveTextContent('#ff00ff');
  });

  it('falls back to the built-in nightly theme when no dark slot theme exists', async () => {
    settingsMapRef.current = new Map([
      [KANGUR_STOREFRONT_DEFAULT_MODE_SETTING_KEY, 'dark'],
      [KANGUR_NIGHTLY_THEME_SETTINGS_KEY, ''],
    ]);

    render(
      <SettingsStoreProvider mode='lite'>
        <KangurStorefrontAppearanceProvider>
          <AppearanceProbe />
        </KangurStorefrontAppearanceProvider>
      </SettingsStoreProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('mode')).toHaveTextContent('dark');
    });
    expect(screen.getByTestId('background')).toHaveTextContent(KANGUR_DEFAULT_THEME.backgroundColor);
  });
});
