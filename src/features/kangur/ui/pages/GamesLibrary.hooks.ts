'use client';

import React from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';

import {
  createKangurGameLibraryPageDataFromGames,
  type KangurGameCatalogEntry,
  type KangurGameLibraryPageData,
} from '@/features/kangur/games';
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
import {
  useKangurAuthActions,
  useKangurAuthSessionState,
} from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModalActions } from '@/features/kangur/ui/context/KangurLoginModalContext';
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

type GamesLibraryTranslations = ReturnType<typeof useTranslations>;
type GamesLibrarySearchParams = ReturnType<typeof useSearchParams>;
type GamesLibrarySelectedGame = KangurGameCatalogEntry['game'];
type GamesLibraryAvailableTab = (typeof GAMES_LIBRARY_TABS)[number];
type GamesLibraryActiveFilterBadge = {
  accent: 'amber' | 'emerald' | 'rose' | 'sky' | 'slate' | 'violet';
  id: string;
  label: string;
  value: string;
};
type GamesLibraryOverviewSection = {
  id: GamesLibraryTabId;
  isActive: boolean;
  node: React.ReactElement;
};
type GamesLibraryLoginModalState = {
  openLoginModal: () => void;
};
type GamesLibraryGuestPlayerState = {
  guestPlayerName: string;
  setGuestPlayerName: (value: string) => void;
};

const DEFAULT_GAMES_LIBRARY_PAGE_DATA: KangurGameLibraryPageData =
  createKangurGameLibraryPageDataFromGames();

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

const resolveGamesLibraryCanonicalHrefBase = (
  requestedHref: string | null | undefined
): string =>
  requestedHref ?? getKangurCanonicalPublicHref([getKangurPageSlug('GamesLibrary')]);

const resolveGamesLibrarySerializationAuditVisible = (
  serializationAudit: KangurGameLibraryPageData['serializationAudit']
): boolean =>
  serializationAudit.runtimeBearingVariantCount > 0 || serializationAudit.engineCount > 0;

const resolveGamesLibraryHasStructureSections = ({
  cohortGroups,
  coverageGroups,
  drawingGroups,
  engineGroups,
  implementationGroups,
  variantGroups,
}: {
  cohortGroups: KangurGameLibraryPageData['overview']['cohortGroups'];
  coverageGroups: KangurGameLibraryPageData['coverage']['groups'];
  drawingGroups: KangurGameLibraryPageData['engineOverview']['drawingGroups'];
  engineGroups: KangurGameLibraryPageData['engineOverview']['engineGroups'];
  implementationGroups: KangurGameLibraryPageData['engineOverview']['implementationGroups'];
  variantGroups: KangurGameLibraryPageData['overview']['variantGroups'];
}): boolean =>
  implementationGroups.length > 0 ||
  coverageGroups.length > 0 ||
  cohortGroups.length > 0 ||
  drawingGroups.length > 0 ||
  engineGroups.length > 0 ||
  variantGroups.length > 0;

const resolveGamesLibraryTabDescription = ({
  hasActiveFilters,
  tab,
  totalGameCount,
  translations,
  visibleGameCount,
}: {
  hasActiveFilters: boolean;
  tab: GamesLibraryAvailableTab;
  totalGameCount: number;
  translations: GamesLibraryTranslations;
  visibleGameCount: number;
}): string => {
  if (tab.id === 'catalog') {
    return hasActiveFilters
      ? translations('filters.summaryFiltered', {
          visible: visibleGameCount,
          total: totalGameCount,
        })
      : translations('filters.summaryAll', { count: totalGameCount });
  }

  if (tab.id === 'structure') {
    return translations('tabs.description');
  }

  return translations('serializationAuditDescription');
};

const resolveGamesLibraryOverviewTitle = (
  tab: GamesLibraryAvailableTab,
  translations: GamesLibraryTranslations
): string =>
  tab.id === 'runtime' ? translations('serializationAuditTitle') : translations(tab.labelKey);

const createGamesLibraryOverviewSection = ({
  activeTab,
  hasActiveFilters,
  tab,
  totalGameCount,
  translations,
  visibleGameCount,
}: {
  activeTab: GamesLibraryTabId;
  hasActiveFilters: boolean;
  tab: GamesLibraryAvailableTab;
  totalGameCount: number;
  translations: GamesLibraryTranslations;
  visibleGameCount: number;
}): GamesLibraryOverviewSection => {
  const isActive = activeTab === tab.id;
  const description = resolveGamesLibraryTabDescription({
    hasActiveFilters,
    tab,
    totalGameCount,
    translations,
    visibleGameCount,
  });

  return {
    id: tab.id,
    isActive,
    node: React.createElement(
      GamesLibrarySidebarSection,
      {
        dataTestId: `games-library-overview-${tab.id}`,
        children: React.createElement(
          'div',
          {
            className: 'text-xs [color:var(--kangur-page-muted-text)]',
          },
          description
        ),
        eyebrow: translations('tabs.eyebrow'),
        isActive,
        key: tab.id,
        title: resolveGamesLibraryOverviewTitle(tab, translations),
        description,
      }
    ),
  };
};

const resolveGamesLibrarySubjectBadge = ({
  filters,
  locale,
  translations,
}: {
  filters: GamesLibraryFilterState;
  locale: string;
  translations: GamesLibraryTranslations;
}): GamesLibraryActiveFilterBadge | null => {
  if (filters.subject === 'all') {
    return null;
  }

  return {
    accent: 'sky',
    id: 'subject',
    label: translations('filters.subject.label'),
    value: getLocalizedKangurSubjectLabel(
      filters.subject,
      locale,
      KANGUR_SUBJECTS.find((entry) => entry.id === filters.subject)?.label ??
        filters.subject
    ),
  };
};

const resolveGamesLibraryAgeGroupBadge = ({
  filters,
  locale,
  translations,
}: {
  filters: GamesLibraryFilterState;
  locale: string;
  translations: GamesLibraryTranslations;
}): GamesLibraryActiveFilterBadge | null => {
  if (filters.ageGroup === 'all') {
    return null;
  }

  return {
    accent: resolveAgeGroupAccent(filters.ageGroup),
    id: 'ageGroup',
    label: translations('filters.ageGroup.label'),
    value: getLocalizedKangurAgeGroupLabel(
      filters.ageGroup,
      locale,
      KANGUR_AGE_GROUPS.find((entry) => entry.id === filters.ageGroup)?.label ??
        filters.ageGroup
    ),
  };
};

const resolveGamesLibraryMechanicBadge = ({
  filters,
  translations,
}: {
  filters: GamesLibraryFilterState;
  translations: GamesLibraryTranslations;
}): GamesLibraryActiveFilterBadge | null => {
  if (filters.mechanic === 'all') {
    return null;
  }

  return {
    accent: 'sky',
    id: 'mechanic',
    label: translations('filters.mechanic.label'),
    value: formatMechanicLabel(filters.mechanic, translations),
  };
};

const resolveGamesLibrarySurfaceBadge = ({
  filters,
  translations,
}: {
  filters: GamesLibraryFilterState;
  translations: GamesLibraryTranslations;
}): GamesLibraryActiveFilterBadge | null => {
  if (filters.surface === 'all') {
    return null;
  }

  return {
    accent: resolveSurfaceAccent(filters.surface),
    id: 'surface',
    label: translations('filters.surface.label'),
    value: translations(`surfaces.${filters.surface}`),
  };
};

const compactGamesLibraryActiveFilterBadges = (
  badges: Array<GamesLibraryActiveFilterBadge | null>
): GamesLibraryActiveFilterBadge[] =>
  badges.filter(
    (badge): badge is GamesLibraryActiveFilterBadge => badge !== null
  );

function useGamesLibraryContextState() {
  const locale = useLocale();
  const translations = useTranslations('KangurGamesLibraryPage');
  const searchParams = useSearchParams();
  const { replace: replaceRoute } = useKangurRouteNavigator();
  const { basePath, requestedHref } = useKangurRouting();
  const { user } = useKangurAuthSessionState();
  const { logout } = useKangurAuthActions();
  const { openLoginModal } = useLoginModalSafe();
  const { guestPlayerName, setGuestPlayerName } = useGuestPlayerSafe();
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  return {
    basePath,
    guestPlayerName,
    locale,
    logout,
    openLoginModal,
    replaceRoute,
    requestedHref,
    searchParams,
    setGuestPlayerName,
    tabRefs,
    translations,
    user,
  };
}

function useGamesLibraryPageDataState(input: {
  filters: GamesLibraryFilterState;
  requestedHref: string | null | undefined;
  searchParams: GamesLibrarySearchParams;
}) {
  const { filters, requestedHref, searchParams } = input;
  const deferredFilters = useDeferredValue(filters);
  const catalogFilter = useMemo(
    () => buildGamesLibraryCatalogFilter(deferredFilters),
    [deferredFilters]
  );
  const pageDataQuery = useKangurGameLibraryPage(catalogFilter);
  const pageData = pageDataQuery.data ?? DEFAULT_GAMES_LIBRARY_PAGE_DATA;
  const {
    catalogFacets,
    coverage,
    engineFilterOptions,
    engineOverview,
    overview,
    serializationAudit,
  } = pageData;
  const canonicalGamesLibraryHrefBase = resolveGamesLibraryCanonicalHrefBase(requestedHref);
  const currentGamesLibraryHref = withGamesLibrarySearchParams(
    canonicalGamesLibraryHrefBase,
    searchParams
  );

  return {
    canonicalGamesLibraryHrefBase,
    catalogFacets,
    cohortGroups: overview.cohortGroups,
    coverageGroups: coverage.groups,
    coverageStatusMap: coverage.statusMap,
    currentGamesLibraryHref,
    drawingGroups: engineOverview.drawingGroups,
    engineCatalogFacets: engineOverview.facets,
    engineCatalogFilterOptions: engineFilterOptions,
    engineGroups: engineOverview.engineGroups,
    engineOverview,
    gameFilterOptions: catalogFacets.games,
    groupedGames: overview.subjectGroups,
    hasActiveFilters: hasActiveGamesLibraryFilters(filters),
    hasStructureSections: resolveGamesLibraryHasStructureSections({
      cohortGroups: overview.cohortGroups,
      coverageGroups: coverage.groups,
      drawingGroups: engineOverview.drawingGroups,
      engineGroups: engineOverview.engineGroups,
      implementationGroups: engineOverview.implementationGroups,
      variantGroups: overview.variantGroups,
    }),
    implementationGroups: engineOverview.implementationGroups,
    metrics: overview.metrics,
    overview,
    pageData,
    pageDataQuery,
    serializationAudit,
    serializationAuditVisible: resolveGamesLibrarySerializationAuditVisible(
      serializationAudit
    ),
    totalGameCount: catalogFacets.gameCount,
    variantGroups: overview.variantGroups,
    visibleGameCount: overview.metrics.visibleGameCount,
  };
}

function useGamesLibraryActiveFilterBadges(input: {
  filters: GamesLibraryFilterState;
  locale: string;
  translations: GamesLibraryTranslations;
}): GamesLibraryActiveFilterBadge[] {
  const { filters, locale, translations } = input;

  return useMemo(() => {
    return compactGamesLibraryActiveFilterBadges([
      resolveGamesLibrarySubjectBadge({
        filters,
        locale,
        translations,
      }),
      resolveGamesLibraryAgeGroupBadge({
        filters,
        locale,
        translations,
      }),
      resolveGamesLibraryMechanicBadge({
        filters,
        translations,
      }),
      resolveGamesLibrarySurfaceBadge({
        filters,
        translations,
      }),
    ]);
  }, [filters, locale, translations]);
}

function useGamesLibraryOverviewSections(input: {
  activeTab: GamesLibraryTabId;
  availableTabs: GamesLibraryAvailableTab[];
  hasActiveFilters: boolean;
  totalGameCount: number;
  translations: GamesLibraryTranslations;
  visibleGameCount: number;
}): GamesLibraryOverviewSection[] {
  const {
    activeTab,
    availableTabs,
    hasActiveFilters,
    totalGameCount,
    translations,
    visibleGameCount,
  } = input;

  return useMemo(
    () =>
      availableTabs
        .map((tab) =>
          createGamesLibraryOverviewSection({
            activeTab,
            hasActiveFilters,
            tab,
            totalGameCount,
            translations,
            visibleGameCount,
          })
        )
        .sort((left, right) => Number(right.isActive) - Number(left.isActive)),
    [
      activeTab,
      availableTabs,
      hasActiveFilters,
      totalGameCount,
      translations,
      visibleGameCount,
    ]
  );
}

function useGamesLibraryTabState(input: {
  availableStructureState: {
    hasStructureSections: boolean;
    serializationAuditVisible: boolean;
  };
  canonicalGamesLibraryHrefBase: string;
  filters: GamesLibraryFilterState;
  replaceRoute: ReturnType<typeof useKangurRouteNavigator>['replace'];
  searchParams: GamesLibrarySearchParams;
  setFilters: React.Dispatch<React.SetStateAction<GamesLibraryFilterState>>;
  tabRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
}) {
  const {
    availableStructureState,
    canonicalGamesLibraryHrefBase,
    filters,
    replaceRoute,
    searchParams,
    setFilters,
    tabRefs,
  } = input;
  const requestedTab = readGamesLibraryTabFromSearchParams(searchParams);
  const availableTabIds = useMemo(
    () =>
      resolveGamesLibraryAvailableTabIds({
        engineId: filters.engineId,
        hasStructureSections: availableStructureState.hasStructureSections,
        serializationAuditVisible:
          availableStructureState.serializationAuditVisible,
      }),
    [
      availableStructureState.hasStructureSections,
      availableStructureState.serializationAuditVisible,
      filters.engineId,
    ]
  );
  const availableTabs = useMemo(
    () => GAMES_LIBRARY_TABS.filter((tab) => availableTabIds.includes(tab.id)),
    [availableTabIds]
  );
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

  useEffect(() => {
    setActiveTab(resolvedActiveTab);
  }, [resolvedActiveTab]);

  const replaceGamesLibraryRoute = useCallback(
    (
      nextFilters: GamesLibraryFilterState,
      nextTab: GamesLibraryTabId,
      sourceId: string
    ) => {
      replaceRoute(
        buildGamesLibraryHref(
          canonicalGamesLibraryHrefBase,
          searchParams,
          nextFilters,
          nextTab
        ),
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
        hasStructureSections: availableStructureState.hasStructureSections,
        serializationAuditVisible:
          availableStructureState.serializationAuditVisible,
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
      availableStructureState.hasStructureSections,
      availableStructureState.serializationAuditVisible,
      replaceGamesLibraryRoute,
      setFilters,
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
      replaceGamesLibraryRoute(
        filters,
        nextTab,
        `kangur-games-library:tab:${nextTab}`
      );
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
    [availableTabs, handleTabChange, tabRefs]
  );

  return {
    activeTab,
    applyFilters,
    availableTabIds,
    availableTabs,
    handlePointerTabMouseDown,
    handleTabChange,
    handleTabKeyDown,
    setActiveTab,
    updateFilter,
  };
}

export function useGamesLibraryState() {
  const context = useGamesLibraryContextState();
  const [filters, setFilters] = useState<GamesLibraryFilterState>(() =>
    readGamesLibraryFiltersFromSearchParams(context.searchParams)
  );
  const [selectedGame, setSelectedGame] = useState<GamesLibrarySelectedGame | null>(
    null
  );
  const pageDataState = useGamesLibraryPageDataState({
    filters,
    requestedHref: context.requestedHref,
    searchParams: context.searchParams,
  });
  const tabState = useGamesLibraryTabState({
    availableStructureState: {
      hasStructureSections: pageDataState.hasStructureSections,
      serializationAuditVisible: pageDataState.serializationAuditVisible,
    },
    canonicalGamesLibraryHrefBase: pageDataState.canonicalGamesLibraryHrefBase,
    filters,
    replaceRoute: context.replaceRoute,
    searchParams: context.searchParams,
    setFilters,
    tabRefs: context.tabRefs,
  });
  const activeFilterBadges = useGamesLibraryActiveFilterBadges({
    filters,
    locale: context.locale,
    translations: context.translations,
  });
  const orderedOverviewSections = useGamesLibraryOverviewSections({
    activeTab: tabState.activeTab,
    availableTabs: tabState.availableTabs,
    hasActiveFilters: pageDataState.hasActiveFilters,
    totalGameCount: pageDataState.totalGameCount,
    translations: context.translations,
    visibleGameCount: pageDataState.visibleGameCount,
  });

  return {
    ...context,
    ...pageDataState,
    ...tabState,
    activeFilterBadges,
    filters,
    orderedOverviewSections,
    selectedGame,
    setActiveTab: tabState.setActiveTab,
    setFilters,
    setSelectedGame,
  };
}

function useLoginModalSafe(): GamesLibraryLoginModalState {
  try {
    return useKangurLoginModalActions();
  } catch {
    return { openLoginModal: () => {} };
  }
}

function useGuestPlayerSafe(): GamesLibraryGuestPlayerState {
  try {
    return useKangurGuestPlayer();
  } catch {
    return { guestPlayerName: '', setGuestPlayerName: () => {} };
  }
}
