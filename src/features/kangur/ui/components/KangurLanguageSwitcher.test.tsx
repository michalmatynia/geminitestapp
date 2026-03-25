/**
 * @vitest-environment jsdom
 */

import { QueryClientContext } from '@tanstack/react-query';
import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const { localeMock } = vi.hoisted(() => ({
  localeMock: vi.fn(),
}));

const {
  pathnameMock,
  prefetchMock,
  replaceMock,
  searchParamsMock,
} = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
  prefetchMock: vi.fn(),
  replaceMock: vi.fn(),
  searchParamsMock: vi.fn(),
}));

const { startRouteTransitionMock } = vi.hoisted(() => ({
  startRouteTransitionMock: vi.fn(),
}));

const { routeTransitionStateMock } = vi.hoisted(() => ({
  routeTransitionStateMock: vi.fn(),
}));

const { frontendPublicOwnerMock } = vi.hoisted(() => ({
  frontendPublicOwnerMock: vi.fn(),
}));

const { useKangurCoarsePointerMock } = vi.hoisted(() => ({
  useKangurCoarsePointerMock: vi.fn(),
}));

const { prefetchKangurPageContentStoreMock } = vi.hoisted(() => ({
  prefetchKangurPageContentStoreMock: vi.fn(),
}));

const { locationAssignSpy } = vi.hoisted(() => ({
  locationAssignSpy: vi.fn(),
}));

const { translationMessages } = vi.hoisted(() => ({
  translationMessages: {
    pl: {
      KangurNavigation: {
        languageSwitcher: {
          triggerAriaLabel: 'Aktualny język: {language}. Otwórz menu zmiany języka.',
          triggerTitle: 'Język: {language}',
        },
      },
    },
    en: {
      KangurNavigation: {
        languageSwitcher: {
          triggerAriaLabel: 'Current language: {language}. Open language menu.',
          triggerTitle: 'Language: {language}',
        },
      },
    },
    de: {
      KangurNavigation: {
        languageSwitcher: {
          triggerAriaLabel: 'Aktuelle Sprache: {language}. Sprachmenü öffnen.',
          triggerTitle: 'Sprache: {language}',
        },
      },
    },
    uk: {
      KangurNavigation: {
        languageSwitcher: {
          triggerAriaLabel: 'Поточна мова: {language}. Відкрити меню мов.',
          triggerTitle: 'Мова: {language}',
        },
      },
    },
  },
}));

vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useLocale: () => localeMock(),
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const locale = localeMock() || 'pl';
      const dictionary =
        translationMessages[locale as keyof typeof translationMessages] ?? translationMessages.pl;
      const namespaceParts = (namespace ?? '').split('.').filter(Boolean);
      const keyParts = key.split('.').filter(Boolean);
      const resolved = [...namespaceParts, ...keyParts].reduce<unknown>((current, part) => {
        if (!current || typeof current !== 'object') {
          return undefined;
        }
        return (current as Record<string, unknown>)[part];
      }, dictionary);

      if (typeof resolved !== 'string') {
        return key;
      }

      return Object.entries(values ?? {}).reduce(
        (message, [valueKey, value]) => message.replaceAll(`{${valueKey}}`, String(value)),
        resolved
      );
    },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({
    back: vi.fn(),
    prefetch: prefetchMock,
    push: vi.fn(),
    refresh: vi.fn(),
    replace: replaceMock,
  }),
  useSearchParams: () => searchParamsMock(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionActions: () => ({
    startRouteTransition: startRouteTransitionMock,
  }),
  useOptionalKangurRouteTransitionState: () => routeTransitionStateMock(),
}));

vi.mock('@/features/kangur/ui/FrontendPublicOwnerContext', () => ({
  useOptionalFrontendPublicOwner: () => frontendPublicOwnerMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => useKangurCoarsePointerMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  prefetchKangurPageContentStore: prefetchKangurPageContentStoreMock,
}));

vi.mock('@/features/kangur/ui/useKangurStorefrontAppearance', () => ({
  useKangurStorefrontAppearance: () => ({
    theme: {
      dropdownBg: '#ffffff',
      surfaceColor: '#ffffff',
      borderColor: '#d1d5db',
      textColor: '#111827',
      accentColor: '#3b82f6',
      primaryColor: '#3b82f6',
      darkMode: false,
      backgroundColor: '#ffffff',
      dropdownBorder: '#d1d5db',
      dropdownShadowBlur: 34,
      dropdownShadowY: 14,
    },
    tone: {
      background: '#f9fafb',
      border: '#d1d5db',
      text: '#111827',
      accent: '#3b82f6',
    },
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({
    back: vi.fn(),
    prefetch: prefetchMock,
    push: vi.fn(),
    replace: replaceMock,
  }),
}));

const { setClientCookieMock } = vi.hoisted(() => ({
  setClientCookieMock: vi.fn(),
}));

vi.mock('@/shared/lib/browser/client-cookies', () => ({
  setClientCookie: setClientCookieMock,
}));

import { KangurLanguageSwitcher } from './KangurLanguageSwitcher';

const openLanguageMenu = (trigger?: HTMLElement): void => {
  fireEvent.keyDown(trigger ?? screen.getByTestId('kangur-language-switcher-trigger'), {
    key: 'ArrowDown',
  });
};

describe('KangurLanguageSwitcher', () => {
  const originalLocation = window.location;

  const setMockWindowLocation = (href: string): void => {
    const resolvedUrl = new URL(href, 'https://kangur.local');

    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        ...originalLocation,
        assign: locationAssignSpy,
        hash: resolvedUrl.hash,
        href: resolvedUrl.href,
        pathname: resolvedUrl.pathname,
        search: resolvedUrl.search,
      },
    });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localeMock.mockReturnValue('pl');
    pathnameMock.mockReturnValue('/kangur/lessons');
    useKangurCoarsePointerMock.mockReturnValue(false);
    searchParamsMock.mockReturnValue(new URLSearchParams());
    routeTransitionStateMock.mockReturnValue(null);
    frontendPublicOwnerMock.mockReturnValue(null);
    prefetchMock.mockReset();
    replaceMock.mockReset();
    prefetchKangurPageContentStoreMock.mockReset();
    prefetchKangurPageContentStoreMock.mockResolvedValue(undefined);
    setClientCookieMock.mockReset();
    locationAssignSpy.mockReset();
    setMockWindowLocation('/kangur/lessons');
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  // ─── Rendering ───────────────────────────────────────────────────────

  it('renders the trigger button with the current locale label and flag', () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    const trigger = screen.getByTestId('kangur-language-switcher-trigger');
    expect(trigger).toBeInTheDocument();
    expect(trigger).toHaveTextContent('Polski');
  });

  it('renders the trigger with a localized aria-label', () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    expect(screen.getByTestId('kangur-language-switcher-trigger')).toHaveAttribute(
      'aria-label',
      'Aktualny język: Polski. Otwórz menu zmiany języka.'
    );
  });

  it('renders the trigger with a localized title', () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    expect(screen.getByTestId('kangur-language-switcher-trigger')).toHaveAttribute(
      'title',
      'Język: Polski'
    );
  });

  it('uses the locale-specific aria label when current locale is English', () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/kangur/lessons');

    render(<KangurLanguageSwitcher basePath='/en/kangur' currentPage='Lessons' />);

    expect(screen.getByTestId('kangur-language-switcher-trigger')).toHaveAttribute(
      'aria-label',
      'Current language: English. Open language menu.'
    );
  });

  it('returns null when the basePath is an embedded kangur path', () => {
    const { container } = render(
      <KangurLanguageSwitcher basePath='__kangur_embed__:/host' currentPage='Lessons' />
    );

    expect(container.innerHTML).toBe('');
  });

  // ─── Dropdown menu ──────────────────────────────────────────────────

  it('displays all four enabled locale options when opened', async () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();

    expect(await screen.findByTestId('kangur-language-switcher-option-pl')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-language-switcher-option-en')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-language-switcher-option-de')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-language-switcher-option-uk')).toBeInTheDocument();
  });

  it('marks the current locale as checked in the radio group', async () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();

    const plOption = await screen.findByTestId('kangur-language-switcher-option-pl');
    expect(plOption).toHaveAttribute('data-state', 'checked');
    expect(screen.getByTestId('kangur-language-switcher-option-en')).toHaveAttribute(
      'data-state',
      'unchecked'
    );
  });

  it('displays each locale option with its native label', async () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();

    await screen.findByTestId('kangur-language-switcher-option-pl');
    expect(screen.getByTestId('kangur-language-switcher-option-pl')).toHaveTextContent('Polski');
    expect(screen.getByTestId('kangur-language-switcher-option-en')).toHaveTextContent('English');
    expect(screen.getByTestId('kangur-language-switcher-option-de')).toHaveTextContent('Deutsch');
    expect(screen.getByTestId('kangur-language-switcher-option-uk')).toHaveTextContent('Українська');
  });

  // ─── Locale switching — hard navigation ─────────────────────────────

  it('navigates to the localized href when switching to English', async () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

    expect(setClientCookieMock).toHaveBeenCalledWith(
      'NEXT_LOCALE',
      'en',
      expect.objectContaining({ path: '/' })
    );
    expect(locationAssignSpy).toHaveBeenCalledWith('/en/kangur/lessons');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('sets the NEXT_LOCALE cookie when navigating', async () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

    expect(setClientCookieMock).toHaveBeenCalledWith(
      'NEXT_LOCALE',
      'en',
      expect.objectContaining({ path: '/' })
    );
    expect(locationAssignSpy).toHaveBeenCalledTimes(1);
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('drops the locale prefix when switching back to the default locale (Polish)', async () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/kangur/lessons');

    render(<KangurLanguageSwitcher basePath='/en/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-pl'));

    expect(locationAssignSpy).toHaveBeenCalledWith('/kangur/lessons');
    expect(replaceMock).not.toHaveBeenCalled();
    expect(setClientCookieMock).toHaveBeenCalledWith(
      'NEXT_LOCALE',
      'pl',
      expect.objectContaining({ path: '/' })
    );
  });

  it('preserves search params when switching locale', async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams('mode=solo&difficulty=hard'));

    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-de'));

    expect(locationAssignSpy).toHaveBeenCalledWith(
      '/de/kangur/lessons?mode=solo&difficulty=hard'
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('preserves the URL hash when switching locale', async () => {
    setMockWindowLocation('/kangur/lessons#section-2');

    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

    expect(locationAssignSpy).toHaveBeenCalledWith('/en/kangur/lessons#section-2');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('uses full-document navigation for locale switches', async () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

    expect(locationAssignSpy).toHaveBeenCalledWith('/en/kangur/lessons');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // ─── No-op when selecting the current locale ───────────────────────

  it('does not navigate when selecting the already-active locale', async () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-pl'));

    expect(locationAssignSpy).not.toHaveBeenCalled();
    expect(replaceMock).not.toHaveBeenCalled();
    expect(setClientCookieMock).not.toHaveBeenCalled();
  });

  // ─── Pending state (loading spinner + disabled) ─────────────────────

  it('shows loading UI immediately while a hard locale navigation is in progress', async () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    const trigger = screen.getByTestId('kangur-language-switcher-trigger');
    expect(trigger.querySelector('.animate-spin')).toBeNull();

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

    expect(locationAssignSpy).toHaveBeenCalledWith('/en/kangur/lessons');
    expect(trigger.querySelector('.animate-spin')).not.toBeNull();
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveClass('opacity-70');
  });

  it('recovers if the document does not unload after a hard locale navigation attempt', async () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    const trigger = screen.getByTestId('kangur-language-switcher-trigger');
    openLanguageMenu();
    const englishOption = await screen.findByTestId('kangur-language-switcher-option-en');

    vi.useFakeTimers();
    try {
      fireEvent.click(englishOption);

      expect(trigger).toBeDisabled();
      expect(trigger.querySelector('.animate-spin')).not.toBeNull();

      act(() => {
        vi.advanceTimersByTime(10_000);
      });

      expect(trigger.querySelector('.animate-spin')).toBeNull();
      expect(trigger).toBeEnabled();
      expect(trigger).not.toHaveClass('opacity-70');
    } finally {
      act(() => {
        vi.runOnlyPendingTimers();
      });
      vi.useRealTimers();
    }
  });

  it('shows loading UI while a locale-switch transition from the selector is active', () => {
    routeTransitionStateMock.mockReturnValue({
      activeTransitionKind: 'locale-switch',
      activeTransitionRequestedHref: '/en/kangur/lessons',
      activeTransitionSourceId: 'kangur-language-switcher',
      transitionPhase: 'pending',
    });

    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    const trigger = screen.getByTestId('kangur-language-switcher-trigger');
    expect(trigger.querySelector('.animate-spin')).not.toBeNull();
    expect(trigger).toBeDisabled();
    expect(trigger).toHaveClass('opacity-70');
  });

  // ─── Accessibility ──────────────────────────────────────────────────

  it('renders an aria-live region for screen reader announcements', () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    const liveRegion = document.querySelector('[aria-live="assertive"]');
    expect(liveRegion).toBeInTheDocument();
    expect(liveRegion).toHaveAttribute('role', 'status');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    expect(liveRegion).toHaveClass('sr-only');
  });

  it('announces the target language when a locale switch is initiated', async () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

    const liveRegion = document.querySelector('[aria-live="assertive"]');
    expect(liveRegion).toHaveTextContent('English');
  });

  it('announces the native label of the target locale', async () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-uk'));

    const liveRegion = document.querySelector('[aria-live="assertive"]');
    expect(liveRegion).toHaveTextContent('Українська');
  });

  it('has all flag SVGs marked as aria-hidden', async () => {
    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    await screen.findByTestId('kangur-language-switcher-option-pl');

    const flagContainers = document.querySelectorAll('[aria-hidden="true"] svg, svg[aria-hidden="true"]');
    expect(flagContainers.length).toBeGreaterThanOrEqual(1);
  });

  // ─── Transition-based locale pinning ────────────────────────────────

  it('pins the selected locale label to the transition target during a locale-switch transition', () => {
    localeMock.mockReturnValue('pl');
    pathnameMock.mockReturnValue('/kangur/lessons');
    routeTransitionStateMock.mockReturnValue({
      activeTransitionKind: 'locale-switch',
      activeTransitionRequestedHref: '/en/kangur/lessons',
      activeTransitionSourceId: 'kangur-language-switcher',
      transitionPhase: 'waiting_for_ready',
    });

    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    const trigger = screen.getByTestId('kangur-language-switcher-trigger');
    expect(trigger).toHaveTextContent('English');
  });

  it('does not pin locale when transition source is not the language switcher', () => {
    localeMock.mockReturnValue('pl');
    pathnameMock.mockReturnValue('/kangur/lessons');
    routeTransitionStateMock.mockReturnValue({
      activeTransitionKind: 'locale-switch',
      activeTransitionRequestedHref: '/en/kangur/lessons',
      activeTransitionSourceId: 'other-source',
      transitionPhase: 'waiting_for_ready',
    });

    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    expect(screen.getByTestId('kangur-language-switcher-trigger')).toHaveTextContent('Polski');
  });

  it('does not pin locale when transition kind is not locale-switch', () => {
    localeMock.mockReturnValue('pl');
    pathnameMock.mockReturnValue('/kangur/lessons');
    routeTransitionStateMock.mockReturnValue({
      activeTransitionKind: 'navigation',
      activeTransitionRequestedHref: '/en/kangur/lessons',
      activeTransitionSourceId: 'kangur-language-switcher',
      transitionPhase: 'pending',
    });

    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    expect(screen.getByTestId('kangur-language-switcher-trigger')).toHaveTextContent('Polski');
  });

  // ─── Prefetch warming ───────────────────────────────────────────────

  it('warms the default locale target when opening the menu from a non-default locale', async () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/kangur/lessons');
    const queryClient = { prefetchQuery: vi.fn() };

    render(
      <QueryClientContext.Provider value={queryClient as never}>
        <KangurLanguageSwitcher basePath='/en/kangur' currentPage='Lessons' />
      </QueryClientContext.Provider>
    );

    prefetchMock.mockClear();
    prefetchKangurPageContentStoreMock.mockClear();

    openLanguageMenu();
    await screen.findByRole('menu');

    await waitFor(() => {
      expect(prefetchMock).toHaveBeenCalledTimes(1);
      expect(prefetchMock).toHaveBeenCalledWith('/kangur/lessons');
    });

    expect(prefetchKangurPageContentStoreMock).toHaveBeenCalledTimes(1);
    expect(prefetchKangurPageContentStoreMock).toHaveBeenCalledWith(queryClient, 'pl');
  });

  it('does not warm the default locale when already on the default locale', async () => {
    localeMock.mockReturnValue('pl');
    pathnameMock.mockReturnValue('/kangur/lessons');

    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    prefetchMock.mockClear();
    prefetchKangurPageContentStoreMock.mockClear();

    openLanguageMenu();
    await screen.findByRole('menu');

    expect(prefetchMock).not.toHaveBeenCalled();
    expect(prefetchKangurPageContentStoreMock).not.toHaveBeenCalled();
  });

  it('does not warm locale targets on coarse-pointer devices', async () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/kangur/lessons');
    useKangurCoarsePointerMock.mockReturnValue(true);
    const queryClient = { prefetchQuery: vi.fn() };

    render(
      <QueryClientContext.Provider value={queryClient as never}>
        <KangurLanguageSwitcher basePath='/en/kangur' currentPage='Lessons' />
      </QueryClientContext.Provider>
    );

    prefetchMock.mockClear();
    prefetchKangurPageContentStoreMock.mockClear();

    openLanguageMenu();
    await screen.findByRole('menu');

    expect(prefetchMock).not.toHaveBeenCalled();
    expect(prefetchKangurPageContentStoreMock).not.toHaveBeenCalled();
  });

  // ─── Page-specific href building ───────────────────────────────────

  it('builds the correct localized href for the Game page (uses home href)', async () => {
    pathnameMock.mockReturnValue('/kangur');

    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Game' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

    expect(locationAssignSpy).toHaveBeenCalledWith(expect.stringContaining('/en/'));
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('builds the correct localized href for the Duels page', async () => {
    pathnameMock.mockReturnValue('/kangur/duels');

    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Duels' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-de'));

    expect(locationAssignSpy).toHaveBeenCalledWith('/de/kangur/duels');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('canonicalizes /kangur alias lesson routes when Kangur owns the public frontend', async () => {
    frontendPublicOwnerMock.mockReturnValue({ publicOwner: 'kangur' });
    pathnameMock.mockReturnValue('/kangur/lessons');

    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

    expect(locationAssignSpy).toHaveBeenCalledWith('/en/lessons');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('canonicalizes localized /kangur alias home routes when Kangur owns the public frontend', async () => {
    frontendPublicOwnerMock.mockReturnValue({ publicOwner: 'kangur' });
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/kangur');

    render(<KangurLanguageSwitcher basePath='/en/kangur' currentPage='Game' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-de'));

    expect(locationAssignSpy).toHaveBeenCalledWith('/de');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it('uses the canonical public fallback when pathname is unavailable in the Kangur-owned frontend shell', async () => {
    frontendPublicOwnerMock.mockReturnValue({ publicOwner: 'kangur' });
    pathnameMock.mockReturnValue(null);

    render(<KangurLanguageSwitcher basePath='/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

    expect(locationAssignSpy).toHaveBeenCalledWith('/en/lessons');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // ─── Switching back to default locale (regression test) ─────────────

  it('navigates back to the default locale (Polish) from English', async () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/kangur/lessons');

    render(<KangurLanguageSwitcher basePath='/en/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-pl'));

    expect(setClientCookieMock).toHaveBeenCalledWith(
      'NEXT_LOCALE',
      'pl',
      expect.objectContaining({ path: '/' })
    );
    expect(locationAssignSpy).toHaveBeenCalledWith('/kangur/lessons');
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // ─── Cross-locale switching (non-default to non-default) ───────────

  it('switches between two non-default locales correctly', async () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/kangur/lessons');

    render(<KangurLanguageSwitcher basePath='/en/kangur' currentPage='Lessons' />);

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-de'));

    expect(locationAssignSpy).toHaveBeenCalledWith('/de/kangur/lessons');
    expect(replaceMock).not.toHaveBeenCalled();
    expect(setClientCookieMock).toHaveBeenCalledWith(
      'NEXT_LOCALE',
      'de',
      expect.objectContaining({ path: '/' })
    );
  });
});
