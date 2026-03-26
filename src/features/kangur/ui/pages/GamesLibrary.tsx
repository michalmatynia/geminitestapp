'use client';

import React, { useDeferredValue, useEffect, useState } from 'react';
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
  resolveKangurGameLibraryLessonCoverageStatus,
  type KangurGameLibraryLessonCoverageStatus,
} from '@/features/kangur/games';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurLessonTitle,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
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
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurGameCatalog } from '@/features/kangur/ui/hooks/useKangurGameCatalog';
import { useKangurGameCatalogFacets } from '@/features/kangur/ui/hooks/useKangurGameCatalogFacets';
import { useKangurGameEngineCatalog } from '@/features/kangur/ui/hooks/useKangurGameEngineCatalog';
import { useKangurGameEngineCatalogFacets } from '@/features/kangur/ui/hooks/useKangurGameEngineCatalogFacets';
import { useKangurGameLibraryCoverage } from '@/features/kangur/ui/hooks/useKangurGameLibraryCoverage';
import { useKangurGameVariants } from '@/features/kangur/ui/hooks/useKangurGameVariants';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import {
  areGamesLibraryFiltersEqual,
  buildGamesLibraryCatalogFilter,
  DEFAULT_GAMES_LIBRARY_FILTERS,
  getGamesLibrarySearchParams,
  hasActiveGamesLibraryFilters,
  readGamesLibraryFiltersFromSearchParams,
  type GamesLibraryFilterState,
} from '@/features/kangur/ui/pages/GamesLibrary.filters';
import {
  createGamesLibraryCohortGroups,
  createGamesLibraryDrawingGroupsFromEngineGroups,
  createGamesLibraryImplementationGroupsFromEngineGroups,
  createGamesLibraryMetrics,
  createGamesLibrarySubjectGroups,
  createGamesLibraryVariantGroups,
} from '@/features/kangur/ui/pages/GamesLibrary.view-model';
import {
  buildKangurGameLaunchHref,
  buildKangurGameLessonHref,
} from '@/features/kangur/ui/services/game-launch';
import type { KangurLessonComponentId } from '@/features/kangur/shared/contracts/kangur';
import type {
  KangurGameVariantSurface,
  KangurGameDefinition,
  KangurGameMechanic,
  KangurGameSurface,
  KangurGameStatus,
} from '@/shared/contracts/kangur-games';
import { cn } from '@/features/kangur/shared/utils';

const GAMES_LIBRARY_MAIN_ID = 'kangur-games-library-main';

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

export default function GamesLibrary(): React.JSX.Element {
  const locale = useLocale();
  const translations = useTranslations('KangurGamesLibraryPage');
  const searchParams = useSearchParams();
  const routeNavigator = useKangurRouteNavigator();
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
  const catalogQuery = useKangurGameCatalog(catalogFilter);
  const coverageQuery = useKangurGameLibraryCoverage();
  const engineCatalogQuery = useKangurGameEngineCatalog(catalogFilter);
  const engineCatalogFacetsQuery = useKangurGameEngineCatalogFacets(catalogFilter);
  const engineCatalogFilterOptionsQuery = useKangurGameEngineCatalogFacets();
  const facetsQuery = useKangurGameCatalogFacets();
  const variantsQuery = useKangurGameVariants(catalogFilter);
  const catalogEntries = catalogQuery.data ?? [];
  const coverageGroups = coverageQuery.data ?? [];
  const engineGroups = engineCatalogQuery.data ?? [];
  const engineCatalogFacets = engineCatalogFacetsQuery.data;
  const engineCatalogFilterOptions = engineCatalogFilterOptionsQuery.data;
  const catalogFacets = facetsQuery.data;
  const variantEntries = variantsQuery.data ?? [];
  const hasActiveFilters = hasActiveGamesLibraryFilters(filters);
  const visibleGameCount = catalogEntries.length;
  const totalGameCount = catalogFacets?.gameCount ?? visibleGameCount;
  const currentGamesLibraryHref =
    requestedHref ??
    getKangurCanonicalPublicHref([getKangurPageSlug('GamesLibrary')]);

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
    sourceId: string
  ): void => {
    if (areGamesLibraryFiltersEqual(filters, nextFilters)) {
      return;
    }

    setFilters(nextFilters);
    routeNavigator.replace(
      appendKangurUrlParams(
        currentGamesLibraryHref,
        getGamesLibrarySearchParams(nextFilters),
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

    setFilters((current) =>
      areGamesLibraryFiltersEqual(current, nextFilters) ? current : nextFilters
    );
  }, [searchParams]);

  const metrics = createGamesLibraryMetrics(catalogEntries, variantEntries);
  const groupedGames = createGamesLibrarySubjectGroups(catalogEntries);
  const cohortGroups = createGamesLibraryCohortGroups(catalogEntries, variantEntries);
  const drawingGroups = createGamesLibraryDrawingGroupsFromEngineGroups(engineGroups);
  const implementationGroups = createGamesLibraryImplementationGroupsFromEngineGroups(engineGroups);
  const variantGroups = createGamesLibraryVariantGroups(variantEntries);

  useKangurRoutePageReady({
    pageKey: 'GamesLibrary',
    ready: true,
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
          routeNavigator.replace(basePath, {
            pageKey: 'Game',
            sourceId: 'kangur-games-library:back',
          })
        }
      >
        <div className='text-xs uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
          {translations('introEyebrow')}
        </div>
      </KangurPageIntroCard>

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

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
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
      </div>

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
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
                count: variantEntries.length,
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
                    accent='slate'
                    padding='lg'
                    className='flex h-full flex-col gap-4'
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
                        {gameHref ? (
                          <KangurButton asChild size='sm' variant='primary'>
                            <Link
                              href={gameHref}
                              targetPageKey='Game'
                              transitionAcknowledgeMs={110}
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
                            variant={gameHref ? 'surface' : 'primary'}
                          >
                            <Link
                              href={lessonHref}
                              targetPageKey='Lessons'
                              transitionAcknowledgeMs={110}
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
                            const status =
                              resolveKangurGameLibraryLessonCoverageStatus(componentId);
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
    </KangurStandardPageLayout>
  );
}
