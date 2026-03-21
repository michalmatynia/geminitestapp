/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  localeState,
  routeNavigatorBackMock,
  settingsStoreMock,
} = vi.hoisted(() => ({
  localeState: {
    value: 'de' as 'de' | 'en' | 'pl',
  },
  routeNavigatorBackMock: vi.fn(),
  settingsStoreMock: {
    get: vi.fn(),
  },
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeState.value,
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const messages = {
        'KangurTests.activeDescriptionFallback': {
          de: 'Gehe die Testfragen durch und prufe das Endergebnis.',
          en: 'Go through the test questions and check the final score.',
          pl: 'Przejdz pytania testowe i sprawdz wynik koncowy.',
        },
        'KangurTests.backToList': {
          de: 'Zuruck zur Testliste',
          en: 'Back to tests list',
          pl: 'Wroc do listy testow',
        },
        'KangurTests.emptyAdultDescription': {
          de: 'Aktuell sind nur Tests fur 10-Jahrige verfugbar.',
          en: 'Right now only tests for 10-year-olds are available.',
          pl: 'Na razie dostepne sa tylko testy dla 10-latkow.',
        },
        'KangurTests.emptyAdultTitle': {
          de: 'Tests fur Erwachsene sind in Vorbereitung',
          en: 'Adult tests are in preparation',
          pl: 'Testy dla doroslych sa w przygotowaniu',
        },
        'KangurTests.emptyDescription': {
          de: 'Aktiviere Tests im Admin-Bereich, damit sie hier erscheinen.',
          en: 'Enable tests in the admin panel to make them appear here.',
          pl: 'Aktywuj testy w panelu admina, aby pojawily sie tutaj.',
        },
        'KangurTests.emptyTitle': {
          de: 'Keine aktiven Tests',
          en: 'No active tests',
          pl: 'Brak aktywnych testow',
        },
        'KangurTests.introDescription': {
          de: 'Wahle ein Testset und gehe die Fragen Schritt fur Schritt durch.',
          en: 'Choose a test set and go through the questions step by step.',
          pl: 'Wybierz zestaw testowy i przejdz pytania krok po kroku.',
        },
        'KangurTests.listAria': {
          de: 'Testliste',
          en: 'Tests list',
          pl: 'Lista testow',
        },
        'KangurTests.noQuestions': {
          de: 'Keine Fragen',
          en: 'No questions',
          pl: 'Brak pytan',
        },
        'KangurTests.questionsCount': {
          de: '{count} Fragen',
          en: '{count} questions',
          pl: '{count} pytan',
        },
        'KangurTests.startTest': {
          de: 'Test starten',
          en: 'Start test',
          pl: 'Rozpocznij test',
        },
        'KangurTests.summary.category': {
          de: 'Kategorie: {value}',
          en: 'Category: {value}',
          pl: 'Kategoria: {value}',
        },
        'KangurTests.summary.gradeLevel': {
          de: 'Stufe: {value}',
          en: 'Level: {value}',
          pl: 'Poziom: {value}',
        },
        'KangurTests.summary.year': {
          de: 'Jahr {year}',
          en: 'Year {year}',
          pl: 'Rok {year}',
        },
        'KangurTests.title': {
          de: 'Prüfungen',
          en: 'Tests',
          pl: 'Testy',
        },
      } as const;
      const resolved =
        messages[`${namespace}.${key}` as keyof typeof messages]?.[localeState.value] ?? key;

      if (!values) {
        return resolved;
      }

      return Object.entries(values).reduce((message, [token, value]) => {
        return message.replace(`{${token}}`, String(value));
      }, resolved);
    },
}));

vi.mock('@/features/kangur/config/routing', () => ({
  appendKangurUrlParams: (href: string) => href,
  getKangurHomeHref: () => '/kangur',
  getKangurInternalQueryParamName: () => 'focus',
  getKangurPageHref: () => '/kangur/tests',
  readKangurUrlParam: () => null,
}));

vi.mock('@/features/kangur/docs/tooltips', () => ({
  useKangurDocsTooltips: () => ({ enabled: false }),
}));

vi.mock('@/features/kangur/ui/components/KangurStandardPageLayout', () => ({
  KangurStandardPageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='tests-layout'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurTopNavigationController', () => ({
  KangurTopNavigationController: () => <div data-testid='tests-top-nav' />,
}));

vi.mock('@/features/kangur/ui/components/KangurPageIntroCard', () => ({
  KangurPageIntroCard: ({
    title,
    visualTitle,
  }: {
    title: string;
    visualTitle?: React.ReactNode;
  }) => (
    <div data-testid='tests-intro-card'>
      <span>{title}</span>
      {visualTitle}
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurTestSuitePlayer', () => ({
  KangurTestSuitePlayer: () => <div data-testid='tests-suite-player' />,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    user: null,
    logout: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurGuestPlayerContext', () => ({
  useKangurGuestPlayer: () => ({
    guestPlayerName: '',
    setGuestPlayerName: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: () => ({
    openLoginModal: vi.fn(),
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurAgeGroupFocusContext', () => ({
  useKangurAgeGroupFocus: () => ({
    ageGroup: 'ten_years_old',
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({
    basePath: '/kangur',
  }),
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurButton: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button {...props}>{children}</button>
  ),
  KangurEmptyState: ({
    title,
    description,
  }: {
    title: string;
    description?: string;
  }) => (
    <div>
      <div>{title}</div>
      {description ? <div>{description}</div> : null}
    </div>
  ),
  KangurInfoCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  KangurStatusChip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/features/kangur/ui/design/tokens', () => ({
  KANGUR_PANEL_GAP_CLASSNAME: 'panel-gap',
  KANGUR_TIGHT_ROW_CLASSNAME: 'tight-row',
  KANGUR_WRAP_ROW_CLASSNAME: 'wrap-row',
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLearnerActivity', () => ({
  useKangurLearnerActivityPing: () => undefined,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({
    back: routeNavigatorBackMock,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRoutePageReady', () => ({
  useKangurRoutePageReady: () => undefined,
}));

vi.mock('@/features/kangur/ui/motion/page-transition', () => ({
  createKangurPageTransitionMotionProps: () => ({}),
}));

vi.mock('@/features/kangur/shared/providers/SettingsStoreProvider', () => ({
  useSettingsStore: () => settingsStoreMock,
}));

vi.mock('@/features/kangur/test-suites', () => ({
  KANGUR_TEST_QUESTIONS_SETTING_KEY: 'kangur-test-questions',
  KANGUR_TEST_SUITES_SETTING_KEY: 'kangur-test-suites',
  isLiveKangurTestSuite: () => true,
  parseKangurTestSuites: () => [],
}));

vi.mock('@/features/kangur/test-questions', () => ({
  getQuestionsForSuite: () => [],
  getPublishedQuestionsForSuite: () => [],
  parseKangurTestQuestionStore: () => ({}),
}));

import Tests from '@/features/kangur/ui/pages/Tests';

describe('Tests page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localeState.value = 'de';
    settingsStoreMock.get.mockReturnValue(undefined);
  });

  it('renders the localized tests SVG heading on the intro card', () => {
    render(<Tests />);

    expect(screen.getByTestId('tests-intro-card')).toBeInTheDocument();
    expect(screen.getAllByText('Prüfungen').length).toBeGreaterThan(0);
    expect(screen.getByTestId('kangur-tests-heading-art')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-tests-heading-art').querySelector('text')).toHaveTextContent(
      'Prüfungen'
    );
  });
});
