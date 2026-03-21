/**
 * @vitest-environment jsdom
 */

import { QueryClientContext } from '@tanstack/react-query';
import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LabeledOptionDto } from '@/shared/contracts/base';

const { startRouteTransitionMock } = vi.hoisted(() => ({
  startRouteTransitionMock: vi.fn(),
}));

const { routeTransitionStateMock } = vi.hoisted(() => ({
  routeTransitionStateMock: vi.fn(),
}));

const {
  pathnameMock,
  prefetchMock,
  pushMock,
  replaceMock,
  searchParamsMock,
} = vi.hoisted(() => ({
  pathnameMock: vi.fn(),
  prefetchMock: vi.fn(),
  pushMock: vi.fn(),
  replaceMock: vi.fn(),
  searchParamsMock: vi.fn(),
}));

const { optionalAuthMock } = vi.hoisted(() => ({
  optionalAuthMock: vi.fn(),
}));

const { optionalTutorMock } = vi.hoisted(() => ({
  optionalTutorMock: vi.fn(),
}));

const { localeMock } = vi.hoisted(() => ({
  localeMock: vi.fn(),
}));

const { translationMessages } = vi.hoisted(() => ({
  translationMessages: {
    pl: {
      KangurNavigation: {
        home: 'Strona główna',
        lessons: 'Lekcje',
        duels: 'Pojedynki',
        parent: 'Rodzic',
        languageSwitcher: {
          triggerAriaLabel: 'Aktualny język: {language}. Otwórz menu zmiany języka.',
          triggerTitle: 'Język: {language}',
        },
        subject: {
          label: 'Wybierz przedmiot',
          currentTitle: 'Aktualny przedmiot: {subject}',
          dialogDescription: 'Wybierz przedmiot, na którym chcesz się teraz skupić.',
          closeAriaLabel: 'Zamknij wybór przedmiotu',
          groupAriaLabel: 'Wybór przedmiotu',
        },
        ageGroup: {
          label: 'Wybierz grupę wiekową',
          currentTitle: 'Aktualna grupa: {group}',
          dialogDescription: 'Wybierz, dla kogo mają być dopasowane lekcje.',
          closeAriaLabel: 'Zamknij wybór grupy wiekowej',
          groupAriaLabel: 'Wybór grupy wiekowej',
        },
      },
    },
    en: {
      KangurNavigation: {
        home: 'Home page',
        lessons: 'Lessons',
        duels: 'Duels',
        parent: 'Parent',
        languageSwitcher: {
          triggerAriaLabel: 'Current language: {language}. Open language menu.',
          triggerTitle: 'Language: {language}',
        },
        subject: {
          label: 'Choose subject',
          currentTitle: 'Current subject: {subject}',
          dialogDescription: 'Choose the subject you want to focus on now.',
          closeAriaLabel: 'Close subject chooser',
          groupAriaLabel: 'Subject chooser',
        },
        ageGroup: {
          label: 'Choose age group',
          currentTitle: 'Current age group: {group}',
          dialogDescription: 'Choose who the lessons should be tailored for.',
          closeAriaLabel: 'Close age group chooser',
          groupAriaLabel: 'Age group chooser',
        },
      },
    },
    de: {
      KangurNavigation: {
        home: 'Startseite',
        lessons: 'Lektionen',
        duels: 'Duelle',
        parent: 'Eltern',
        languageSwitcher: {
          triggerAriaLabel: 'Aktuelle Sprache: {language}. Sprachmenü öffnen.',
          triggerTitle: 'Sprache: {language}',
        },
        subject: {
          label: 'Fach auswahlen',
          currentTitle: 'Aktuelles Fach: {subject}',
          dialogDescription: 'Wahle das Fach aus, auf das du dich jetzt konzentrieren mochtest.',
          closeAriaLabel: 'Fachauswahl schliessen',
          groupAriaLabel: 'Fachauswahl',
        },
        ageGroup: {
          label: 'Altersgruppe auswahlen',
          currentTitle: 'Aktuelle Gruppe: {group}',
          dialogDescription: 'Wahle aus, fur wen die Lektionen angepasst werden sollen.',
          closeAriaLabel: 'Altersgruppenauswahl schliessen',
          groupAriaLabel: 'Altersgruppenauswahl',
        },
      },
    },
    uk: {
      KangurNavigation: {
        home: 'Головна',
        lessons: 'Уроки',
        duels: 'Дуелі',
        parent: 'Батьки',
        languageSwitcher: {
          triggerAriaLabel: 'Поточна мова: {language}. Відкрити меню мов.',
          triggerTitle: 'Мова: {language}',
        },
        subject: {
          label: 'Вибрати предмет',
          currentTitle: 'Поточний предмет: {subject}',
          dialogDescription: 'Виберіть предмет, на якому хочете зосередитися зараз.',
          closeAriaLabel: 'Закрити вибір предмета',
          groupAriaLabel: 'Вибір предмета',
        },
        ageGroup: {
          label: 'Вибрати вікову групу',
          currentTitle: 'Поточна група: {group}',
          dialogDescription: 'Виберіть, для кого мають бути підібрані уроки.',
          closeAriaLabel: 'Закрити вибір вікової групи',
          groupAriaLabel: 'Вибір вікової групи',
        },
      },
    },
  },
}));

const { useKangurPageContentEntryMock } = vi.hoisted(() => ({
  useKangurPageContentEntryMock: vi.fn(),
}));

const { prefetchKangurPageContentStoreMock } = vi.hoisted(() => ({
  prefetchKangurPageContentStoreMock: vi.fn(),
}));

const { useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));

const { sessionMock } = vi.hoisted(() => ({
  sessionMock: vi.fn(),
}));

const { settingsStoreGetMock } = vi.hoisted(() => ({
  settingsStoreGetMock: vi.fn<(key: string) => string | undefined>(),
}));

const { updateSettingMutateAsyncMock } = vi.hoisted(() => ({
  updateSettingMutateAsyncMock: vi.fn(),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    scroll: _scroll,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; scroll?: boolean }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => pathnameMock(),
  useRouter: () => ({
    back: vi.fn(),
    prefetch: prefetchMock,
    push: pushMock,
    refresh: vi.fn(),
    replace: replaceMock,
  }),
  useSearchParams: () => searchParamsMock(),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => sessionMock(),
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

vi.mock('@/i18n/navigation', () => ({
  Link: ({
    children,
    href,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
  getPathname: vi.fn(),
  permanentRedirect: vi.fn(),
  redirect: vi.fn(),
  usePathname: () => pathnameMock(),
  useRouter: () => ({
    prefetch: prefetchMock,
    push: pushMock,
    replace: replaceMock,
  }),
}));

vi.mock('framer-motion', () => {
  const createMotionTag = (tag: keyof React.JSX.IntrinsicElements) =>
    function MotionTag({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.HTMLAttributes<HTMLElement> & {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }): React.JSX.Element {
      return React.createElement(tag, props, children);
    };

  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      button: createMotionTag('button'),
      div: createMotionTag('div'),
    },
  };
});

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useOptionalKangurRouting: () => null,
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionActions: () => ({
    startRouteTransition: startRouteTransitionMock,
  }),
  useOptionalKangurRouteTransitionState: () => routeTransitionStateMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: () => optionalAuthMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: () => useKangurSubjectFocusMock(),
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useOptionalKangurAiTutor: () => optionalTutorMock(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  prefetchKangurPageContentStore: prefetchKangurPageContentStoreMock,
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/kangur/shared/providers/SettingsStoreProvider')>();
  return {
    ...actual,
    useSettingsStore: () => ({
      get: settingsStoreGetMock,
    }),
  };
});

vi.mock('@/shared/hooks/use-settings', () => ({
  useUpdateSetting: () => ({
    isPending: false,
    mutateAsync: updateSettingMutateAsyncMock,
  }),
}));

vi.mock('@/features/kangur/shared/ui/select-simple', () => ({
  SelectSimple: ({
    ariaLabel,
    disabled,
    onValueChange,
    options,
    value,
  }: {
    ariaLabel?: string;
    disabled?: boolean;
    onValueChange: (value: string) => void;
    options: Array<LabeledOptionDto<string>>;
    value?: string;
  }) => (
    <select
      aria-label={ariaLabel}
      data-testid='mock-select-simple'
      disabled={disabled}
      onChange={(event) => onValueChange(event.target.value)}
      value={value}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));

const setViewport = ({ width, matches }: { width: number; matches: boolean }): void => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

const openLanguageMenu = (trigger?: HTMLElement): void => {
  fireEvent.keyDown(trigger ?? screen.getByTestId('kangur-language-switcher-trigger'), {
    key: 'ArrowDown',
  });
};

import { CmsStorefrontAppearanceProvider } from '@/features/cms/components/frontend/CmsStorefrontAppearance';
import {
  KANGUR_DAILY_THEME_SETTINGS_KEY,
  KANGUR_NIGHTLY_THEME_SETTINGS_KEY,
} from '@/features/kangur/theme-settings';
import { KangurPrimaryNavigation } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import {
  loadPersistedTutorVisibilityHidden,
  persistTutorVisibilityHidden,
} from '@/features/kangur/ui/components/KangurAiTutorWidget.storage';
import { KangurTutorAnchorProvider } from '@/features/kangur/ui/context/KangurTutorAnchorContext';

describe('KangurPrimaryNavigation', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.clearAllMocks();
    routeTransitionStateMock.mockReturnValue(null);
    localeMock.mockReturnValue('pl');
    setViewport({ width: 1024, matches: false });
    pathnameMock.mockReturnValue('/kangur');
    searchParamsMock.mockReturnValue(new URLSearchParams());
    prefetchMock.mockReset();
    replaceMock.mockReset();
    optionalAuthMock.mockReturnValue(null);
    optionalTutorMock.mockReturnValue(null);
    useKangurSubjectFocusMock.mockReturnValue({
      subject: 'maths',
      setSubject: vi.fn(),
      subjectKey: 'learner-1',
    });
    sessionMock.mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });
    settingsStoreGetMock.mockReset();
    settingsStoreGetMock.mockReturnValue(undefined);
    updateSettingMutateAsyncMock.mockReset();
    updateSettingMutateAsyncMock.mockResolvedValue({
      key: KANGUR_DAILY_THEME_SETTINGS_KEY,
      value: 'default',
    });
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: null,
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });
    prefetchKangurPageContentStoreMock.mockReset();
    prefetchKangurPageContentStoreMock.mockResolvedValue(undefined);
    window.sessionStorage.clear();
    document.cookie = 'NEXT_LOCALE=; Max-Age=0; Path=/';
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        ...originalLocation,
        hash: '',
        replace: vi.fn(),
      },
    });
  });

  afterAll(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: originalLocation,
    });
  });

  it('renders the SVG logo inside the home control', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        contentClassName='justify-center'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    const logo = screen.getByTestId('kangur-home-logo');

    expect(logo.querySelector('svg')).not.toBeNull();
    expect(logo.className).not.toContain('translate-x-');
    expect(screen.getByRole('link', { name: /strona główna/i })).toHaveAttribute(
      'href',
      '/kangur'
    );
  });

  it('navigates to the learner profile directly from the profile item', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: /profil/i })).toHaveAttribute(
      'href',
      '/kangur/profile'
    );
  });

  it('starts the Kangur route transition before navigating to another page', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: /lekcje/i }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      acknowledgeMs: 110,
      href: '/kangur/lessons',
      pageKey: 'Lessons',
      sourceId: 'kangur-primary-nav:lessons',
    });
  });

  it('uses the canonical Kangur home route when returning from another page', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: /strona główna/i }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      acknowledgeMs: 110,
      href: '/kangur',
      pageKey: 'Game',
      sourceId: 'kangur-primary-nav:home',
    });
  });

  it('starts the managed handoff when opening the learner profile from the navbar', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('link', { name: /profil/i }));

    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      acknowledgeMs: 110,
      href: '/kangur/profile',
      pageKey: 'LearnerProfile',
      sourceId: 'kangur-primary-nav:profile',
    });
  });

  it('renders the toolbar nav group at full width', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByTestId('kangur-page-top-bar')).toHaveClass('sticky', 'top-0', 'w-full');
    expect(screen.getByRole('navigation', { name: /główna nawigacja kangur/i })).toHaveClass(
      'kangur-nav-group',
      'w-full',
      'p-2'
    );
  });

  it('shows logout as a separate action and calls the logout handler', () => {
    const onLogout = vi.fn();

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Lessons'
        isAuthenticated
        onLogout={onLogout}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /wyloguj/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('fires logout on the first tap from the mobile menu', async () => {
    const onLogout = vi.fn();
    setViewport({ width: 390, matches: true });

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Lessons'
        isAuthenticated
        onLogout={onLogout}
      />
    );

    fireEvent.click(await screen.findByTestId('kangur-primary-nav-mobile-toggle'));
    fireEvent.click(screen.getByRole('button', { name: /wyloguj/i }));

    expect(onLogout).toHaveBeenCalledTimes(1);
  });

  it('disables the logout action while auth logout is already pending', () => {
    const onLogout = vi.fn();
    optionalAuthMock.mockReturnValue({
      authError: null,
      appPublicSettings: null,
      canAccessParentAssignments: true,
      checkAppState: vi.fn(),
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoggingOut: true,
      isLoadingPublicSettings: false,
      logout: vi.fn(),
      navigateToLogin: vi.fn(),
      selectLearner: vi.fn(),
      user: {
        activeLearner: {
          createdAt: '2026-03-08T10:00:00.000Z',
          displayName: 'Maja',
          id: 'learner-2',
          loginName: 'maja',
          ownerUserId: 'parent-1',
          status: 'active',
          updatedAt: '2026-03-08T10:00:00.000Z',
        },
        actorType: 'learner',
        canManageLearners: false,
        email: 'maja@example.com',
        full_name: 'Maja',
        id: 'learner-2',
        learners: [],
        ownerUserId: 'parent-1',
        role: 'user',
      },
    });

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Lessons'
        isAuthenticated
        onLogout={onLogout}
      />
    );

    const logoutButton = screen.getByTestId('kangur-primary-nav-logout');

    expect(logoutButton).toBeDisabled();
    expect(logoutButton).toHaveTextContent('Wylogowywanie...');

    fireEvent.click(logoutButton);

    expect(onLogout).not.toHaveBeenCalled();
  });

  it('renders storefront appearance controls inside the Kangur navbar and updates the mode', () => {
    render(
      <CmsStorefrontAppearanceProvider initialMode='default'>
        <KangurPrimaryNavigation
          basePath='/kangur'
          currentPage='Lessons'
          isAuthenticated
          onLogout={vi.fn()}
        />
      </CmsStorefrontAppearanceProvider>
    );

    const utilityActions = screen.getByTestId('kangur-primary-nav-utility-actions');
    const themeToggleButton = screen.getByRole('button', { name: 'Switch to Dawn theme' });

    expect(utilityActions).toContainElement(
      screen.getByTestId('kangur-primary-nav-appearance-controls')
    );

    fireEvent.click(themeToggleButton);

    expect(screen.getByRole('button', { name: 'Switch to Sunset theme' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Sunset theme' }));

    expect(screen.getByRole('button', { name: 'Switch to Nightly theme' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Nightly theme' }));

    expect(screen.getByRole('button', { name: 'Switch to Daily theme' })).toBeInTheDocument();
  });

  it('renders the language switcher inside the utility actions and marks the current locale', async () => {
    localeMock.mockReturnValue('de');
    pathnameMock.mockReturnValue('/de/lessons');

    render(
      <KangurPrimaryNavigation
        basePath='/de'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    const utilityActions = screen.getByTestId('kangur-primary-nav-utility-actions');
    const trigger = screen.getByTestId('kangur-language-switcher-trigger');

    expect(utilityActions).toContainElement(trigger);

    openLanguageMenu(trigger);

    const activeOption = await screen.findByTestId('kangur-language-switcher-option-de');

    expect(activeOption).toHaveAttribute('data-state', 'checked');
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('switches to a non-default locale while preserving search params', async () => {
    localeMock.mockReturnValue('pl');
    pathnameMock.mockReturnValue('/lessons');
    searchParamsMock.mockReturnValue(new URLSearchParams('mode=solo&difficulty=hard'));

    render(
      <KangurPrimaryNavigation
        basePath='/'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    prefetchMock.mockClear();
    openLanguageMenu();
    expect(prefetchMock).not.toHaveBeenCalled();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-en'));

    expect(prefetchMock).toHaveBeenCalledTimes(1);
    expect(prefetchMock).toHaveBeenCalledWith('/en/lessons?mode=solo&difficulty=hard');
    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/lessons?mode=solo&difficulty=hard',
      pageKey: 'Lessons',
      sourceId: 'kangur-language-switcher',
      transitionKind: 'locale-switch',
    });
    expect(replaceMock).toHaveBeenCalledWith('/en/lessons?mode=solo&difficulty=hard', {
      scroll: false,
    });
    expect(document.cookie).toContain('NEXT_LOCALE=en');
  });

  it('drops the locale prefix when switching back to the default locale', async () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/duels');

    render(
      <KangurPrimaryNavigation
        basePath='/en'
        currentPage='Duels'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    prefetchMock.mockClear();
    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-pl'));

    expect(prefetchMock).toHaveBeenCalledWith('/duels');
    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/duels',
      pageKey: 'Duels',
      sourceId: 'kangur-language-switcher',
      transitionKind: 'locale-switch',
    });
    expect(replaceMock).toHaveBeenCalledWith('/duels', { scroll: false });
  });

  it('forces a document replace when switching back to Polish from an unprefixed English lessons route', async () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/lessons');

    render(
      <KangurPrimaryNavigation
        basePath='/'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    prefetchMock.mockClear();
    replaceMock.mockClear();

    openLanguageMenu();
    fireEvent.click(await screen.findByTestId('kangur-language-switcher-option-pl'));

    expect(replaceMock).not.toHaveBeenCalled();
    expect(window.location.replace).toHaveBeenCalledWith('/lessons');
    expect(document.cookie).toContain('NEXT_LOCALE=pl');
  });

  it('warms the default locale target when opening the menu from a non-default locale', async () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/lessons');
    const queryClient = { prefetchQuery: vi.fn() };

    render(
      <QueryClientContext.Provider value={queryClient as never}>
        <KangurPrimaryNavigation
          basePath='/en'
          currentPage='Lessons'
          isAuthenticated
          onLogout={vi.fn()}
        />
      </QueryClientContext.Provider>
    );

    prefetchMock.mockClear();
    prefetchKangurPageContentStoreMock.mockClear();

    openLanguageMenu();
    await screen.findByRole('menu');

    await waitFor(() => {
      expect(prefetchMock).toHaveBeenCalledTimes(1);
      expect(prefetchMock).toHaveBeenCalledWith('/lessons');
    });

    expect(prefetchKangurPageContentStoreMock).toHaveBeenCalledTimes(1);
    expect(prefetchKangurPageContentStoreMock).toHaveBeenCalledWith(queryClient, 'pl');
  });

  it('warms the locale route and page content only once before switching', async () => {
    localeMock.mockReturnValue('pl');
    pathnameMock.mockReturnValue('/lessons');
    const queryClient = { prefetchQuery: vi.fn() };

    render(
      <QueryClientContext.Provider value={queryClient as never}>
        <KangurPrimaryNavigation
          basePath='/'
          currentPage='Lessons'
          isAuthenticated
          onLogout={vi.fn()}
        />
      </QueryClientContext.Provider>
    );

    openLanguageMenu();
    const englishOption = await screen.findByTestId('kangur-language-switcher-option-en');
    prefetchMock.mockClear();
    prefetchKangurPageContentStoreMock.mockClear();

    fireEvent.mouseEnter(englishOption);
    fireEvent.focus(englishOption);
    fireEvent.click(englishOption);

    expect(prefetchMock).toHaveBeenCalledTimes(1);
    expect(prefetchMock).toHaveBeenCalledWith('/en/lessons');
    expect(prefetchKangurPageContentStoreMock).toHaveBeenCalledTimes(1);
    expect(prefetchKangurPageContentStoreMock).toHaveBeenCalledWith(queryClient, 'en');
    expect(startRouteTransitionMock).toHaveBeenCalledWith({
      href: '/en/lessons',
      pageKey: 'Lessons',
      sourceId: 'kangur-language-switcher',
      transitionKind: 'locale-switch',
    });
  });

  it('keeps the language trigger enabled after the locale route has committed', () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/lessons');
    routeTransitionStateMock.mockReturnValue({
      activeTransitionKind: 'locale-switch',
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      activeTransitionSourceId: 'kangur-language-switcher',
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteRevealing: false,
      isRouteWaitingForReady: true,
      pendingPageKey: null,
      transitionPhase: 'waiting_for_ready',
    });

    render(
      <KangurPrimaryNavigation
        basePath='/en'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByTestId('kangur-language-switcher-trigger')).toBeEnabled();
  });

  it('pins the language switcher to the pending target locale until the new locale route mounts', async () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/lessons');
    routeTransitionStateMock.mockReturnValue({
      activeTransitionKind: 'locale-switch',
      activeTransitionPageKey: 'Lessons',
      activeTransitionRequestedHref: '/de/lessons',
      activeTransitionSkeletonVariant: 'lessons-library',
      activeTransitionSourceId: 'kangur-language-switcher',
      isRouteAcknowledging: false,
      isRoutePending: false,
      isRouteRevealing: false,
      isRouteWaitingForReady: true,
      pendingPageKey: null,
      transitionPhase: 'waiting_for_ready',
    });

    render(
      <KangurPrimaryNavigation
        basePath='/en'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    const trigger = screen.getByTestId('kangur-language-switcher-trigger');

    expect(trigger).toHaveTextContent('Deutsch');
    expect(trigger).toHaveAttribute('title', 'Language: Deutsch');

    openLanguageMenu(trigger);

    const activeOption = await screen.findByTestId('kangur-language-switcher-option-de');

    expect(activeOption).toHaveAttribute('data-state', 'checked');
    expect(screen.getByTestId('kangur-language-switcher-option-en')).toHaveAttribute(
      'data-state',
      'unchecked'
    );
  });

  it('translates the desktop section labels and chooser copy for English locale', () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/lessons');

    render(
      <KangurPrimaryNavigation
        basePath='/en'
        canManageLearners
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: 'Home page' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lessons' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Duels' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Parent' })).toBeInTheDocument();

    const subjectButton = screen.getByRole('button', { name: 'Choose subject' });
    const ageGroupButton = screen.getByRole('button', { name: 'Choose age group' });

    expect(subjectButton).toHaveAttribute('title', 'Current subject: Maths');
    expect(ageGroupButton).toHaveAttribute('title', 'Current age group: Age 10');
  });

  it('translates the mobile section labels for German locale', async () => {
    setViewport({ width: 390, matches: true });
    localeMock.mockReturnValue('de');
    pathnameMock.mockReturnValue('/de/lessons');

    render(
      <KangurPrimaryNavigation
        basePath='/de'
        canManageLearners
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(await screen.findByTestId('kangur-primary-nav-mobile-toggle'));

    expect(screen.getByRole('link', { name: 'Startseite' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Lektionen' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Duelle' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Eltern' })).toBeInTheDocument();
  });

  it('uses theme-aware language menu colors and keeps the menu container clipped', async () => {
    localeMock.mockReturnValue('en');
    pathnameMock.mockReturnValue('/en/lessons');

    render(
      <CmsStorefrontAppearanceProvider initialMode='dark'>
        <KangurPrimaryNavigation
          basePath='/en'
          currentPage='Lessons'
          isAuthenticated
          onLogout={vi.fn()}
        />
      </CmsStorefrontAppearanceProvider>
    );

    openLanguageMenu();

    const menu = await screen.findByTestId('kangur-language-switcher-menu');
    const menuContainer = await screen.findByTestId('kangur-language-switcher-menu-container');
    const options = await screen.findByTestId('kangur-language-switcher-options');
    const polishOption = await screen.findByTestId('kangur-language-switcher-option-pl');
    const germanOption = await screen.findByTestId('kangur-language-switcher-option-de');
    const option = await screen.findByTestId('kangur-language-switcher-option-en');
    const optionLabel = within(option).getByText('English');

    expect(menu.style.getPropertyValue('--kangur-language-menu-bg')).toBe('#1a1f38');
    expect(menu.style.getPropertyValue('--kangur-language-menu-text')).toBe('#f8fafc');
    expect(menu.style.getPropertyValue('--kangur-language-menu-hover-text')).toBe('');
    expect(menu.style.getPropertyValue('--kangur-language-menu-active-text')).toBe('');
    expect(menu.style.overflow).toBe('hidden');
    expect(menu.className).toContain('w-fit');
    expect(menu.className).not.toContain('min-w-[13rem]');
    expect(menuContainer).toHaveClass('rounded-[20px]', 'p-1');
    expect(options).toHaveClass('flex', 'flex-col', 'gap-1.5');
    expect(option.className).toContain('cursor-pointer');
    expect(option.className).toContain('data-[state=checked]:cursor-default');
    expect(option.className).toContain('py-2.5');
    expect(option.className).toContain('pl-3.5');
    expect(option.className).toContain('[color:var(--kangur-language-menu-text)]');
    expect(option.className).toContain('data-[highlighted]:[color:var(--kangur-language-menu-text)]');
    expect(option.className).toContain('data-[state=checked]:[color:var(--kangur-language-menu-text)]');
    expect(option.className).toContain('[&>span:first-child]:hidden');
    expect(option.className).not.toContain('hover:[color:var(--kangur-language-menu-hover-text)]');
    expect(option.className).not.toContain('focus:[color:var(--kangur-language-menu-hover-text)]');
    expect(option.className).not.toContain(
      'data-[state=checked]:[color:var(--kangur-language-menu-active-text)]'
    );
    expect(option.className).not.toContain('text-[11px]');
    expect(option.className).not.toContain('text-slate-');
    expect(optionLabel).toHaveStyle({ color: 'var(--kangur-language-menu-text)' });
    expect(within(polishOption).queryByText('Polish')).toBeNull();
    expect(within(germanOption).queryByText('German')).toBeNull();
  });

  it('locks the language dropdown visual contract across the trigger and every locale row', async () => {
    localeMock.mockReturnValue('pl');
    pathnameMock.mockReturnValue('/lessons');

    render(
      <KangurPrimaryNavigation
        basePath='/'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    const trigger = screen.getByTestId('kangur-language-switcher-trigger');
    const triggerLabel = within(trigger).getByText('Polski');
    const triggerFlagShell = trigger.querySelector('span[aria-hidden="true"]');
    const triggerChevron = trigger.querySelector('svg.lucide-chevron-down');

    expect(trigger).toHaveClass(
      'min-w-[8.75rem]',
      'shrink-0',
      'overflow-hidden',
      'gap-2',
      'px-3'
    );
    expect(trigger.className).not.toContain('sm:w-[11rem]');
    expect(trigger).toHaveAttribute('title', 'Język: Polski');
    expect(triggerLabel).toHaveClass('flex-1', 'truncate', 'text-sm', 'font-semibold');
    expect(triggerFlagShell).not.toBeNull();
    expect(triggerFlagShell).toHaveClass('h-[1.15rem]', 'w-[1.7rem]', 'rounded-[6px]');
    expect(triggerFlagShell?.querySelector('svg')).not.toBeNull();
    expect(triggerChevron).not.toBeNull();
    expect(triggerChevron).not.toHaveClass('ml-auto');

    openLanguageMenu(trigger);

    const menu = await screen.findByTestId('kangur-language-switcher-menu');
    const menuContainer = await screen.findByTestId('kangur-language-switcher-menu-container');
    const options = await screen.findByTestId('kangur-language-switcher-options');
    const rows = [
      await screen.findByTestId('kangur-language-switcher-option-pl'),
      await screen.findByTestId('kangur-language-switcher-option-en'),
      await screen.findByTestId('kangur-language-switcher-option-de'),
      await screen.findByTestId('kangur-language-switcher-option-uk'),
    ];
    const labels = ['Polski', 'English', 'Deutsch', 'Українська'] as const;

    expect(menu).toHaveClass(
      'w-fit',
      'max-w-[calc(100vw-1rem)]',
      'overflow-hidden',
      'rounded-[26px]',
      'p-2'
    );
    expect(menuContainer).toHaveClass('rounded-[20px]', 'p-1');
    expect(options).toHaveClass('flex', 'flex-col', 'gap-1.5');
    expect(rows).toHaveLength(labels.length);
    expect(rows.map((row) => row.textContent?.trim())).toEqual(labels);

    rows.forEach((row, index) => {
      const label = within(row).getByText(labels[index]);
      const flagShell = row.querySelector('div > span[aria-hidden="true"]');

      expect(row).toHaveClass(
        'min-h-[3.1rem]',
        'rounded-[18px]',
        'py-2.5',
        'pl-3.5',
        'pr-3.5',
        'text-left'
      );
      expect(row.className).toContain('cursor-pointer');
      expect(row.className).toContain('data-[state=checked]:cursor-default');
      expect(row.className).toContain('[&>span:first-child]:hidden');
      expect(flagShell).not.toBeNull();
      expect(flagShell).toHaveClass('h-5', 'w-7', 'rounded-[7px]');
      expect(flagShell?.querySelector('svg')).not.toBeNull();
      expect(label).toHaveClass('truncate', 'text-sm', 'font-semibold');
      expect(label).toHaveStyle({ color: 'var(--kangur-language-menu-text)' });
    });

    expect(rows[0]).toHaveAttribute('data-state', 'checked');
    expect(within(rows[0]).queryByText('Polish')).toBeNull();
    expect(within(rows[1]).queryByText('English')).not.toBeNull();
    expect(within(rows[2]).queryByText('German')).toBeNull();
    expect(within(rows[3]).queryByText('Ukrainian')).toBeNull();
  });

  it('places the language selector left of the appearance toggle in the mobile menu header', async () => {
    setViewport({ width: 390, matches: true });

    render(
      <CmsStorefrontAppearanceProvider initialMode='default'>
        <KangurPrimaryNavigation
          basePath='/kangur'
          currentPage='Lessons'
          isAuthenticated
          onLogout={vi.fn()}
        />
      </CmsStorefrontAppearanceProvider>
    );

    fireEvent.click(await screen.findByTestId('kangur-primary-nav-mobile-toggle'));

    const header = screen.getByTestId('kangur-primary-nav-mobile-header');
    const headerActions = screen.getByTestId('kangur-primary-nav-mobile-header-actions');
    const utilityActions = screen.getByTestId('kangur-primary-nav-utility-actions');
    const mobileMenuDialog = screen.getByRole('dialog');
    const headerScope = within(header);
    const trigger = within(headerActions).getByTestId('kangur-language-switcher-trigger');
    const themeToggle = headerScope.getByRole('button', { name: 'Switch to Dawn theme' });

    expect(trigger).toBeInTheDocument();
    expect(themeToggle).toBeInTheDocument();
    expect(headerActions.firstElementChild).toBe(trigger);
    expect(headerActions).toContainElement(trigger);
    expect(headerActions).toContainElement(themeToggle);
    expect(mobileMenuDialog.className).toContain(
      'var(--kangur-mobile-bottom-clearance,env(safe-area-inset-bottom))+32px'
    );
    expect(within(utilityActions).queryByTestId('kangur-language-switcher-trigger')).toBeNull();
    expect(headerScope.getByRole('button', { name: /zamknij menu/i })).toBeInTheDocument();
  });

  it('keeps the parent dashboard and logout actions inside the navbar and aligned right', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        canManageLearners
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    const utilityActions = screen.getByTestId('kangur-primary-nav-utility-actions');
    const nav = screen.getByRole('navigation', { name: /główna nawigacja kangur/i });

    expect(utilityActions).toHaveClass('ml-auto', 'justify-end');
    expect(nav).toContainElement(utilityActions);
    expect(utilityActions).toContainElement(
      screen.getByTestId('kangur-primary-nav-parent-dashboard')
    );
    expect(utilityActions).toContainElement(screen.getByTestId('kangur-primary-nav-logout'));
    expect(nav).toContainElement(screen.getByTestId('kangur-primary-nav-parent-dashboard'));
  });

  it('does not split the parent dashboard and logout actions into a separate top-bar cluster', () => {
    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        canManageLearners
        currentPage='ParentDashboard'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.queryByTestId('kangur-page-top-bar-right')).toBeNull();
    expect(screen.getByRole('navigation', { name: /główna nawigacja kangur/i })).toContainElement(
      screen.getByTestId('kangur-primary-nav-utility-actions')
    );
  });

  it('hides the profile link for parent accounts without an active learner', () => {
    optionalAuthMock.mockReturnValue({
      authError: null,
      appPublicSettings: null,
      canAccessParentAssignments: false,
      checkAppState: vi.fn(),
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      logout: vi.fn(),
      navigateToLogin: vi.fn(),
      selectLearner: vi.fn(),
      user: {
        activeLearner: null,
        actorType: 'parent',
        canManageLearners: true,
        email: 'parent@example.com',
        full_name: 'Rodzic',
        id: 'parent-1',
        learners: [],
        ownerUserId: 'parent-1',
        ownerEmailVerified: true,
        role: 'user',
      },
    });

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.queryByRole('link', { name: /profil/i })).toBeNull();
  });

  it('shows the active learner name in the profile label for parent accounts', () => {
    optionalAuthMock.mockReturnValue({
      authError: null,
      appPublicSettings: null,
      canAccessParentAssignments: true,
      checkAppState: vi.fn(),
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      logout: vi.fn(),
      navigateToLogin: vi.fn(),
      selectLearner: vi.fn(),
      user: {
        activeLearner: {
          createdAt: '2026-03-08T10:00:00.000Z',
          displayName: 'Maja',
          id: 'learner-2',
          loginName: 'maja',
          ownerUserId: 'parent-1',
          status: 'active',
          updatedAt: '2026-03-08T10:00:00.000Z',
        },
        actorType: 'parent',
        canManageLearners: true,
        email: 'parent@example.com',
        full_name: 'Rodzic',
        id: 'parent-1',
        learners: [],
        ownerUserId: 'parent-1',
        ownerEmailVerified: true,
        role: 'user',
      },
    });

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('link', { name: 'Profil Maja' })).toHaveAttribute(
      'href',
      '/kangur/profile'
    );
  });

  it('shows login and create-account actions when the user is not authenticated', () => {
    const onLogin = vi.fn();
    const onCreateAccount = vi.fn();
    const onGuestPlayerNameChange = vi.fn();

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        guestPlayerName='Ala'
        isAuthenticated={false}
        onCreateAccount={onCreateAccount}
        onGuestPlayerNameChange={onGuestPlayerNameChange}
        onLogin={onLogin}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Ala' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ala' }));
    fireEvent.change(screen.getByPlaceholderText('Wpisz imię gracza...'), {
      target: { value: 'Ola' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('Wpisz imię gracza...'), {
      key: 'Enter',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Utwórz konto' }));
    fireEvent.click(screen.getByRole('button', { name: /zaloguj się/i }));

    expect(onGuestPlayerNameChange).toHaveBeenCalledWith('Ola');
    expect(onCreateAccount).toHaveBeenCalledTimes(1);
    expect(onLogin).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Ala' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /profil/i })).toBeNull();
  });

  it('registers tutor anchors on the anonymous auth actions', () => {
    render(
      <KangurTutorAnchorProvider>
        <KangurPrimaryNavigation
          basePath='/kangur'
          currentPage='Game'
          guestPlayerName='Ala'
          isAuthenticated={false}
          onCreateAccount={vi.fn()}
          onGuestPlayerNameChange={vi.fn()}
          onLogin={vi.fn()}
          onLogout={vi.fn()}
        />
      </KangurTutorAnchorProvider>
    );

    expect(screen.getByTestId('kangur-primary-nav-login')).toHaveAttribute(
      'data-kangur-tutor-anchor-kind',
      'login_action'
    );
    expect(screen.getByTestId('kangur-primary-nav-create-account')).toHaveAttribute(
      'data-kangur-tutor-anchor-kind',
      'create_account_action'
    );
    expect(screen.getByTestId('kangur-primary-nav-login')).toHaveAttribute(
      'data-kangur-tutor-anchor-surface',
      'auth'
    );
  });

  it('uses Mongo-backed labels on the anonymous auth actions when available', () => {
    useKangurPageContentEntryMock.mockImplementation((entryId: string) => ({
      data: undefined,
      entry:
        entryId === 'shared-nav-create-account-action'
          ? {
              id: 'shared-nav-create-account-action',
              title: 'Utwórz konto',
              summary: 'Załóż konto rodzica bez opuszczania tej strony.',
            }
          : {
              id: 'shared-nav-login-action',
              title: 'Zaloguj się',
              summary: 'Otwórz logowanie rodzica lub ucznia z bieżącej strony.',
            },
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    }));

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        guestPlayerName='Ala'
        isAuthenticated={false}
        onCreateAccount={vi.fn()}
        onGuestPlayerNameChange={vi.fn()}
        onLogin={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    expect(screen.getByRole('button', { name: 'Utwórz konto' })).toHaveAttribute(
      'title',
      'Załóż konto rodzica bez opuszczania tej strony.'
    );
    expect(screen.getByRole('button', { name: 'Zaloguj się' })).toHaveAttribute(
      'title',
      'Otwórz logowanie rodzica lub ucznia z bieżącej strony.'
    );
  });

  it('hides the toggle action in the primary nav when the tutor is hidden locally', () => {
    optionalTutorMock.mockReturnValue({
      enabled: true,
      openChat: vi.fn(),
    });
    persistTutorVisibilityHidden(true);

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.queryByTestId('kangur-ai-tutor-toggle')).toBeNull();
  });

  it('keeps the toggle action hidden even when the current tutor surface is unavailable', () => {
    optionalTutorMock.mockReturnValue({
      enabled: false,
      openChat: vi.fn(),
      tutorSettings: {
        enabled: true,
      },
    });
    persistTutorVisibilityHidden(true);

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        contentClassName='justify-center'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.queryByTestId('kangur-ai-tutor-toggle')).toBeNull();
  });

  it('does not render the toggle action inside the main nav group when the tutor is hidden locally', () => {
    optionalTutorMock.mockReturnValue({
      enabled: true,
      openChat: vi.fn(),
      tutorSettings: {
        enabled: true,
      },
    });
    persistTutorVisibilityHidden(true);

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        contentClassName='justify-center'
        currentPage='Game'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.queryByTestId('kangur-ai-tutor-toggle')).toBeNull();
  });

  it('collapses the guest name input on blur and reopens it on click', () => {
    const onGuestPlayerNameChange = vi.fn();

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        currentPage='Game'
        guestPlayerName='Ola'
        isAuthenticated={false}
        onCreateAccount={vi.fn()}
        onGuestPlayerNameChange={onGuestPlayerNameChange}
        onLogin={vi.fn()}
        onLogout={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ola' }));
    fireEvent.blur(screen.getByPlaceholderText('Wpisz imię gracza...'));

    expect(screen.getByRole('button', { name: 'Ola' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Ola' }));

    expect(screen.getByPlaceholderText('Wpisz imię gracza...')).toBeInTheDocument();
  });

  it('hides the parent dashboard link when auth resolves a student session', () => {
    optionalAuthMock.mockReturnValue({
      authError: null,
      appPublicSettings: null,
      canAccessParentAssignments: true,
      checkAppState: vi.fn(),
      isAuthenticated: true,
      isLoadingAuth: false,
      isLoadingPublicSettings: false,
      logout: vi.fn(),
      navigateToLogin: vi.fn(),
      selectLearner: vi.fn(),
      user: {
        activeLearner: {
          createdAt: '2026-03-08T10:00:00.000Z',
          displayName: 'Ola',
          id: 'learner-1',
          loginName: 'ola',
          ownerUserId: 'parent-1',
          status: 'active',
          updatedAt: '2026-03-08T10:00:00.000Z',
        },
        actorType: 'learner',
        canManageLearners: false,
        email: null,
        full_name: 'Ola',
        id: 'learner-1',
        learners: [],
        ownerUserId: 'parent-1',
        role: 'user',
      },
    });

    render(
      <KangurPrimaryNavigation
        basePath='/kangur'
        canManageLearners
        currentPage='Lessons'
        isAuthenticated
        onLogout={vi.fn()}
      />
    );

    expect(screen.queryByTestId('kangur-primary-nav-parent-dashboard')).toBeNull();
    expect(screen.getByRole('link', { name: 'Profil Ola' })).toBeInTheDocument();
  });
});
