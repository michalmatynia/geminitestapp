'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type {
  KangurGameCatalogEntry,
  KangurGamesLibrarySubjectGroup,
} from '@/features/kangur/games';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { cn } from '@/features/kangur/shared/utils';
import { getKangurSixYearOldSubjectVisual } from '@/features/kangur/ui/constants/six-year-old-visuals';
import {
  KangurButton,
  KangurEmptyState,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { buildKangurGameLaunchHref } from '@/features/kangur/ui/services/game-launch';

import {
  GamesLibraryCompactMetric,
} from '../GamesLibrary.components';
import {
  DEFAULT_GAMES_LIBRARY_FILTERS,
  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
  GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME,
  getGamesLibraryTabIds,
  getKangurGameCardAnchorId,
  isGamesLibraryCardInteractiveTarget,
  resolveAgeGroupAccent,
  resolveStatusAccent,
} from '../GamesLibrary.utils';
import type { GamesLibraryFilterState } from '../GamesLibrary.filters';

type GamesLibraryTranslations = ReturnType<typeof useTranslations>;
type GamesLibrarySelectedGame = KangurGameCatalogEntry['game'];

export interface CatalogTabProps {
  filters: GamesLibraryFilterState;
  hasActiveFilters: boolean;
  applyFilters: (filters: GamesLibraryFilterState, sourceId: string) => void;
  translations: GamesLibraryTranslations;
  visibleGameCount: number;
  totalGameCount: number;
  groupedGames: KangurGamesLibrarySubjectGroup[];
  locale: string;
  basePath: string;
  selectedGame: GamesLibrarySelectedGame | null;
  setSelectedGame: (game: GamesLibrarySelectedGame, trigger?: HTMLElement | null) => void;
}

export const CatalogTab = ({
  filters,
  hasActiveFilters,
  applyFilters,
  translations,
  visibleGameCount,
  totalGameCount,
  groupedGames,
  locale,
  basePath,
  selectedGame,
  setSelectedGame,
}: CatalogTabProps) => {
  const catalogPanelEyebrow =
    filters.gameId === 'all' ? translations('tabs.catalog') : translations('focus.gameTitle');
  const catalogSummaryText = hasActiveFilters
    ? translations('filters.summaryFiltered', {
        visible: visibleGameCount,
        total: totalGameCount,
      })
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
        <div
          className={cn(
            GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
            'flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'
          )}
        >
          <div className='space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
              {catalogPanelEyebrow}
            </div>
            <div className='text-xl font-black tracking-[-0.03em] [color:var(--kangur-page-text)]'>
              {catalogSummaryText}
            </div>
          </div>
          {hasActiveFilters ? (
            <KangurButton
              className='w-full sm:w-auto'
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
          groupedGames.map(({ subject, entries: subjectEntries }) => {
            const subjectLabel = getLocalizedKangurSubjectLabel(
              subject.id,
              locale,
              subject.label
            );

            return (
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
                    <div className='flex size-14 shrink-0 items-center justify-center rounded-[1.4rem] border border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_98%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_90%,white)_100%)] text-[1.7rem] shadow-[0_16px_36px_-30px_rgba(15,23,42,0.28)]'>
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
                    const gameHref = buildKangurGameLaunchHref(basePath, game);
                    const isSelected = selectedGame?.id === game.id;
                    const resolvedAgeGroupLabel = game.ageGroup
                      ? getLocalizedKangurAgeGroupLabel(game.ageGroup, locale, game.ageGroup)
                      : translations('labels.allAgeGroups');

                    return (
                      <KangurInfoCard
                        key={game.id}
                        id={getKangurGameCardAnchorId(game.id)}
                        accent='slate'
                        padding='lg'
                        data-selected={isSelected ? 'true' : 'false'}
                        className={cn(
                          'group flex h-full scroll-mt-24 cursor-pointer flex-col gap-5 border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_98%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_93%,white)_100%)] transition hover:-translate-y-[1px] hover:border-[color:var(--kangur-page-accent)] hover:shadow-[0_32px_72px_-52px_rgba(37,99,235,0.42)]',
                          isSelected
                            ? 'border-[color:var(--kangur-page-accent)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_96%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_88%,var(--kangur-accent-sky-start,#38bdf8))_100%)] shadow-[0_38px_88px_-56px_rgba(37,99,235,0.48)]'
                            : null
                        )}
                        onClick={(event) => {
                          if (
                            isGamesLibraryCardInteractiveTarget(
                              event.target,
                              event.currentTarget
                            )
                          ) {
                            return;
                          }
                          setSelectedGame(game, event.currentTarget);
                        }}
                      >
                        <div className='flex items-start gap-4'>
                          <div className='flex size-14 shrink-0 items-center justify-center rounded-[1.4rem] border border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_98%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_92%,white)_100%)] text-[1.7rem] shadow-[0_18px_42px_-30px_rgba(15,23,42,0.34)]'>
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
                                {resolvedAgeGroupLabel}
                              </KangurStatusChip>
                              <KangurStatusChip
                                accent={resolveStatusAccent(game.status)}
                                size='sm'
                              >
                                {translations(`statuses.${game.status}`)}
                              </KangurStatusChip>
                            </div>
                            <div className='space-y-2'>
                              <div className='text-xl font-black [color:var(--kangur-page-text)] group-hover:[color:var(--kangur-page-accent)]'>
                                {game.title}
                              </div>
                              <p className='text-sm leading-6 [color:var(--kangur-page-muted-text)]'>
                                {game.description}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className='grid gap-2 sm:grid-cols-3'>
                          <GamesLibraryCompactMetric
                            label={translations('labels.variants')}
                            value={translations('labels.variantCount', {
                              count: game.variants.length,
                            })}
                          />
                          <GamesLibraryCompactMetric
                            label={translations('labels.lessonLinks')}
                            value={
                              game.lessonComponentIds.length > 0
                                ? translations('labels.lessonCount', {
                                    count: game.lessonComponentIds.length,
                                  })
                                : translations('labels.none')
                            }
                          />
                          <GamesLibraryCompactMetric
                            label={translations('filters.surface.label')}
                            value={game.surfaces
                              .map((surface) => translations(`surfaces.${surface}`))
                              .join(', ')}
                          />
                        </div>

                        <div className='mt-auto grid gap-2 border-t border-[color:var(--kangur-soft-card-border)] pt-3 sm:flex sm:flex-wrap'>
                          <KangurButton
                            aria-label={`${translations('actions.previewGame')}: ${game.title}`}
                            aria-controls={isSelected ? 'games-library-game-modal' : undefined}
                            aria-expanded={isSelected}
                            aria-haspopup='dialog'
                            className='w-full sm:w-auto'
                            onClick={(event) =>
                              setSelectedGame(game, event.currentTarget)
                            }
                            size='sm'
                            type='button'
                            variant='primary'
                          >
                            {translations('actions.previewGame')}
                          </KangurButton>
                          {gameHref ? (
                            <KangurButton
                              asChild
                              className='w-full sm:w-auto'
                              size='sm'
                              variant='surface'
                            >
                              <Link
                                aria-label={`${translations('actions.openGame')}: ${game.title}`}
                                href={gameHref}
                              >
                                {translations('actions.openGame')}
                              </Link>
                            </KangurButton>
                          ) : null}
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
