/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createDefaultKangurGames,
  createKangurGameLibraryPageDataFromGames,
} from '@/features/kangur/games';

const {
  pageDataState,
  searchParamsState,
  replaceMock,
  openLoginModalMock,
  logoutMock,
  setGuestPlayerNameMock,
} = vi.hoisted(() => ({
  pageDataState: {
    value: null as ReturnType<typeof createKangurGameLibraryPageDataFromGames> | null,
  },
  searchParamsState: {
    value: new URLSearchParams(),
  },
  replaceMock: vi.fn(),
  openLoginModalMock: vi.fn(),
  logoutMock: vi.fn(),
  setGuestPlayerNameMock: vi.fn(),
}));

const messageMap = {
  'KangurGamesLibraryPage.title': 'Games library',
  'KangurGamesLibraryPage.description': 'Shared games catalog.',
  'KangurGamesLibraryPage.introEyebrow': 'Shared games domain',
  'KangurGamesLibraryPage.serializationAuditEyebrow': 'Runtime contract',
  'KangurGamesLibraryPage.serializationAuditTitle': 'Runtime serialization',
  'KangurGamesLibraryPage.serializationAuditDescription':
    'Tracks which runtime-bearing variants use explicit ids and which ones still rely on compatibility fallbacks.',
  'KangurGamesLibraryPage.serializationAudit.statusClean': 'Explicit runtime ids',
  'KangurGamesLibraryPage.serializationAudit.statusAttention': 'Compatibility cleanup',
  'KangurGamesLibraryPage.serializationAudit.explicitLabel': 'Explicit runtimes',
  'KangurGamesLibraryPage.serializationAudit.explicitDescription':
    '{count} of {total} runtime-bearing variants use explicit runtime ids.',
  'KangurGamesLibraryPage.serializationAudit.fallbackLabel': 'Fallback only',
  'KangurGamesLibraryPage.serializationAudit.fallbackDescription':
    'Variants still resolving only through compatibility ids.',
  'KangurGamesLibraryPage.serializationAudit.duplicatesLabel': 'Duplicate legacy ids',
  'KangurGamesLibraryPage.serializationAudit.duplicatesDescription':
    'Variants still carrying both explicit and legacy runtime ids.',
  'KangurGamesLibraryPage.serializationAudit.legacyGameFallbackLabel':
    'Legacy launch games',
  'KangurGamesLibraryPage.serializationAudit.legacyGameFallbackDescription':
    'Games still carrying legacyScreenIds on the shared definition.',
  'KangurGamesLibraryPage.serializationAudit.backlogEyebrow': 'Fix backlog',
  'KangurGamesLibraryPage.serializationAudit.backlogDescription':
    'Lists the exact catalog ids that still need compatibility cleanup.',
  'KangurGamesLibraryPage.serializationAudit.fallbackBacklogLabel':
    'Fallback-only variants',
  'KangurGamesLibraryPage.serializationAudit.duplicatesBacklogLabel':
    'Duplicate-legacy variants',
  'KangurGamesLibraryPage.serializationAudit.missingBacklogLabel':
    'Missing-runtime variants',
  'KangurGamesLibraryPage.serializationAudit.legacyGameBacklogLabel':
    'Legacy launch games',
  'KangurGamesLibraryPage.serializationAudit.nonSharedBacklogLabel':
    'Non-shared engines',
  'KangurGamesLibraryPage.serializationAudit.nonSharedEnginesLabel': 'Non-shared engines',
  'KangurGamesLibraryPage.serializationAudit.nonSharedEnginesDescription':
    'Engine families not yet marked as shared runtime.',
  'KangurGamesLibraryPage.serializationAudit.surfaceDescription':
    '{count} runtime-bearing variants currently use this surface.',
  'KangurGamesLibraryPage.serializationAudit.totalVariantsLabel': 'Runtime-bearing variants',
  'KangurGamesLibraryPage.serializationAudit.explicitVariantsLabel': 'Explicit',
  'KangurGamesLibraryPage.serializationAudit.fallbackVariantsLabel': 'Fallback only',
  'KangurGamesLibraryPage.serializationAudit.duplicatesVariantsLabel': 'Duplicated legacy',
  'KangurGamesLibraryPage.serializationAudit.missingVariantsLabel': 'Missing runtime',
  'KangurGamesLibraryPage.filters.game.label': 'Game',
  'KangurGamesLibraryPage.filters.game.aria': 'Filter games by exact game',
  'KangurGamesLibraryPage.filters.game.all': 'All games',
  'KangurGamesLibraryPage.filters.engine.label': 'Engine family',
  'KangurGamesLibraryPage.filters.engine.aria': 'Filter games by engine family',
  'KangurGamesLibraryPage.filters.engine.all': 'All engines',
  'KangurGamesLibraryPage.variantSurfaces.lesson_inline': 'Lesson inline',
  'KangurGamesLibraryPage.variantSurfaces.lesson_stage': 'Lesson stage',
  'KangurGamesLibraryPage.variantSurfaces.library_preview': 'Library preview',
  'KangurGamesLibraryPage.variantSurfaces.game_screen': 'Game screen',
  'KangurGamesLibraryPage.focus.eyebrow': 'Deep link focus',
  'KangurGamesLibraryPage.focus.gameTitle': 'Focused catalog entry',
  'KangurGamesLibraryPage.focus.gameDescription':
    'This view is currently narrowed to {game}.',
  'KangurGamesLibraryPage.focus.clear': 'Clear game focus',
  'KangurGamesLibraryPage.focus.engineTitle': 'Focused engine family',
  'KangurGamesLibraryPage.focus.engineDescription':
    'This view is currently narrowed to the {engine} engine family.',
  'KangurGamesLibraryPage.focus.clearEngine': 'Clear engine focus',
  'KangurGamesLibraryPage.tabs.eyebrow': 'Section layout',
  'KangurGamesLibraryPage.tabs.title': 'Browse by tabs',
  'KangurGamesLibraryPage.tabs.description':
    'Switch between the game catalog, the shared structure view, and runtime serialization.',
  'KangurGamesLibraryPage.tabs.listLabel': 'Games library sections',
  'KangurGamesLibraryPage.tabs.catalog': 'Catalog',
  'KangurGamesLibraryPage.tabs.structure': 'Structure',
  'KangurGamesLibraryPage.tabs.runtime': 'Runtime',
  'KangurGamesLibraryPage.labels.none': 'None',
} as const;

const translateMessage = (namespace: string | undefined, key: string): string =>
  messageMap[`${namespace}.${key}` as keyof typeof messageMap] ?? key;

vi.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations:
    (namespace?: string) =>
    (key: string, values?: Record<string, string | number>) => {
      const template = translateMessage(namespace, key);
      if (!values) {
        return template;
      }

      return Object.entries(values).reduce(
        (message, [token, value]) => message.replace(`{${token}}`, String(value)),
        template
      );
    },
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => searchParamsState.value,
}));

vi.mock('@/features/kangur/config/routing', () => ({
  appendKangurUrlParams: (
    href: string,
    params?: Record<string, string | null | undefined>
  ) => {
    const url = new URL(href, 'https://kangur.test');

    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (!value) {
        url.searchParams.delete(key);
        return;
      }

      url.searchParams.set(key, value);
    });

    return `${url.pathname}${url.search}${url.hash}`;
  },
  getKangurCanonicalPublicHref: () => '/games',
  getKangurPageSlug: () => 'games',
}));

vi.mock('@/features/kangur/lessons/lesson-catalog-i18n', () => ({
  getLocalizedKangurAgeGroupLabel: (_ageGroup: string, _locale: string, fallback: string) => fallback,
  getLocalizedKangurLessonTitle: (_id: string, _locale: string, fallback: string) => fallback,
  getLocalizedKangurSubjectLabel: (_id: string, _locale: string, fallback: string) => fallback,
}));

vi.mock('@/features/kangur/ui/components/KangurPageIntroCard', () => ({
  KangurPageIntroCard: ({
    children,
    title,
    description,
  }: {
    children?: React.ReactNode;
    title: string;
    description?: string;
  }) => (
    <section data-testid='games-library-intro'>
      {children}
      <h1>{title}</h1>
      {description ? <p>{description}</p> : null}
    </section>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurStandardPageLayout', () => ({
  KangurStandardPageLayout: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='games-library-layout'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurTopNavigationController', () => ({
  KangurTopNavigationController: () => <div data-testid='games-library-top-nav' />,
}));

vi.mock('@/features/kangur/ui/components/KangurTransitionLink', () => ({
  KangurTransitionLink: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    user: null,
    logout: logoutMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurGuestPlayerContext', () => ({
  useKangurGuestPlayer: () => ({
    guestPlayerName: 'Guest',
    setGuestPlayerName: setGuestPlayerNameMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurLoginModalContext', () => ({
  useKangurLoginModal: () => ({
    openLoginModal: openLoginModalMock,
  }),
}));

vi.mock('@/features/kangur/ui/context/KangurRoutingContext', () => ({
  useKangurRouting: () => ({
    basePath: '/kangur',
    requestedHref: '/games',
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurGameLibraryPage', () => ({
  useKangurGameLibraryPage: () => ({
    data: pageDataState.value,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRouteNavigator', () => ({
  useKangurRouteNavigator: () => ({
    replace: replaceMock,
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurRoutePageReady', () => ({
  useKangurRoutePageReady: () => undefined,
}));

vi.mock('@/features/kangur/ui/services/game-launch', () => ({
  buildKangurGameLaunchHref: () => '/games/open',
  buildKangurGameLessonHref: () => '/lessons/open',
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurButton: ({
    children,
    variant: _variant,
    size: _size,
    fullWidth: _fullWidth,
    accent: _accent,
    asChild: _asChild,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & Record<string, unknown>) => (
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
  KangurInfoCard: ({
    children,
    accent: _accent,
    padding: _padding,
    className,
    ...props
  }: React.HTMLAttributes<HTMLElement> & Record<string, unknown>) => (
    <section {...props} className={typeof className === 'string' ? className : undefined}>
      {children}
    </section>
  ),
  KangurMetricCard: ({
    label,
    value,
    description,
  }: {
    label: React.ReactNode;
    value: React.ReactNode;
    description?: React.ReactNode;
  }) => (
    <div data-testid={`metric-card:${String(label)}`}>
      <div>{label}</div>
      <div>{value}</div>
      {description ? <div>{description}</div> : null}
    </div>
  ),
  KangurSelectField: ({
    children,
    accent: _accent,
    size: _size,
    ...props
  }: React.SelectHTMLAttributes<HTMLSelectElement> & Record<string, unknown>) => (
    <select {...props}>{children}</select>
  ),
  KangurStatusChip: ({
    children,
  }: {
    children: React.ReactNode;
  }) => <span>{children}</span>,
}));

import GamesLibrary from '@/features/kangur/ui/pages/GamesLibrary';

const openRuntimeTab = (): void => {
  fireEvent.click(screen.getByRole('tab', { name: 'Runtime' }));
};

describe('GamesLibrary serialization audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsState.value = new URLSearchParams();
    pageDataState.value = createKangurGameLibraryPageDataFromGames({
      games: createDefaultKangurGames(),
    });
  });

  it('renders the runtime serialization summary when the catalog is fully explicit', () => {
    render(<GamesLibrary />);

    expect(screen.getByRole('tab', { name: 'Catalog' })).toHaveAttribute(
      'aria-selected',
      'true'
    );

    openRuntimeTab();

    expect(screen.getByText('Runtime serialization')).toBeInTheDocument();
    expect(screen.getAllByText('Explicit runtime ids').length).toBeGreaterThan(0);
    expect(screen.getByTestId('metric-card:Explicit runtimes')).toHaveTextContent(
      String(pageDataState.value.serializationAudit.explicitRuntimeVariantCount)
    );
    expect(screen.getByTestId('metric-card:Legacy launch games')).toHaveTextContent('0');
    expect(screen.queryByText('Fix backlog')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Games library' })).toBeInTheDocument();
    expect(screen.getAllByText('Lesson stage').length).toBeGreaterThan(0);
  });

  it('switches the audit status when compatibility cleanup is needed', () => {
    pageDataState.value = {
      ...pageDataState.value,
      serializationAudit: {
        ...pageDataState.value.serializationAudit,
        compatibilityFallbackVariantCount: 1,
        duplicatedLegacyVariantCount: 1,
        missingRuntimeVariantCount: 1,
        legacyLaunchFallbackGameCount: 1,
        issues: [
          {
            kind: 'compatibility_fallback_variant',
            itemId: 'division_groups.lesson-inline',
            label: 'Division Groups · Lesson inline',
            detail: 'division_groups.lesson-inline',
            targetKind: 'game',
            targetId: 'division_groups',
          },
          {
            kind: 'duplicated_legacy_variant',
            itemId: 'clock_training.lesson-inline',
            label: 'Clock Training · Lesson inline',
            detail: 'clock_training.lesson-inline',
            targetKind: 'game',
            targetId: 'clock_training',
          },
          {
            kind: 'missing_runtime_variant',
            itemId: 'logical_patterns_workshop.lesson-stage',
            label: 'Logical Patterns Workshop · Lesson stage',
            detail: 'logical_patterns_workshop.lesson-stage',
            targetKind: 'game',
            targetId: 'logical_patterns_workshop',
          },
          {
            kind: 'legacy_launch_fallback_game',
            itemId: 'clock_training',
            label: 'Clock Training',
            detail: 'clock_training',
            targetKind: 'game',
            targetId: 'clock_training',
          },
          {
            kind: 'non_shared_runtime_engine',
            itemId: 'classification-engine',
            label: 'Classification engine',
            detail: 'classification-engine',
            targetKind: 'engine',
            targetId: 'classification-engine',
          },
        ],
        nonSharedRuntimeEngineCount: 1,
        allEnginesSharedRuntime: false,
        surfaces: pageDataState.value.serializationAudit.surfaces.map((surface) =>
          surface.surface === 'game_screen'
            ? {
                ...surface,
                compatibilityFallbackVariants: 1,
                duplicatedLegacyVariants: 1,
              }
            : surface
        ),
      },
    };

    render(<GamesLibrary />);
    openRuntimeTab();

    expect(screen.getAllByText('Compatibility cleanup').length).toBeGreaterThan(0);
    expect(screen.getByTestId('metric-card:Fallback only')).toHaveTextContent('1');
    expect(screen.getByTestId('metric-card:Duplicate legacy ids')).toHaveTextContent('1');
    expect(screen.getByTestId('metric-card:Legacy launch games')).toHaveTextContent('1');
    expect(screen.getByText('Fix backlog')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /division_groups\.lesson-inline/i })
    ).toHaveAttribute('href', '/games?gameId=division_groups#kangur-game-card-division_groups');
    expect(screen.getByRole('link', { name: /classification-engine/i })).toHaveAttribute(
      'href',
      '/games?engineId=classification-engine#kangur-engine-card-classification-engine'
    );
  });

  it('explains when the page is focused to a single game through a deep link', () => {
    searchParamsState.value = new URLSearchParams('gameId=division_groups');
    pageDataState.value = createKangurGameLibraryPageDataFromGames({
      filter: { gameId: 'division_groups' },
      games: createDefaultKangurGames(),
    });

    render(<GamesLibrary />);

    expect(screen.getByText('Deep link focus')).toBeInTheDocument();
    expect(screen.getByText('Focused catalog entry')).toBeInTheDocument();
    expect(
      screen.getByText(
        `This view is currently narrowed to ${
          pageDataState.value.overview.subjectGroups[0]?.entries[0]?.game.title ?? 'division_groups'
        }.`
      )
    ).toBeInTheDocument();
    expect(screen.getByText('division_groups')).toBeInTheDocument();
    expect(screen.getByLabelText('Filter games by exact game')).toHaveValue('division_groups');

    fireEvent.click(screen.getByRole('button', { name: 'Clear game focus' }));

    expect(replaceMock).toHaveBeenCalledWith('/games', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:filters:gameId',
    });
  });

  it('keeps the focused game title when other filters produce an empty result', () => {
    searchParamsState.value = new URLSearchParams(
      'gameId=division_groups&subject=english'
    );
    pageDataState.value = createKangurGameLibraryPageDataFromGames({
      filter: { gameId: 'division_groups', subject: 'english' },
      games: createDefaultKangurGames(),
    });

    render(<GamesLibrary />);

    expect(screen.getByText('Deep link focus')).toBeInTheDocument();
    expect(screen.getByText('Focused catalog entry')).toBeInTheDocument();
    expect(
      screen.getByText('This view is currently narrowed to Division Groups.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Filter games by exact game')).toHaveValue('division_groups');
  });

  it('explains when the page is focused to a single engine through a deep link', () => {
    searchParamsState.value = new URLSearchParams('engineId=classification-engine');
    pageDataState.value = createKangurGameLibraryPageDataFromGames({
      filter: { engineId: 'classification-engine' },
      games: createDefaultKangurGames(),
    });

    render(<GamesLibrary />);

    const engineTitle =
      pageDataState.value.engineOverview.engineGroups[0]?.engine?.title ?? 'classification-engine';

    expect(screen.getByText('Deep link focus')).toBeInTheDocument();
    expect(screen.getByText('Focused engine family')).toBeInTheDocument();
    expect(
      screen.getByText(
        `This view is currently narrowed to the ${engineTitle} engine family.`
      )
    ).toBeInTheDocument();
    expect(screen.getAllByText('classification-engine').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('Filter games by engine family')).toHaveValue(
      'classification-engine'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear engine focus' }));

    expect(replaceMock).toHaveBeenCalledWith('/games', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:filters:engineId',
    });
  });

  it('keeps the focused engine title when other filters produce an empty result', () => {
    searchParamsState.value = new URLSearchParams(
      'engineId=sentence-builder-engine&subject=maths'
    );
    pageDataState.value = createKangurGameLibraryPageDataFromGames({
      filter: { engineId: 'sentence-builder-engine', subject: 'maths' },
      games: createDefaultKangurGames(),
    });

    render(<GamesLibrary />);

    const engineTitle =
      pageDataState.value.engineFilterOptions.engines.find(
        (engine) => engine.id === 'sentence-builder-engine'
      )?.title ?? 'sentence-builder-engine';

    expect(screen.getByText('Deep link focus')).toBeInTheDocument();
    expect(screen.getByText('Focused engine family')).toBeInTheDocument();
    expect(
      screen.getByText(
        `This view is currently narrowed to the ${engineTitle} engine family.`
      )
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Filter games by engine family')).toHaveValue(
      'sentence-builder-engine'
    );
  });
});
