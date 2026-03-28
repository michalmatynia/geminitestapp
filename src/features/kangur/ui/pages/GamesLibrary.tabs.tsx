'use client';

import React from 'react';
import { useTranslations } from 'next-intl';
import {
  KangurButton,
  KangurEmptyState,
  KangurInfoCard,
  KangurMetricCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME,
  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
  GAMES_LIBRARY_COMPACT_STAT_CARD_CLASSNAME,
  getGamesLibraryTabIds,
  resolveSerializationAuditAccent,
  getSerializationAuditIssueCount,
  getSerializationSurfaceIssueCount,
  resolveSerializationSurfaceAccent,
  getSerializationIssueHref,
  resolveImplementationOwnershipAccent,
  resolveCoverageAccent,
  resolveAgeGroupAccent,
  resolveEngineCategoryAccent,
  resolveStatusAccent,
  resolveSurfaceAccent,
  resolveVariantGroupAccent,
  getVariantGroupLabel,
  formatMechanicLabel,
  resolveLessonCoverageStatusAccent,
  getLessonTitles,
  getKangurGameCardAnchorId,
  getKangurEngineCardAnchorId,
  isGamesLibraryCardInteractiveTarget,
  resolveVariantSurfaceAccent,
  DEFAULT_GAMES_LIBRARY_FILTERS,
} from './GamesLibrary.utils';
import {
  GamesLibraryCompactMetric,
  GamesLibraryDetailSurface,
  GamesLibrarySectionHeader,
} from './GamesLibrary.components';
import {
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KANGUR_SUBJECTS } from '@/features/kangur/lessons/lesson-catalog';
import { getKangurGameLibraryLessonCoverageStatusFromMap } from '@/features/kangur/games';
import { getKangurSixYearOldSubjectVisual } from '@/features/kangur/ui/constants/six-year-old-visuals';
import {
  buildKangurGameLaunchHref,
  buildKangurGameLessonHref,
} from '@/features/kangur/ui/services/game-launch';
import { cn } from '@/features/kangur/shared/utils';
import Link from 'next/link';

interface CatalogTabProps {
  filters: any;
  hasActiveFilters: boolean;
  applyFilters: (filters: any, sourceId: string) => void;
  updateFilter: (key: string, value: any) => void;
  translations: any;
  visibleGameCount: number;
  totalGameCount: number;
  groupedGames: any[];
  locale: string;
  basePath: string;
  selectedGame: any;
  setSelectedGame: (game: any) => void;
  coverageStatusMap: any;
  gameFilterOptions: any[];
  catalogFacets: any;
}

export const CatalogTab = ({
  filters,
  hasActiveFilters,
  applyFilters,
  updateFilter,
  translations,
  visibleGameCount,
  totalGameCount,
  groupedGames,
  locale,
  basePath,
  selectedGame,
  setSelectedGame,
  coverageStatusMap,
  gameFilterOptions,
  catalogFacets,
}: CatalogTabProps) => {
  const catalogPanelEyebrow = filters.gameId === 'all' ? translations('tabs.catalog') : translations('focus.gameTitle');
  const catalogSummaryText = hasActiveFilters
    ? translations('filters.summaryFiltered', { visible: visibleGameCount, total: totalGameCount })
    : translations('filters.summaryAll', { count: totalGameCount });

  return (
    <div
      id={getGamesLibraryTabIds('catalog').panelId}
      role='tabpanel'
      aria-labelledby={getGamesLibraryTabIds('catalog').tabId}
      tabIndex={0}
      className='flex min-w-0 flex-col gap-6'
    >
      <div className={cn(GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME, 'space-y-6')}>
        <div className={cn(GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME, 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between')}>
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
              {catalogPanelEyebrow}
            </div>
            <div className='text-lg font-black [color:var(--kangur-page-text)]'>
              {catalogSummaryText}
            </div>
          </div>
          {hasActiveFilters && (
            <KangurButton
              type='button'
              size='sm'
              variant='surface'
              onClick={() => applyFilters(DEFAULT_GAMES_LIBRARY_FILTERS, 'kangur-games-library:filters:clear')}
            >
              {translations('filters.clear')}
            </KangurButton>
          )}
        </div>

        {groupedGames.length === 0 ? (
          <KangurEmptyState
            title={hasActiveFilters ? translations('emptyFilteredTitle') : translations('emptyTitle')}
            description={hasActiveFilters ? translations('emptyFilteredDescription') : translations('emptyDescription')}
            padding='lg'
          />
        ) : (
          groupedGames.map(({ subject, entries: subjectEntries }) => {
            const subjectLabel = getLocalizedKangurSubjectLabel(subject.id, locale, subject.label);
            return (
              <section key={subject.id} data-testid={`games-library-subject-${subject.id}`} className='space-y-4'>
                <div className={cn(GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME, 'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between')}>
                  <div className='flex items-start gap-4'>
                    <div className='flex size-14 shrink-0 items-center justify-center rounded-[1.4rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_88%,white)] text-[1.7rem]'>
                      {getKangurSixYearOldSubjectVisual(subject.id).icon}
                    </div>
                    <div className='space-y-1'>
                      <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                        {translations('groupEyebrow')}
                      </div>
                      <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
                        {subjectLabel}
                      </div>
                      <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                        {translations('groupDescription', { count: subjectEntries.length })}
                      </div>
                    </div>
                  </div>

                  <div className='grid gap-3 sm:grid-cols-2 lg:min-w-[24rem] lg:max-w-[30rem] lg:flex-1'>
                    <GamesLibraryCompactMetric label={translations('metrics.games')} value={subjectEntries.length} />
                    <GamesLibraryCompactMetric label={translations('filters.engine.label')} value={new Set(subjectEntries.map((e: any) => e.game.engineId)).size} />
                    <GamesLibraryCompactMetric label={translations('metrics.lessonLinked')} value={subjectEntries.filter((e: any) => e.game.lessonComponentIds.length > 0).length} />
                    <GamesLibraryCompactMetric label={translations('cohortGroups.launchableLabel')} value={subjectEntries.filter((e: any) => Boolean(buildKangurGameLaunchHref(basePath, e.game))).length} />
                  </div>
                </div>

                <div className='grid gap-4 lg:grid-cols-2'>
                  {subjectEntries.map((entry: any) => {
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
                        className='group flex h-full scroll-mt-24 cursor-pointer flex-col gap-5 transition hover:-translate-y-[1px] hover:border-[color:var(--kangur-page-accent)]'
                        onClick={(event) => {
                          if (isGamesLibraryCardInteractiveTarget(event.target, event.currentTarget)) return;
                          setSelectedGame(game);
                        }}
                        role='button'
                        tabIndex={0}
                      >
                        <div className='flex items-start gap-4'>
                          <div className='flex size-14 shrink-0 items-center justify-center rounded-[1.4rem] border border-[color:var(--kangur-soft-card-border)] [background:color-mix(in_srgb,var(--kangur-soft-card-background)_90%,white)] text-[1.7rem]'>
                            <span aria-hidden='true'>{game.emoji}</span>
                          </div>
                          <div className='min-w-0 flex-1 space-y-3'>
                            <div className='flex flex-wrap items-center gap-2'>
                              <KangurStatusChip accent='slate' size='sm'>{game.engineId}</KangurStatusChip>
                              <KangurStatusChip accent={game.ageGroup ? resolveAgeGroupAccent(game.ageGroup) : 'slate'} size='sm'>
                                {game.ageGroup ? translations(`labels.ageGroup`) : translations('labels.allAgeGroups')}
                              </KangurStatusChip>
                              <KangurStatusChip accent={resolveStatusAccent(game.status)} size='sm'>
                                {translations(`statuses.${game.status}`)}
                              </KangurStatusChip>
                            </div>
                            <div className='space-y-2'>
                              <div className='text-xl font-black [color:var(--kangur-page-text)] group-hover:[color:var(--kangur-page-accent)]'>{game.title}</div>
                              <p className='text-sm leading-6 [color:var(--kangur-page-muted-text)]'>{game.description}</p>
                            </div>
                          </div>
                        </div>
                        {/* ... Actions ... */}
                        <div className='mt-auto flex flex-wrap gap-2 border-t border-[color:var(--kangur-soft-card-border)] pt-3'>
                          <KangurButton onClick={() => setSelectedGame(game)} size='sm' type='button' variant='primary'>
                            {translations('actions.previewGame')}
                          </KangurButton>
                          {gameHref && (
                            <KangurButton asChild size='sm' variant='surface'>
                              <Link href={gameHref}>{translations('actions.openGame')}</Link>
                            </KangurButton>
                          )}
                        </div>
                      </KangurInfoCard>
                    );
                  })}
                </div>
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};

interface StructureTabProps {
  filters: any;
  translations: any;
  implementationGroups: any[];
  coverageGroups: any[];
  cohortGroups: any[];
  drawingGroups: any[];
  engineGroups: any[];
  variantGroups: any[];
  locale: string;
  metrics: any;
}

export const StructureTab = ({
  filters,
  translations,
  implementationGroups,
  coverageGroups,
  cohortGroups,
  drawingGroups,
  engineGroups,
  variantGroups,
  locale,
  metrics,
}: StructureTabProps) => {
  const structurePanelEyebrow = filters.engineId === 'all' ? translations('tabs.structure') : translations('focus.engineTitle');

  return (
    <div
      id={getGamesLibraryTabIds('structure').panelId}
      role='tabpanel'
      aria-labelledby={getGamesLibraryTabIds('structure').tabId}
      tabIndex={0}
      className='flex min-w-0 flex-col gap-6'
    >
      <div className={cn(GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME, 'space-y-6')}>
        <GamesLibrarySectionHeader
          eyebrow={structurePanelEyebrow}
          title={translations('tabs.structure')}
          description={translations('tabs.description')}
          summary={
            <>
              <GamesLibraryCompactMetric label={translations('implementationGroupsTitle')} value={implementationGroups.length} />
              <GamesLibraryCompactMetric label={translations('coverageGroupsTitle')} value={coverageGroups.length} />
            </>
          }
        />
        {/* Render sections if groups exist */}
      </div>
    </div>
  );
};

interface RuntimeTabProps {
  serializationAudit: any;
  translations: any;
  serializationAuditVisible: boolean;
  currentGamesLibraryHref: string;
  basePath: string;
}

export const RuntimeTab = ({
  serializationAudit,
  translations,
  serializationAuditVisible,
  currentGamesLibraryHref,
  basePath,
}: RuntimeTabProps) => {
  if (!serializationAuditVisible) return null;

  return (
    <div
      id={getGamesLibraryTabIds('runtime').panelId}
      role='tabpanel'
      aria-labelledby={getGamesLibraryTabIds('runtime').tabId}
      tabIndex={0}
      className='flex min-w-0 flex-col gap-6'
    >
      <div className={cn(GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME, 'space-y-6')}>
        <GamesLibrarySectionHeader
          eyebrow={translations('serializationAuditEyebrow')}
          title={translations('serializationAuditTitle')}
          description={translations('serializationAuditDescription')}
          summary={
            <>
              <GamesLibraryCompactMetric label={translations('serializationAudit.explicitLabel')} value={serializationAudit.explicitRuntimeVariantCount} />
              <GamesLibraryCompactMetric label={translations('serializationAudit.fallbackLabel')} value={serializationAudit.compatibilityFallbackVariantCount} />
            </>
          }
        />
        {/* Render audit cards */}
      </div>
    </div>
  );
};
