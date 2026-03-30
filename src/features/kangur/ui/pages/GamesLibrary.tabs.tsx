'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type {
  KangurDrawingEngineCatalogEntry,
  KangurGameCatalogEntry,
  KangurGameEngineCatalogEntry,
  KangurGameEngineCatalogImplementationGroup,
  KangurGameLibraryPageData,
  KangurGameRuntimeSerializationAudit,
  KangurGamesLibraryCohortGroup,
  KangurGamesLibrarySubjectGroup,
  KangurGamesLibraryVariantGroup,
} from '@/features/kangur/games';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';
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
  GamesLibraryDetailSurface,
  GamesLibrarySectionHeader,
} from './GamesLibrary.components';
import {
  DEFAULT_GAMES_LIBRARY_FILTERS,
  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
  GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME,
  getGamesLibraryTabIds,
  getKangurGameCardAnchorId,
  getLessonTitles,
  getSerializationAuditIssueCount,
  getSerializationIssueHref,
  getVariantGroupLabel,
  isGamesLibraryCardInteractiveTarget,
  resolveAgeGroupAccent,
  resolveCoverageAccent,
  resolveEngineCategoryAccent,
  resolveImplementationOwnershipAccent,
  resolveSerializationAuditAccent,
  resolveSerializationSurfaceAccent,
  resolveStatusAccent,
  resolveVariantGroupAccent,
} from './GamesLibrary.utils';
import type { GamesLibraryFilterState } from './GamesLibrary.filters';

type GamesLibraryTranslations = ReturnType<typeof useTranslations>;
type GamesLibrarySelectedGame = KangurGameCatalogEntry['game'];

interface CatalogTabProps {
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

interface StructureTabProps {
  filters: GamesLibraryFilterState;
  translations: GamesLibraryTranslations;
  implementationGroups: KangurGameEngineCatalogImplementationGroup[];
  coverageGroups: KangurGameLibraryPageData['coverage']['groups'];
  cohortGroups: KangurGamesLibraryCohortGroup[];
  drawingGroups: KangurDrawingEngineCatalogEntry[];
  engineGroups: KangurGameEngineCatalogEntry[];
  variantGroups: KangurGamesLibraryVariantGroup[];
  locale: string;
  metrics: KangurGameLibraryPageData['overview']['metrics'];
}

interface RuntimeTabProps {
  serializationAudit: KangurGameRuntimeSerializationAudit;
  translations: GamesLibraryTranslations;
  serializationAuditVisible: boolean;
  currentGamesLibraryHref: string;
}

const STRUCTURE_SECTION_CLASSNAME = cn(
  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
  'space-y-4'
);

const ISSUE_GROUPS = [
  {
    kind: 'compatibility_fallback_variant',
    labelKey: 'serializationAudit.fallbackBacklogLabel',
  },
  {
    kind: 'duplicated_legacy_variant',
    labelKey: 'serializationAudit.duplicatesBacklogLabel',
  },
  {
    kind: 'missing_runtime_variant',
    labelKey: 'serializationAudit.missingBacklogLabel',
  },
  {
    kind: 'legacy_launch_fallback_game',
    labelKey: 'serializationAudit.legacyGameBacklogLabel',
  },
  {
    kind: 'non_shared_runtime_engine',
    labelKey: 'serializationAudit.nonSharedBacklogLabel',
  },
] as const;

const takeListPreview = <T,>(values: readonly T[], count = 4): T[] => values.slice(0, count);

const formatVariantGroupMetric = (group: KangurGamesLibraryVariantGroup): number =>
  new Set(group.entries.map((entry) => entry.game.id)).size;

const formatEngineGroupMetric = (group: KangurGameEngineCatalogEntry): number =>
  new Set(group.entries.map((entry) => entry.game.id)).size;

const resolveSurfaceAuditLabel = (
  surfaceId: KangurGameRuntimeSerializationAudit['surfaces'][number]['surface'],
  translations: GamesLibraryTranslations
): string =>
  surfaceId === 'lesson_inline'
    ? translations('surfaces.lesson')
    : translations(`variantSurfaces.${surfaceId}`);

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
  const structurePanelEyebrow =
    filters.engineId === 'all'
      ? translations('tabs.structure')
      : translations('focus.engineTitle');

  const hasAnySections =
    implementationGroups.length > 0 ||
    coverageGroups.length > 0 ||
    cohortGroups.length > 0 ||
    drawingGroups.length > 0 ||
    engineGroups.length > 0 ||
    variantGroups.length > 0;

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
                label={translations('variantGroupsTitle')}
                value={variantGroups.length}
              />
            </>
          }
        />

        {!hasAnySections ? (
          <KangurEmptyState
            title={translations('emptyTitle')}
            description={translations('emptyDescription')}
            padding='lg'
          />
        ) : null}

        {implementationGroups.length > 0 ? (
          <section className={STRUCTURE_SECTION_CLASSNAME}>
            <GamesLibrarySectionHeader
              eyebrow={translations('implementationGroupsEyebrow')}
              title={translations('implementationGroupsTitle')}
              description={translations('implementationGroupsDescription', {
                count: implementationGroups.length,
              })}
              summary={
                <>
                  <GamesLibraryCompactMetric
                    label={translations('metrics.games')}
                    value={metrics.visibleGameCount}
                  />
                  <GamesLibraryCompactMetric
                    label={translations('metrics.engines')}
                    value={metrics.engineCount}
                  />
                </>
              }
            />

            <div className='grid gap-4 xl:grid-cols-2'>
              {implementationGroups.map((group) => {
                const engineTitles = group.engineGroups.map(
                  (engineGroup) => engineGroup.engine?.title ?? engineGroup.engineId
                );

                return (
                  <KangurInfoCard
                    key={group.ownership}
                    accent={resolveImplementationOwnershipAccent(group.ownership)}
                    padding='lg'
                    className='space-y-4'
                  >
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='space-y-1'>
                        <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                          {translations('implementationGroups.eyebrow')}
                        </div>
                        <div className='text-xl font-black [color:var(--kangur-page-text)]'>
                          {translations(`implementationOwnership.${group.ownership}`)}
                        </div>
                        <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                          {translations('implementationGroups.groupDescription', {
                            count: group.engineGroups.length,
                          })}
                        </div>
                      </div>
                      <KangurStatusChip
                        accent={resolveImplementationOwnershipAccent(group.ownership)}
                        size='sm'
                      >
                        {group.gameCount}
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
                      {engineTitles.join(', ')}
                    </GamesLibraryDetailSurface>
                  </KangurInfoCard>
                );
              })}
            </div>
          </section>
        ) : null}

        {coverageGroups.length > 0 ? (
          <section className={STRUCTURE_SECTION_CLASSNAME}>
            <GamesLibrarySectionHeader
              eyebrow={translations('coverageGroupsEyebrow')}
              title={translations('coverageGroupsTitle')}
              description={translations('coverageGroupsDescription', {
                count: coverageGroups.length,
              })}
            />

            <div className='grid gap-4 xl:grid-cols-2'>
              {coverageGroups.map((group) => {
                const uncoveredLessonTitles = getLessonTitles(
                  group.uncoveredComponentIds,
                  locale
                );
                const coverageRatio = `${group.coveredComponentIds.length}/${group.componentIds.length}`;
                const uncoveredCount = group.uncoveredComponentIds.length;

                return (
                  <KangurInfoCard
                    key={group.id}
                    accent={resolveCoverageAccent(group.id)}
                    padding='lg'
                    className='space-y-4'
                  >
                    <div className='flex flex-wrap items-start justify-between gap-3'>
                      <div className='space-y-1'>
                        <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                          {translations(`coverageGroups.groups.${group.id}.eyebrow`)}
                        </div>
                        <div className='text-xl font-black [color:var(--kangur-page-text)]'>
                          {translations(`coverageGroups.groups.${group.id}.title`)}
                        </div>
                        <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                          {translations(`coverageGroups.groups.${group.id}.description`)}
                        </div>
                      </div>
                      <KangurStatusChip
                        accent={uncoveredCount === 0 ? 'emerald' : 'amber'}
                        size='sm'
                      >
                        {uncoveredCount === 0
                          ? translations('coverageGroups.completeChip')
                          : translations('coverageGroups.gapsChip', {
                              count: uncoveredCount,
                            })}
                      </KangurStatusChip>
                    </div>

                    <div className='grid gap-3 sm:grid-cols-2'>
                      <GamesLibraryCompactMetric
                        label={translations('coverageGroups.lessonsLabel')}
                        value={group.componentIds.length}
                      />
                      <GamesLibraryCompactMetric
                        label={translations('coverageGroups.coveredLabel')}
                        value={coverageRatio}
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

                    <GamesLibraryDetailSurface
                      label={translations('coverageGroups.uncoveredLessonsLabel')}
                    >
                      {uncoveredLessonTitles.length > 0
                        ? uncoveredLessonTitles.join(', ')
                        : translations('coverageGroups.completeChip')}
                    </GamesLibraryDetailSurface>
                  </KangurInfoCard>
                );
              })}
            </div>
          </section>
        ) : null}

        {(cohortGroups.length > 0 || variantGroups.length > 0) ? (
          <section className={STRUCTURE_SECTION_CLASSNAME}>
            <div className='grid gap-4 xl:grid-cols-2'>
              {cohortGroups.length > 0 ? (
                <div className='space-y-4'>
                  <GamesLibrarySectionHeader
                    eyebrow={translations('cohortGroupsEyebrow')}
                    title={translations('cohortGroupsTitle')}
                    description={translations('cohortGroupsDescription', {
                      count: cohortGroups.length,
                    })}
                  />

                  {cohortGroups.map((group) => (
                    <KangurInfoCard
                      key={group.ageGroup}
                      accent={resolveAgeGroupAccent(group.ageGroup)}
                      padding='lg'
                      className='space-y-4'
                    >
                      <div className='space-y-1'>
                        <div className='text-xl font-black [color:var(--kangur-page-text)]'>
                          {getLocalizedKangurAgeGroupLabel(
                            group.ageGroup,
                            locale,
                            group.ageGroup
                          )}
                        </div>
                        <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                          {translations('cohortGroups.groupDescription', {
                            count: group.entries.length,
                          })}
                        </div>
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

                      <GamesLibraryDetailSurface
                        label={translations('cohortGroups.subjectsLabel')}
                      >
                        {group.subjects
                          .map((subject: string) =>
                            getLocalizedKangurSubjectLabel(subject as KangurLessonSubject, locale, subject)
                          )
                          .join(', ')}
                      </GamesLibraryDetailSurface>
                    </KangurInfoCard>
                  ))}
                </div>
              ) : null}

              {variantGroups.length > 0 ? (
                <div className='space-y-4'>
                  <GamesLibrarySectionHeader
                    eyebrow={translations('variantGroupsEyebrow')}
                    title={translations('variantGroupsTitle')}
                    description={translations('variantGroupsDescription', {
                      count: variantGroups.reduce((count, group) => count + group.entries.length, 0),
                      surfaceCount: variantGroups.length,
                    })}
                  />

                  {variantGroups.map((group) => (
                    <KangurInfoCard
                      key={group.surface}
                      accent={resolveVariantGroupAccent(group.surface)}
                      padding='lg'
                      className='space-y-4'
                    >
                      <div className='space-y-1'>
                        <div className='text-xl font-black [color:var(--kangur-page-text)]'>
                          {getVariantGroupLabel(group.surface, translations)}
                        </div>
                        <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                          {translations('variantGroups.groupDescription', {
                            count: group.entries.length,
                          })}
                        </div>
                      </div>

                      <div className='grid gap-3 sm:grid-cols-2'>
                        <GamesLibraryCompactMetric
                          label={translations('variantGroups.variantsLabel')}
                          value={group.entries.length}
                        />
                        <GamesLibraryCompactMetric
                          label={translations('variantGroups.gamesLabel')}
                          value={formatVariantGroupMetric(group)}
                        />
                        <GamesLibraryCompactMetric
                          label={translations('variantGroups.enginesLabel')}
                          value={new Set(group.entries.map((entry) => entry.game.engineId)).size}
                        />
                        <GamesLibraryCompactMetric
                          label={translations('variantGroups.launchableLabel')}
                          value={group.entries.filter((entry) => Boolean(entry.launchableScreen)).length}
                        />
                      </div>

                      <GamesLibraryDetailSurface
                        label={translations('variantGroups.defaultsLabel')}
                      >
                        {takeListPreview(
                          group.entries
                            .filter((entry) => entry.isDefaultVariant)
                            .map((entry) => entry.variant.title),
                          5
                        ).join(', ') || translations('labels.none')}
                      </GamesLibraryDetailSurface>
                    </KangurInfoCard>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {(drawingGroups.length > 0 || engineGroups.length > 0) ? (
          <section className={STRUCTURE_SECTION_CLASSNAME}>
            <div className='grid gap-4 xl:grid-cols-2'>
              {drawingGroups.length > 0 ? (
                <div className='space-y-4'>
                  <GamesLibrarySectionHeader
                    eyebrow={translations('drawingGroupsEyebrow')}
                    title={translations('drawingGroupsTitle')}
                    description={translations('drawingGroupsDescription', {
                      count: drawingGroups.length,
                    })}
                  />

                  {drawingGroups.map((group) => (
                    <KangurInfoCard
                      key={group.engineId}
                      accent={resolveEngineCategoryAccent(group.category)}
                      padding='lg'
                      className='space-y-4'
                    >
                      <div className='space-y-1'>
                        <div className='text-xl font-black [color:var(--kangur-page-text)]'>
                          {group.engine?.title ?? group.engineId}
                        </div>
                        <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                          {group.engine?.description ?? group.engineId}
                        </div>
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
                          label={translations('drawingGroups.cohortsLabel')}
                          value={group.ageGroups.length}
                        />
                        <GamesLibraryCompactMetric
                          label={translations('drawingGroups.lessonsLabel')}
                          value={group.lessonComponentIds.length}
                        />
                      </div>

                      <GamesLibraryDetailSurface
                        label={translations('drawingGroups.subjectsLabel')}
                      >
                        {group.subjects
                          .map((subject: string) =>
                            getLocalizedKangurSubjectLabel(subject as KangurLessonSubject, locale, subject)
                          )
                          .join(', ')}
                      </GamesLibraryDetailSurface>
                    </KangurInfoCard>
                  ))}
                </div>
              ) : null}

              {engineGroups.length > 0 ? (
                <div className='space-y-4'>
                  <GamesLibrarySectionHeader
                    eyebrow={translations('engineGroupsEyebrow')}
                    title={translations('engineGroupsTitle')}
                    description={translations('engineGroupsDescription', {
                      count: engineGroups.length,
                    })}
                  />

                  {engineGroups.map((group) => (
                    <KangurInfoCard
                      key={group.engineId}
                      accent={resolveEngineCategoryAccent(group.category)}
                      padding='lg'
                      className='space-y-4'
                    >
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div className='space-y-1'>
                          <div className='text-xl font-black [color:var(--kangur-page-text)]'>
                            {group.engine?.title ?? group.engineId}
                          </div>
                          <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                            {translations('engineGroups.gameCount', {
                              count: group.entries.length,
                            })}
                          </div>
                        </div>
                        {group.implementation?.ownership ? (
                          <KangurStatusChip
                            accent={resolveImplementationOwnershipAccent(
                              group.implementation.ownership
                            )}
                            size='sm'
                          >
                            {translations(
                              `implementationOwnership.${group.implementation.ownership}`
                            )}
                          </KangurStatusChip>
                        ) : null}
                      </div>

                      <div className='grid gap-3 sm:grid-cols-2'>
                        <GamesLibraryCompactMetric
                          label={translations('engineGroups.gamesLabel')}
                          value={formatEngineGroupMetric(group)}
                        />
                        <GamesLibraryCompactMetric
                          label={translations('metrics.variants')}
                          value={group.variants.length}
                        />
                        <GamesLibraryCompactMetric
                          label={translations('cohortGroups.launchableLabel')}
                          value={group.launchableCount}
                        />
                        <GamesLibraryCompactMetric
                          label={translations('labels.lessonLinks')}
                          value={group.lessonComponentIds.length}
                        />
                      </div>

                      <GamesLibraryDetailSurface
                        label={translations('engineGroups.mechanicsLabel')}
                      >
                        {group.mechanics
                          .map((mechanic) => translations(`mechanics.${mechanic}`))
                          .join(', ')}
                      </GamesLibraryDetailSurface>
                      <GamesLibraryDetailSurface
                        label={translations('engineGroups.surfacesLabel')}
                      >
                        {group.surfaces
                          .map((surface) => translations(`surfaces.${surface}`))
                          .join(', ')}
                      </GamesLibraryDetailSurface>
                    </KangurInfoCard>
                  ))}
                </div>
              ) : null}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
};

export const RuntimeTab = ({
  serializationAudit,
  translations,
  serializationAuditVisible,
  currentGamesLibraryHref,
}: RuntimeTabProps) => {
  if (!serializationAuditVisible) {
    return null;
  }

  const issueCount = getSerializationAuditIssueCount(serializationAudit);
  const auditAccent = resolveSerializationAuditAccent(serializationAudit);

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
                label={translations('serializationAudit.missingVariantsLabel')}
                value={serializationAudit.missingRuntimeVariantCount}
              />
            </>
          }
        />

        <div
          className={cn(
            GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
            'flex flex-wrap items-center justify-between gap-3'
          )}
        >
          <div>
            <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
              {translations('serializationAuditEyebrow')}
            </div>
            <div className='mt-1 text-lg font-black [color:var(--kangur-page-text)]'>
              {auditAccent === 'emerald'
                ? translations('serializationAudit.statusClean')
                : translations('serializationAudit.statusAttention')}
            </div>
            <div className='mt-1 text-sm [color:var(--kangur-page-muted-text)]'>
              {issueCount > 0
                ? translations('serializationAudit.backlogDescription')
                : translations('serializationAudit.explicitDescription', {
                    count: serializationAudit.explicitRuntimeVariantCount,
                    total: serializationAudit.runtimeBearingVariantCount,
                  })}
            </div>
          </div>
          <KangurStatusChip accent={auditAccent} size='sm'>
            {issueCount}
          </KangurStatusChip>
        </div>

        <section className={STRUCTURE_SECTION_CLASSNAME}>
          <GamesLibrarySectionHeader
            eyebrow={translations('serializationAuditTitle')}
            title={translations('serializationAudit.totalVariantsLabel')}
            description={translations('serializationAuditDescription')}
          />

          <div className='grid gap-4 xl:grid-cols-2'>
            {serializationAudit.surfaces.map((surface) => (
              <KangurInfoCard
                key={surface.surface}
                accent={resolveSerializationSurfaceAccent(surface)}
                padding='lg'
                className='space-y-4'
              >
                <div className='flex flex-wrap items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <div className='text-xl font-black [color:var(--kangur-page-text)]'>
                      {resolveSurfaceAuditLabel(surface.surface, translations)}
                    </div>
                    <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                      {translations('serializationAudit.surfaceDescription', {
                        count: surface.totalVariants,
                      })}
                    </div>
                  </div>
                  <KangurStatusChip
                    accent={resolveSerializationSurfaceAccent(surface)}
                    size='sm'
                  >
                    {surface.totalVariants}
                  </KangurStatusChip>
                </div>

                <div className='grid gap-3 sm:grid-cols-2'>
                  <GamesLibraryCompactMetric
                    label={translations('serializationAudit.explicitVariantsLabel')}
                    value={surface.explicitRuntimeVariants}
                  />
                  <GamesLibraryCompactMetric
                    label={translations('serializationAudit.fallbackVariantsLabel')}
                    value={surface.compatibilityFallbackVariants}
                  />
                  <GamesLibraryCompactMetric
                    label={translations('serializationAudit.duplicatesVariantsLabel')}
                    value={surface.duplicatedLegacyVariants}
                  />
                  <GamesLibraryCompactMetric
                    label={translations('serializationAudit.missingVariantsLabel')}
                    value={surface.missingRuntimeVariants}
                  />
                </div>
              </KangurInfoCard>
            ))}
          </div>
        </section>

        <section className={STRUCTURE_SECTION_CLASSNAME}>
          <GamesLibrarySectionHeader
            eyebrow={translations('serializationAudit.backlogEyebrow')}
            title={translations('serializationAudit.nonSharedEnginesLabel')}
            description={translations('serializationAudit.backlogDescription')}
            summary={
              <>
                <GamesLibraryCompactMetric
                  label={translations('serializationAudit.nonSharedEnginesLabel')}
                  value={serializationAudit.nonSharedRuntimeEngineCount}
                />
                <GamesLibraryCompactMetric
                  label={translations('metrics.engines')}
                  value={serializationAudit.engineCount}
                />
              </>
            }
          />

          <div className='grid gap-4 xl:grid-cols-2'>
            {ISSUE_GROUPS.map((issueGroup) => {
              const issues = serializationAudit.issues.filter(
                (issue) => issue.kind === issueGroup.kind
              );

              if (issues.length === 0) {
                return null;
              }

              return (
                <KangurInfoCard key={issueGroup.kind} accent='amber' padding='lg' className='space-y-4'>
                  <div className='flex items-start justify-between gap-3'>
                    <div className='space-y-1'>
                      <div className='text-xl font-black [color:var(--kangur-page-text)]'>
                        {translations(issueGroup.labelKey)}
                      </div>
                      <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                        {issues.length}
                      </div>
                    </div>
                    <KangurStatusChip accent='amber' size='sm'>
                      {issues.length}
                    </KangurStatusChip>
                  </div>

                  <div className='space-y-2'>
                    {takeListPreview(issues, 6).map((issue) => (
                      <Link
                        key={`${issue.kind}:${issue.itemId}`}
                        href={getSerializationIssueHref(currentGamesLibraryHref, issue)}
                        className='block rounded-[1rem] border border-[color:var(--kangur-soft-card-border)] bg-[var(--kangur-soft-card-background,#ffffff)] [background:linear-gradient(180deg,color-mix(in_srgb,var(--kangur-soft-card-background)_98%,white)_0%,color-mix(in_srgb,var(--kangur-soft-card-background)_93%,white)_100%)] px-3 py-3 text-sm font-semibold [color:var(--kangur-page-text)] transition hover:border-[color:var(--kangur-page-accent)] hover:[color:var(--kangur-page-accent)]'
                      >
                        <div>{issue.label}</div>
                        <div className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>
                          {issue.detail}
                        </div>
                      </Link>
                    ))}
                  </div>
                </KangurInfoCard>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};
