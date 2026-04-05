'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type {
  KangurGameRuntimeSerializationAudit,
} from '@/features/kangur/games';
import { cn } from '@/features/kangur/shared/utils';
import {
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';

import {
  GamesLibraryCompactMetric,
  GamesLibrarySectionHeader,
} from '../GamesLibrary.components';
import {
  GAMES_LIBRARY_PANEL_INSET_SURFACE_CLASSNAME,
  GAMES_LIBRARY_PANEL_SURFACE_CLASSNAME,
  getGamesLibraryTabIds,
  getSerializationAuditIssueCount,
  getSerializationIssueHref,
  resolveSerializationAuditAccent,
  resolveSerializationSurfaceAccent,
} from '../GamesLibrary.utils';

type GamesLibraryTranslations = ReturnType<typeof useTranslations>;

export interface RuntimeTabProps {
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

const resolveSurfaceAuditLabel = (
  surfaceId: KangurGameRuntimeSerializationAudit['surfaces'][number]['surface'],
  translations: GamesLibraryTranslations
): string =>
  surfaceId === 'lesson_inline'
    ? translations('surfaces.lesson')
    : translations(`variantSurfaces.${surfaceId}`);

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
