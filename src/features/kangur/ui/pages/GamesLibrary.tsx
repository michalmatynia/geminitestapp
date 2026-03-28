'use client';

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import {
  appendKangurUrlParams,
  getKangurCanonicalPublicHref,
  getKangurPageSlug,
} from '@/features/kangur/config/routing';
import {
  KANGUR_AGE_GROUPS,
  KANGUR_LESSON_LIBRARY,
  KANGUR_SUBJECTS,
} from '@/features/kangur/lessons/lesson-catalog';
import {
  getKangurGameLibraryLessonCoverageStatusFromMap,
  type KangurGameLibraryLessonCoverageStatus,
  type KangurGamesLibraryVariantGroupSurface,
} from '@/features/kangur/games';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurLessonTitle,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import PageNotFound from '@/features/kangur/ui/components/PageNotFound';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { getKangurSixYearOldSubjectVisual } from '@/features/kangur/ui/constants/six-year-old-visuals';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurInfoCard,
  KangurMetricCard,
  KangurSelectField,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { useKangurPageAccess } from '@/features/kangur/ui/hooks/useKangurPageAccess';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurGameLibraryPage } from '@/features/kangur/ui/hooks/useKangurGameLibraryPage';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import {
  areGamesLibrarySearchParamsCanonical,
  areGamesLibraryFiltersEqual,
  buildGamesLibraryCatalogFilter,
  DEFAULT_GAMES_LIBRARY_FILTERS,
  getGamesLibrarySearchParams,
  hasActiveGamesLibraryFilters,
  readGamesLibraryTabFromSearchParams,
  readGamesLibraryFiltersFromSearchParams,
  type GamesLibraryFilterState,
  type GamesLibraryTabId,
} from '@/features/kangur/ui/pages/GamesLibrary.filters';
import {
  buildKangurGameLaunchHref,
  buildKangurGameLessonHref,
} from '@/features/kangur/ui/services/game-launch';
import { GamesLibraryGameModal } from '@/features/kangur/ui/pages/GamesLibraryGameModal';
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurGameVariantSurface,
  KangurGameDefinition,
  KangurGameMechanic,
  KangurGameRuntimeSerializationIssueDto,
  KangurGameRuntimeSerializationAuditDto,
  KangurGameRuntimeSerializationSurfaceDto,
  KangurGameSurface,
  KangurGameStatus,
} from '@/shared/contracts/kangur-games';
import { cn } from '@/features/kangur/shared/utils';

const GAMES_LIBRARY_MAIN_ID = 'kangur-games-library-main';

const GAMES_LIBRARY_TABS: Array<{ id: GamesLibraryTabId; labelKey: string }> = [
  {
    id: 'catalog',
    labelKey: 'tabs.catalog',
  },
  {
    id: 'structure',
    labelKey: 'tabs.structure',
  },
  {
    id: 'runtime',
    labelKey: 'tabs.runtime',
  },
];

const GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME =
  'rounded-[2rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_95%,var(--kangur-page-background))] p-5 shadow-[0_28px_84px_-58px_rgba(15,23,42,0.44)] sm:p-6';

const GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME =
  'rounded-[1.4rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_96%,white)] p-4 sm:p-5';

const GAMES_LIBRARY_COMPACT_STAT_CARD_CLASSNAME =
  'rounded-[1.15rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_92%,white)] px-3 py-3';

const GAMES_LIBRARY_DETAIL_SURFACE_CLASSNAME =
  'rounded-[1.15rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_89%,white)] px-3 py-3';

const getGamesLibraryTabIds = (
  tabId: GamesLibraryTabId
): { tabId: string; panelId: string } => ({
  tabId: `kangur-games-library-tab-${tabId}`,
  panelId: `kangur-games-library-panel-${tabId}`,
});

const resolveGamesLibraryAvailableTabIds = (input: {
  engineId: GamesLibraryFilterState['engineId'];
  hasStructureSections: boolean;
  serializationAuditVisible: boolean;
}): GamesLibraryTabId[] =>
  GAMES_LIBRARY_TABS.filter((tab) => {
    switch (tab.id) {
      case 'catalog':
        return true;
      case 'structure':
        return input.hasStructureSections || input.engineId !== 'all';
      case 'runtime':
        return input.serializationAuditVisible;
      default:
        return false;
    }
  }).map((tab) => tab.id);

const resolveGamesLibraryActiveTab = (input: {
  availableTabIds: readonly GamesLibraryTabId[];
  engineId: GamesLibraryFilterState['engineId'];
  gameId: GamesLibraryFilterState['gameId'];
  requestedTab: GamesLibraryTabId | null;
}): GamesLibraryTabId => {
  if (input.gameId !== 'all') {
    return 'catalog';
  }

  if (input.engineId !== 'all' && input.availableTabIds.includes('structure')) {
    return 'structure';
  }

  if (input.requestedTab && input.availableTabIds.includes(input.requestedTab)) {
    return input.requestedTab;
  }

  return input.availableTabIds[0] ?? 'catalog';
};

const formatMechanicLabel = (
  mechanic: KangurGameMechanic,
  translations: ReturnType<typeof useTranslations>
): string => translations(`mechanics.${mechanic}`);

const resolveStatusAccent = (
  status: KangurGameStatus
): 'amber' | 'emerald' | 'slate' => {
  switch (status) {
    case 'draft':
      return 'amber';
    case 'legacy':
      return 'slate';
    case 'active':
    default:
      return 'emerald';
  }
};

const resolveSurfaceAccent = (
  surface: KangurGameSurface
): 'emerald' | 'rose' | 'sky' | 'violet' => {
  switch (surface) {
    case 'lesson':
      return 'emerald';
    case 'game':
      return 'rose';
    case 'duel':
      return 'violet';
    case 'library':
    default:
      return 'sky';
  }
};

const resolveVariantSurfaceAccent = (
  surface: KangurGameVariantSurface
): 'amber' | 'emerald' | 'rose' | 'sky' => {
  switch (surface) {
    case 'lesson_inline':
      return 'emerald';
    case 'lesson_stage':
      return 'amber';
    case 'game_screen':
      return 'rose';
    case 'library_preview':
    default:
      return 'sky';
  }
};

const resolveVariantGroupAccent = (
  surface: KangurGamesLibraryVariantGroupSurface
): 'emerald' | 'rose' | 'sky' => {
  switch (surface) {
    case 'lesson':
      return 'emerald';
    case 'game_screen':
      return 'rose';
    case 'library_preview':
    default:
      return 'sky';
  }
};

const getVariantGroupLabel = (
  surface: KangurGamesLibraryVariantGroupSurface,
  translations: ReturnType<typeof useTranslations>
): string =>
  surface === 'lesson'
    ? translations('surfaces.lesson')
    : translations(`variantSurfaces.${surface}`);

const resolveAgeGroupAccent = (
  ageGroup: NonNullable<KangurGameDefinition['ageGroup']>
): 'amber' | 'sky' | 'slate' => {
  switch (ageGroup) {
    case 'six_year_old':
      return 'amber';
    case 'grown_ups':
      return 'slate';
    case 'ten_year_old':
    default:
      return 'sky';
  }
};

const resolveCoverageAccent = (
  coverageId: 'library_backed' | 'launchable'
): 'rose' | 'sky' => {
  switch (coverageId) {
    case 'launchable':
      return 'rose';
    case 'library_backed':
    default:
      return 'sky';
  }
};

const resolveEngineCategoryAccent = (
  category: 'foundational' | 'early_learning' | 'adult_learning' | null
): 'amber' | 'sky' | 'slate' => {
  switch (category) {
    case 'early_learning':
      return 'amber';
    case 'adult_learning':
      return 'slate';
    case 'foundational':
    default:
      return 'sky';
  }
};

const resolveImplementationOwnershipAccent = (
  ownership: 'mixed_runtime' | 'shared_runtime' | 'lesson_embedded' | null | undefined
): 'amber' | 'emerald' | 'sky' | 'slate' => {
  switch (ownership) {
    case 'lesson_embedded':
      return 'amber';
    case 'mixed_runtime':
      return 'sky';
    case 'shared_runtime':
      return 'emerald';
    default:
      return 'slate';
  }
};

const getSerializationAuditIssueCount = (
  audit:
    | Pick<
        KangurGameRuntimeSerializationAuditDto,
        | 'compatibilityFallbackVariantCount'
        | 'duplicatedLegacyVariantCount'
        | 'legacyLaunchFallbackGameCount'
        | 'missingRuntimeVariantCount'
        | 'nonSharedRuntimeEngineCount'
      >
    | null
    | undefined
): number =>
  (audit?.compatibilityFallbackVariantCount ?? 0) +
  (audit?.duplicatedLegacyVariantCount ?? 0) +
  (audit?.legacyLaunchFallbackGameCount ?? 0) +
  (audit?.missingRuntimeVariantCount ?? 0) +
  (audit?.nonSharedRuntimeEngineCount ?? 0);

const getSerializationSurfaceIssueCount = (
  surface: Pick<
    KangurGameRuntimeSerializationSurfaceDto,
    'compatibilityFallbackVariants' | 'duplicatedLegacyVariants' | 'missingRuntimeVariants'
  >
): number =>
  surface.compatibilityFallbackVariants +
  surface.duplicatedLegacyVariants +
  surface.missingRuntimeVariants;

const resolveSerializationAuditAccent = (
  audit: KangurGameRuntimeSerializationAuditDto | null | undefined
): 'amber' | 'emerald' =>
  getSerializationAuditIssueCount(audit) > 0 ? 'amber' : 'emerald';

const resolveSerializationSurfaceAccent = (
  surface: KangurGameRuntimeSerializationSurfaceDto
): 'amber' | 'emerald' | 'rose' => {
  if (surface.missingRuntimeVariants > 0) {
    return 'rose';
  }

  if (getSerializationSurfaceIssueCount(surface) > 0) {
    return 'amber';
  }

  return 'emerald';
};

const withGamesLibrarySearchParams = (
  href: string,
  searchParams: ReturnType<typeof useSearchParams>
): string => {
  const search = searchParams?.toString() ?? '';

  if (!search) {
    return href;
  }

  const [withoutHash, rawHash = ''] = href.split('#');
  const [withoutQuery = href] = (withoutHash ?? href).split('?');
  const hash = rawHash ? `#${rawHash}` : '';

  return `${withoutQuery}?${search}${hash}`;
};

const getKangurGameCardAnchorId = (gameId: string): string =>
  `kangur-game-card-${gameId}`;

const getKangurEngineCardAnchorId = (engineId: string): string =>
  `kangur-engine-card-${engineId}`;

const isGamesLibraryCardInteractiveTarget = (
  target: EventTarget | null,
  currentTarget?: Element | null
): boolean => {
  if (!(target instanceof Element)) {
    return false;
  }

  const interactiveTarget = target.closest(
    'a, button, input, select, textarea, summary, [role="button"], [role="link"]'
  );

  return interactiveTarget !== null && interactiveTarget !== currentTarget;
};

const withGamesLibraryAnchor = (href: string, anchorId: string): string => {
  const [withoutHash = href] = href.split('#');
  return `${withoutHash}#${anchorId}`;
};

const getSerializationIssueHref = (
  hrefBase: string,
  basePath: string,
  issue: Pick<KangurGameRuntimeSerializationIssueDto, 'targetId' | 'targetKind'>
): string => {
  const anchorId =
    issue.targetKind === 'engine'
      ? getKangurEngineCardAnchorId(issue.targetId)
      : getKangurGameCardAnchorId(issue.targetId);
  const href = appendKangurUrlParams(
    hrefBase,
    issue.targetKind === 'engine'
      ? getGamesLibrarySearchParams(
          {
            ...DEFAULT_GAMES_LIBRARY_FILTERS,
            engineId: issue.targetId,
          },
          'structure'
        )
      : getGamesLibrarySearchParams(
          {
            ...DEFAULT_GAMES_LIBRARY_FILTERS,
            gameId: issue.targetId,
          },
          'catalog'
        ),
    basePath
  );

  return withGamesLibraryAnchor(href, anchorId);
};

const getLessonTitles = (
  lessonComponentIds: readonly KangurLessonComponentId[],
  locale: string
): string[] =>
  lessonComponentIds.map((componentId) =>
    getLocalizedKangurLessonTitle(
      componentId,
      locale,
      KANGUR_LESSON_LIBRARY[componentId]?.title ?? componentId
    )
  );

const resolveLessonCoverageStatusAccent = (
  status: KangurGameLibraryLessonCoverageStatus
): 'rose' | 'sky' | 'slate' => {
  switch (status) {
    case 'launchable':
      return 'rose';
    case 'lesson_only':
      return 'slate';
    case 'library_backed':
    default:
      return 'sky';
  }
};

function GamesLibraryCompactMetric(input: {
  label: React.ReactNode;
  value: React.ReactNode;
  description?: React.ReactNode;
}): React.JSX.Element {
  const { description, label, value } = input;

  return (
    <div className={cn(GAMES_LIBRARY_COMPACT_STAT_CARD_CLASSNAME, 'space-y-1.5')}>
      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
        {label}
      </div>
      <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>{value}</div>
      {description ? (
        <div className='text-xs leading-5 [color:var(--kangur-page-muted-text)]'>
          {description}
        </div>
      ) : null}
    </div>
  );
}

function GamesLibraryDetailSurface(input: {
  children: React.ReactNode;
  className?: string;
  label: React.ReactNode;
}): React.JSX.Element {
  const { children, className, label } = input;

  return (
    <div className={cn(GAMES_LIBRARY_DETAIL_SURFACE_CLASSNAME, 'space-y-2', className)}>
      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
        {label}
      </div>
      <div className='text-sm leading-6 [color:var(--kangur-page-text)]'>{children}</div>
    </div>
  );
}

function GamesLibrarySectionHeader(input: {
  dataTestId?: string;
  description: React.ReactNode;
  eyebrow: React.ReactNode;
  summary?: React.ReactNode;
  summaryClassName?: string;
  title: React.ReactNode;
}): React.JSX.Element {
  const { dataTestId, description, eyebrow, summary, summaryClassName, title } = input;

  return (
    <div
      data-testid={dataTestId}
      className={cn(
        GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
        'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'
      )}
    >
      <div className='space-y-1'>
        <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
          {eyebrow}
        </div>
        <div className='text-2xl font-black [color:var(--kangur-page-text)]'>{title}</div>
        <div className='text-sm [color:var(--kangur-page-muted-text)]'>{description}</div>
      </div>

      {summary ? (
        <div
          className={cn(
            'grid gap-3 sm:grid-cols-2 lg:min-w-[20rem] lg:max-w-[32rem] lg:flex-1',
            summaryClassName
          )}
        >
          {summary}
        </div>
      ) : null}
    </div>
  );
}

function GamesLibrarySidebarSection(input: {
  children: React.ReactNode;
  dataTestId?: string;
  description?: React.ReactNode;
  eyebrow: React.ReactNode;
  isActive?: boolean;
  title: React.ReactNode;
}): React.JSX.Element {
  const { children, dataTestId, description, eyebrow, isActive = false, title } = input;

  return (
    <div
      data-testid={dataTestId}
      data-active={isActive ? 'true' : 'false'}
      className={cn(
        GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
        'space-y-4 transition',
        isActive
          ? 'border-[color:var(--kangur-page-accent)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_90%,white)] shadow-[0_26px_64px_-50px_rgba(59,130,246,0.42)]'
          : '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_96%,white)]'
      )}
    >
      <div className='space-y-1'>
        <div
          className={cn(
            'text-[11px] font-bold uppercase tracking-[0.18em]',
            isActive
              ? '[color:var(--kangur-page-accent)]'
              : '[color:var(--kangur-page-muted-text)]'
          )}
        >
          {eyebrow}
        </div>
        <div
          className={cn(
            'text-base font-black',
            isActive
              ? '[color:color-mix(in_srgb,var(--kangur-page-text)_88%,var(--kangur-page-accent))]'
              : '[color:var(--kangur-page-text)]'
          )}
        >
          {title}
        </div>
        {description ? (
          <div className='text-sm [color:var(--kangur-page-muted-text)]'>{description}</div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function GamesLibraryContent(): React.JSX.Element {
  const locale = useLocale();
  const translations = useTranslations('KangurGamesLibraryPage');
  const searchParams = useSearchParams();
  const { replace: replaceRoute } = useKangurRouteNavigator();
  const { basePath, requestedHref } = useKangurRouting();
  const auth = useKangurAuth();
  const { user, logout } = auth;
  const { openLoginModal } = useKangurLoginModal();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const [filters, setFilters] = useState<GamesLibraryFilterState>(() =>
    readGamesLibraryFiltersFromSearchParams(searchParams)
  );
  const deferredFilters = useDeferredValue(filters);
  const catalogFilter = buildGamesLibraryCatalogFilter(deferredFilters);
  const pageDataQuery = useKangurGameLibraryPage(catalogFilter);
  const pageData = pageDataQuery.data;
  if (pageDataQuery.isError && !pageData) {
    return <PageNotFound />;
  }
  const overview = pageData?.overview;
  const engineOverview = pageData?.engineOverview;
  const coverageResource = pageData?.coverage;
  const coverageGroups = coverageResource?.groups ?? [];
  const coverageStatusMap = coverageResource?.statusMap ?? {};
  const engineGroups = engineOverview?.engineGroups ?? [];
  const drawingGroups = engineOverview?.drawingGroups ?? [];
  const implementationGroups = engineOverview?.implementationGroups ?? [];
  const engineCatalogFacets = engineOverview?.facets;
  const engineCatalogFilterOptions = pageData?.engineFilterOptions;
  const catalogFacets = pageData?.catalogFacets;
  const serializationAudit = pageData?.serializationAudit ?? {
    surfaces: [],
    runtimeBearingVariantCount: 0,
    explicitRuntimeVariantCount: 0,
    compatibilityFallbackVariantCount: 0,
    duplicatedLegacyVariantCount: 0,
    missingRuntimeVariantCount: 0,
    legacyLaunchFallbackGameCount: 0,
    issues: [],
    engineCount: 0,
    sharedRuntimeEngineCount: 0,
    nonSharedRuntimeEngineCount: 0,
    allEnginesSharedRuntime: false,
  };
  const serializationSurfaceAudits = serializationAudit.surfaces ?? [];
  const serializationBacklogEntries = [
    {
      key: 'fallback',
      accent: 'amber' as const,
      issues: serializationAudit.issues.filter(
        (issue) => issue.kind === 'compatibility_fallback_variant'
      ),
      label: translations('serializationAudit.fallbackBacklogLabel'),
    },
    {
      key: 'duplicates',
      accent: 'amber' as const,
      issues: serializationAudit.issues.filter(
        (issue) => issue.kind === 'duplicated_legacy_variant'
      ),
      label: translations('serializationAudit.duplicatesBacklogLabel'),
    },
    {
      key: 'missing',
      accent: 'rose' as const,
      issues: serializationAudit.issues.filter(
        (issue) => issue.kind === 'missing_runtime_variant'
      ),
      label: translations('serializationAudit.missingBacklogLabel'),
    },
    {
      key: 'legacy-games',
      accent: 'amber' as const,
      issues: serializationAudit.issues.filter(
        (issue) => issue.kind === 'legacy_launch_fallback_game'
      ),
      label: translations('serializationAudit.legacyGameBacklogLabel'),
    },
    {
      key: 'engines',
      accent: 'amber' as const,
      issues: serializationAudit.issues.filter(
        (issue) => issue.kind === 'non_shared_runtime_engine'
      ),
      label: translations('serializationAudit.nonSharedBacklogLabel'),
    },
  ].filter((entry) => entry.issues.length > 0);
  const metrics = overview?.metrics ?? {
    engineCount: 0,
    lessonLinkedCount: 0,
    variantCount: 0,
    visibleGameCount: 0,
  };
  const groupedGames = overview?.subjectGroups ?? [];
  const cohortGroups = overview?.cohortGroups ?? [];
  const variantGroups = overview?.variantGroups ?? [];
  const gameFilterOptions = catalogFacets?.games ?? [];
  const focusedGameDefinition =
    filters.gameId === 'all'
      ? null
      : gameFilterOptions.find((game) => game.id === filters.gameId) ?? null;
  const focusedGameEntry =
    filters.gameId === 'all'
      ? null
      : groupedGames
          .flatMap((group) => group.entries)
          .find((entry) => entry.game.id === filters.gameId) ?? null;
  const focusedGameTitle =
    filters.gameId === 'all'
      ? null
      : (focusedGameDefinition?.title ?? focusedGameEntry?.game.title ?? filters.gameId);
  const focusedEngineGroup =
    filters.engineId === 'all'
      ? null
      : engineGroups.find((group) => group.engineId === filters.engineId) ?? null;
  const focusedEngineDefinition =
    filters.engineId === 'all'
      ? null
      : (engineCatalogFilterOptions?.engines ?? []).find(
          (engine) => engine.id === filters.engineId
        ) ?? null;
  const focusedEngineTitle =
    filters.engineId === 'all'
      ? null
      : (focusedEngineDefinition?.title ??
        focusedEngineGroup?.engine?.title ??
        filters.engineId);
  const hasActiveFilters = hasActiveGamesLibraryFilters(filters);
  const visibleGameCount = metrics.visibleGameCount;
  const totalGameCount = catalogFacets?.gameCount ?? visibleGameCount;
  const serializationAuditVisible =
    serializationAudit.runtimeBearingVariantCount > 0 || serializationAudit.engineCount > 0;
  const hasStructureSections =
    implementationGroups.length > 0 ||
    coverageGroups.length > 0 ||
    cohortGroups.length > 0 ||
    drawingGroups.length > 0 ||
    engineGroups.length > 0 ||
    variantGroups.length > 0;
  const currentGamesLibraryHref = withGamesLibrarySearchParams(
    requestedHref ??
      getKangurCanonicalPublicHref([getKangurPageSlug('GamesLibrary')]),
    searchParams
  );
  const requestedTab = readGamesLibraryTabFromSearchParams(searchParams);
  const availableTabIds = useMemo(
    () =>
      resolveGamesLibraryAvailableTabIds({
        engineId: filters.engineId,
        hasStructureSections,
        serializationAuditVisible,
      }),
    [filters.engineId, hasStructureSections, serializationAuditVisible]
  );
  const availableTabs = useMemo(
    () => GAMES_LIBRARY_TABS.filter((tab) => availableTabIds.includes(tab.id)),
    [availableTabIds]
  );
  const catalogSummaryText = hasActiveFilters
    ? translations('filters.summaryFiltered', {
        visible: visibleGameCount,
        total: totalGameCount,
      })
    : translations('filters.summaryAll', { count: totalGameCount });
  const activeFilterBadges = useMemo(() => {
    const badges: Array<{
      accent: 'amber' | 'emerald' | 'rose' | 'sky' | 'slate' | 'violet';
      id: string;
      label: string;
      value: string;
    }> = [];
    const addBadge = (
      id: string,
      label: string,
      value: string,
      accent: 'amber' | 'emerald' | 'rose' | 'sky' | 'slate' | 'violet' = 'slate'
    ): void => {
      badges.push({
        accent,
        id,
        label,
        value,
      });
    };

    if (filters.subject !== 'all') {
      addBadge(
        'subject',
        translations('filters.subject.label'),
        getLocalizedKangurSubjectLabel(
          filters.subject,
          locale,
          KANGUR_SUBJECTS.find((entry) => entry.id === filters.subject)?.label ??
            filters.subject
        ),
        'sky'
      );
    }

    if (filters.ageGroup !== 'all') {
      addBadge(
        'ageGroup',
        translations('filters.ageGroup.label'),
        getLocalizedKangurAgeGroupLabel(
          filters.ageGroup,
          locale,
          KANGUR_AGE_GROUPS.find((entry) => entry.id === filters.ageGroup)?.label ??
            filters.ageGroup
        ),
        resolveAgeGroupAccent(filters.ageGroup)
      );
    }

    if (filters.mechanic !== 'all') {
      addBadge(
        'mechanic',
        translations('filters.mechanic.label'),
        formatMechanicLabel(filters.mechanic, translations),
        'sky'
      );
    }

    if (filters.surface !== 'all') {
      addBadge(
        'surface',
        translations('filters.surface.label'),
        translations(`surfaces.${filters.surface}`),
        resolveSurfaceAccent(filters.surface)
      );
    }

    if (filters.gameStatus !== 'all') {
      addBadge(
        'status',
        translations('filters.status.label'),
        translations(`statuses.${filters.gameStatus}`),
        resolveStatusAccent(filters.gameStatus)
      );
    }

    if (filters.variantSurface !== 'all') {
      addBadge(
        'variantSurface',
        translations('filters.variantSurface.label'),
        translations(`variantSurfaces.${filters.variantSurface}`),
        resolveVariantSurfaceAccent(filters.variantSurface)
      );
    }

    if (filters.variantStatus !== 'all') {
      addBadge(
        'variantStatus',
        translations('filters.variantStatus.label'),
        translations(`statuses.${filters.variantStatus}`),
        resolveStatusAccent(filters.variantStatus)
      );
    }

    if (filters.engineCategory !== 'all') {
      addBadge(
        'engineCategory',
        translations('filters.engineCategory.label'),
        translations(`engineCategories.${filters.engineCategory}`),
        resolveEngineCategoryAccent(filters.engineCategory)
      );
    }

    if (filters.implementationOwnership !== 'all') {
      addBadge(
        'implementationOwnership',
        translations('filters.implementationOwnership.label'),
        translations(`implementationOwnership.${filters.implementationOwnership}`),
        resolveImplementationOwnershipAccent(filters.implementationOwnership)
      );
    }

    if (filters.launchability === 'launchable') {
      addBadge(
        'launchability',
        translations('filters.launchability.label'),
        translations('filters.launchability.launchable'),
        'emerald'
      );
    }

    return badges;
  }, [
    filters.ageGroup,
    filters.engineCategory,
    filters.gameStatus,
    filters.implementationOwnership,
    filters.launchability,
    filters.mechanic,
    filters.subject,
    filters.surface,
    filters.variantStatus,
    filters.variantSurface,
    locale,
    translations,
  ]);
  const focusedGameDescription =
    filters.gameId === 'all'
      ? null
      : translations('focus.gameDescription', {
          game: focusedGameTitle ?? filters.gameId,
        });
  const focusedEngineDescription =
    filters.engineId === 'all'
      ? null
      : translations('focus.engineDescription', {
          engine: focusedEngineTitle ?? filters.engineId,
        });
  const catalogPanelEyebrow =
    filters.gameId === 'all' ? translations('tabs.catalog') : translations('focus.gameTitle');
  const catalogPanelTitle = focusedGameTitle ?? catalogSummaryText;
  const catalogPanelDescription = focusedGameDescription ?? translations('tabs.description');
  const structurePanelEyebrow =
    filters.engineId === 'all'
      ? translations('tabs.structure')
      : translations('focus.engineTitle');
  const structurePanelTitle = focusedEngineTitle ?? catalogSummaryText;
  const structurePanelDescription = focusedEngineDescription ?? translations('tabs.description');

  const navigation = {
    basePath,
    canManageLearners: Boolean(user?.canManageLearners),
    currentPage: 'GamesLibrary' as const,
    guestPlayerName: user ? undefined : guestPlayerName,
    isAuthenticated: Boolean(user),
    onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
    onLogin: openLoginModal,
    onLogout: () => logout(false),
  };

  const applyFilters = (
    nextFilters: GamesLibraryFilterState,
    sourceId: string,
    requestedNextTab: GamesLibraryTabId | null = activeTab
  ): void => {
    const nextActiveTab = resolveGamesLibraryActiveTab({
      availableTabIds: resolveGamesLibraryAvailableTabIds({
        engineId: nextFilters.engineId,
        hasStructureSections,
        serializationAuditVisible,
      }),
      engineId: nextFilters.engineId,
      gameId: nextFilters.gameId,
      requestedTab: requestedNextTab,
    });

    if (areGamesLibraryFiltersEqual(filters, nextFilters) && nextActiveTab === activeTab) {
      return;
    }

    setFilters(nextFilters);
    setActiveTab(nextActiveTab);
    replaceRoute(
      appendKangurUrlParams(
        currentGamesLibraryHref,
        getGamesLibrarySearchParams(nextFilters, nextActiveTab),
        basePath
      ),
      {
        pageKey: 'GamesLibrary',
        scroll: false,
        sourceId,
      }
    );
  };

  const updateFilter = <TKey extends keyof GamesLibraryFilterState>(
    key: TKey,
    value: GamesLibraryFilterState[TKey]
  ): void => {
    const nextFilters = {
      ...filters,
      [key]: value,
    };

    applyFilters(nextFilters, `kangur-games-library:filters:${String(key)}`);
  };

  useEffect(() => {
    const nextFilters = readGamesLibraryFiltersFromSearchParams(searchParams);
    const nextRequestedTab = readGamesLibraryTabFromSearchParams(searchParams);
    const nextActiveTab = resolveGamesLibraryActiveTab({
      availableTabIds: resolveGamesLibraryAvailableTabIds({
        engineId: nextFilters.engineId,
        hasStructureSections,
        serializationAuditVisible,
      }),
      engineId: nextFilters.engineId,
      gameId: nextFilters.gameId,
      requestedTab: nextRequestedTab,
    });

    setFilters((current) =>
      areGamesLibraryFiltersEqual(current, nextFilters) ? current : nextFilters
    );
    setActiveTab((current) => (current === nextActiveTab ? current : nextActiveTab));

    if (
      !areGamesLibrarySearchParamsCanonical(searchParams, nextFilters, nextActiveTab)
    ) {
      replaceRoute(
        appendKangurUrlParams(
          currentGamesLibraryHref,
          getGamesLibrarySearchParams(nextFilters, nextActiveTab),
          basePath
        ),
        {
          pageKey: 'GamesLibrary',
          scroll: false,
          sourceId: 'kangur-games-library:query-normalize',
        }
      );
    }
  }, [
    basePath,
    currentGamesLibraryHref,
    hasStructureSections,
    replaceRoute,
    searchParams,
    serializationAuditVisible,
  ]);

  useKangurRoutePageReady({
    pageKey: 'GamesLibrary',
    ready: true,
  });
  const [activeTab, setActiveTab] = useState<GamesLibraryTabId>(() =>
    resolveGamesLibraryActiveTab({
      availableTabIds,
      engineId: filters.engineId,
      gameId: filters.gameId,
      requestedTab,
    })
  );
  const activeTabSummaryDescription =
    activeTab === 'catalog'
      ? focusedGameDescription ??
        (hasActiveFilters
          ? translations('filters.summaryFiltered', {
              total: totalGameCount,
              visible: visibleGameCount,
            })
          : translations('filters.summaryAll', { count: totalGameCount }))
      : activeTab === 'structure'
        ? focusedEngineDescription ?? translations('tabs.description')
        : translations('serializationAuditDescription');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [selectedGame, setSelectedGame] = useState<KangurGameDefinition | null>(null);

  const handleTabChange = useCallback((tabId: GamesLibraryTabId): void => {
    const nextActiveTab = resolveGamesLibraryActiveTab({
      availableTabIds,
      engineId: filters.engineId,
      gameId: filters.gameId,
      requestedTab: tabId,
    });

    if (nextActiveTab === activeTab) {
      return;
    }

    setActiveTab(nextActiveTab);
    replaceRoute(
      appendKangurUrlParams(
        currentGamesLibraryHref,
        getGamesLibrarySearchParams(filters, nextActiveTab),
        basePath
      ),
      {
        pageKey: 'GamesLibrary',
        scroll: false,
        sourceId: `kangur-games-library:tab:${nextActiveTab}`,
      }
    );
  }, [activeTab, availableTabIds, basePath, currentGamesLibraryHref, filters, replaceRoute]);

  const focusTabAt = useCallback((index: number): void => {
    tabRefs.current[index]?.focus();
  }, []);

  const handleTabKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLButtonElement>): void => {
      if (availableTabs.length === 0) {
        return;
      }

      let nextIndex = index;

      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (index + 1) % availableTabs.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (index - 1 + availableTabs.length) % availableTabs.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = availableTabs.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      const nextTab = availableTabs[nextIndex];
      if (!nextTab) {
        return;
      }

      handleTabChange(nextTab.id);
      requestAnimationFrame(() => focusTabAt(nextIndex));
    },
    [availableTabs, focusTabAt, handleTabChange]
  );

  const handlePointerTabMouseDown = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      event.preventDefault();
    },
    []
  );

  const orderedOverviewSections = [
    {
      id: 'catalog' as const,
      node: (
        <GamesLibrarySidebarSection
          dataTestId='games-library-overview-catalog'
          eyebrow={translations('tabs.catalog')}
          isActive={activeTab === 'catalog'}
          title={catalogSummaryText}
          description={translations('metrics.gamesDescription')}
        >
          <div className='grid gap-3 sm:grid-cols-2'>
            <GamesLibraryCompactMetric
              label={translations('metrics.games')}
              value={metrics.visibleGameCount}
              description={translations('metrics.gamesDescription')}
            />
            <GamesLibraryCompactMetric
              label={translations('metrics.engines')}
              value={engineCatalogFacets?.engineCount ?? metrics.engineCount}
              description={translations('metrics.enginesDescription')}
            />
            <GamesLibraryCompactMetric
              label={translations('metrics.variants')}
              value={metrics.variantCount}
              description={translations('metrics.variantsDescription')}
            />
            <GamesLibraryCompactMetric
              label={translations('metrics.lessonLinked')}
              value={metrics.lessonLinkedCount}
              description={translations('metrics.lessonLinkedDescription')}
            />
          </div>
        </GamesLibrarySidebarSection>
      ),
    },
    {
      id: 'structure' as const,
      node: (
        <GamesLibrarySidebarSection
          dataTestId='games-library-overview-structure'
          eyebrow={translations('tabs.structure')}
          isActive={activeTab === 'structure'}
          title={focusedEngineTitle ?? translations('filters.engine.label')}
          description={focusedEngineDescription ?? translations('tabs.description')}
        >
          <div className='grid gap-3 sm:grid-cols-2'>
            <GamesLibraryCompactMetric
              label={translations('drawingGroupsTitle')}
              value={engineCatalogFacets?.drawingEngineCount ?? drawingGroups.length}
            />
            <GamesLibraryCompactMetric
              label={translations('cohortGroups.launchableLabel')}
              value={
                engineCatalogFacets?.launchableEngineCount ??
                engineGroups.filter((group) => group.launchableCount > 0).length
              }
            />
            <GamesLibraryCompactMetric
              label={translations('cohortGroups.lessonLinkedLabel')}
              value={
                engineCatalogFacets?.lessonLinkedEngineCount ??
                engineGroups.filter((group) => group.lessonComponentIds.length > 0).length
              }
            />
            <GamesLibraryCompactMetric
              label={translations('implementationGroupsTitle')}
              value={
                engineCatalogFacets?.implementationOwnerships.length ??
                implementationGroups.length
              }
            />
          </div>
        </GamesLibrarySidebarSection>
      ),
    },
    serializationAuditVisible
      ? {
          id: 'runtime' as const,
          node: (
            <GamesLibrarySidebarSection
              dataTestId='games-library-overview-runtime'
              eyebrow={translations('tabs.runtime')}
              isActive={activeTab === 'runtime'}
              title={translations('serializationAuditTitle')}
              description={translations('serializationAuditDescription')}
            >
              <div className='grid gap-3 sm:grid-cols-2'>
                <GamesLibraryCompactMetric
                  label={translations('serializationAudit.explicitLabel')}
                  value={serializationAudit.explicitRuntimeVariantCount}
                />
                <GamesLibraryCompactMetric
                  label={translations('serializationAudit.fallbackLabel')}
                  value={serializationAudit.compatibilityFallbackVariantCount}
                />
                <GamesLibraryCompactMetric
                  label={translations('serializationAudit.duplicatesLabel')}
                  value={serializationAudit.duplicatedLegacyVariantCount}
                />
                <GamesLibraryCompactMetric
                  label={translations('serializationAudit.nonSharedEnginesLabel')}
                  value={serializationAudit.nonSharedRuntimeEngineCount}
                />
              </div>
            </GamesLibrarySidebarSection>
          ),
        }
      : null,
  ]
    .filter(
      (
        section
      ): section is {
        id: GamesLibraryTabId;
        node: React.JSX.Element;
      } => section !== null
    )
    .map((section, index) => ({ ...section, index }))
    .sort((left, right) => {
      if (left.id === activeTab && right.id !== activeTab) {
        return -1;
      }

      if (right.id === activeTab && left.id !== activeTab) {
        return 1;
      }

      return left.index - right.index;
    });

  return (
    <KangurStandardPageLayout
      tone='learn'
      id='kangur-games-library-page'
      skipLinkTargetId={GAMES_LIBRARY_MAIN_ID}
      navigation={<KangurTopNavigationController navigation={navigation} />}
      containerProps={{
        as: 'section',
        id: GAMES_LIBRARY_MAIN_ID,
        className: cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME),
      }}
    >
      <KangurPageIntroCard
        title={translations('title')}
        description={translations('description')}
        showBackButton
        onBack={() =>
          replaceRoute(basePath, {
            pageKey: 'Game',
            sourceId: 'kangur-games-library:back',
          })
        }
      >
        <div className='text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
          {translations('introEyebrow')}
        </div>
      </KangurPageIntroCard>

      <section
        className={`grid items-start ${KANGUR_PANEL_GAP_CLASSNAME} xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]`}
      >
        <div className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
          <KangurInfoCard accent='amber' padding='lg' className='space-y-4'>
            <div className='flex flex-wrap items-start justify-between gap-3'>
              <div className='space-y-1'>
                <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                  {translations('filters.eyebrow')}
                </div>
                <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
                  {translations('filters.title')}
                </div>
                <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                  {hasActiveFilters
                    ? translations('filters.summaryFiltered', {
                        visible: visibleGameCount,
                        total: totalGameCount,
                      })
                    : translations('filters.summaryAll', { count: totalGameCount })}
                </div>
              </div>
              <KangurButton
                type='button'
                size='sm'
                variant='surface'
                onClick={() =>
                  applyFilters(
                    DEFAULT_GAMES_LIBRARY_FILTERS,
                    'kangur-games-library:filters:clear'
                  )
                }
                disabled={!hasActiveFilters}
              >
                {translations('filters.clear')}
              </KangurButton>
            </div>

            <div className='space-y-3'>
              <div
                className={cn(
                  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
                  'space-y-3'
                )}
              >
                <div className='text-[11px] font-bold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                  {translations('tabs.catalog')}
                </div>
                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.game.label')}
                    </div>
                    <KangurSelectField
                      value={filters.gameId}
                      onChange={(event) =>
                        updateFilter('gameId', event.target.value)
                      }
                      aria-label={translations('filters.game.aria')}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>{translations('filters.game.all')}</option>
                      {gameFilterOptions.map((game) => (
                        <option key={game.id} value={game.id}>
                          {game.title}
                        </option>
                      ))}
                    </KangurSelectField>
                  </div>

                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.subject.label')}
                    </div>
                    <KangurSelectField
                      value={filters.subject}
                      onChange={(event) =>
                        updateFilter(
                          'subject',
                          event.target.value as GamesLibraryFilterState['subject']
                        )
                      }
                      aria-label={translations('filters.subject.aria')}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>{translations('filters.subject.all')}</option>
                      {(catalogFacets?.subjects ?? []).map((subject) => (
                        <option key={subject} value={subject}>
                          {getLocalizedKangurSubjectLabel(
                            subject,
                            locale,
                            KANGUR_SUBJECTS.find((entry) => entry.id === subject)?.label ?? subject
                          )}
                        </option>
                      ))}
                    </KangurSelectField>
                  </div>

                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.ageGroup.label')}
                    </div>
                    <KangurSelectField
                      value={filters.ageGroup}
                      onChange={(event) =>
                        updateFilter(
                          'ageGroup',
                          event.target.value as GamesLibraryFilterState['ageGroup']
                        )
                      }
                      aria-label={translations('filters.ageGroup.aria')}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>{translations('filters.ageGroup.all')}</option>
                      {(catalogFacets?.ageGroups ?? []).map((ageGroup) => (
                        <option key={ageGroup} value={ageGroup}>
                          {getLocalizedKangurAgeGroupLabel(
                            ageGroup,
                            locale,
                            KANGUR_AGE_GROUPS.find((entry) => entry.id === ageGroup)?.label ?? ageGroup
                          )}
                        </option>
                      ))}
                    </KangurSelectField>
                  </div>

                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.mechanic.label')}
                    </div>
                    <KangurSelectField
                      value={filters.mechanic}
                      onChange={(event) =>
                        updateFilter(
                          'mechanic',
                          event.target.value as GamesLibraryFilterState['mechanic']
                        )
                      }
                      aria-label={translations('filters.mechanic.aria')}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>{translations('filters.mechanic.all')}</option>
                      {(catalogFacets?.mechanics ?? []).map((mechanic) => (
                        <option key={mechanic} value={mechanic}>
                          {formatMechanicLabel(mechanic, translations)}
                        </option>
                      ))}
                    </KangurSelectField>
                  </div>

                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.surface.label')}
                    </div>
                    <KangurSelectField
                      value={filters.surface}
                      onChange={(event) =>
                        updateFilter('surface', event.target.value as GamesLibraryFilterState['surface'])
                      }
                      aria-label={translations('filters.surface.aria')}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>{translations('filters.surface.all')}</option>
                      {(catalogFacets?.surfaces ?? []).map((surface) => (
                        <option key={surface} value={surface}>
                          {translations(`surfaces.${surface}`)}
                        </option>
                      ))}
                    </KangurSelectField>
                  </div>

                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.status.label')}
                    </div>
                    <KangurSelectField
                      value={filters.gameStatus}
                      onChange={(event) =>
                        updateFilter(
                          'gameStatus',
                          event.target.value as GamesLibraryFilterState['gameStatus']
                        )
                      }
                      aria-label={translations('filters.status.aria')}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>{translations('filters.status.all')}</option>
                      {(catalogFacets?.statuses ?? []).map((status) => (
                        <option key={status} value={status}>
                          {translations(`statuses.${status}`)}
                        </option>
                      ))}
                    </KangurSelectField>
                  </div>
                </div>
              </div>

              <div
                className={cn(
                  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
                  'space-y-3'
                )}
              >
                <div className='text-[11px] font-bold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                  {translations('tabs.structure')}
                </div>
                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-3'>
                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.variantSurface.label')}
                    </div>
                    <KangurSelectField
                      value={filters.variantSurface}
                      onChange={(event) =>
                        updateFilter(
                          'variantSurface',
                          event.target.value as GamesLibraryFilterState['variantSurface']
                        )
                      }
                      aria-label={translations('filters.variantSurface.aria')}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>{translations('filters.variantSurface.all')}</option>
                      {(catalogFacets?.variantSurfaces ?? []).map((surface) => (
                        <option key={surface} value={surface}>
                          {translations(`variantSurfaces.${surface}`)}
                        </option>
                      ))}
                    </KangurSelectField>
                  </div>

                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.variantStatus.label')}
                    </div>
                    <KangurSelectField
                      value={filters.variantStatus}
                      onChange={(event) =>
                        updateFilter(
                          'variantStatus',
                          event.target.value as GamesLibraryFilterState['variantStatus']
                        )
                      }
                      aria-label={translations('filters.variantStatus.aria')}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>{translations('filters.variantStatus.all')}</option>
                      {(catalogFacets?.variantStatuses ?? []).map((status) => (
                        <option key={status} value={status}>
                          {translations(`statuses.${status}`)}
                        </option>
                      ))}
                    </KangurSelectField>
                  </div>

                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.engineCategory.label')}
                    </div>
                    <KangurSelectField
                      value={filters.engineCategory}
                      onChange={(event) =>
                        updateFilter(
                          'engineCategory',
                          event.target.value as GamesLibraryFilterState['engineCategory']
                        )
                      }
                      aria-label={translations('filters.engineCategory.aria')}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>{translations('filters.engineCategory.all')}</option>
                      {(engineCatalogFilterOptions?.engineCategories ??
                        catalogFacets?.engineCategories ??
                        []).map((category) => (
                        <option key={category} value={category}>
                          {translations(`engineCategories.${category}`)}
                        </option>
                      ))}
                    </KangurSelectField>
                  </div>

                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.implementationOwnership.label')}
                    </div>
                    <KangurSelectField
                      value={filters.implementationOwnership}
                      onChange={(event) =>
                        updateFilter(
                          'implementationOwnership',
                          event.target.value as GamesLibraryFilterState['implementationOwnership']
                        )
                      }
                      aria-label={translations('filters.implementationOwnership.aria')}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>
                        {translations('filters.implementationOwnership.all')}
                      </option>
                      {(engineCatalogFilterOptions?.implementationOwnerships ??
                        catalogFacets?.implementationOwnerships ??
                        []).map((ownership) => (
                        <option key={ownership} value={ownership}>
                          {translations(`implementationOwnership.${ownership}`)}
                        </option>
                      ))}
                    </KangurSelectField>
                  </div>

                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.engine.label')}
                    </div>
                    <KangurSelectField
                      value={filters.engineId}
                      onChange={(event) => updateFilter('engineId', event.target.value)}
                      aria-label={translations('filters.engine.aria')}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>{translations('filters.engine.all')}</option>
                      {(engineCatalogFilterOptions?.engines ?? catalogFacets?.engines ?? []).map(
                        (engine) => (
                          <option key={engine.id} value={engine.id}>
                            {engine.title}
                          </option>
                        )
                      )}
                    </KangurSelectField>
                  </div>

                  <div className='min-w-0 space-y-1'>
                    <div className='text-xs font-semibold uppercase tracking-[0.08em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.launchability.label')}
                    </div>
                    <KangurSelectField
                      value={filters.launchability}
                      onChange={(event) =>
                        updateFilter(
                          'launchability',
                          event.target.value as GamesLibraryFilterState['launchability']
                        )
                      }
                      aria-label={translations('filters.launchability.aria')}
                      size='sm'
                      accent='slate'
                    >
                      <option value='all'>{translations('filters.launchability.all')}</option>
                      <option value='launchable'>
                        {translations('filters.launchability.launchable')}
                      </option>
                    </KangurSelectField>
                  </div>
                </div>
              </div>
            </div>

            {activeFilterBadges.length > 0 ? (
              <div
                data-testid='games-library-active-filters-summary'
                className={cn(
                  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
                  'space-y-3 p-3 sm:p-4'
                )}
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <div className='text-[11px] font-bold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                      {translations('filters.activeEyebrow')}
                    </div>
                    <div className='text-sm font-semibold [color:var(--kangur-page-text)]'>
                      {catalogSummaryText}
                    </div>
                  </div>
                </div>

                <div className='flex flex-wrap gap-2'>
                  {activeFilterBadges.map((badge) => (
                    <KangurStatusChip
                      key={badge.id}
                      accent={badge.accent}
                      size='sm'
                    >
                      {badge.label}
                      {': '}
                      {badge.value}
                    </KangurStatusChip>
                  ))}
                </div>
              </div>
            ) : null}
          </KangurInfoCard>
        </div>

        <aside
          className={cn(
            `flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`,
            'xl:sticky xl:top-[calc(var(--kangur-top-bar-height,88px)+1rem)]'
          )}
        >
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
              {translations('introEyebrow')}
            </div>
            <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
              {translations('title')}
            </div>
            <div className='text-sm [color:var(--kangur-page-muted-text)]'>
              {catalogSummaryText}
            </div>
          </div>

          {filters.gameId !== 'all' || filters.engineId !== 'all' ? (
            <KangurInfoCard
              data-testid='games-library-focus-summary'
              accent='sky'
              padding='lg'
              className='space-y-4'
            >
              <div className='space-y-1'>
                <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                  {translations('focus.eyebrow')}
                </div>
                <div className='text-xl font-black [color:var(--kangur-page-text)]'>
                  {translations(`tabs.${activeTab}`)}
                </div>
                <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                  {activeTabSummaryDescription}
                </div>
              </div>

              <div className='space-y-3'>
                {filters.gameId !== 'all' ? (
                  <div className='flex flex-wrap items-start gap-3'>
                    <GamesLibraryDetailSurface
                      className='min-w-0 flex-1'
                      label={translations('focus.gameTitle')}
                    >
                      <>
                        <div>{focusedGameDescription}</div>
                        <div className='text-xs font-semibold uppercase tracking-[0.12em] [color:var(--kangur-page-muted-text)]'>
                          {filters.gameId}
                        </div>
                      </>
                    </GamesLibraryDetailSurface>
                    <KangurButton
                      type='button'
                      size='sm'
                      variant='surface'
                      onClick={() => updateFilter('gameId', 'all')}
                    >
                      {translations('focus.clear')}
                    </KangurButton>
                  </div>
                ) : null}

                {filters.engineId !== 'all' ? (
                  <div className='flex flex-wrap items-start gap-3'>
                    <GamesLibraryDetailSurface
                      className='min-w-0 flex-1'
                      label={translations('focus.engineTitle')}
                    >
                      <>
                        <div>{focusedEngineDescription}</div>
                        <div className='text-xs font-semibold uppercase tracking-[0.12em] [color:var(--kangur-page-muted-text)]'>
                          {filters.engineId}
                        </div>
                      </>
                    </GamesLibraryDetailSurface>
                    <KangurButton
                      type='button'
                      size='sm'
                      variant='surface'
                      onClick={() => updateFilter('engineId', 'all')}
                    >
                      {translations('focus.clearEngine')}
                    </KangurButton>
                  </div>
                ) : null}
              </div>
            </KangurInfoCard>
          ) : null}

          <div data-testid='games-library-overview-rail' className='space-y-4'>
            {orderedOverviewSections.map((section) => (
              <React.Fragment key={section.id}>{section.node}</React.Fragment>
            ))}
          </div>
        </aside>
      </section>

      <section className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <div className={cn(GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME, 'space-y-4')}>
          <div className='flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between'>
            <div className='space-y-1'>
              <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                {translations('tabs.eyebrow')}
              </div>
              <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
                {translations('tabs.title')}
              </div>
              <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                {translations('tabs.description')}
              </div>
            </div>

            <div className='w-full xl:max-w-4xl'>
              <div
                className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full`}
                role='tablist'
                aria-label={translations('tabs.listLabel')}
              >
                {availableTabs.map((tab, index) => {
                  const { tabId, panelId } = getGamesLibraryTabIds(tab.id);
                  return (
                    <KangurButton
                      id={tabId}
                      key={tab.id}
                      size='sm'
                      variant={activeTab === tab.id ? 'segmentActive' : 'segment'}
                      onMouseDown={handlePointerTabMouseDown}
                      onKeyDown={(event) => handleTabKeyDown(index, event)}
                      onClick={() => handleTabChange(tab.id)}
                      role='tab'
                      aria-selected={activeTab === tab.id}
                      aria-controls={panelId}
                      tabIndex={activeTab === tab.id ? 0 : -1}
                      ref={(node) => {
                        tabRefs.current[index] = node;
                      }}
                      type='button'
                    >
                      {translations(tab.labelKey)}
                    </KangurButton>
                  );
                })}
              </div>
            </div>
          </div>

          <div className='flex flex-wrap items-center gap-3 border-t border-[color:var(--kangur-soft-card-border)] pt-4'>
            <KangurStatusChip
              accent={
                activeTab === 'catalog' ? 'sky' : activeTab === 'structure' ? 'amber' : 'rose'
              }
              size='sm'
            >
              {translations(`tabs.${activeTab}`)}
            </KangurStatusChip>
            <div className='text-sm [color:var(--kangur-page-muted-text)]'>
              {activeTabSummaryDescription}
            </div>
          </div>
        </div>

        {activeTab === 'runtime' && serializationAuditVisible ? (
          <div
            id={getGamesLibraryTabIds('runtime').panelId}
            role='tabpanel'
            aria-labelledby={getGamesLibraryTabIds('runtime').tabId}
            tabIndex={0}
            className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
          >
            <div className={cn(GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME, 'space-y-6')}>
              <GamesLibrarySectionHeader
                dataTestId='games-library-runtime-intro'
                eyebrow={translations('serializationAuditEyebrow')}
                title={
                  <div className='flex flex-wrap items-center gap-3'>
                    <span>{translations('serializationAuditTitle')}</span>
                    <KangurStatusChip
                      accent={resolveSerializationAuditAccent(serializationAudit)}
                      className='uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      {translations(
                        serializationAudit.allEnginesSharedRuntime &&
                          getSerializationAuditIssueCount(serializationAudit) === 0
                          ? 'serializationAudit.statusClean'
                          : 'serializationAudit.statusAttention'
                      )}
                    </KangurStatusChip>
                  </div>
                }
                description={translations('serializationAuditDescription')}
                summaryClassName='grid gap-3 sm:grid-cols-2 xl:w-[28rem]'
                summary={
                  <>
                    <GamesLibraryCompactMetric
                      label={translations('serializationAudit.explicitLabel')}
                      value={serializationAudit.explicitRuntimeVariantCount}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('serializationAudit.fallbackLabel')}
                      value={serializationAudit.compatibilityFallbackVariantCount}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('serializationAudit.duplicatesLabel')}
                      value={serializationAudit.duplicatedLegacyVariantCount}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('serializationAudit.nonSharedEnginesLabel')}
                      value={serializationAudit.nonSharedRuntimeEngineCount}
                    />
                  </>
                }
              />

              <section className='space-y-4'>
                <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-5'>
                  <KangurMetricCard
                    accent='emerald'
                    label={translations('serializationAudit.explicitLabel')}
                    value={serializationAudit.explicitRuntimeVariantCount}
                    description={translations('serializationAudit.explicitDescription', {
                      count: serializationAudit.explicitRuntimeVariantCount,
                      total: serializationAudit.runtimeBearingVariantCount,
                    })}
                  />
                  <KangurMetricCard
                    accent='amber'
                    label={translations('serializationAudit.fallbackLabel')}
                    value={serializationAudit.compatibilityFallbackVariantCount}
                    description={translations('serializationAudit.fallbackDescription')}
                  />
                  <KangurMetricCard
                    accent='amber'
                    label={translations('serializationAudit.duplicatesLabel')}
                    value={serializationAudit.duplicatedLegacyVariantCount}
                    description={translations('serializationAudit.duplicatesDescription')}
                  />
                  <KangurMetricCard
                    accent={
                      serializationAudit.legacyLaunchFallbackGameCount > 0 ? 'amber' : 'emerald'
                    }
                    label={translations('serializationAudit.legacyGameFallbackLabel')}
                    value={serializationAudit.legacyLaunchFallbackGameCount}
                    description={translations('serializationAudit.legacyGameFallbackDescription')}
                  />
                  <KangurMetricCard
                    accent={
                      serializationAudit.nonSharedRuntimeEngineCount > 0 ? 'amber' : 'emerald'
                    }
                    label={translations('serializationAudit.nonSharedEnginesLabel')}
                    value={serializationAudit.nonSharedRuntimeEngineCount}
                    description={translations('serializationAudit.nonSharedEnginesDescription')}
                  />
                </div>

                <div className='grid gap-4 xl:grid-cols-3'>
                  {serializationSurfaceAudits.map((surfaceAudit) => {
                    const issueCount = getSerializationSurfaceIssueCount(surfaceAudit);

                    return (
                      <KangurInfoCard
                        key={surfaceAudit.surface}
                        accent={resolveSerializationSurfaceAccent(surfaceAudit)}
                        padding='lg'
                        className='flex h-full flex-col gap-4'
                      >
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div className='min-w-0 flex-1'>
                            <div className='text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                              {translations('serializationAuditEyebrow')}
                            </div>
                            <div className='mt-1 text-xl font-black [color:var(--kangur-page-text)]'>
                              {translations(`variantSurfaces.${surfaceAudit.surface}`)}
                            </div>
                            <p className='mt-2 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                              {translations('serializationAudit.surfaceDescription', {
                                count: surfaceAudit.totalVariants,
                              })}
                            </p>
                          </div>
                          <KangurStatusChip
                            accent={resolveSerializationSurfaceAccent(surfaceAudit)}
                            className='uppercase tracking-[0.14em]'
                            size='sm'
                          >
                            {translations(
                              issueCount === 0
                                ? 'serializationAudit.statusClean'
                                : 'serializationAudit.statusAttention'
                            )}
                          </KangurStatusChip>
                        </div>

                        <div className='grid gap-3 sm:grid-cols-2'>
                          <GamesLibraryCompactMetric
                            label={translations('serializationAudit.totalVariantsLabel')}
                            value={surfaceAudit.totalVariants}
                          />
                          <GamesLibraryCompactMetric
                            label={translations('serializationAudit.explicitVariantsLabel')}
                            value={surfaceAudit.explicitRuntimeVariants}
                          />
                          <GamesLibraryCompactMetric
                            label={translations('serializationAudit.fallbackVariantsLabel')}
                            value={surfaceAudit.compatibilityFallbackVariants}
                          />
                          <GamesLibraryCompactMetric
                            label={translations('serializationAudit.duplicatesVariantsLabel')}
                            value={surfaceAudit.duplicatedLegacyVariants}
                          />
                          <GamesLibraryCompactMetric
                            label={translations('serializationAudit.missingVariantsLabel')}
                            value={surfaceAudit.missingRuntimeVariants}
                          />
                        </div>
                      </KangurInfoCard>
                    );
                  })}
                </div>

                {serializationBacklogEntries.length > 0 ? (
                  <div className='space-y-3'>
                    <GamesLibrarySectionHeader
                      eyebrow={translations('tabs.runtime')}
                      title={translations('serializationAudit.backlogEyebrow')}
                      description={translations('serializationAudit.backlogDescription')}
                    />
                    <div className='grid gap-4 xl:grid-cols-2'>
                      {serializationBacklogEntries.map((entry) => (
                        <KangurInfoCard
                          key={entry.key}
                          accent={entry.accent}
                          padding='lg'
                          className='space-y-3'
                        >
                          <div className='text-sm font-bold uppercase tracking-[0.14em] [color:var(--kangur-page-text)]'>
                            {entry.label}
                          </div>
                          <GamesLibraryDetailSurface label={translations('serializationAudit.backlogEyebrow')}>
                            <div className='flex flex-wrap gap-2'>
                              {entry.issues.map((issue) => (
                                <a
                                  key={`${entry.key}:${issue.itemId}`}
                                  href={getSerializationIssueHref(
                                    currentGamesLibraryHref,
                                    basePath,
                                    issue
                                  )}
                                  className='inline-flex rounded-full border border-[color:var(--kangur-page-border)] px-3 py-1 text-xs font-semibold [color:var(--kangur-page-text)] transition hover:border-[color:var(--kangur-page-accent)] hover:[color:var(--kangur-page-accent)]'
                                >
                                  <span>{issue.label}</span>
                                  {issue.detail ? (
                                    <span className='ml-2 text-[10px] uppercase tracking-[0.14em] [color:var(--kangur-page-muted-text)]'>
                                      {issue.detail}
                                    </span>
                                  ) : null}
                                </a>
                              ))}
                            </div>
                          </GamesLibraryDetailSurface>
                        </KangurInfoCard>
                      ))}
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          </div>
        ) : null}

        {activeTab === 'structure' ? (
          <div
            id={getGamesLibraryTabIds('structure').panelId}
            role='tabpanel'
            aria-labelledby={getGamesLibraryTabIds('structure').tabId}
            tabIndex={0}
            className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
          >
            <div className={cn(GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME, 'space-y-6')}>
              <GamesLibrarySectionHeader
                dataTestId='games-library-structure-intro'
                eyebrow={structurePanelEyebrow}
                title={structurePanelTitle}
                description={structurePanelDescription}
                summaryClassName='grid gap-3 sm:grid-cols-2 xl:grid-cols-3 xl:w-[36rem]'
                summary={
                  <>
                    <GamesLibraryCompactMetric
                      label={translations('implementationGroupsTitle')}
                      value={implementationGroups.length}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('coverageGroupsTitle')}
                      value={coverageGroups.length}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('cohortGroupsTitle')}
                      value={cohortGroups.length}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('drawingGroupsTitle')}
                      value={drawingGroups.length}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('engineGroupsTitle')}
                      value={engineGroups.length}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('variantGroupsTitle')}
                      value={variantGroups.length}
                    />
                  </>
                }
              />
            {implementationGroups.length > 0 ? (
        <section className='space-y-4'>
          <GamesLibrarySectionHeader
            eyebrow={translations('implementationGroupsEyebrow')}
            title={translations('implementationGroupsTitle')}
            description={translations('implementationGroupsDescription', {
              count: implementationGroups.length,
            })}
          />

          <div className='grid gap-4 xl:grid-cols-3'>
            {implementationGroups.map((group) => {
              const lessonTitles = getLessonTitles(group.lessonComponentIds, locale);

              return (
                <KangurInfoCard
                  key={group.ownership}
                  accent={resolveImplementationOwnershipAccent(group.ownership)}
                  padding='lg'
                  className='flex h-full flex-col gap-4'
                >
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='min-w-0 flex-1'>
                      <div className='text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                        {translations('implementationGroups.eyebrow')}
                      </div>
                      <div className='mt-1 text-xl font-black [color:var(--kangur-page-text)]'>
                        {translations(`implementationOwnership.${group.ownership}`)}
                      </div>
                      <p className='mt-2 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                        {translations('implementationGroups.groupDescription', {
                          count: group.engineGroups.length,
                        })}
                      </p>
                    </div>
                    <KangurStatusChip
                      accent={resolveImplementationOwnershipAccent(group.ownership)}
                      className='uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      {translations(`implementationOwnership.${group.ownership}`)}
                    </KangurStatusChip>
                  </div>

                  <div className='grid gap-3 sm:grid-cols-2'>
                    <GamesLibraryCompactMetric
                      label={translations('implementationGroups.enginesLabel')}
                      value={group.engineGroups.length}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('implementationGroups.gamesLabel')}
                      value={group.gameCount}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('implementationGroups.runtimeComponentsLabel')}
                      value={group.runtimeIds.length}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('implementationGroups.lessonsLabel')}
                      value={group.lessonComponentIds.length}
                    />
                  </div>

                  <GamesLibraryDetailSurface
                    label={translations('implementationGroups.engineTitlesLabel')}
                  >
                    {group.engineGroups
                      .map((engineGroup) => engineGroup.engine?.title ?? engineGroup.engineId)
                      .join(', ')}
                  </GamesLibraryDetailSurface>

                  <GamesLibraryDetailSurface
                    label={translations('implementationGroups.runtimeComponentsLabel')}
                  >
                    {group.runtimeIds.length
                      ? group.runtimeIds.join(', ')
                      : translations('labels.none')}
                  </GamesLibraryDetailSurface>

                  <GamesLibraryDetailSurface
                    label={translations('implementationGroups.lessonLinksLabel')}
                  >
                    {lessonTitles.length > 0
                      ? lessonTitles.join(', ')
                      : translations('labels.none')}
                  </GamesLibraryDetailSurface>
                </KangurInfoCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {coverageGroups.length > 0 ? (
        <section className='space-y-4'>
          <GamesLibrarySectionHeader
            eyebrow={translations('coverageGroupsEyebrow')}
            title={translations('coverageGroupsTitle')}
            description={translations('coverageGroupsDescription', { count: coverageGroups.length })}
          />

          <div className='grid gap-4 xl:grid-cols-3'>
            {coverageGroups.map((group) => {
              const coveredLessonTitles = getLessonTitles(group.coveredComponentIds, locale);
              const uncoveredLessonTitles = getLessonTitles(group.uncoveredComponentIds, locale);

              return (
                <KangurInfoCard
                  key={group.id}
                  accent={resolveCoverageAccent(group.id)}
                  padding='lg'
                  className='flex h-full flex-col gap-4'
                >
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='min-w-0 flex-1'>
                      <div className='text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                        {translations(`coverageGroups.groups.${group.id}.eyebrow`)}
                      </div>
                      <div className='mt-1 text-xl font-black [color:var(--kangur-page-text)]'>
                        {translations(`coverageGroups.groups.${group.id}.title`)}
                      </div>
                      <p className='mt-2 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                        {translations(`coverageGroups.groups.${group.id}.description`)}
                      </p>
                    </div>
                    <KangurStatusChip
                      accent={group.uncoveredComponentIds.length > 0 ? 'amber' : 'emerald'}
                      className='uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      {group.uncoveredComponentIds.length > 0
                        ? translations('coverageGroups.gapsChip', {
                            count: group.uncoveredComponentIds.length,
                          })
                        : translations('coverageGroups.completeChip')}
                    </KangurStatusChip>
                  </div>

                  <div className='grid gap-3 sm:grid-cols-2'>
                    <GamesLibraryCompactMetric
                      label={translations('coverageGroups.lessonsLabel')}
                      value={group.componentIds.length}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('coverageGroups.coveredLabel')}
                      value={group.coveredComponentIds.length}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('coverageGroups.gamesLabel')}
                      value={group.entries.length}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('coverageGroups.cohortsLabel')}
                      value={group.ageGroups.length}
                    />
                  </div>

                  <GamesLibraryDetailSurface label={translations('coverageGroups.subjectsLabel')}>
                    {group.subjects.length > 0
                      ? group.subjects
                          .map((subject) =>
                            getLocalizedKangurSubjectLabel(
                              subject,
                              locale,
                              KANGUR_SUBJECTS.find((entry) => entry.id === subject)?.label ??
                                subject
                            )
                          )
                          .join(', ')
                      : translations('labels.none')}
                  </GamesLibraryDetailSurface>

                  <GamesLibraryDetailSurface
                    label={translations('coverageGroups.coveredLessonsLabel')}
                  >
                    {coveredLessonTitles.length > 0
                      ? coveredLessonTitles.join(', ')
                      : translations('labels.none')}
                  </GamesLibraryDetailSurface>

                  {uncoveredLessonTitles.length > 0 ? (
                    <GamesLibraryDetailSurface
                      label={translations('coverageGroups.uncoveredLessonsLabel')}
                    >
                      {uncoveredLessonTitles.join(', ')}
                    </GamesLibraryDetailSurface>
                  ) : null}
                </KangurInfoCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {cohortGroups.length > 0 ? (
        <section className='space-y-4'>
          <GamesLibrarySectionHeader
            eyebrow={translations('cohortGroupsEyebrow')}
            title={translations('cohortGroupsTitle')}
            description={translations('cohortGroupsDescription', { count: cohortGroups.length })}
          />

          <div className='grid gap-4 xl:grid-cols-3'>
            {cohortGroups.map((group) => (
              <KangurInfoCard
                key={group.ageGroup}
                accent={resolveAgeGroupAccent(group.ageGroup)}
                padding='lg'
                className='flex h-full flex-col gap-4'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='min-w-0 flex-1'>
                    <div className='text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                      {translations('labels.ageGroup')}
                    </div>
                    <div className='mt-1 text-xl font-black [color:var(--kangur-page-text)]'>
                      {getLocalizedKangurAgeGroupLabel(group.ageGroup, locale)}
                    </div>
                    <p className='mt-2 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                      {translations('cohortGroups.groupDescription', {
                        count: group.entries.length,
                      })}
                    </p>
                  </div>
                  <KangurStatusChip
                    accent={resolveAgeGroupAccent(group.ageGroup)}
                    className='uppercase tracking-[0.14em]'
                    size='sm'
                  >
                    {translations('labels.variantCount', { count: group.variantCount })}
                  </KangurStatusChip>
                </div>

                <div className='grid gap-3 sm:grid-cols-2'>
                  <GamesLibraryCompactMetric
                    label={translations('cohortGroups.gamesLabel')}
                    value={group.entries.length}
                  />
                  <GamesLibraryCompactMetric
                    label={translations('cohortGroups.enginesLabel')}
                    value={group.engineCount}
                  />
                  <GamesLibraryCompactMetric
                    label={translations('cohortGroups.launchableLabel')}
                    value={group.launchableCount}
                  />
                  <GamesLibraryCompactMetric
                    label={translations('cohortGroups.lessonLinkedLabel')}
                    value={group.lessonLinkedCount}
                  />
                </div>

                <GamesLibraryDetailSurface label={translations('cohortGroups.subjectsLabel')}>
                  {group.subjects
                    .map((subject) =>
                      getLocalizedKangurSubjectLabel(
                        subject,
                        locale,
                        KANGUR_SUBJECTS.find((entry) => entry.id === subject)?.label ?? subject
                      )
                    )
                    .join(', ')}
                </GamesLibraryDetailSurface>
              </KangurInfoCard>
            ))}
          </div>
        </section>
      ) : null}

      {drawingGroups.length > 0 ? (
        <section className='space-y-4'>
          <GamesLibrarySectionHeader
            eyebrow={translations('drawingGroupsEyebrow')}
            title={translations('drawingGroupsTitle')}
            description={translations('drawingGroupsDescription', { count: drawingGroups.length })}
          />

          <div className='grid gap-4 xl:grid-cols-2'>
            {drawingGroups.map((group) => {
              const lessonTitles = getLessonTitles(group.lessonComponentIds, locale);
              const implementation = group.implementation;

              return (
                <KangurInfoCard
                  key={group.engineId}
                  id={getKangurEngineCardAnchorId(group.engineId)}
                  accent={resolveEngineCategoryAccent(group.category)}
                  padding='lg'
                  className='flex h-full scroll-mt-24 flex-col gap-4'
                >
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='min-w-0 flex-1'>
                      <div className='text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                        {translations('labels.engineId')}
                      </div>
                      <div className='mt-1 text-xl font-black [color:var(--kangur-page-text)]'>
                        {group.engine?.title ?? group.engineId}
                      </div>
                      <div className='mt-1 text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                        {group.engineId}
                      </div>
                      <p className='mt-2 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                        {implementation?.summary ??
                          group.engine?.description ??
                          translations('engineGroups.gameCount', {
                            count: group.entries.length,
                          })}
                      </p>
                    </div>
                    <KangurStatusChip
                      accent={resolveImplementationOwnershipAccent(implementation?.ownership)}
                      className='uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      {implementation?.ownership
                        ? translations(`implementationOwnership.${implementation.ownership}`)
                        : translations('labels.none')}
                    </KangurStatusChip>
                  </div>

                  <div className='grid gap-3 sm:grid-cols-2'>
                    <GamesLibraryCompactMetric
                      label={translations('drawingGroups.gamesLabel')}
                      value={group.entries.length}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('drawingGroups.variantsLabel')}
                      value={group.variantCount}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('labels.engineCategory')}
                      value={
                        group.category
                          ? translations(`engineCategories.${group.category}`)
                          : translations('labels.none')
                      }
                    />
                    <GamesLibraryCompactMetric
                      label={translations('drawingGroups.cohortsLabel')}
                      value={group.ageGroups.length}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('drawingGroups.ownershipLabel')}
                      value={
                        implementation?.ownership
                          ? translations(`implementationOwnership.${implementation.ownership}`)
                          : translations('labels.none')
                      }
                    />
                    <GamesLibraryCompactMetric
                      label={translations('drawingGroups.lessonsLabel')}
                      value={group.lessonComponentIds.length}
                    />
                  </div>

                  <GamesLibraryDetailSurface
                    label={translations('drawingGroups.runtimeComponentsLabel')}
                  >
                    {implementation?.runtimeIds.length
                      ? implementation.runtimeIds.join(', ')
                      : translations('labels.none')}
                  </GamesLibraryDetailSurface>

                  <GamesLibraryDetailSurface label={translations('drawingGroups.subjectsLabel')}>
                    {group.subjects
                      .map((subject) =>
                        getLocalizedKangurSubjectLabel(
                          subject,
                          locale,
                          KANGUR_SUBJECTS.find((entry) => entry.id === subject)?.label ?? subject
                        )
                      )
                      .join(', ')}
                  </GamesLibraryDetailSurface>

                  <GamesLibraryDetailSurface
                    label={translations('drawingGroups.lessonLinksLabel')}
                  >
                    {lessonTitles.length > 0
                      ? lessonTitles.join(', ')
                      : translations('labels.none')}
                  </GamesLibraryDetailSurface>

                  <GamesLibraryDetailSurface label={translations('drawingGroups.gameTitlesLabel')}>
                    {group.entries.map((entry) => entry.game.title).join(', ')}
                  </GamesLibraryDetailSurface>
                </KangurInfoCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {engineGroups.length > 0 ? (
        <section className='space-y-4'>
          <GamesLibrarySectionHeader
            eyebrow={translations('engineGroupsEyebrow')}
            title={translations('engineGroupsTitle')}
            description={translations('engineGroupsDescription', { count: engineGroups.length })}
          />

          <div className='grid gap-4 xl:grid-cols-2'>
            {engineGroups.map((group) => {
              const engine = group.engine;
              const implementation = group.implementation;
              const engineTitle = engine?.title ?? group.engineId;
              const engineDescription =
                implementation?.summary ??
                engine?.description ??
                translations('engineGroups.gameCount', { count: group.entries.length });
              const mechanics = engine?.mechanics ?? group.mechanics;
              const surfaces = engine?.surfaces ?? group.surfaces;

              return (
                <KangurInfoCard
                  key={group.engineId}
                  accent={resolveEngineCategoryAccent(group.category)}
                  padding='lg'
                  className='flex h-full flex-col gap-4'
                >
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='min-w-0 flex-1'>
                      <div className='text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                        {translations('labels.engineId')}
                      </div>
                      <div className='mt-1 text-xl font-black [color:var(--kangur-page-text)]'>
                        {engineTitle}
                      </div>
                      <div className='mt-1 text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                        {group.engineId}
                      </div>
                      <p className='mt-2 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                        {engineDescription}
                      </p>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <KangurStatusChip
                        accent={group.entries.length > 1 ? 'emerald' : 'sky'}
                        className='uppercase tracking-[0.14em]'
                        size='sm'
                      >
                        {group.entries.length > 1
                          ? translations('engineGroups.sharedChip')
                          : translations('engineGroups.singleChip')}
                      </KangurStatusChip>
                      <KangurStatusChip
                        accent={resolveImplementationOwnershipAccent(implementation?.ownership)}
                        className='uppercase tracking-[0.14em]'
                        size='sm'
                      >
                        {implementation?.ownership
                          ? translations(`implementationOwnership.${implementation.ownership}`)
                          : translations('labels.none')}
                      </KangurStatusChip>
                    </div>
                  </div>

                  <div className='grid gap-3 sm:grid-cols-2'>
                    <GamesLibraryDetailSurface label={translations('engineGroups.gamesLabel')}>
                      {group.entries.map((entry) => entry.game.title).join(', ')}
                    </GamesLibraryDetailSurface>
                    <GamesLibraryDetailSurface label={translations('engineGroups.subjectsLabel')}>
                      {group.subjects
                        .map((subject) =>
                          getLocalizedKangurSubjectLabel(
                            subject,
                            locale,
                            KANGUR_SUBJECTS.find((entry) => entry.id === subject)?.label ?? subject
                          )
                        )
                        .join(', ')}
                    </GamesLibraryDetailSurface>
                    <GamesLibraryCompactMetric
                      label={translations('labels.engineCategory')}
                      value={
                        group.category
                          ? translations(`engineCategories.${group.category}`)
                          : translations('labels.none')
                      }
                    />
                    <GamesLibraryCompactMetric
                      label={translations('engineGroups.ownershipLabel')}
                      value={
                        implementation?.ownership
                          ? translations(`implementationOwnership.${implementation.ownership}`)
                          : translations('labels.none')
                      }
                    />
                    <GamesLibraryDetailSurface label={translations('engineGroups.mechanicsLabel')}>
                      {mechanics
                        .map((mechanic) => formatMechanicLabel(mechanic, translations))
                        .join(', ')}
                    </GamesLibraryDetailSurface>
                    <GamesLibraryDetailSurface label={translations('engineGroups.surfacesLabel')}>
                      {surfaces
                        .map((surface) => translations(`surfaces.${surface}`))
                        .join(', ')}
                    </GamesLibraryDetailSurface>
                  </div>

                  <GamesLibraryDetailSurface
                    label={translations('engineGroups.runtimeComponentsLabel')}
                  >
                    {implementation?.runtimeIds.length
                      ? implementation.runtimeIds.join(', ')
                      : translations('labels.none')}
                  </GamesLibraryDetailSurface>
                </KangurInfoCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {variantGroups.length > 0 ? (
        <section className='space-y-4'>
          <GamesLibrarySectionHeader
            eyebrow={translations('variantGroupsEyebrow')}
            title={translations('variantGroupsTitle')}
            description={translations('variantGroupsDescription', {
              count: metrics.variantCount,
              surfaceCount: variantGroups.length,
            })}
          />

          <div className='grid gap-4 xl:grid-cols-2'>
            {variantGroups.map((group) => {
              const gamesCount = new Set(group.entries.map((entry) => entry.game.id)).size;
              const enginesCount = new Set(group.entries.map((entry) => entry.game.engineId)).size;
              const defaultCount = group.entries.filter((entry) => entry.isDefaultVariant).length;
              const launchableCount = group.entries.filter((entry) => Boolean(entry.launchableScreen))
                .length;

              return (
                <KangurInfoCard
                  key={group.surface}
                  accent='slate'
                  padding='lg'
                  className='flex h-full flex-col gap-4'
                >
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div className='min-w-0 flex-1'>
                      <div className='text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                        {translations('variantGroups.surfaceLabel')}
                      </div>
                      <div className='mt-1 text-xl font-black [color:var(--kangur-page-text)]'>
                        {getVariantGroupLabel(group.surface, translations)}
                      </div>
                      <p className='mt-2 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                        {translations('variantGroups.groupDescription', {
                          count: group.entries.length,
                        })}
                      </p>
                    </div>
                    <KangurStatusChip
                      accent={resolveVariantGroupAccent(group.surface)}
                      className='uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      {translations('labels.variantCount', { count: group.entries.length })}
                    </KangurStatusChip>
                  </div>

                  <div className='grid gap-3 sm:grid-cols-2'>
                    <GamesLibraryCompactMetric
                      label={translations('variantGroups.gamesLabel')}
                      value={gamesCount}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('variantGroups.enginesLabel')}
                      value={enginesCount}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('variantGroups.defaultsLabel')}
                      value={defaultCount}
                    />
                    <GamesLibraryCompactMetric
                      label={translations('variantGroups.launchableLabel')}
                      value={launchableCount}
                    />
                  </div>

                  <GamesLibraryDetailSurface label={translations('variantGroups.variantsLabel')}>
                    {group.entries
                      .map((entry) => `${entry.game.title} · ${entry.variant.title}`)
                      .join(', ')}
                  </GamesLibraryDetailSurface>
                </KangurInfoCard>
              );
            })}
          </div>
        </section>
            ) : null}
            </div>
          </div>
        ) : null}

        {activeTab === 'catalog' ? (
          <div
            id={getGamesLibraryTabIds('catalog').panelId}
            role='tabpanel'
            aria-labelledby={getGamesLibraryTabIds('catalog').tabId}
            tabIndex={0}
            className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
          >
            <div className={cn(GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME, 'space-y-6')}>
              <div
                data-testid='games-library-catalog-intro'
                className={cn(
                  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
                  'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'
                )}
              >
                <div className='space-y-1'>
                  <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                    {catalogPanelEyebrow}
                  </div>
                  <div className='text-lg font-black [color:var(--kangur-page-text)]'>
                    {catalogPanelTitle}
                  </div>
                  <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                    {catalogPanelDescription}
                  </div>
                </div>

                {hasActiveFilters ? (
                  <KangurButton
                    type='button'
                    size='sm'
                    variant='surface'
                    onClick={() =>
                      applyFilters(
                        DEFAULT_GAMES_LIBRARY_FILTERS,
                        'kangur-games-library:filters:clear'
                      )
                    }
                  >
                    {translations('filters.clear')}
                  </KangurButton>
                ) : null}
              </div>

            {groupedGames.length === 0 ? (
        <KangurEmptyState
          title={
            hasActiveFilters
              ? translations('emptyFilteredTitle')
              : translations('emptyTitle')
          }
          description={
            hasActiveFilters
              ? translations('emptyFilteredDescription')
              : translations('emptyDescription')
          }
          padding='lg'
        />
      ) : (
        groupedGames.map(({ subject, entries: subjectEntries }) => (
          <section
            key={subject.id}
            data-testid={`games-library-subject-${subject.id}`}
            className='space-y-4'
          >
            <div
              className={cn(
                GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
                'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'
              )}
            >
              <div className='flex items-start gap-4'>
                <div
                  aria-hidden='true'
                  className='flex size-14 shrink-0 items-center justify-center rounded-[1.4rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_88%,white)] text-[1.7rem] shadow-[0_20px_46px_-38px_rgba(15,23,42,0.45)]'
                  data-testid={`games-library-subject-icon-${subject.id}`}
                >
                  {getKangurSixYearOldSubjectVisual(subject.id).icon}
                </div>
                <div className='space-y-1'>
                  <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                    {translations('groupEyebrow')}
                  </div>
                  <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
                    {getLocalizedKangurSubjectLabel(subject.id, locale, subject.label)}
                  </div>
                  <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                    {translations('groupDescription', { count: subjectEntries.length })}
                  </div>
                </div>
              </div>

              <div className='grid gap-3 sm:grid-cols-2 lg:min-w-[24rem] lg:max-w-[30rem] lg:flex-1'>
                <GamesLibraryCompactMetric
                  label={translations('metrics.games')}
                  value={subjectEntries.length}
                />
                <GamesLibraryCompactMetric
                  label={translations('filters.engine.label')}
                  value={new Set(subjectEntries.map((entry) => entry.game.engineId)).size}
                />
                <GamesLibraryCompactMetric
                  label={translations('metrics.lessonLinked')}
                  value={
                    subjectEntries.filter((entry) => entry.game.lessonComponentIds.length > 0)
                      .length
                  }
                />
                <GamesLibraryCompactMetric
                  label={translations('cohortGroups.launchableLabel')}
                  value={
                    subjectEntries.filter((entry) =>
                      Boolean(buildKangurGameLaunchHref(basePath, entry.game))
                    ).length
                  }
                />
              </div>
            </div>

            <div className='grid gap-4 lg:grid-cols-2'>
              {subjectEntries.map((entry) => {
                const game = entry.game;
                const linkedLessonTitles = getLessonTitles(game.lessonComponentIds, locale);
                const gameHref = buildKangurGameLaunchHref(basePath, game);
                const lessonHref = buildKangurGameLessonHref(basePath, game);
                return (
                  <KangurInfoCard
                    key={game.id}
                    id={getKangurGameCardAnchorId(game.id)}
                    accent='slate'
                    padding='lg'
                    aria-expanded={selectedGame?.id === game.id}
                    aria-haspopup='dialog'
                    aria-label={`${translations('actions.previewGame')}: ${game.title}`}
                    className='group flex h-full scroll-mt-24 cursor-pointer flex-col gap-5 transition hover:-translate-y-[1px] hover:border-[color:var(--kangur-page-accent)] hover:shadow-[0_24px_60px_-42px_rgba(15,23,42,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kangur-page-accent)] focus-visible:ring-offset-2'
                    onClick={(event) => {
                      if (isGamesLibraryCardInteractiveTarget(event.target, event.currentTarget)) {
                        return;
                      }

                      setSelectedGame(game);
                    }}
                    onKeyDown={(event) => {
                      if (isGamesLibraryCardInteractiveTarget(event.target, event.currentTarget)) {
                        return;
                      }

                      if (event.key !== 'Enter' && event.key !== ' ') {
                        return;
                      }

                      event.preventDefault();
                      setSelectedGame(game);
                    }}
                    role='button'
                    tabIndex={0}
                  >
                    <div className='flex items-start gap-4'>
                      <div className='flex size-14 shrink-0 items-center justify-center rounded-[1.4rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_90%,white)] text-[1.7rem] shadow-[0_18px_42px_-34px_rgba(15,23,42,0.45)]'>
                        <span aria-hidden='true'>{game.emoji}</span>
                      </div>

                      <div className='min-w-0 flex-1 space-y-3'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <KangurStatusChip accent='slate' size='sm'>
                            {game.engineId}
                          </KangurStatusChip>
                          <KangurStatusChip
                            accent={game.ageGroup ? resolveAgeGroupAccent(game.ageGroup) : 'slate'}
                            size='sm'
                          >
                            {game.ageGroup
                              ? getLocalizedKangurAgeGroupLabel(game.ageGroup, locale)
                              : translations('labels.allAgeGroups')}
                          </KangurStatusChip>
                          <KangurStatusChip
                            accent={resolveStatusAccent(game.status)}
                            className='uppercase tracking-[0.14em]'
                            size='sm'
                          >
                            {translations(`statuses.${game.status}`)}
                          </KangurStatusChip>
                        </div>

                        <div className='space-y-2'>
                          <div className='text-xl font-black tracking-[-0.03em] [color:var(--kangur-page-text)] transition group-hover:[color:var(--kangur-page-accent)]'>
                            {game.title}
                          </div>
                          <p className='text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                            {game.description}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className='flex flex-wrap gap-2'>
                      <KangurStatusChip accent='sky' size='sm'>
                        {formatMechanicLabel(game.mechanic, translations)}
                      </KangurStatusChip>
                      {game.surfaces.map((surface) => (
                        <KangurStatusChip
                          key={`${game.id}-${surface}`}
                          accent={resolveSurfaceAccent(surface)}
                          className='uppercase tracking-[0.14em]'
                          size='sm'
                        >
                          {translations(`surfaces.${surface}`)}
                        </KangurStatusChip>
                      ))}
                    </div>

                    <div className='grid gap-3 sm:grid-cols-3'>
                      <div className={GAMES_LIBRARY_COMPACT_STAT_CARD_CLASSNAME}>
                        <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                          {translations('labels.variants')}
                        </div>
                        <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {translations('labels.variantCount', { count: game.variants.length })}
                        </div>
                      </div>
                      <div className={GAMES_LIBRARY_COMPACT_STAT_CARD_CLASSNAME}>
                        <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                          {translations('labels.lessonLinks')}
                        </div>
                        <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {game.lessonComponentIds.length > 0
                            ? String(game.lessonComponentIds.length)
                            : translations('labels.none')}
                        </div>
                      </div>
                      <div className={GAMES_LIBRARY_COMPACT_STAT_CARD_CLASSNAME}>
                        <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                          {translations('labels.legacyScreens')}
                        </div>
                        <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {game.legacyScreenIds.length > 0
                            ? String(game.legacyScreenIds.length)
                            : translations('labels.none')}
                        </div>
                      </div>
                    </div>

                    <div
                      className={cn(
                        GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
                        'space-y-2 p-3'
                      )}
                    >
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('labels.lessonLinks')}
                      </div>
                      {game.lessonComponentIds.length > 0 ? (
                        <div className='flex flex-wrap gap-2'>
                          {game.lessonComponentIds.map((componentId, index) => {
                            const status = getKangurGameLibraryLessonCoverageStatusFromMap(
                              componentId,
                              coverageStatusMap
                            );
                            return (
                              <KangurStatusChip
                                key={`${game.id}:${componentId}`}
                                accent={resolveLessonCoverageStatusAccent(status)}
                                className='max-w-full'
                                size='sm'
                              >
                                {linkedLessonTitles[index] ?? componentId}
                                {' · '}
                                {translations(`lessonCoverageStatuses.${status}`)}
                              </KangurStatusChip>
                            );
                          })}
                        </div>
                      ) : (
                        <div className='text-sm [color:var(--kangur-page-text)]'>
                          {translations('labels.none')}
                        </div>
                      )}
                    </div>

                    <div
                      data-testid={`games-library-card-actions-${game.id}`}
                      className='mt-auto flex flex-wrap gap-2 border-t border-[color:var(--kangur-soft-card-border)] pt-3'
                    >
                      <KangurButton
                        onClick={() => setSelectedGame(game)}
                        size='sm'
                        type='button'
                        variant='primary'
                      >
                        {translations('actions.previewGame')}
                      </KangurButton>
                      {gameHref ? (
                        <KangurButton asChild size='sm' variant='surface'>
                          <Link
                            href={gameHref}
                            targetPageKey='Game'
                            transitionSourceId={`kangur-games-library:${game.id}:game`}
                          >
                            {translations('actions.openGame')}
                          </Link>
                        </KangurButton>
                      ) : null}
                      {lessonHref ? (
                        <KangurButton asChild size='sm' variant='surface'>
                          <Link
                            href={lessonHref}
                            targetPageKey='Lessons'
                            transitionSourceId={`kangur-games-library:${game.id}:lessons`}
                          >
                            {translations('actions.openLessons')}
                          </Link>
                        </KangurButton>
                      ) : null}
                    </div>
                  </KangurInfoCard>
                );
              })}
            </div>
          </section>
        ))
      )}
            </div>
          </div>
        ) : null}
      </section>

      <GamesLibraryGameModal
        basePath={basePath}
        game={selectedGame}
        key={selectedGame?.id ?? 'kangur-games-library-modal'}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedGame(null);
          }
        }}
        open={selectedGame !== null}
      />
    </KangurStandardPageLayout>
  );
}

export default function GamesLibrary(): React.JSX.Element {
  const { canAccess, status } = useKangurPageAccess('GamesLibrary');

  if (status === 'loading') {
    return <></>;
  }

  if (!canAccess) {
    return <PageNotFound />;
  }

  return <GamesLibraryContent />;
}
