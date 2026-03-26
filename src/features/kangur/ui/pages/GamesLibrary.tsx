'use client';

import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';

import { canAccessKangurPage } from '@/features/kangur/config/page-access';
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
import { useOptionalNextAuthSession } from '@/features/kangur/ui/hooks/useOptionalNextAuthSession';
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
  coverageId: 'library_backed' | 'launchable' | 'selector_fallback'
): 'amber' | 'rose' | 'sky' => {
  switch (coverageId) {
    case 'launchable':
      return 'rose';
    case 'selector_fallback':
      return 'amber';
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
): 'amber' | 'rose' | 'sky' | 'slate' => {
  switch (status) {
    case 'launchable':
      return 'rose';
    case 'selector_fallback':
      return 'amber';
    case 'lesson_only':
      return 'slate';
    case 'library_backed':
    default:
      return 'sky';
  }
};

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

              <div className='min-w-0 space-y-1 sm:col-span-2 xl:col-span-3'>
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
          </KangurInfoCard>

          {filters.gameId !== 'all' ? (
            <KangurInfoCard
              accent='sky'
              padding='lg'
              className='flex flex-wrap items-start justify-between gap-4'
            >
              <div className='space-y-1'>
                <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                  {translations('focus.eyebrow')}
                </div>
                <div className='text-xl font-black [color:var(--kangur-page-text)]'>
                  {translations('focus.gameTitle')}
                </div>
                <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                  {translations('focus.gameDescription', {
                    game: focusedGameTitle ?? filters.gameId,
                  })}
                </div>
                <div className='text-xs font-semibold uppercase tracking-[0.12em] [color:var(--kangur-page-muted-text)]'>
                  {filters.gameId}
                </div>
              </div>
              <KangurButton
                type='button'
                size='sm'
                variant='surface'
                onClick={() => updateFilter('gameId', 'all')}
              >
                {translations('focus.clear')}
              </KangurButton>
            </KangurInfoCard>
          ) : null}

          {filters.engineId !== 'all' ? (
            <KangurInfoCard
              accent='sky'
              padding='lg'
              className='flex flex-wrap items-start justify-between gap-4'
            >
              <div className='space-y-1'>
                <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                  {translations('focus.eyebrow')}
                </div>
                <div className='text-xl font-black [color:var(--kangur-page-text)]'>
                  {translations('focus.engineTitle')}
                </div>
                <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                  {translations('focus.engineDescription', {
                    engine: focusedEngineTitle ?? filters.engineId,
                  })}
                </div>
                <div className='text-xs font-semibold uppercase tracking-[0.12em] [color:var(--kangur-page-muted-text)]'>
                  {filters.engineId}
                </div>
              </div>
              <KangurButton
                type='button'
                size='sm'
                variant='surface'
                onClick={() => updateFilter('engineId', 'all')}
              >
                {translations('focus.clearEngine')}
              </KangurButton>
            </KangurInfoCard>
          ) : null}

        <div className='grid gap-3 sm:grid-cols-2'>
          <KangurMetricCard
            accent='sky'
            label={translations('metrics.games')}
            value={metrics.visibleGameCount}
            description={translations('metrics.gamesDescription')}
          />
          <KangurMetricCard
            accent='rose'
            label={translations('metrics.engines')}
            value={engineCatalogFacets?.engineCount ?? metrics.engineCount}
            description={translations('metrics.enginesDescription')}
          />
          <KangurMetricCard
            accent='emerald'
            label={translations('metrics.variants')}
            value={metrics.variantCount}
            description={translations('metrics.variantsDescription')}
          />
          <KangurMetricCard
            accent='amber'
            label={translations('metrics.lessonLinked')}
            value={metrics.lessonLinkedCount}
            description={translations('metrics.lessonLinkedDescription')}
          />
          <KangurMetricCard
            accent='sky'
            label={translations('drawingGroupsTitle')}
            value={engineCatalogFacets?.drawingEngineCount ?? drawingGroups.length}
          />
          <KangurMetricCard
            accent='rose'
            label={translations('cohortGroups.launchableLabel')}
            value={
              engineCatalogFacets?.launchableEngineCount ??
              engineGroups.filter((group) => group.launchableCount > 0).length
            }
          />
          <KangurMetricCard
            accent='emerald'
            label={translations('cohortGroups.lessonLinkedLabel')}
            value={
              engineCatalogFacets?.lessonLinkedEngineCount ??
              engineGroups.filter((group) => group.lessonComponentIds.length > 0).length
            }
          />
          <KangurMetricCard
            accent='amber'
            label={translations('implementationGroupsTitle')}
            value={
              engineCatalogFacets?.implementationOwnerships.length ??
              implementationGroups.length
            }
          />
        </div>
      </div>
      </section>

      <section className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
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

        {activeTab === 'runtime' && serializationAuditVisible ? (
          <div
            id={getGamesLibraryTabIds('runtime').panelId}
            role='tabpanel'
            aria-labelledby={getGamesLibraryTabIds('runtime').tabId}
            tabIndex={0}
            className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
          >
            <section className='space-y-4'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
              {translations('serializationAuditEyebrow')}
            </div>
            <div className='flex flex-wrap items-center gap-3'>
              <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
                {translations('serializationAuditTitle')}
              </div>
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
            <div className='text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('serializationAuditDescription')}
            </div>
          </div>

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
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('serializationAudit.totalVariantsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {surfaceAudit.totalVariants}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('serializationAudit.explicitVariantsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {surfaceAudit.explicitRuntimeVariants}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('serializationAudit.fallbackVariantsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {surfaceAudit.compatibilityFallbackVariants}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('serializationAudit.duplicatesVariantsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {surfaceAudit.duplicatedLegacyVariants}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('serializationAudit.missingVariantsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {surfaceAudit.missingRuntimeVariants}
                      </div>
                    </div>
                  </div>
                </KangurInfoCard>
              );
            })}
          </div>

          {serializationBacklogEntries.length > 0 ? (
            <div className='space-y-3'>
              <div className='space-y-1'>
                <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                  {translations('serializationAudit.backlogEyebrow')}
                </div>
                <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                  {translations('serializationAudit.backlogDescription')}
                </div>
              </div>
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
                  </KangurInfoCard>
                ))}
              </div>
            </div>
          ) : null}
            </section>
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
            {implementationGroups.length > 0 ? (
        <section className='space-y-4'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
              {translations('implementationGroupsEyebrow')}
            </div>
            <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
              {translations('implementationGroupsTitle')}
            </div>
            <div className='text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('implementationGroupsDescription', {
                count: implementationGroups.length,
              })}
            </div>
          </div>

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
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('implementationGroups.enginesLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.engineGroups.length}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('implementationGroups.gamesLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.gameCount}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('implementationGroups.runtimeComponentsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.runtimeIds.length}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('implementationGroups.lessonsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.lessonComponentIds.length}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('implementationGroups.engineTitlesLabel')}
                    </div>
                    <div className='text-sm [color:var(--kangur-page-text)]'>
                      {group.engineGroups
                        .map((engineGroup) => engineGroup.engine?.title ?? engineGroup.engineId)
                        .join(', ')}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('implementationGroups.runtimeComponentsLabel')}
                    </div>
                    <div className='text-sm [color:var(--kangur-page-text)]'>
                      {group.runtimeIds.length
                        ? group.runtimeIds.join(', ')
                        : translations('labels.none')}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('implementationGroups.lessonLinksLabel')}
                    </div>
                    <div className='text-sm [color:var(--kangur-page-text)]'>
                      {lessonTitles.length > 0
                        ? lessonTitles.join(', ')
                        : translations('labels.none')}
                    </div>
                  </div>
                </KangurInfoCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {coverageGroups.length > 0 ? (
        <section className='space-y-4'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
              {translations('coverageGroupsEyebrow')}
            </div>
            <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
              {translations('coverageGroupsTitle')}
            </div>
            <div className='text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('coverageGroupsDescription', { count: coverageGroups.length })}
            </div>
          </div>

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
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('coverageGroups.lessonsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.componentIds.length}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('coverageGroups.coveredLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.coveredComponentIds.length}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('coverageGroups.gamesLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.entries.length}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('coverageGroups.cohortsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.ageGroups.length}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('coverageGroups.subjectsLabel')}
                    </div>
                    <div className='text-sm [color:var(--kangur-page-text)]'>
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
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('coverageGroups.coveredLessonsLabel')}
                    </div>
                    <div className='text-sm [color:var(--kangur-page-text)]'>
                      {coveredLessonTitles.length > 0
                        ? coveredLessonTitles.join(', ')
                        : translations('labels.none')}
                    </div>
                  </div>

                  {uncoveredLessonTitles.length > 0 ? (
                    <div className='space-y-2'>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('coverageGroups.fallbackOnlyLessonsLabel')}
                      </div>
                      <div className='text-sm [color:var(--kangur-page-text)]'>
                        {uncoveredLessonTitles.join(', ')}
                      </div>
                    </div>
                  ) : null}
                </KangurInfoCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {cohortGroups.length > 0 ? (
        <section className='space-y-4'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
              {translations('cohortGroupsEyebrow')}
            </div>
            <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
              {translations('cohortGroupsTitle')}
            </div>
            <div className='text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('cohortGroupsDescription', { count: cohortGroups.length })}
            </div>
          </div>

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
                  <div>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('cohortGroups.gamesLabel')}
                    </div>
                    <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                      {group.entries.length}
                    </div>
                  </div>
                  <div>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('cohortGroups.enginesLabel')}
                    </div>
                    <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                      {group.engineCount}
                    </div>
                  </div>
                  <div>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('cohortGroups.launchableLabel')}
                    </div>
                    <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                      {group.launchableCount}
                    </div>
                  </div>
                  <div>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('cohortGroups.lessonLinkedLabel')}
                    </div>
                    <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                      {group.lessonLinkedCount}
                    </div>
                  </div>
                </div>

                <div className='space-y-2'>
                  <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                    {translations('cohortGroups.subjectsLabel')}
                  </div>
                  <div className='text-sm [color:var(--kangur-page-text)]'>
                    {group.subjects
                      .map((subject) =>
                        getLocalizedKangurSubjectLabel(
                          subject,
                          locale,
                          KANGUR_SUBJECTS.find((entry) => entry.id === subject)?.label ?? subject
                        )
                      )
                      .join(', ')}
                  </div>
                </div>
              </KangurInfoCard>
            ))}
          </div>
        </section>
      ) : null}

      {drawingGroups.length > 0 ? (
        <section className='space-y-4'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
              {translations('drawingGroupsEyebrow')}
            </div>
            <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
              {translations('drawingGroupsTitle')}
            </div>
            <div className='text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('drawingGroupsDescription', { count: drawingGroups.length })}
            </div>
          </div>

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
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('drawingGroups.gamesLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.entries.length}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('drawingGroups.variantsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.variantCount}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('labels.engineCategory')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.category
                          ? translations(`engineCategories.${group.category}`)
                          : translations('labels.none')}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('drawingGroups.cohortsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.ageGroups.length}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('drawingGroups.ownershipLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {implementation?.ownership
                          ? translations(`implementationOwnership.${implementation.ownership}`)
                          : translations('labels.none')}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('drawingGroups.lessonsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.lessonComponentIds.length}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('drawingGroups.runtimeComponentsLabel')}
                    </div>
                    <div className='text-sm [color:var(--kangur-page-text)]'>
                      {implementation?.runtimeIds.length
                        ? implementation.runtimeIds.join(', ')
                        : translations('labels.none')}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('drawingGroups.subjectsLabel')}
                    </div>
                    <div className='text-sm [color:var(--kangur-page-text)]'>
                      {group.subjects
                        .map((subject) =>
                          getLocalizedKangurSubjectLabel(
                            subject,
                            locale,
                            KANGUR_SUBJECTS.find((entry) => entry.id === subject)?.label ?? subject
                          )
                        )
                        .join(', ')}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('drawingGroups.lessonLinksLabel')}
                    </div>
                    <div className='text-sm [color:var(--kangur-page-text)]'>
                      {lessonTitles.length > 0
                        ? lessonTitles.join(', ')
                        : translations('labels.none')}
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('drawingGroups.gameTitlesLabel')}
                    </div>
                    <div className='text-sm [color:var(--kangur-page-text)]'>
                      {group.entries.map((entry) => entry.game.title).join(', ')}
                    </div>
                  </div>
                </KangurInfoCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {engineGroups.length > 0 ? (
        <section className='space-y-4'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
              {translations('engineGroupsEyebrow')}
            </div>
            <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
              {translations('engineGroupsTitle')}
            </div>
            <div className='text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('engineGroupsDescription', { count: engineGroups.length })}
            </div>
          </div>

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
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('engineGroups.gamesLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.entries.map((entry) => entry.game.title).join(', ')}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('engineGroups.subjectsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.subjects
                          .map((subject) =>
                            getLocalizedKangurSubjectLabel(
                              subject,
                              locale,
                              KANGUR_SUBJECTS.find((entry) => entry.id === subject)?.label ?? subject
                            )
                          )
                          .join(', ')}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('labels.engineCategory')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {group.category
                          ? translations(`engineCategories.${group.category}`)
                          : translations('labels.none')}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('engineGroups.ownershipLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {implementation?.ownership
                          ? translations(`implementationOwnership.${implementation.ownership}`)
                          : translations('labels.none')}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('engineGroups.mechanicsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {mechanics
                          .map((mechanic) => formatMechanicLabel(mechanic, translations))
                          .join(', ')}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('engineGroups.surfacesLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {surfaces
                          .map((surface) => translations(`surfaces.${surface}`))
                          .join(', ')}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('engineGroups.runtimeComponentsLabel')}
                    </div>
                    <div className='text-sm [color:var(--kangur-page-text)]'>
                      {implementation?.runtimeIds.length
                        ? implementation.runtimeIds.join(', ')
                        : translations('labels.none')}
                    </div>
                  </div>
                </KangurInfoCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {variantGroups.length > 0 ? (
        <section className='space-y-4'>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
              {translations('variantGroupsEyebrow')}
            </div>
            <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
              {translations('variantGroupsTitle')}
            </div>
            <div className='text-sm [color:var(--kangur-page-muted-text)]'>
              {translations('variantGroupsDescription', {
                count: metrics.variantCount,
                surfaceCount: variantGroups.length,
              })}
            </div>
          </div>

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
                        {translations(`variantSurfaces.${group.surface}`)}
                      </div>
                      <p className='mt-2 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                        {translations('variantGroups.groupDescription', {
                          count: group.entries.length,
                        })}
                      </p>
                    </div>
                    <KangurStatusChip
                      accent={resolveVariantSurfaceAccent(group.surface)}
                      className='uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      {translations('labels.variantCount', { count: group.entries.length })}
                    </KangurStatusChip>
                  </div>

                  <div className='grid gap-3 sm:grid-cols-2'>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('variantGroups.gamesLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {gamesCount}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('variantGroups.enginesLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {enginesCount}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('variantGroups.defaultsLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {defaultCount}
                      </div>
                    </div>
                    <div>
                      <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                        {translations('variantGroups.launchableLabel')}
                      </div>
                      <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                        {launchableCount}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-2'>
                    <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                      {translations('variantGroups.variantsLabel')}
                    </div>
                    <div className='text-sm [color:var(--kangur-page-text)]'>
                      {group.entries
                        .map(
                          (entry) =>
                            `${entry.game.title} · ${entry.variant.title}`
                        )
                        .join(', ')}
                    </div>
                  </div>
                </KangurInfoCard>
              );
            })}
          </div>
        </section>
            ) : null}
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
          <section key={subject.id} className='space-y-4'>
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
                    className='flex h-full scroll-mt-24 cursor-pointer flex-col gap-4 transition hover:border-[color:var(--kangur-page-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--kangur-page-accent)] focus-visible:ring-offset-2'
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
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='min-w-0 flex-1'>
                        <div className='text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                          {game.engineId}
                        </div>
                        <div className='mt-1 text-xl font-black [color:var(--kangur-page-text)]'>
                          <span className='mr-2' aria-hidden='true'>
                            {game.emoji}
                          </span>
                          {game.title}
                        </div>
                        <p className='mt-2 text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                          {game.description}
                        </p>
                      </div>
                      <KangurStatusChip
                        accent={resolveStatusAccent(game.status)}
                        className='uppercase tracking-[0.14em]'
                        size='sm'
                      >
                        {translations(`statuses.${game.status}`)}
                      </KangurStatusChip>
                    </div>

                    <div className='flex flex-wrap gap-2'>
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

                    {gameHref || lessonHref ? (
                      <div className='flex flex-wrap gap-2'>
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
                          <KangurButton
                            asChild
                            size='sm'
                            variant='surface'
                          >
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
                    ) : null}

                    <div className='grid gap-3 sm:grid-cols-2'>
                      <div>
                        <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                          {translations('labels.mechanic')}
                        </div>
                        <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {formatMechanicLabel(game.mechanic, translations)}
                        </div>
                      </div>
                      <div>
                        <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                          {translations('labels.ageGroup')}
                        </div>
                        <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {game.ageGroup
                            ? getLocalizedKangurAgeGroupLabel(game.ageGroup, locale)
                            : translations('labels.allAgeGroups')}
                        </div>
                      </div>
                      <div>
                        <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                          {translations('labels.variants')}
                        </div>
                        <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {translations('labels.variantCount', { count: game.variants.length })}
                        </div>
                      </div>
                      <div>
                        <div className='text-[11px] font-bold uppercase tracking-wide [color:var(--kangur-page-muted-text)]'>
                          {translations('labels.legacyScreens')}
                        </div>
                        <div className='mt-1 text-sm font-semibold [color:var(--kangur-page-text)]'>
                          {game.legacyScreenIds.length > 0
                            ? game.legacyScreenIds.join(', ')
                            : translations('labels.none')}
                        </div>
                      </div>
                    </div>

                    <div className='space-y-2'>
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
                  </KangurInfoCard>
                );
              })}
            </div>
          </section>
        ))
      )}
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
  const { data: session, status } = useOptionalNextAuthSession();

  if (status === 'loading') {
    return <></>;
  }

  if (!canAccessKangurPage('GamesLibrary', session)) {
    return <PageNotFound />;
  }

  return <GamesLibraryContent />;
}
