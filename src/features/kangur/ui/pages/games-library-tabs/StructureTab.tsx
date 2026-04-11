import type { useTranslations } from 'next-intl';
import type {
  KangurDrawingEngineCatalogEntry,
  KangurGameEngineCatalogEntry,
  KangurGameEngineCatalogImplementationGroup,
  KangurGameLibraryPageData,
  KangurGamesLibraryCohortGroup,
  KangurGamesLibraryVariantGroup,
} from '@/features/kangur/games';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import type { KangurLessonSubject } from '@/features/kangur/shared/contracts/kangur';
import { cn } from '@/features/kangur/shared/utils';
import {
  KangurEmptyState,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';

import {
  GamesLibraryCompactMetric,
  GamesLibraryDetailSurface,
  GamesLibrarySectionHeader,
} from '../GamesLibrary.components';
import {
  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
  GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME,
  getGamesLibraryTabIds,
  getLessonTitles,
  getVariantGroupLabel,
  resolveAgeGroupAccent,
  resolveCoverageAccent,
  resolveEngineCategoryAccent,
  resolveImplementationOwnershipAccent,
  resolveVariantGroupAccent,
} from '../GamesLibrary.utils';
import type { GamesLibraryFilterState } from '../GamesLibrary.filters';

type GamesLibraryTranslations = ReturnType<typeof useTranslations>;

export interface StructureTabProps {
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

const STRUCTURE_SECTION_CLASSNAME = cn(
  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
  'space-y-4'
);

const takeListPreview = <T,>(values: readonly T[], count = 4): T[] => values.slice(0, count);

const formatVariantGroupMetric = (group: KangurGamesLibraryVariantGroup): number =>
  new Set(group.entries.map((entry) => entry.game.id)).size;

const formatEngineGroupMetric = (group: KangurGameEngineCatalogEntry): number =>
  new Set(group.entries.map((entry) => entry.game.id)).size;

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
                        <KangurStatusChip
                          accent={resolveEngineCategoryAccent(group.category)}
                          size='sm'
                        >
                          {group.category}
                        </KangurStatusChip>
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
