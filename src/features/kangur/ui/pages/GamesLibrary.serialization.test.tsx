/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
  sessionState,
  lessonGameSectionsState,
  replaceLessonGameSectionsMutateAsyncMock,
  useKangurGameLibraryPageMock,
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
  sessionState: {
    value: {
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'admin@example.com',
          id: 'admin-1',
          isElevated: true,
          name: 'Super Admin',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    } as {
      data: {
        expires: string;
        user: {
          email: string;
          id: string;
          isElevated?: boolean;
          name: string;
          role: string;
        };
      } | null;
      status: 'authenticated' | 'loading' | 'unauthenticated';
    },
  },
  lessonGameSectionsState: {
    value: [] as Array<Record<string, unknown>>,
  },
  replaceLessonGameSectionsMutateAsyncMock: vi.fn(async (input: { sections: Array<Record<string, unknown>> }) => {
    lessonGameSectionsState.value = input.sections;
    return input.sections;
  }),
  useKangurGameLibraryPageMock: vi.fn(),
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
  'KangurGamesLibraryPage.filters.subject.label': 'Subject',
  'KangurGamesLibraryPage.filters.subject.aria': 'Filter games by subject',
  'KangurGamesLibraryPage.filters.subject.all': 'All subjects',
  'KangurGamesLibraryPage.filters.launchability.label': 'Launchability',
  'KangurGamesLibraryPage.filters.launchability.aria': 'Filter games by launchability',
  'KangurGamesLibraryPage.filters.launchability.all': 'All launch states',
  'KangurGamesLibraryPage.filters.launchability.launchable': 'Launchable only',
  'KangurGamesLibraryPage.filters.engine.label': 'Engine family',
  'KangurGamesLibraryPage.filters.engine.aria': 'Filter games by engine family',
  'KangurGamesLibraryPage.filters.engine.all': 'All engines',
  'KangurGamesLibraryPage.filters.clear': 'Clear filters',
  'KangurGamesLibraryPage.actions.previewGame': 'Preview & map',
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
  'KangurGamesLibraryPage.modal.eyebrow': 'Game scaffold',
  'KangurGamesLibraryPage.modal.scaffoldBadge': 'Scaffold',
  'KangurGamesLibraryPage.modal.description':
    'Preview the active runtime, map the game to a lesson hub, and manage saved hub sections.',
  'KangurGamesLibraryPage.modal.settingsButton': 'Game settings',
  'KangurGamesLibraryPage.modal.hideSettingsButton': 'Hide settings',
  'KangurGamesLibraryPage.modal.closeButton': 'Close',
  'KangurGamesLibraryPage.modal.lessonEyebrow': 'Lesson hub',
  'KangurGamesLibraryPage.modal.lessonTitle': 'Attach the game to a hub lesson',
  'KangurGamesLibraryPage.modal.lessonSelectLabel': 'Attached hub lesson',
  'KangurGamesLibraryPage.modal.lessonPlaceholder': 'Select a lesson hub',
  'KangurGamesLibraryPage.modal.lessonSearchPlaceholder': 'Search lesson hubs',
  'KangurGamesLibraryPage.modal.lessonEmpty': 'No lesson hubs found.',
  'KangurGamesLibraryPage.modal.lessonUnassigned': 'No lesson attached yet',
  'KangurGamesLibraryPage.modal.scaffoldHint':
    'The current editor is mapped to {lesson}.',
  'KangurGamesLibraryPage.modal.previewEyebrow': 'Live runtime',
  'KangurGamesLibraryPage.modal.previewTitle': 'Game preview',
  'KangurGamesLibraryPage.modal.previewFallback':
    'Clock is scaffolded first. Other games will plug into this modal next.',
  'KangurGamesLibraryPage.modal.draftEyebrow': 'Hub section draft',
  'KangurGamesLibraryPage.modal.draftTitle': 'Create a new hub game section',
  'KangurGamesLibraryPage.modal.editDraftTitle': 'Edit saved hub game section',
  'KangurGamesLibraryPage.modal.draftNameLabel': 'Section name',
  'KangurGamesLibraryPage.modal.draftNamePlaceholder': 'Clock challenge',
  'KangurGamesLibraryPage.modal.draftSubtextLabel': 'Section subtext',
  'KangurGamesLibraryPage.modal.draftSubtextPlaceholder':
    'Write a short subtext for the lesson hub card.',
  'KangurGamesLibraryPage.modal.draftIconLabel': 'Game icon',
  'KangurGamesLibraryPage.modal.draftIconAria': 'Choose {icon} as the game icon',
  'KangurGamesLibraryPage.modal.addDraftButton': 'Add hub section draft',
  'KangurGamesLibraryPage.modal.saveDraftButton': 'Save hub section',
  'KangurGamesLibraryPage.modal.newDraftButton': 'New hub section',
  'KangurGamesLibraryPage.modal.draftListEyebrow': 'Draft list',
  'KangurGamesLibraryPage.modal.draftListTitle': 'Saved hub sections',
  'KangurGamesLibraryPage.modal.draftListEmpty': 'No hub sections drafted yet.',
  'KangurGamesLibraryPage.modal.editDraftButton': 'Edit',
  'KangurGamesLibraryPage.modal.editingBadge': 'Editing',
  'KangurGamesLibraryPage.modal.removeDraftButton': 'Remove',
  'KangurGamesLibraryPage.modal.settingsEyebrow': 'Preview settings',
  'KangurGamesLibraryPage.modal.settingsTitle': 'Clock preview settings',
  'KangurGamesLibraryPage.modal.settingsDescription':
    'These options currently drive the clock scaffold inside the modal.',
  'KangurGamesLibraryPage.modal.settings.showModeSwitchLabel': 'Show mode switch',
  'KangurGamesLibraryPage.modal.settings.showModeSwitchDescription':
    'Keep practice and challenge tabs visible inside the preview.',
  'KangurGamesLibraryPage.modal.settings.showTaskTitleLabel': 'Show task title',
  'KangurGamesLibraryPage.modal.settings.showTaskTitleDescription':
    'Display the target time above the clock.',
  'KangurGamesLibraryPage.modal.settings.showTimeDisplayLabel': 'Show digital time',
  'KangurGamesLibraryPage.modal.settings.showTimeDisplayDescription':
    'Render the live blue digital readout above the dial.',
  'KangurGamesLibraryPage.modal.settings.showHourHandLabel': 'Show hour hand',
  'KangurGamesLibraryPage.modal.settings.showHourHandDescription':
    'Hide or reveal the short red clock hand in the preview.',
  'KangurGamesLibraryPage.modal.settings.showMinuteHandLabel': 'Show minute hand',
  'KangurGamesLibraryPage.modal.settings.showMinuteHandDescription':
    'Hide or reveal the long green clock hand in the preview.',
  'KangurGamesLibraryPage.modal.settings.initialModeLabel': 'Initial mode',
  'KangurGamesLibraryPage.modal.settings.initialModePractice': 'Practice',
  'KangurGamesLibraryPage.modal.settings.initialModeChallenge': 'Challenge',
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

vi.mock('next-auth/react', () => ({
  useSession: () => sessionState.value,
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

vi.mock('@/features/kangur/ui/components/PageNotFound', () => ({
  PageNotFound: () => <div data-testid='kangur-page-not-found' />,
  default: () => <div data-testid='kangur-page-not-found' />,
}));

vi.mock('@/features/kangur/ui/components/KangurTopNavigationController', () => ({
  KangurTopNavigationController: () => <div data-testid='games-library-top-nav' />,
}));

vi.mock('@/features/kangur/ui/components/KangurDialog', () => ({
  KangurDialog: ({
    children,
    open,
    contentProps,
  }: {
    children: React.ReactNode;
    open: boolean;
    contentProps?: Record<string, unknown>;
  }) => (open ? <div data-testid={String(contentProps?.['data-testid'] ?? 'kangur-dialog')}>{children}</div> : null),
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

vi.mock('@/shared/ui/searchable-select', () => ({
  SearchableSelect: ({
    label,
    options,
    value,
    onChange,
  }: {
    label?: string;
    options: Array<{ label: string; value: string }>;
    value?: string | null;
    onChange: (value: string | null) => void;
  }) => (
    <label>
      <span>{label}</span>
      <select
        aria-label={label}
        onChange={(event) => onChange(event.target.value || null)}
        value={value ?? ''}
      >
        <option value=''>None</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

vi.mock('@/features/kangur/ui/components/ClockTrainingGame', () => ({
  default: ({
    hideModeSwitch = false,
    initialMode = 'practice',
    showHourHand = true,
    showMinuteHand = true,
    showTaskTitle = true,
    showTimeDisplay = true,
  }: Record<string, unknown>) => (
    <div
      data-hide-mode-switch={String(hideModeSwitch)}
      data-initial-mode={String(initialMode)}
      data-show-hour-hand={String(showHourHand)}
      data-show-minute-hand={String(showMinuteHand)}
      data-show-task-title={String(showTaskTitle)}
      data-show-time-display={String(showTimeDisplay)}
      data-testid='clock-training-game-preview'
    />
  ),
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
  useKangurGameLibraryPage: (...args: unknown[]) => {
    useKangurGameLibraryPageMock(...args);
    return {
      data: pageDataState.value,
      isError: false,
    };
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonGameSections', () => ({
  useKangurLessonGameSections: () => ({
    data: lessonGameSectionsState.value,
    isPending: false,
  }),
  useReplaceKangurLessonGameSections: () => ({
    isPending: false,
    mutateAsync: replaceLessonGameSectionsMutateAsyncMock,
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
    lessonGameSectionsState.value = [];
    sessionState.value = {
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'admin@example.com',
          id: 'admin-1',
          isElevated: true,
          name: 'Super Admin',
          role: 'super_admin',
        },
      },
      status: 'authenticated',
    };
    pageDataState.value = createKangurGameLibraryPageDataFromGames({
      games: createDefaultKangurGames(),
    });
  });

  const enableCompatibilityCleanupAudit = (): void => {
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
  };

  it('renders nothing while the admin session is still loading and skips page data hooks', () => {
    sessionState.value = {
      data: null,
      status: 'loading',
    };

    const { container } = render(<GamesLibrary />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByTestId('games-library-layout')).toBeNull();
    expect(useKangurGameLibraryPageMock).not.toHaveBeenCalled();
  });

  it('renders not found for non-super-admin sessions before loading page data', () => {
    sessionState.value = {
      data: {
        expires: '2026-12-31T23:59:59.000Z',
        user: {
          email: 'admin@example.com',
          id: 'admin-1',
          name: 'Admin',
          role: 'admin',
        },
      },
      status: 'authenticated',
    };

    render(<GamesLibrary />);

    expect(screen.getByTestId('kangur-page-not-found')).toBeInTheDocument();
    expect(screen.queryByTestId('games-library-layout')).toBeNull();
    expect(useKangurGameLibraryPageMock).not.toHaveBeenCalled();
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

  it('opens the runtime tab directly from the route query and persists tab clicks back to the route', () => {
    searchParamsState.value = new URLSearchParams('tab=runtime');

    render(<GamesLibrary />);

    expect(screen.getByRole('tab', { name: 'Runtime' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('Runtime serialization')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Catalog' }));

    expect(replaceMock).toHaveBeenCalledWith('/games', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:tab:catalog',
    });
  });

  it('normalizes an explicit catalog tab back to the canonical catalog route', () => {
    searchParamsState.value = new URLSearchParams('tab=catalog');

    render(<GamesLibrary />);

    expect(screen.getByRole('tab', { name: 'Catalog' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(replaceMock).toHaveBeenCalledWith('/games', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:query-normalize',
    });
  });

  it('drops invalid tab query values back to the canonical catalog route', () => {
    searchParamsState.value = new URLSearchParams('tab=invalid');

    render(<GamesLibrary />);

    expect(screen.getByRole('tab', { name: 'Catalog' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(replaceMock).toHaveBeenCalledWith('/games', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:query-normalize',
    });
  });

  it('writes the runtime tab into the route when the user switches tabs manually', () => {
    render(<GamesLibrary />);

    openRuntimeTab();

    expect(replaceMock).toHaveBeenCalledWith('/games?tab=runtime', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:tab:runtime',
    });
  });

  it('drops invalid filter query values while preserving valid tab state', () => {
    searchParamsState.value = new URLSearchParams('subject=invalid&tab=runtime');

    render(<GamesLibrary />);

    expect(screen.getByRole('tab', { name: 'Runtime' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(replaceMock).toHaveBeenCalledWith('/games?tab=runtime', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:query-normalize',
    });
  });

  it('deduplicates repeated known filter params while preserving valid tab state', () => {
    searchParamsState.value = new URLSearchParams(
      'subject=english&subject=maths&tab=runtime'
    );

    render(<GamesLibrary />);

    expect(screen.getByRole('tab', { name: 'Runtime' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(replaceMock).toHaveBeenCalledWith('/games?subject=english&tab=runtime', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:query-normalize',
    });
  });

  it('preserves unrelated query params while normalizing invalid filter values', () => {
    searchParamsState.value = new URLSearchParams(
      'subject=invalid&view=compact&tab=runtime'
    );

    render(<GamesLibrary />);

    expect(screen.getByRole('tab', { name: 'Runtime' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(replaceMock).toHaveBeenCalledWith('/games?view=compact&tab=runtime', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:query-normalize',
    });
  });

  it('drops unsupported lessonComponentId query values while preserving valid tab state', () => {
    searchParamsState.value = new URLSearchParams(
      'lessonComponentId=legacy-inline-link&tab=runtime'
    );

    render(<GamesLibrary />);

    expect(screen.getByRole('tab', { name: 'Runtime' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(replaceMock).toHaveBeenCalledWith('/games?tab=runtime', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:query-normalize',
    });
  });

  it('keeps the runtime tab in the route when non-overriding filters change', () => {
    render(<GamesLibrary />);
    openRuntimeTab();
    replaceMock.mockClear();

    fireEvent.change(screen.getByLabelText('Filter games by subject'), {
      target: { value: 'english' },
    });

    expect(replaceMock).toHaveBeenCalledWith('/games?subject=english&tab=runtime', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:filters:subject',
    });
  });

  it('preserves unrelated query params when non-overriding filters change', () => {
    searchParamsState.value = new URLSearchParams('view=compact&tab=runtime');

    render(<GamesLibrary />);
    replaceMock.mockClear();

    fireEvent.change(screen.getByLabelText('Filter games by subject'), {
      target: { value: 'english' },
    });

    expect(replaceMock).toHaveBeenCalledWith(
      '/games?view=compact&tab=runtime&subject=english',
      {
        pageKey: 'GamesLibrary',
        scroll: false,
        sourceId: 'kangur-games-library:filters:subject',
      }
    );
  });

  it('switches to the structure tab when an engine filter overrides runtime focus', () => {
    render(<GamesLibrary />);
    openRuntimeTab();
    replaceMock.mockClear();

    fireEvent.change(screen.getByLabelText('Filter games by engine family'), {
      target: { value: 'classification-engine' },
    });

    expect(replaceMock).toHaveBeenCalledWith(
      '/games?engineId=classification-engine&tab=structure',
      {
        pageKey: 'GamesLibrary',
        scroll: false,
        sourceId: 'kangur-games-library:filters:engineId',
      }
    );
  });

  it('preserves the runtime tab when clearing filters from a runtime deep link', () => {
    searchParamsState.value = new URLSearchParams('tab=runtime&subject=english');
    pageDataState.value = createKangurGameLibraryPageDataFromGames({
      filter: { subject: 'english' },
      games: createDefaultKangurGames(),
    });

    render(<GamesLibrary />);
    replaceMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(replaceMock).toHaveBeenCalledWith('/games?tab=runtime', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:filters:clear',
    });
  });

  it('preserves unrelated query params when clearing known filters', () => {
    searchParamsState.value = new URLSearchParams('view=compact&tab=runtime&subject=english');
    pageDataState.value = createKangurGameLibraryPageDataFromGames({
      filter: { subject: 'english' },
      games: createDefaultKangurGames(),
    });

    render(<GamesLibrary />);
    replaceMock.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Clear filters' }));

    expect(replaceMock).toHaveBeenCalledWith('/games?view=compact&tab=runtime', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:filters:clear',
    });
  });

  it('switches the audit status when compatibility cleanup is needed', () => {
    enableCompatibilityCleanupAudit();

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
      '/games?engineId=classification-engine&tab=structure#kangur-engine-card-classification-engine'
    );
  });

  it('preserves unrelated query params while canonicalizing runtime backlog links', () => {
    searchParamsState.value = new URLSearchParams('view=compact&tab=runtime&subject=english');
    enableCompatibilityCleanupAudit();

    render(<GamesLibrary />);

    const divisionLink = new URL(
      screen.getByRole('link', { name: /division_groups\.lesson-inline/i }).getAttribute('href') ??
        '',
      'https://kangur.test'
    );
    const engineLink = new URL(
      screen.getByRole('link', { name: /classification-engine/i }).getAttribute('href') ?? '',
      'https://kangur.test'
    );

    expect(divisionLink.pathname).toBe('/games');
    expect(divisionLink.searchParams.get('view')).toBe('compact');
    expect(divisionLink.searchParams.get('gameId')).toBe('division_groups');
    expect(divisionLink.searchParams.get('subject')).toBeNull();
    expect(divisionLink.searchParams.get('tab')).toBeNull();
    expect(divisionLink.hash).toBe('#kangur-game-card-division_groups');

    expect(engineLink.pathname).toBe('/games');
    expect(engineLink.searchParams.get('view')).toBe('compact');
    expect(engineLink.searchParams.get('engineId')).toBe('classification-engine');
    expect(engineLink.searchParams.get('subject')).toBeNull();
    expect(engineLink.searchParams.get('tab')).toBe('structure');
    expect(engineLink.hash).toBe('#kangur-engine-card-classification-engine');
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
    expect(useKangurGameLibraryPageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        gameId: 'division_groups',
      })
    );

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
    expect(useKangurGameLibraryPageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        gameId: 'division_groups',
        subject: 'english',
      })
    );
  });

  it('passes the selected exact game into the page data hook when the filter changes', () => {
    render(<GamesLibrary />);
    useKangurGameLibraryPageMock.mockClear();

    fireEvent.change(screen.getByLabelText('Filter games by exact game'), {
      target: { value: 'division_groups' },
    });

    expect(useKangurGameLibraryPageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        gameId: 'division_groups',
      })
    );
    expect(replaceMock).toHaveBeenCalledWith('/games?gameId=division_groups', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:filters:gameId',
    });
  });

  it('passes launchableOnly into the page data hook when the launchability filter changes', () => {
    render(<GamesLibrary />);
    useKangurGameLibraryPageMock.mockClear();

    fireEvent.change(screen.getByLabelText('Filter games by launchability'), {
      target: { value: 'launchable' },
    });

    expect(useKangurGameLibraryPageMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        launchableOnly: true,
      })
    );
    expect(replaceMock).toHaveBeenCalledWith('/games?launchableOnly=true', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:filters:launchability',
    });
  });

  it('keeps the catalog tab active when a focused game deep link also requests runtime', () => {
    searchParamsState.value = new URLSearchParams('gameId=division_groups&tab=runtime');
    pageDataState.value = createKangurGameLibraryPageDataFromGames({
      filter: { gameId: 'division_groups' },
      games: createDefaultKangurGames(),
    });

    render(<GamesLibrary />);

    expect(screen.getByRole('tab', { name: 'Catalog' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Runtime' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(replaceMock).toHaveBeenCalledWith('/games?gameId=division_groups', {
      pageKey: 'GamesLibrary',
      scroll: false,
      sourceId: 'kangur-games-library:query-normalize',
    });
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

    expect(replaceMock).toHaveBeenCalledWith('/games?tab=structure', {
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

  it('opens the game modal from a catalog card and scaffolds hub-section controls for the clock game', () => {
    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    expect(screen.getByTestId('games-library-game-modal')).toBeInTheDocument();
    expect(screen.getByLabelText('Attached hub lesson')).toHaveValue('clock');
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-minute-hand',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Hide settings' }));
    expect(screen.queryByText('Clock preview settings')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Game settings' }));
    fireEvent.click(screen.getByLabelText('Show minute hand'));
    fireEvent.change(screen.getByLabelText('Initial mode'), {
      target: { value: 'challenge' },
    });

    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-minute-hand',
      'false'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-initial-mode',
      'challenge'
    );

    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: 'Clock deck' },
    });
    fireEvent.change(screen.getByLabelText('Section subtext'), {
      target: { value: 'Mixed drills for the lesson hub.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Choose 🧩 as the game icon' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add hub section draft' }));

    expect(screen.getByText('Clock deck')).toBeInTheDocument();
    expect(screen.getAllByText('Mixed drills for the lesson hub.').length).toBeGreaterThan(0);
  });

  it('loads a saved hub section into the editor and persists updates on the same record', () => {
    lessonGameSectionsState.value = [
      {
        id: 'clock_saved_section',
        lessonComponentId: 'clock',
        gameId: 'clock_training',
        title: 'Saved clock deck',
        description: 'Saved section from the lesson hub.',
        emoji: '🧩',
        sortOrder: 1,
        enabled: true,
        settings: {
          clock: {
            clockSection: 'minutes',
            initialMode: 'challenge',
            showHourHand: false,
            showMinuteHand: true,
            showModeSwitch: true,
            showTaskTitle: true,
            showTimeDisplay: false,
          },
        },
      },
    ];

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    expect(screen.getByRole('button', { name: 'Save hub section' })).toBeInTheDocument();
    expect(screen.getByLabelText('Attached hub lesson')).toHaveValue('clock');
    expect(screen.getByLabelText('Section name')).toHaveValue('Saved clock deck');
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-hour-hand',
      'false'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-initial-mode',
      'challenge'
    );

    fireEvent.click(screen.getByRole('button', { name: 'New hub section' }));
    expect(screen.getByRole('button', { name: 'Add hub section draft' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Attached hub lesson'), {
      target: { value: 'calendar' },
    });
    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: 'Updated clock deck' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save hub section' }));

    expect(replaceLessonGameSectionsMutateAsyncMock).toHaveBeenLastCalledWith({
      gameId: 'clock_training',
      sections: [
        expect.objectContaining({
          id: 'clock_saved_section',
          lessonComponentId: 'calendar',
          title: 'Updated clock deck',
        }),
      ],
    });
    expect(screen.getByText('Updated clock deck')).toBeInTheDocument();
  });

  it('restores the edited saved section when deleting it fails', async () => {
    lessonGameSectionsState.value = [
      {
        id: 'clock_saved_section',
        lessonComponentId: 'clock',
        gameId: 'clock_training',
        title: 'Saved clock deck',
        description: 'Saved section from the lesson hub.',
        emoji: '🧩',
        sortOrder: 1,
        enabled: true,
        settings: {
          clock: {
            clockSection: 'minutes',
            initialMode: 'challenge',
            showHourHand: false,
            showMinuteHand: true,
            showModeSwitch: true,
            showTaskTitle: true,
            showTimeDisplay: false,
          },
        },
      },
      {
        id: 'clock_secondary_section',
        lessonComponentId: 'calendar',
        gameId: 'clock_training',
        title: 'Fallback clock deck',
        description: 'Fallback section from the lesson hub.',
        emoji: '⏰',
        sortOrder: 2,
        enabled: true,
        settings: {
          clock: {
            clockSection: 'hours',
            initialMode: 'practice',
            showHourHand: true,
            showMinuteHand: true,
            showModeSwitch: true,
            showTaskTitle: true,
            showTimeDisplay: true,
          },
        },
      },
    ];
    replaceLessonGameSectionsMutateAsyncMock.mockImplementationOnce(async () => {
      throw new Error('delete failed');
    });

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    expect(screen.getByRole('button', { name: 'Save hub section' })).toBeInTheDocument();
    expect(screen.getByLabelText('Section name')).toHaveValue('Saved clock deck');

    fireEvent.click(screen.getAllByRole('button', { name: 'Remove' })[0]!);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save hub section' })).toBeInTheDocument();
      expect(screen.getByLabelText('Section name')).toHaveValue('Saved clock deck');
      expect(screen.getByLabelText('Attached hub lesson')).toHaveValue('clock');
      expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
        'data-show-hour-hand',
        'false'
      );
    });
  });

  it('keeps the structure tab active when an engine deep link also requests runtime', () => {
    searchParamsState.value = new URLSearchParams(
      'engineId=classification-engine&tab=runtime'
    );
    pageDataState.value = createKangurGameLibraryPageDataFromGames({
      filter: { engineId: 'classification-engine' },
      games: createDefaultKangurGames(),
    });

    render(<GamesLibrary />);

    expect(screen.getByRole('tab', { name: 'Structure' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByRole('tab', { name: 'Runtime' })).toHaveAttribute(
      'aria-selected',
      'false'
    );
    expect(replaceMock).toHaveBeenCalledWith(
      '/games?engineId=classification-engine&tab=structure',
      {
        pageKey: 'GamesLibrary',
        scroll: false,
        sourceId: 'kangur-games-library:query-normalize',
      }
    );
  });
});
