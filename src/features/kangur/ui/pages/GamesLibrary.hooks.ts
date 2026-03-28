'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  getKangurCanonicalPublicHref,
  getKangurPageSlug,
} from '@/features/kangur/config/routing';
import {
  KANGUR_AGE_GROUPS,
  KANGUR_SUBJECTS,
} from '@/features/kangur/lessons/lesson-catalog';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurGameLibraryPage } from '@/features/kangur/ui/hooks/useKangurGameLibraryPage';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import {
  buildGamesLibraryCatalogFilter,
  getGamesLibrarySearchParams,
  hasActiveGamesLibraryFilters,
  readGamesLibraryFiltersFromSearchParams,
  readGamesLibraryTabFromSearchParams,
  type GamesLibraryFilterState,
  type GamesLibraryTabId,
} from './GamesLibrary.filters';
import {
  formatMechanicLabel,
  GAMES_LIBRARY_TABS,
  resolveGamesLibraryActiveTab,
  resolveAgeGroupAccent,
  resolveGamesLibraryAvailableTabIds,
  resolveSurfaceAccent,
  withGamesLibrarySearchParams,
} from './GamesLibrary.utils';
import { GamesLibrarySidebarSection } from './GamesLibrary.components';

const buildGamesLibraryHref = (
  hrefBase: string,
  searchParams: Pick<URLSearchParams, 'delete' | 'set' | 'toString'> | null | undefined,
  filters: GamesLibraryFilterState,
  tab: GamesLibraryTabId
): string => {
  const nextSearchParams = new URLSearchParams(searchParams?.toString() ?? '');
  const knownParams = getGamesLibrarySearchParams(filters, tab);

  Object.keys(knownParams).forEach((key) => {
    nextSearchParams.delete(key);
  });

  Object.entries(knownParams).forEach(([key, value]) => {
    if (value !== undefined) {
      nextSearchParams.set(key, value);
    }
  });

  const [withoutHash = hrefBase] = hrefBase.split('#');
  const [withoutQuery = hrefBase] = withoutHash.split('?');
  const search = nextSearchParams.toString();
  return search ? `${withoutQuery}?${search}` : withoutQuery;
};

export function useGamesLibraryState() {
  const locale = useLocale();
  const translations = useTranslations('KangurGamesLibraryPage');
  const searchParams = useSearchParams();
  const { replace: replaceRoute } = useKangurRouteNavigator();
  const { basePath, requestedHref } = useKangurRouting();
  const auth = useKangurAuth();
  const { user, logout } = auth;
  const { openLoginModal } = useLoginModalSafe();
  const { guestPlayerName, setGuestPlayerName } = useGuestPlayerSafe();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const [filters, setFilters] = useState<GamesLibraryFilterState>(() =>
    readGamesLibraryFiltersFromSearchParams(searchParams)
  );
  const [selectedGame, setSelectedGame] = useState<unknown | null>(null);
  const deferredFilters = useDeferredValue(filters);
  const catalogFilter = useMemo(() => buildGamesLibraryCatalogFilter(deferredFilters), [deferredFilters]);
  const pageDataQuery = useKangurGameLibraryPage(catalogFilter);
  const pageData = pageDataQuery.data;

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
    requestedHref ?? getKangurCanonicalPublicHref([getKangurPageSlug('GamesLibrary')]),
    searchParams
  );
  const canonicalGamesLibraryHrefBase =
    requestedHref ?? getKangurCanonicalPublicHref([getKangurPageSlug('GamesLibrary')]);

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
  const requestedTab = readGamesLibraryTabFromSearchParams(searchParams);
  const resolvedActiveTab = useMemo(
    () =>
      resolveGamesLibraryActiveTab({
        availableTabIds,
        engineId: filters.engineId,
        gameId: filters.gameId,
        requestedTab,
      }),
    [availableTabIds, filters.engineId, filters.gameId, requestedTab]
  );
  const [activeTab, setActiveTab] = useState<GamesLibraryTabId>(resolvedActiveTab);

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
      badges.push({ accent, id, label, value });
    };

    if (filters.subject !== 'all') {
      addBadge(
        'subject',
        translations('filters.subject.label'),
        getLocalizedKangurSubjectLabel(
          filters.subject,
          locale,
          KANGUR_SUBJECTS.find((entry) => entry.id === filters.subject)?.label ?? filters.subject
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
          KANGUR_AGE_GROUPS.find((entry) => entry.id === filters.ageGroup)?.label ?? filters.ageGroup
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

    // ... (rest of badges)
    return badges;
  }, [filters, locale, translations]);

  useEffect(() => {
    setActiveTab(resolvedActiveTab);
  }, [resolvedActiveTab]);

  const replaceGamesLibraryRoute = useCallback(
    (nextFilters: GamesLibraryFilterState, nextTab: GamesLibraryTabId, sourceId: string) => {
      replaceRoute(
        buildGamesLibraryHref(canonicalGamesLibraryHrefBase, searchParams, nextFilters, nextTab),
        {
          pageKey: 'GamesLibrary',
          scroll: false,
          sourceId,
        }
      );
    },
    [canonicalGamesLibraryHrefBase, replaceRoute, searchParams]
  );

  const applyFilters = useCallback(
    (nextFilters: GamesLibraryFilterState, sourceId: string) => {
      const nextAvailableTabIds = resolveGamesLibraryAvailableTabIds({
        engineId: nextFilters.engineId,
        hasStructureSections,
        serializationAuditVisible,
      });
      const nextTab = resolveGamesLibraryActiveTab({
        availableTabIds: nextAvailableTabIds,
        engineId: nextFilters.engineId,
        gameId: nextFilters.gameId,
        requestedTab: activeTab,
      });

      setFilters(nextFilters);
      setActiveTab(nextTab);
      replaceGamesLibraryRoute(nextFilters, nextTab, sourceId);
    },
    [
      activeTab,
      hasStructureSections,
      replaceGamesLibraryRoute,
      serializationAuditVisible,
    ]
  );

  const updateFilter = useCallback(
    <TKey extends keyof GamesLibraryFilterState>(
      key: TKey,
      value: GamesLibraryFilterState[TKey]
    ) => {
      applyFilters(
        {
          ...filters,
          [key]: value,
        },
        `kangur-games-library:filters:${String(key)}`
      );
    },
    [applyFilters, filters]
  );

  const handleTabChange = useCallback(
    (nextTab: GamesLibraryTabId) => {
      if (!availableTabIds.includes(nextTab)) {
        return;
      }

      setActiveTab(nextTab);
      replaceGamesLibraryRoute(filters, nextTab, `kangur-games-library:tab:${nextTab}`);
    },
    [availableTabIds, filters, replaceGamesLibraryRoute]
  );

  const handlePointerTabMouseDown = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.preventDefault();
    },
    []
  );

  const handleTabKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') {
        return;
      }

      event.preventDefault();
      const delta = event.key === 'ArrowRight' ? 1 : -1;
      const nextIndex =
        (index + delta + availableTabs.length) % Math.max(availableTabs.length, 1);
      const nextTab = availableTabs[nextIndex];

      if (!nextTab) {
        return;
      }

      tabRefs.current[nextIndex]?.focus();
      handleTabChange(nextTab.id);
    },
    [availableTabs, handleTabChange]
  );

  const activeTabSummaryDescription = useMemo(() => {
    switch (activeTab) {
      case 'runtime':
        return translations('serializationAuditDescription');
      case 'structure':
        return translations('tabs.description');
      case 'catalog':
      default:
        return hasActiveFilters
          ? translations('filters.summaryFiltered', {
              visible: visibleGameCount,
              total: totalGameCount,
            })
          : translations('filters.summaryAll', { count: totalGameCount });
    }
  }, [
    activeTab,
    hasActiveFilters,
    totalGameCount,
    translations,
    visibleGameCount,
  ]);

  const orderedOverviewSections = useMemo(() => {
    const overviewSections = availableTabs.map((tab) => {
      const isActive = activeTab === tab.id;
      const title =
        tab.id === 'runtime'
          ? translations('serializationAuditTitle')
          : translations(tab.labelKey);
      const description =
        tab.id === 'catalog'
          ? hasActiveFilters
            ? translations('filters.summaryFiltered', {
                visible: visibleGameCount,
                total: totalGameCount,
              })
            : translations('filters.summaryAll', { count: totalGameCount })
          : tab.id === 'structure'
            ? translations('tabs.description')
            : translations('serializationAuditDescription');

      return {
        id: tab.id,
        isActive,
        node: React.createElement(
          GamesLibrarySidebarSection,
          {
            dataTestId: `games-library-overview-${tab.id}`,
            eyebrow: translations('tabs.eyebrow'),
            isActive,
            key: tab.id,
            title,
            description,
          },
          React.createElement('div', {
            className: 'text-xs [color:var(--kangur-page-muted-text)]',
          }, description)
        ),
      };
    });

    return overviewSections.sort((left, right) => Number(right.isActive) - Number(left.isActive));
  }, [
    activeTab,
    availableTabs,
    hasActiveFilters,
    totalGameCount,
    translations,
    visibleGameCount,
  ]);

  return {
    locale,
    translations,
    searchParams,
    replaceRoute,
    basePath,
    requestedHref,
    user,
    logout,
    openLoginModal,
    guestPlayerName,
    setGuestPlayerName,
    filters,
    setFilters,
    pageDataQuery,
    pageData,
    overview,
    engineOverview,
    coverageGroups,
    coverageStatusMap,
    engineGroups,
    drawingGroups,
    implementationGroups,
    engineCatalogFacets,
    engineCatalogFilterOptions,
    catalogFacets,
    serializationAudit,
    metrics,
    groupedGames,
    cohortGroups,
    variantGroups,
    gameFilterOptions,
    hasActiveFilters,
    visibleGameCount,
    totalGameCount,
    serializationAuditVisible,
    hasStructureSections,
    currentGamesLibraryHref,
    availableTabIds,
    availableTabs,
    activeFilterBadges,
    activeTab,
    setActiveTab,
    handleTabChange,
    handleTabKeyDown,
    handlePointerTabMouseDown,
    tabRefs,
    selectedGame,
    setSelectedGame,
    updateFilter,
    applyFilters,
    activeTabSummaryDescription,
    orderedOverviewSections,
  };
}

// Helper to avoid issues if contexts are not yet available or optional
function useLoginModalSafe() {
  try {
    return useKangurLoginModal();
  } catch {
    return { openLoginModal: () => {} };
  }
}

function useGuestPlayerSafe() {
  try {
    return useKangurGuestPlayer();
  } catch {
    return { guestPlayerName: '', setGuestPlayerName: () => {} };
  }
}
