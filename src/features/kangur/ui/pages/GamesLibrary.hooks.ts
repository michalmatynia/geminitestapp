'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useCallback, useDeferredValue, useMemo, useState } from 'react';
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
  hasActiveGamesLibraryFilters,
  readGamesLibraryFiltersFromSearchParams,
  readGamesLibraryTabFromSearchParams,
  type GamesLibraryFilterState,
} from './GamesLibrary.filters';
import {
  formatMechanicLabel,
  GAMES_LIBRARY_TABS,
  resolveAgeGroupAccent,
  resolveGamesLibraryAvailableTabIds,
  resolveSurfaceAccent,
  withGamesLibrarySearchParams,
} from './GamesLibrary.utils';

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

  const [filters, setFilters] = useState<GamesLibraryFilterState>(() =>
    readGamesLibraryFiltersFromSearchParams(searchParams)
  );
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
