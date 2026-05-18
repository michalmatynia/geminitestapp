'use client';

import * as React from 'react';

/**
 * Theme Provider
 * 
 * Provides application-wide theme management capability (light/dark/system).
 * Built on `next-themes`, it enables:
 * - Persistent theme preference storage in local storage
 * - System theme synchronization
 * - CSS class-based or data-attribute theme switching
 * - Flicker-free theme application via SSR hydration support
 */
type Theme = 'light' | 'dark' | 'system';
type ThemeAttribute = 'class' | `data-${string}` | Array<'class' | `data-${string}`>;

export interface ThemeProviderProps {
  children: React.ReactNode;
  attribute?: ThemeAttribute;
  defaultTheme?: Theme;
  disableTransitionOnChange?: boolean;
  enableColorScheme?: boolean;
  enableSystem?: boolean;
  forcedTheme?: Theme;
  storageKey?: string;
  themes?: string[];
  value?: Record<string, string>;
}

interface ThemeContextValue {
  forcedTheme?: Theme;
  resolvedTheme?: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  systemTheme?: 'light' | 'dark';
  theme?: Theme;
  themes: string[];
}

interface ResolvedThemeProviderOptions {
  attribute: ThemeAttribute;
  children: React.ReactNode;
  defaultTheme: Theme;
  disableTransitionOnChange: boolean;
  enableColorScheme: boolean;
  enableSystem: boolean;
  forcedTheme?: Theme;
  storageKey: string;
  themes: string[];
  value?: Record<string, string>;
}

const DEFAULT_THEMES = ['light', 'dark'];
const SYSTEM_QUERY = '(prefers-color-scheme: dark)';
const DEFAULT_THEME_PROVIDER_OPTIONS = {
  attribute: 'data-theme',
  defaultTheme: 'system',
  disableTransitionOnChange: false,
  enableColorScheme: true,
  enableSystem: true,
  storageKey: 'theme',
  themes: DEFAULT_THEMES,
} satisfies Omit<ResolvedThemeProviderOptions, 'children' | 'forcedTheme' | 'value'>;

const ThemeContext = React.createContext<ThemeContextValue>({
  setTheme: () => undefined,
  themes: DEFAULT_THEMES,
});

const isTheme = (value: string | null | undefined): value is Theme =>
  value === 'light' || value === 'dark' || value === 'system';

const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(SYSTEM_QUERY).matches ? 'dark' : 'light';
};

const getStoredTheme = (storageKey: string, fallback: Theme): Theme => {
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = window.localStorage.getItem(storageKey);
    return isTheme(stored) ? stored : fallback;
  } catch {
    return fallback;
  }
};

const normalizeDefaultTheme = (defaultTheme: Theme, enableSystem: boolean): Theme => {
  if (enableSystem) return defaultTheme;
  return defaultTheme === 'system' ? 'light' : defaultTheme;
};

const resolveTheme = (theme: Theme, systemTheme: 'light' | 'dark'): 'light' | 'dark' =>
  theme === 'system' ? systemTheme : theme;

const resolveAvailableThemes = (themes: string[], enableSystem: boolean): string[] =>
  enableSystem ? [...themes, 'system'] : themes;

const withoutTransitions = (enabled: boolean): (() => void) | null => {
  if (!enabled || typeof document === 'undefined') return null;

  const style = document.createElement('style');
  style.appendChild(
    document.createTextNode(
      '*,*::before,*::after{transition:none!important;animation:none!important}'
    )
  );
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    window.setTimeout(() => {
      style.remove();
    }, 1);
  };
};

const applyTheme = ({
  attribute,
  disableTransitionOnChange,
  enableColorScheme,
  resolvedTheme,
  themes,
  value,
}: {
  attribute: ThemeAttribute;
  disableTransitionOnChange: boolean;
  enableColorScheme: boolean;
  resolvedTheme: 'light' | 'dark';
  themes: string[];
  value?: Record<string, string>;
}): void => {
  if (typeof document === 'undefined') return;

  const cleanupTransitions = withoutTransitions(disableTransitionOnChange);
  const root = document.documentElement;
  const resolvedValue = value?.[resolvedTheme] ?? resolvedTheme;
  const attributes = Array.isArray(attribute) ? attribute : [attribute];

  attributes.forEach((item) => {
    if (item === 'class') {
      const classNames = themes.map((theme) => value?.[theme] ?? theme);
      root.classList.remove(...classNames);
      root.classList.add(resolvedValue);
      return;
    }

    root.setAttribute(item, resolvedValue);
  });

  if (enableColorScheme) {
    root.style.colorScheme = resolvedTheme;
  }

  cleanupTransitions?.();
};

const useSystemTheme = (): 'light' | 'dark' => {
  const [systemTheme, setSystemTheme] = React.useState<'light' | 'dark'>(() => getSystemTheme());

  React.useEffect(() => {
    const media = window.matchMedia(SYSTEM_QUERY);
    const updateSystemTheme = (): void => {
      setSystemTheme(media.matches ? 'dark' : 'light');
    };

    updateSystemTheme();
    media.addEventListener('change', updateSystemTheme);
    return () => media.removeEventListener('change', updateSystemTheme);
  }, []);

  return systemTheme;
};

const useStoredTheme = ({
  fallback,
  storageKey,
}: {
  fallback: Theme;
  storageKey: string;
}): [Theme, (theme: Theme) => void] => {
  const [theme, setThemeState] = React.useState<Theme>(() => getStoredTheme(storageKey, fallback));

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent): void => {
      if (event.key !== storageKey) return;
      setThemeState(isTheme(event.newValue) ? event.newValue : fallback);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [fallback, storageKey]);

  const setTheme = React.useCallback(
    (nextTheme: Theme): void => {
      setThemeState(nextTheme);
      try {
        window.localStorage.setItem(storageKey, nextTheme);
      } catch {
        // Theme persistence is best-effort in private or locked-down browsers.
      }
    },
    [storageKey]
  );

  return [theme, setTheme];
};

const resolveThemeProviderOptions = (
  props: ThemeProviderProps
): ResolvedThemeProviderOptions => ({
  ...DEFAULT_THEME_PROVIDER_OPTIONS,
  ...props,
});

export function ThemeProvider(props: ThemeProviderProps): React.ReactNode {
  const {
    attribute,
    children,
    defaultTheme,
    disableTransitionOnChange,
    enableColorScheme,
    enableSystem,
    forcedTheme,
    storageKey,
    themes,
    value,
  } = resolveThemeProviderOptions(props);
  const normalizedDefaultTheme = normalizeDefaultTheme(defaultTheme, enableSystem);
  const [theme, setTheme] = useStoredTheme({
    fallback: normalizedDefaultTheme,
    storageKey,
  });
  const systemTheme = useSystemTheme();
  const activeTheme = forcedTheme ?? theme;
  const resolvedTheme = resolveTheme(activeTheme, systemTheme);

  React.useEffect(() => {
    applyTheme({
      attribute,
      disableTransitionOnChange,
      enableColorScheme,
      resolvedTheme,
      themes,
      value,
    });
  }, [attribute, disableTransitionOnChange, enableColorScheme, resolvedTheme, themes, value]);

  const contextValue = React.useMemo(
    (): ThemeContextValue => ({
      forcedTheme,
      resolvedTheme,
      setTheme,
      systemTheme,
      theme,
      themes: resolveAvailableThemes(themes, enableSystem),
    }),
    [enableSystem, forcedTheme, resolvedTheme, setTheme, systemTheme, theme, themes]
  );

  return <ThemeContext.Provider value={contextValue}>{children}</ThemeContext.Provider>;
}

export const useTheme = (): ThemeContextValue => React.useContext(ThemeContext);
