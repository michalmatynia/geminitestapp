/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { afterAll, beforeEach, vi } from 'vitest';

import type { LabeledOptionDto } from '@/shared/contracts/base';

const { startRouteTransitionMock } = vi.hoisted(() => ({
  startRouteTransitionMock: vi.fn(),
}));

const { routeTransitionStateMock } = vi.hoisted(() => ({
  routeTransitionStateMock: vi.fn(),
}));

const { frontendPublicOwnerMock } = vi.hoisted(() => ({
  frontendPublicOwnerMock: vi.fn(),
}));

const { locationAssignSpy } = vi.hoisted(() => ({
  locationAssignSpy: vi.fn(),
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

const { optionalRoutingMock } = vi.hoisted(() => ({
  optionalRoutingMock: vi.fn(),
}));

const { localeMock } = vi.hoisted(() => ({
  localeMock: vi.fn(),
}));

const { useKangurCoarsePointerMock } = vi.hoisted(() => ({
  useKangurCoarsePointerMock: vi.fn(),
}));

const { translationMessages } = vi.hoisted(() => ({
  translationMessages: {
    pl: {
      KangurNavigation: {
        home: 'Strona główna',
        lessons: 'Lekcje',
        duels: 'Pojedynki',
        parent: 'Rodzic',
        parentDashboard: 'Panel rodzica',
        languageSwitcher: {
          triggerAriaLabel: 'Aktualny język: {language}. Otwórz menu zmiany języka.',
          triggerTitle: 'Język: {language}',
        },
        mobileMenu: {
          open: 'Otwórz menu',
          close: 'Zamknij menu',
          title: 'Menu Kangur',
          description:
            'Użyj klawisza Tab, aby przechodzić między opcjami nawigacji, a Escape, aby zamknąć menu.',
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
        parentDashboard: 'Parent dashboard',
        languageSwitcher: {
          triggerAriaLabel: 'Current language: {language}. Open language menu.',
          triggerTitle: 'Language: {language}',
        },
        mobileMenu: {
          open: 'Open menu',
          close: 'Close menu',
          title: 'Kangur menu',
          description: 'Use Tab to move through the navigation options and Escape to close the menu.',
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
        parentDashboard: 'Elternbereich',
        languageSwitcher: {
          triggerAriaLabel: 'Aktuelle Sprache: {language}. Sprachmenü öffnen.',
          triggerTitle: 'Sprache: {language}',
        },
        mobileMenu: {
          open: 'Menü öffnen',
          close: 'Menü schließen',
          title: 'Kangur-Menü',
          description:
            'Verwende Tab, um durch die Navigationsoptionen zu wechseln, und Escape, um das Menü zu schließen.',
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
        parentDashboard: 'Панель батьків',
        languageSwitcher: {
          triggerAriaLabel: 'Поточна мова: {language}. Відкрити меню мов.',
          triggerTitle: 'Мова: {language}',
        },
        mobileMenu: {
          open: 'Відкрити меню',
          close: 'Закрити меню',
          title: 'Меню Kangur',
          description:
            'Використовуйте Tab, щоб переходити між параметрами навігації, і Escape, щоб закрити меню.',
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

const { prefetchKangurLessonsCatalogMock } = vi.hoisted(() => ({
  prefetchKangurLessonsCatalogMock: vi.fn(),
}));

const { useKangurSubjectFocusMock } = vi.hoisted(() => ({
  useKangurSubjectFocusMock: vi.fn(),
}));

const { ageGroupState } = vi.hoisted(() => ({
  ageGroupState: {
    value: 'ten_year_old' as 'six_year_old' | 'ten_year_old' | 'grown_ups',
  },
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
    prefetch: _prefetch,
    scroll: _scroll,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    prefetch?: boolean;
    scroll?: boolean;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock('next/navigation', () => ({
  usePathname: (): string => pathnameMock() as string,
  useRouter: () => ({
    back: vi.fn(),
    prefetch: prefetchMock,
    push: pushMock,
    refresh: vi.fn(),
    replace: replaceMock,
  }),
  useSearchParams: (): URLSearchParams => searchParamsMock() as URLSearchParams,
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: (): unknown => sessionMock() as unknown,
}));

vi.mock('next-intl', () => ({
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useLocale: (): string => localeMock() as string,
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const locale = (localeMock() as string | undefined) || 'pl';
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
  usePathname: (): string => pathnameMock() as string,
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
  useOptionalKangurRouting: (): unknown => optionalRoutingMock() as unknown,
}));

vi.mock('@/features/kangur/ui/context/KangurRouteTransitionContext', () => ({
  useOptionalKangurRouteTransitionActions: () => ({
    startRouteTransition: startRouteTransitionMock,
  }),
  useOptionalKangurRouteTransitionState: (): unknown => routeTransitionStateMock() as unknown,
}));

vi.mock('@/features/kangur/ui/FrontendPublicOwnerContext', () => ({
  useOptionalFrontendPublicOwner: (): unknown => frontendPublicOwnerMock() as unknown,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useOptionalKangurAuth: (): unknown => optionalAuthMock() as unknown,
}));

vi.mock('@/features/kangur/ui/context/KangurSubjectFocusContext', () => ({
  useKangurSubjectFocus: (): unknown => useKangurSubjectFocusMock() as unknown,
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => ({
    ageGroup: ageGroupState.value,
    setAgeGroup: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAiTutorContext', () => ({
  useOptionalKangurAiTutor: (): unknown => optionalTutorMock() as unknown,
  useKangurAiTutorDeferredActivationBridge: vi.fn(),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: (): boolean => useKangurCoarsePointerMock() as boolean,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  prefetchKangurPageContentStore: prefetchKangurPageContentStoreMock,
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonsCatalog', () => ({
  prefetchKangurLessonsCatalog: prefetchKangurLessonsCatalogMock,
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

export const setViewport = ({ width, matches }: { width: number; matches: boolean }): void => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
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

export const openLanguageMenu = async (trigger?: HTMLElement): Promise<void> => {
  fireEvent.keyDown(trigger ?? await screen.findByTestId('kangur-language-switcher-trigger'), {
    key: 'ArrowDown',
  });
};

import { KANGUR_DAILY_THEME_SETTINGS_KEY } from '@/features/kangur/appearance/theme-settings';
export let CmsStorefrontAppearanceProvider: typeof import('@/features/cms/public').CmsStorefrontAppearanceProvider;
export let KangurPrimaryNavigation: typeof import('@/features/kangur/ui/components/KangurPrimaryNavigation').KangurPrimaryNavigation;
export let persistTutorVisibilityHidden: typeof import('@/features/kangur/ui/components/KangurAiTutorWidget.storage').persistTutorVisibilityHidden;
export let KangurTutorAnchorProvider: typeof import('@/features/kangur/ui/context/KangurTutorAnchorContext').KangurTutorAnchorProvider;

let sharedKangurPrimaryNavigationTestImportsPromise: Promise<void> | null = null;

const loadKangurPrimaryNavigationTestImports = async (): Promise<void> => {
  if (sharedKangurPrimaryNavigationTestImportsPromise) {
    return sharedKangurPrimaryNavigationTestImportsPromise;
  }

  sharedKangurPrimaryNavigationTestImportsPromise = (async () => {
    ({ CmsStorefrontAppearanceProvider } = await import('@/features/cms/public'));
    ({ KangurPrimaryNavigation } = await import('@/features/kangur/ui/components/KangurPrimaryNavigation'));
    ({ persistTutorVisibilityHidden } = await import('@/features/kangur/ui/components/KangurAiTutorWidget.storage'));
    ({ KangurTutorAnchorProvider } = await import('@/features/kangur/ui/context/KangurTutorAnchorContext'));
  })();

  return sharedKangurPrimaryNavigationTestImportsPromise;
};

export const setupKangurPrimaryNavigationTest = () => {
  const originalLocation = window.location;

  beforeEach(async () => {
    vi.clearAllMocks();
    await loadKangurPrimaryNavigationTestImports();
    ageGroupState.value = 'ten_year_old';
    routeTransitionStateMock.mockReturnValue(null);
    frontendPublicOwnerMock.mockReturnValue(null);
    localeMock.mockReturnValue('pl');
    useKangurCoarsePointerMock.mockReturnValue(true);
    setViewport({ width: 1024, matches: false });
    pathnameMock.mockReturnValue('/kangur');
    searchParamsMock.mockReturnValue(new URLSearchParams());
    prefetchMock.mockReset();
    replaceMock.mockReset();
    optionalAuthMock.mockReturnValue(null);
    optionalRoutingMock.mockReturnValue(null);
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
    prefetchKangurLessonsCatalogMock.mockReset();
    prefetchKangurLessonsCatalogMock.mockResolvedValue(undefined);
    locationAssignSpy.mockReset();
    window.sessionStorage.clear();
    document.cookie = 'NEXT_LOCALE=; Max-Age=0; Path=/';
    Object.defineProperty(window, 'location', {
      configurable: true,
      writable: true,
      value: {
        ...originalLocation,
        assign: locationAssignSpy,
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

};


export {
  ageGroupState,
  frontendPublicOwnerMock,
  localeMock,
  locationAssignSpy,
  optionalAuthMock,
  optionalRoutingMock,
  optionalTutorMock,
  pathnameMock,
  prefetchKangurLessonsCatalogMock,
  prefetchKangurPageContentStoreMock,
  prefetchMock,
  pushMock,
  replaceMock,
  routeTransitionStateMock,
  searchParamsMock,
  sessionMock,
  settingsStoreGetMock,
  startRouteTransitionMock,
  translationMessages,
  updateSettingMutateAsyncMock,
  useKangurCoarsePointerMock,
  useKangurPageContentEntryMock,
  useKangurSubjectFocusMock,
};
