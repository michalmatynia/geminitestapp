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
  lessonGameSectionsByGameIdState,
  lessonGameSectionsPendingState,
  replaceLessonGameSectionsPendingState,
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
  lessonGameSectionsByGameIdState: {
    value: {} as Record<string, Array<Record<string, unknown>>>,
  },
  lessonGameSectionsPendingState: {
    value: false,
  },
  replaceLessonGameSectionsPendingState: {
    value: false,
  },
  replaceLessonGameSectionsMutateAsyncMock: vi.fn(async (input: { sections: Array<Record<string, unknown>> }) => {
    lessonGameSectionsState.value = input.sections;
    if ('gameId' in input && typeof input.gameId === 'string') {
      lessonGameSectionsByGameIdState.value[input.gameId] = input.sections;
    }
    return input.sections;
  }),
  useKangurGameLibraryPageMock: vi.fn(),
}));
const ALL_TEST_GAMES = createDefaultKangurGames();

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
  'KangurGamesLibraryPage.actions.openGame': 'Open game',
  'KangurGamesLibraryPage.actions.openLessons': 'Open lessons',
  'KangurGamesLibraryPage.modal.draftEyebrow': 'Hub section draft',
  'KangurGamesLibraryPage.modal.draftTitle': 'Create a new hub game section',
  'KangurGamesLibraryPage.modal.editDraftTitle': 'Edit saved hub game section',
  'KangurGamesLibraryPage.modal.draftNameLabel': 'Section name',
  'KangurGamesLibraryPage.modal.draftNamePlaceholder': 'Clock challenge',
  'KangurGamesLibraryPage.modal.draftSubtextLabel': 'Section subtext',
  'KangurGamesLibraryPage.modal.draftSubtextPlaceholder':
    'Write a short subtext for the lesson hub card.',
  'KangurGamesLibraryPage.modal.draftIconLabel': 'Game icon',
  'KangurGamesLibraryPage.modal.draftEnabledLabel': 'Visible in the lesson hub',
  'KangurGamesLibraryPage.modal.draftEnabledDescription':
    'Control whether this hub section shows up in the lesson flow after saving.',
  'KangurGamesLibraryPage.modal.customIconInputLabel': 'Custom game icon',
  'KangurGamesLibraryPage.modal.customIconInputPlaceholder':
    'Paste an emoji or short icon',
  'KangurGamesLibraryPage.modal.customIconPreviewLabel':
    'Selected game icon preview',
  'KangurGamesLibraryPage.modal.draftIconAria': 'Choose {icon} as the game icon',
  'KangurGamesLibraryPage.modal.addDraftButton': 'Add hub section draft',
  'KangurGamesLibraryPage.modal.saveDraftButton': 'Save hub section',
  'KangurGamesLibraryPage.modal.newDraftButton': 'New hub section',
  'KangurGamesLibraryPage.modal.draftListEyebrow': 'Draft list',
  'KangurGamesLibraryPage.modal.draftListTitle': 'Saved hub sections',
  'KangurGamesLibraryPage.modal.draftListSearchLabel': 'Search saved hub sections',
  'KangurGamesLibraryPage.modal.draftListSearchPlaceholder': 'Search saved hub sections',
  'KangurGamesLibraryPage.modal.draftListClearFiltersButton': 'Clear list filters',
  'KangurGamesLibraryPage.modal.draftListStatusFilterLabel':
    'Filter saved hub sections by status',
  'KangurGamesLibraryPage.modal.draftListStatusFilterAll': 'All',
  'KangurGamesLibraryPage.modal.draftListStatusFilterEnabled': 'Enabled',
  'KangurGamesLibraryPage.modal.draftListStatusFilterDisabled': 'Disabled',
  'KangurGamesLibraryPage.modal.draftListSearchEmpty':
    'No saved hub sections match the current filters.',
  'KangurGamesLibraryPage.modal.draftListEmpty': 'No hub sections drafted yet.',
  'KangurGamesLibraryPage.modal.editDraftButton': 'Edit',
  'KangurGamesLibraryPage.modal.duplicateDraftButton': 'Duplicate',
  'KangurGamesLibraryPage.modal.duplicateDraftSuffix': 'Copy',
  'KangurGamesLibraryPage.modal.moveDraftUpButton': 'Move up',
  'KangurGamesLibraryPage.modal.moveDraftDownButton': 'Move down',
  'KangurGamesLibraryPage.modal.enableDraftButton': 'Enable',
  'KangurGamesLibraryPage.modal.disableDraftButton': 'Disable',
  'KangurGamesLibraryPage.modal.enabledBadge': 'Enabled',
  'KangurGamesLibraryPage.modal.disabledBadge': 'Disabled',
  'KangurGamesLibraryPage.modal.dirtyBadge': 'Unsaved changes',
  'KangurGamesLibraryPage.modal.editingBadge': 'Editing',
  'KangurGamesLibraryPage.modal.discardChangesButton': 'Discard changes',
  'KangurGamesLibraryPage.modal.removeDraftButton': 'Remove',
  'KangurGamesLibraryPage.modal.syncPending': 'Saving hub sections...',
  'KangurGamesLibraryPage.modal.syncError':
    "We couldn't save the last hub change. The editor state was restored.",
  'KangurGamesLibraryPage.modal.sectionsLoading': 'Loading saved hub sections...',
  'KangurGamesLibraryPage.modal.settingsEyebrow': 'Preview settings',
  'KangurGamesLibraryPage.modal.settingsTitle': 'Clock preview settings',
  'KangurGamesLibraryPage.modal.resetPreviewSettingsButton': 'Reset preview defaults',
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
  'KangurGamesLibraryPage.modal.settings.clockSectionLabel': 'Clock focus',
  'KangurGamesLibraryPage.modal.settings.clockSectionHours': 'Hours',
  'KangurGamesLibraryPage.modal.settings.clockSectionMinutes': 'Minutes',
  'KangurGamesLibraryPage.modal.settings.clockSectionCombined': 'Hours + minutes',
  'KangurGamesLibraryPage.modal.settings.initialModeLabel': 'Initial mode',
  'KangurGamesLibraryPage.modal.settings.initialModePractice': 'Practice',
  'KangurGamesLibraryPage.modal.settings.initialModeChallenge': 'Challenge',
  'KangurGamesLibraryPage.modal.settingsSummary.hourHandHidden': 'Hour hand hidden',
  'KangurGamesLibraryPage.modal.settingsSummary.minuteHandHidden': 'Minute hand hidden',
  'KangurGamesLibraryPage.modal.settingsSummary.modeSwitchHidden': 'Mode switch hidden',
  'KangurGamesLibraryPage.modal.settingsSummary.taskTitleHidden': 'Task title hidden',
  'KangurGamesLibraryPage.modal.settingsSummary.timeDisplayHidden': 'Time display hidden',
  'KangurGamesLibraryPage.modal.validation.attachedLessonRequired':
    'Attach this game section to a lesson hub before saving.',
  'KangurGamesLibraryPage.modal.validation.sectionNameRequired':
    'Add a section name before saving.',
  'KangurGamesLibraryPage.modal.validation.gameIconRequired':
    'Choose or enter a game icon before saving.',
  'KangurGamesLibraryPage.modal.validation.visibleClockHandRequired':
    'Keep at least one clock hand visible to save this hub section.',
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

vi.mock('@/features/kangur/ui/hooks/useOptionalNextAuthSession', () => ({
  useOptionalNextAuthSession: () => sessionState.value,
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
    'aria-disabled': ariaDisabled,
    children,
    className,
    disabled,
    href,
    onClick,
    tabIndex,
    targetPageKey: _targetPageKey,
    transitionAcknowledgeMs: _transitionAcknowledgeMs,
    transitionSourceId: _transitionSourceId,
    ...props
  }: {
    'aria-disabled'?: string;
    children: React.ReactNode;
    className?: string;
    disabled?: boolean;
    href: string;
    onClick?: React.MouseEventHandler<HTMLAnchorElement>;
    tabIndex?: number;
    targetPageKey?: string | null;
    transitionAcknowledgeMs?: number;
    transitionSourceId?: string | null;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a
      aria-disabled={disabled ? 'true' : ariaDisabled}
      className={className}
      href={href}
      onClick={(event) => {
        if (disabled) {
          event.preventDefault();
          event.stopPropagation();
          return;
        }

        onClick?.(event);
      }}
      tabIndex={disabled ? -1 : tabIndex}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock('@/shared/ui/searchable-select', () => ({
  SearchableSelect: ({
    disabled,
    label,
    options,
    value,
    onChange,
  }: {
    disabled?: boolean;
    label?: string;
    options: Array<{ label: string; value: string }>;
    value?: string | null;
    onChange: (value: string | null) => void;
  }) => (
    <label>
      <span>{label}</span>
      <select
        aria-label={label}
        disabled={disabled}
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
    section = 'mixed',
    showHourHand = true,
    showMinuteHand = true,
    showTaskTitle = true,
    showTimeDisplay = true,
  }: Record<string, unknown>) => (
    <div
      data-hide-mode-switch={String(hideModeSwitch)}
      data-initial-mode={String(initialMode)}
      data-section={String(section)}
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
  useKangurLessonGameSections: (input?: { gameId?: string }) => ({
    data:
      (input?.gameId ? lessonGameSectionsByGameIdState.value[input.gameId] : undefined) ??
      lessonGameSectionsState.value,
    isPending: lessonGameSectionsPendingState.value,
  }),
  useReplaceKangurLessonGameSections: () => ({
    isPending: replaceLessonGameSectionsPendingState.value,
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
    ...props
  }: React.HTMLAttributes<HTMLSpanElement> & {
    children: React.ReactNode;
  }) => <span {...props}>{children}</span>,
  KangurTextField: ({
    accent: _accent,
    size: _size,
    ...props
  }: React.InputHTMLAttributes<HTMLInputElement> & Record<string, unknown>) => (
    <input {...props} />
  ),
}));

import GamesLibrary from '@/features/kangur/ui/pages/GamesLibrary';

const buildPageDataForGameIds = (...gameIds: string[]) =>
  createKangurGameLibraryPageDataFromGames({
    games: structuredClone(
      gameIds.length === 0
        ? ALL_TEST_GAMES
        : ALL_TEST_GAMES.filter((game) => gameIds.includes(game.id))
    ),
  });

const openRuntimeTab = (): void => {
  fireEvent.click(screen.getByRole('tab', { name: 'Runtime' }));
};

describe('GamesLibrary serialization audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsState.value = new URLSearchParams();
    lessonGameSectionsState.value = [];
    lessonGameSectionsByGameIdState.value = {};
    lessonGameSectionsPendingState.value = false;
    replaceLessonGameSectionsPendingState.value = false;
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
    pageDataState.value = buildPageDataForGameIds();
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
    pageDataState.value = buildPageDataForGameIds('clock_training');
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

  it('shows the current unsaved attached lesson in the linked lesson chip list', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));
    fireEvent.change(screen.getByLabelText('Attached hub lesson'), {
      target: { value: 'calendar' },
    });

    const linkedLessons = screen.getByTestId('games-library-linked-lessons');

    expect(within(linkedLessons).getByText('Nauka kalendarza')).toBeInTheDocument();
    expect(screen.getByText('The current editor is mapped to Nauka kalendarza.')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Attached hub lesson'), {
      target: { value: '' },
    });

    expect(within(linkedLessons).getAllByText('No lesson attached yet').length).toBeGreaterThan(0);
    expect(screen.getByText('The current editor is mapped to No lesson attached yet.')).toBeInTheDocument();
  });

  it('opens the game modal from the game card keyboard trigger', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    expect(clockCard).toHaveAttribute('role', 'button');
    expect(clockCard).toHaveAttribute('tabindex', '0');

    fireEvent.keyDown(clockCard, { key: 'Enter' });

    expect(screen.getByTestId('games-library-game-modal')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('games-library-game-modal')).getByRole('heading', {
        name: 'Clock Training',
      })
    ).toBeInTheDocument();
  });

  it('blocks hub mutations while saved sections are still loading', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
    lessonGameSectionsPendingState.value = true;

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    expect(screen.getByTestId('games-library-sections-loading')).toHaveTextContent(
      'Loading saved hub sections...'
    );
    expect(screen.getByRole('button', { name: 'Add hub section draft' })).toBeDisabled();
    expect(screen.getByLabelText('Attached hub lesson')).toBeDisabled();
    expect(screen.getByLabelText('Section name')).toBeDisabled();
    expect(screen.getByLabelText('Section subtext')).toBeDisabled();
    expect(screen.queryByText('No hub sections drafted yet.')).toBeNull();
  });

  it('blocks editor interactions while a hub mutation is pending', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
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
    replaceLessonGameSectionsPendingState.value = true;

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    expect(screen.getByTestId('games-library-sync-pending')).toHaveTextContent(
      'Saving hub sections...'
    );
    expect(screen.getByRole('button', { name: 'Save hub section' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'New hub section' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Hide settings' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
    expect(screen.getByLabelText('Attached hub lesson')).toBeDisabled();
    expect(screen.getByLabelText('Section name')).toBeDisabled();
    expect(screen.getByLabelText('Section subtext')).toBeDisabled();
    expect(screen.getByLabelText('Clock focus')).toBeDisabled();
    expect(screen.getByLabelText('Initial mode')).toBeDisabled();
    expect(
      within(screen.getByTestId('games-library-saved-section-clock_secondary_section')).getByRole(
        'button',
        { name: 'Edit: Fallback clock deck' }
      )
    ).toBeDisabled();
    expect(
      within(screen.getByTestId('games-library-saved-section-clock_saved_section')).getByRole(
        'button',
        { name: 'Disable: Saved clock deck' }
      )
    ).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.getByTestId('games-library-game-modal')).toBeInTheDocument();
    expect(screen.getByText('Clock preview settings')).toBeInTheDocument();
  });

  it('loads a saved hub section into the editor and persists updates on the same record', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
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

    fireEvent.click(
      within(screen.getByTestId('games-library-saved-section-clock_saved_section')).getByRole(
        'button',
        { name: 'Edit: Saved clock deck' }
      )
    );
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

  it('updates clock focus independently from clock hand visibility', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
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

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    expect(screen.getByLabelText('Clock focus')).toHaveValue('hours');
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-section',
      'hours'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-hour-hand',
      'true'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-minute-hand',
      'true'
    );

    fireEvent.change(screen.getByLabelText('Clock focus'), {
      target: { value: 'minutes' },
    });

    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-section',
      'minutes'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-hour-hand',
      'true'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-minute-hand',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save hub section' }));

    expect(replaceLessonGameSectionsMutateAsyncMock).toHaveBeenLastCalledWith({
      gameId: 'clock_training',
      sections: [
        expect.objectContaining({
          id: 'clock_saved_section',
          settings: expect.objectContaining({
            clock: expect.objectContaining({
              clockSection: 'minutes',
              showHourHand: true,
              showMinuteHand: true,
            }),
          }),
        }),
      ],
    });
  });

  it('shows a validation message when both clock hands are hidden', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));
    fireEvent.click(screen.getByLabelText('Show hour hand'));
    fireEvent.click(screen.getByLabelText('Show minute hand'));

    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-hour-hand',
      'false'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-minute-hand',
      'false'
    );
    expect(screen.getByRole('button', { name: 'Add hub section draft' })).toBeDisabled();
    expect(screen.getByTestId('games-library-draft-validation')).toHaveTextContent(
      'Keep at least one clock hand visible to save this hub section.'
    );

    fireEvent.click(screen.getByLabelText('Show minute hand'));

    expect(screen.getByRole('button', { name: 'Add hub section draft' })).toBeEnabled();
    expect(screen.queryByTestId('games-library-draft-validation')).toBeNull();
  });

  it('shows required-field validation when lesson, name, and icon are missing', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));
    fireEvent.change(screen.getByLabelText('Attached hub lesson'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: '' },
    });
    fireEvent.change(screen.getByLabelText('Custom game icon'), {
      target: { value: '' },
    });

    const validation = screen.getByTestId('games-library-draft-validation');

    expect(screen.getByRole('button', { name: 'Add hub section draft' })).toBeDisabled();
    expect(validation).toHaveTextContent(
      'Attach this game section to a lesson hub before saving.'
    );
    expect(validation).toHaveTextContent('Add a section name before saving.');
    expect(validation).toHaveTextContent('Choose or enter a game icon before saving.');
  });

  it('resets clock preview settings back to the default scaffold state', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    const resetButton = screen.getByRole('button', { name: 'Reset preview defaults' });
    expect(resetButton).toBeDisabled();

    fireEvent.click(screen.getByLabelText('Show minute hand'));
    fireEvent.change(screen.getByLabelText('Clock focus'), {
      target: { value: 'minutes' },
    });
    fireEvent.change(screen.getByLabelText('Initial mode'), {
      target: { value: 'challenge' },
    });

    expect(resetButton).toBeEnabled();
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-minute-hand',
      'false'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-section',
      'minutes'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-initial-mode',
      'challenge'
    );

    fireEvent.click(resetButton);

    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-minute-hand',
      'true'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-section',
      'combined'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-initial-mode',
      'practice'
    );
    expect(resetButton).toBeDisabled();
  });

  it('discards unsaved editor changes for the selected saved section', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
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

    expect(screen.queryByText('Unsaved changes')).toBeNull();

    fireEvent.change(screen.getByLabelText('Attached hub lesson'), {
      target: { value: 'calendar' },
    });
    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: 'Unsaved clock deck' },
    });
    fireEvent.change(screen.getByLabelText('Clock focus'), {
      target: { value: 'hours' },
    });

    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeInTheDocument();
    expect(screen.getByLabelText('Attached hub lesson')).toHaveValue('calendar');
    expect(screen.getByLabelText('Section name')).toHaveValue('Unsaved clock deck');
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-section',
      'hours'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(screen.queryByText('Unsaved changes')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Discard changes' })).toBeNull();
    expect(screen.getByLabelText('Attached hub lesson')).toHaveValue('clock');
    expect(screen.getByLabelText('Section name')).toHaveValue('Saved clock deck');
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-section',
      'minutes'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-hour-hand',
      'false'
    );
  });

  it('lets the editor save a section as disabled before persisting', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
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

    expect(screen.getByTestId('games-library-draft-status')).toHaveTextContent('Enabled');
    fireEvent.click(screen.getByLabelText('Visible in the lesson hub'));

    expect(screen.getByTestId('games-library-draft-status')).toHaveTextContent('Disabled');
    fireEvent.click(screen.getByRole('button', { name: 'Save hub section' }));

    expect(replaceLessonGameSectionsMutateAsyncMock).toHaveBeenLastCalledWith({
      gameId: 'clock_training',
      sections: [
        expect.objectContaining({
          id: 'clock_saved_section',
          enabled: false,
        }),
      ],
    });
  });

  it('lets the editor save a custom icon for a hub section', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));
    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: 'Custom icon deck' },
    });
    fireEvent.change(screen.getByLabelText('Section subtext'), {
      target: { value: 'Uses a custom icon.' },
    });
    fireEvent.change(screen.getByLabelText('Custom game icon'), {
      target: { value: '🦊' },
    });

    expect(screen.getByTestId('games-library-draft-icon-preview')).toHaveTextContent('🦊');

    fireEvent.click(screen.getByRole('button', { name: 'Add hub section draft' }));

    expect(replaceLessonGameSectionsMutateAsyncMock).toHaveBeenLastCalledWith({
      gameId: 'clock_training',
      sections: [
        expect.objectContaining({
          title: 'Custom icon deck',
          emoji: '🦊',
        }),
      ],
    });
  });

  it('filters saved hub sections by search query', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
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

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));
    const savedSectionsSearch = screen.getByRole('searchbox', {
      name: 'Search saved hub sections',
    });

    fireEvent.change(savedSectionsSearch, {
      target: { value: 'fallback' },
    });

    expect(screen.queryByTestId('games-library-saved-section-clock_saved_section')).toBeNull();
    expect(screen.getByTestId('games-library-saved-section-clock_secondary_section')).toBeInTheDocument();

    fireEvent.change(savedSectionsSearch, {
      target: { value: 'missing section' },
    });

    expect(screen.getByTestId('games-library-saved-section-search-empty')).toHaveTextContent(
      'No saved hub sections match the current filters.'
    );

    fireEvent.change(savedSectionsSearch, {
      target: { value: 'nauka kalendarza' },
    });

    expect(screen.getByTestId('games-library-saved-section-clock_secondary_section')).toBeInTheDocument();
  });

  it('filters saved hub sections by enabled status', () => {
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
        enabled: false,
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

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));
    fireEvent.click(
      within(screen.getByRole('radiogroup', { name: 'Filter saved hub sections by status' })).getByRole(
        'radio',
        { name: 'Disabled' }
      )
    );

    expect(screen.queryByTestId('games-library-saved-section-clock_saved_section')).toBeNull();
    expect(screen.getByTestId('games-library-saved-section-clock_secondary_section')).toBeInTheDocument();
  });

  it('clears saved hub section list filters in one action', () => {
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
        enabled: false,
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

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    const savedSectionsSearch = screen.getByRole('searchbox', {
      name: 'Search saved hub sections',
    });
    const savedSectionsStatusFilter = within(
      screen.getByRole('radiogroup', { name: 'Filter saved hub sections by status' })
    );

    fireEvent.change(savedSectionsSearch, {
      target: { value: 'saved' },
    });
    fireEvent.click(savedSectionsStatusFilter.getByRole('radio', { name: 'Disabled' }));

    expect(screen.getByTestId('games-library-saved-section-search-empty')).toHaveTextContent(
      'No saved hub sections match the current filters.'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Clear list filters' }));

    expect(savedSectionsSearch).toHaveValue('');
    expect(savedSectionsStatusFilter.getByRole('radio', { name: 'All' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    expect(screen.getByTestId('games-library-saved-section-clock_saved_section')).toBeInTheDocument();
    expect(screen.getByTestId('games-library-saved-section-clock_secondary_section')).toBeInTheDocument();
  });

  it('duplicates a saved hub section into a new draft with copied settings', () => {
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
    fireEvent.click(
      within(screen.getByTestId('games-library-saved-section-clock_saved_section')).getByRole(
        'button',
        { name: 'Duplicate: Saved clock deck' }
      )
    );

    expect(screen.getByRole('button', { name: 'Add hub section draft' })).toBeInTheDocument();
    expect(screen.getByLabelText('Section name')).toHaveValue('Saved clock deck Copy');
    expect(screen.getByLabelText('Attached hub lesson')).toHaveValue('clock');
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-section',
      'minutes'
    );
    expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
      'data-show-hour-hand',
      'false'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add hub section draft' }));

    expect(replaceLessonGameSectionsMutateAsyncMock).toHaveBeenLastCalledWith({
      gameId: 'clock_training',
      sections: [
        expect.objectContaining({
          id: 'clock_saved_section',
          title: 'Saved clock deck',
        }),
        expect.objectContaining({
          id: expect.not.stringMatching(/^clock_saved_section$/),
          title: 'Saved clock deck Copy',
          lessonComponentId: 'clock',
          sortOrder: 2,
          settings: expect.objectContaining({
            clock: expect.objectContaining({
              clockSection: 'minutes',
              initialMode: 'challenge',
              showHourHand: false,
              showMinuteHand: true,
            }),
          }),
        }),
      ],
    });
  });

  it('shows a compact clock settings summary for saved hub sections', () => {
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
            showModeSwitch: false,
            showTaskTitle: false,
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

    const settingsSummary = within(
      screen.getByTestId('games-library-saved-section-settings-clock_saved_section')
    );

    expect(settingsSummary.getByText('Minutes')).toBeInTheDocument();
    expect(settingsSummary.getByText('Challenge')).toBeInTheDocument();
    expect(settingsSummary.getByText('Hour hand hidden')).toBeInTheDocument();
    expect(settingsSummary.getByText('Mode switch hidden')).toBeInTheDocument();
    expect(settingsSummary.getByText('Task title hidden')).toBeInTheDocument();
    expect(settingsSummary.getByText('Time display hidden')).toBeInTheDocument();
    expect(settingsSummary.queryByText('Minute hand hidden')).toBeNull();
  });

  it('preserves the enabled state when duplicating a disabled saved section', () => {
    lessonGameSectionsState.value = [
      {
        id: 'clock_saved_section',
        lessonComponentId: 'clock',
        gameId: 'clock_training',
        title: 'Saved clock deck',
        description: 'Saved section from the lesson hub.',
        emoji: '🧩',
        sortOrder: 1,
        enabled: false,
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
    fireEvent.click(
      within(screen.getByTestId('games-library-saved-section-clock_saved_section')).getByRole(
        'button',
        { name: 'Duplicate: Saved clock deck' }
      )
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add hub section draft' }));

    expect(replaceLessonGameSectionsMutateAsyncMock).toHaveBeenLastCalledWith({
      gameId: 'clock_training',
      sections: [
        expect.objectContaining({
          id: 'clock_saved_section',
          enabled: false,
        }),
        expect.objectContaining({
          title: 'Saved clock deck Copy',
          enabled: false,
        }),
      ],
    });
  });

  it('keeps clock preview settings hidden when switching editor modes inside the modal', () => {
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

    expect(screen.getByText('Clock preview settings')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Hide settings' }));
    expect(screen.queryByText('Clock preview settings')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'New hub section' }));
    expect(screen.queryByText('Clock preview settings')).toBeNull();

    fireEvent.click(
      within(screen.getByTestId('games-library-saved-section-clock_saved_section')).getByRole(
        'button',
        { name: 'Edit: Saved clock deck' }
      )
    );
    expect(screen.queryByText('Clock preview settings')).toBeNull();
  });

  it('reorders saved hub sections and persists normalized sort order', () => {
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

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));
    fireEvent.click(
      within(screen.getByTestId('games-library-saved-section-clock_secondary_section')).getByRole(
        'button',
        { name: 'Move up: Fallback clock deck' }
      )
    );

    expect(replaceLessonGameSectionsMutateAsyncMock).toHaveBeenLastCalledWith({
      gameId: 'clock_training',
      sections: [
        expect.objectContaining({
          id: 'clock_secondary_section',
          sortOrder: 1,
        }),
        expect.objectContaining({
          id: 'clock_saved_section',
          sortOrder: 2,
        }),
      ],
    });

    expect(
      Array.from(
        document.querySelectorAll(
          '[data-testid^="games-library-saved-section-"]:not([data-testid^="games-library-saved-section-settings-"])'
        )
      ).map((node) => node.getAttribute('data-testid'))
    ).toEqual([
      'games-library-saved-section-clock_secondary_section',
      'games-library-saved-section-clock_saved_section',
    ]);
  });

  it('toggles a saved hub section between enabled and disabled states', async () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
    lessonGameSectionsState.value = [
      {
        id: 'clock_saved_section',
        lessonComponentId: 'clock',
        gameId: 'clock_training',
        title: 'Saved clock deck',
        description: 'Saved section from the lesson hub.',
        emoji: '🧩',
        sortOrder: 1,
        enabled: false,
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

    const savedSection = screen.getByTestId('games-library-saved-section-clock_saved_section');
    expect(within(savedSection).getByText('Disabled')).toBeInTheDocument();
    expect(screen.getByTestId('games-library-draft-status')).toHaveTextContent('Disabled');

    fireEvent.click(
      within(savedSection).getByRole('button', { name: 'Enable: Saved clock deck' })
    );

    await waitFor(() => {
      expect(replaceLessonGameSectionsMutateAsyncMock).toHaveBeenLastCalledWith({
        gameId: 'clock_training',
        sections: [
          expect.objectContaining({
            id: 'clock_saved_section',
            enabled: true,
            sortOrder: 1,
          }),
        ],
      });
      expect(within(savedSection).getByText('Enabled')).toBeInTheDocument();
      expect(screen.getByTestId('games-library-draft-status')).toHaveTextContent('Enabled');
      expect(
        within(savedSection).getByRole('button', { name: 'Disable: Saved clock deck' })
      ).toBeInTheDocument();
    });
  });

  it('preserves a disabled section when saving edits to the same record', async () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
    lessonGameSectionsState.value = [
      {
        id: 'clock_saved_section',
        lessonComponentId: 'clock',
        gameId: 'clock_training',
        title: 'Saved clock deck',
        description: 'Saved section from the lesson hub.',
        emoji: '🧩',
        sortOrder: 1,
        enabled: false,
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

    expect(screen.getByTestId('games-library-draft-status')).toHaveTextContent('Disabled');

    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: 'Updated disabled clock deck' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save hub section' }));

    await waitFor(() => {
      expect(replaceLessonGameSectionsMutateAsyncMock).toHaveBeenLastCalledWith({
        gameId: 'clock_training',
        sections: [
          expect.objectContaining({
            id: 'clock_saved_section',
            enabled: false,
            title: 'Updated disabled clock deck',
          }),
        ],
      });
      expect(screen.getByTestId('games-library-draft-status')).toHaveTextContent('Disabled');
      expect(
        within(screen.getByTestId('games-library-saved-section-clock_saved_section')).getByRole(
          'button',
          { name: 'Enable: Updated disabled clock deck' }
        )
      ).toBeInTheDocument();
    });
  });

  it('keeps unsaved editor changes while reordering a different saved section', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
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

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: 'Unsaved editor change' },
    });
    fireEvent.change(screen.getByLabelText('Section subtext'), {
      target: { value: 'Keep this unsaved text while the list reorders.' },
    });

    fireEvent.click(
      within(screen.getByTestId('games-library-saved-section-clock_secondary_section')).getByRole(
        'button',
        { name: 'Move up: Fallback clock deck' }
      )
    );

    expect(screen.getByLabelText('Section name')).toHaveValue('Unsaved editor change');
    expect(screen.getByLabelText('Section subtext')).toHaveValue(
      'Keep this unsaved text while the list reorders.'
    );
  });

  it('keeps unsaved editor changes while deleting a different saved section', async () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
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

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: 'Unsaved editor change' },
    });
    fireEvent.change(screen.getByLabelText('Section subtext'), {
      target: { value: 'Keep this unsaved text while the other section is removed.' },
    });

    fireEvent.click(
      within(screen.getByTestId('games-library-saved-section-clock_secondary_section')).getByRole(
        'button',
        { name: 'Remove: Fallback clock deck' }
      )
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Section name')).toHaveValue('Unsaved editor change');
      expect(screen.getByLabelText('Section subtext')).toHaveValue(
        'Keep this unsaved text while the other section is removed.'
      );
      expect(
        screen.queryByTestId('games-library-saved-section-clock_secondary_section')
      ).toBeNull();
    });

    expect(replaceLessonGameSectionsMutateAsyncMock).toHaveBeenLastCalledWith({
      gameId: 'clock_training',
      sections: [
        expect.objectContaining({
          id: 'clock_saved_section',
          sortOrder: 1,
        }),
      ],
    });
  });

  it('resets unsaved editor state when the modal is closed and reopened for the same game', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
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
    fireEvent.click(screen.getByRole('button', { name: 'New hub section' }));
    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: 'Temporary unsaved draft' },
    });
    fireEvent.change(screen.getByLabelText('Section subtext'), {
      target: { value: 'This should not survive a close and reopen.' },
    });
    fireEvent.change(screen.getByLabelText('Attached hub lesson'), {
      target: { value: 'calendar' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByTestId('games-library-game-modal')).toBeNull();

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    expect(screen.getByRole('button', { name: 'Save hub section' })).toBeInTheDocument();
    expect(screen.getByLabelText('Attached hub lesson')).toHaveValue('clock');
    expect(screen.getByLabelText('Section name')).toHaveValue('Saved clock deck');
    expect(screen.getByLabelText('Section subtext')).toHaveValue(
      'Saved section from the lesson hub.'
    );
  });

  it('switches the open modal to the newly selected game without leaking the previous editor state', () => {
    pageDataState.value = buildPageDataForGameIds('clock_training', 'division_groups');
    lessonGameSectionsByGameIdState.value = {
      clock_training: [
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
      ],
      division_groups: [
        {
          id: 'division_saved_section',
          lessonComponentId: 'division',
          gameId: 'division_groups',
          title: 'Saved division deck',
          description: 'Division section from the lesson hub.',
          emoji: '➗',
          sortOrder: 1,
          enabled: true,
          settings: {},
        },
      ],
    };

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    const divisionCard = document.getElementById('kangur-game-card-division_groups');

    if (!clockCard || !divisionCard) {
      throw new Error('Expected clock and division game cards to be rendered.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    expect(screen.getByRole('button', { name: 'Save hub section' })).toBeInTheDocument();
    expect(screen.getByLabelText('Section name')).toHaveValue('Saved clock deck');
    expect(screen.getByLabelText('Section subtext')).toHaveValue(
      'Saved section from the lesson hub.'
    );
    expect(screen.getByText('Clock preview settings')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'New hub section' }));
    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: 'Temporary clock draft' },
    });
    fireEvent.change(screen.getByLabelText('Section subtext'), {
      target: { value: 'This should not leak into division.' },
    });

    fireEvent.click(within(divisionCard).getByRole('button', { name: 'Preview & map' }));

    expect(screen.getByRole('button', { name: 'Save hub section' })).toBeInTheDocument();
    expect(screen.getByLabelText('Section name')).toHaveValue('Saved division deck');
    expect(screen.getByLabelText('Section subtext')).toHaveValue(
      'Division section from the lesson hub.'
    );
    expect(screen.queryByText('Clock preview settings')).toBeNull();
    expect(screen.queryByTestId('clock-training-game-preview')).toBeNull();
    expect(
      within(screen.getByTestId('games-library-game-modal')).getByRole('heading', {
        name: 'Division Groups',
      })
    ).toBeInTheDocument();
  });

  it('keeps a new hub section draft in the editor when saving fails', async () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
    replaceLessonGameSectionsMutateAsyncMock.mockImplementationOnce(async () => {
      throw new Error('save failed');
    });

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));

    fireEvent.change(screen.getByLabelText('Attached hub lesson'), {
      target: { value: 'calendar' },
    });
    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: 'Unsaved clock deck' },
    });
    fireEvent.change(screen.getByLabelText('Section subtext'), {
      target: { value: 'Keep this new draft in the editor.' },
    });
    fireEvent.click(screen.getByLabelText('Show minute hand'));
    fireEvent.click(screen.getByRole('button', { name: 'Add hub section draft' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Add hub section draft' })).toBeInTheDocument();
      expect(screen.getByLabelText('Attached hub lesson')).toHaveValue('calendar');
      expect(screen.getByLabelText('Section name')).toHaveValue('Unsaved clock deck');
      expect(screen.getByLabelText('Section subtext')).toHaveValue(
        'Keep this new draft in the editor.'
      );
      expect(screen.getByTestId('games-library-sync-error')).toHaveTextContent(
        "We couldn't save the last hub change. The editor state was restored."
      );
      expect(screen.getByTestId('clock-training-game-preview')).toHaveAttribute(
        'data-show-minute-hand',
        'false'
      );
    });

    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: 'Unsaved clock deck retry' },
    });

    expect(screen.queryByTestId('games-library-sync-error')).toBeNull();
  });

  it('clears stale sync errors when switching editor context inside the modal', async () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
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
      throw new Error('save failed');
    });

    render(<GamesLibrary />);

    const clockCard = document.getElementById('kangur-game-card-clock_training');
    if (!clockCard) {
      throw new Error('Clock Training card container not found.');
    }

    fireEvent.click(within(clockCard).getByRole('button', { name: 'Preview & map' }));
    fireEvent.change(screen.getByLabelText('Section name'), {
      target: { value: 'Broken save' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save hub section' }));

    await waitFor(() => {
      expect(screen.getByTestId('games-library-sync-error')).toHaveTextContent(
        "We couldn't save the last hub change. The editor state was restored."
      );
    });

    fireEvent.click(
      within(screen.getByTestId('games-library-game-modal')).getByRole('button', {
        name: 'New hub section',
      })
    );
    expect(screen.queryByTestId('games-library-sync-error')).toBeNull();
    expect(screen.getByRole('button', { name: 'Add hub section draft' })).toBeInTheDocument();

    fireEvent.click(
      within(screen.getByTestId('games-library-saved-section-clock_saved_section')).getByRole(
        'button',
        { name: 'Edit: Saved clock deck' }
      )
    );
    expect(screen.queryByTestId('games-library-sync-error')).toBeNull();
    expect(screen.getByLabelText('Section name')).toHaveValue('Saved clock deck');
  });

  it('restores the edited saved section when deleting it fails', async () => {
    pageDataState.value = buildPageDataForGameIds('clock_training');
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

    fireEvent.click(
      within(screen.getByTestId('games-library-saved-section-clock_saved_section')).getByRole(
        'button',
        { name: 'Remove: Saved clock deck' }
      )
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Save hub section' })).toBeInTheDocument();
      expect(screen.getByLabelText('Section name')).toHaveValue('Saved clock deck');
      expect(screen.getByLabelText('Attached hub lesson')).toHaveValue('clock');
      expect(screen.getByTestId('games-library-sync-error')).toHaveTextContent(
        "We couldn't save the last hub change. The editor state was restored."
      );
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
