'use client';

import { useLocale, useTranslations } from 'next-intl';

import {
  type KangurGameCatalogEntry,
} from '@/features/kangur/games';
import { KANGUR_LESSON_LIBRARY, KANGUR_SUBJECTS } from '@/features/kangur/lessons/lesson-catalog';
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
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurGameCatalog } from '@/features/kangur/ui/hooks/useKangurGameCatalog';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import {
  buildKangurGameLaunchHref,
  buildKangurGameLessonHref,
} from '@/features/kangur/ui/services/game-launch';
import type {
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

const getLinkedLessonTitles = (
  game: KangurGameDefinition,
  locale: string
): string[] =>
  game.lessonComponentIds.map((componentId) =>
    getLocalizedKangurLessonTitle(
      componentId,
      locale,
      KANGUR_LESSON_LIBRARY[componentId]?.title ?? componentId
    )
  );

export default function GamesLibrary(): React.JSX.Element {
  const locale = useLocale();
  const translations = useTranslations('KangurGamesLibraryPage');
  const routeNavigator = useKangurRouteNavigator();
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { user, logout } = auth;
  const { openLoginModal } = useKangurLoginModal();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const catalogQuery = useKangurGameCatalog();
  const catalogEntries = catalogQuery.data ?? [];

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

  const engineCount = new Set(catalogEntries.map((entry) => entry.game.engineId)).size;
  const variantCount = catalogEntries.reduce((sum, entry) => sum + entry.game.variants.length, 0);
  const lessonLinkedCount = catalogEntries.filter((entry) => entry.game.lessonComponentIds.length > 0)
    .length;
  const groupedGames = KANGUR_SUBJECTS.map((subject) => ({
    subject,
    entries: catalogEntries.filter((entry) => entry.game.subject === subject.id),
  })).filter((group) => group.entries.length > 0);
  const engineGroups = Array.from(
    catalogEntries.reduce((groups, entry) => {
      const existing = groups.get(entry.game.engineId);
      if (existing) {
        existing.push(entry);
      } else {
        groups.set(entry.game.engineId, [entry]);
      }

      return groups;
    }, new Map<string, KangurGameCatalogEntry[]>())
  ).map(([engineId, entries]) => ({
      engineId,
      entries: entries.slice().sort((left, right) => left.game.sortOrder - right.game.sortOrder),
      engine: entries[0]?.engine ?? null,
      mechanics: Array.from(new Set(entries.flatMap((entry) => entry.engine?.mechanics ?? [entry.game.mechanic]))),
      subjects: Array.from(new Set(entries.map((entry) => entry.game.subject))),
      surfaces: Array.from(new Set(entries.flatMap((entry) => entry.engine?.surfaces ?? entry.game.surfaces))),
    })).sort((left, right) => {
      const leftEngine = left.engine;
      const rightEngine = right.engine;

      if (leftEngine && rightEngine && leftEngine.sortOrder !== rightEngine.sortOrder) {
        return leftEngine.sortOrder - rightEngine.sortOrder;
      }

      return right.entries.length - left.entries.length || left.engineId.localeCompare(right.engineId);
    });

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

      <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
        <KangurMetricCard
          accent='sky'
          label={translations('metrics.games')}
          value={catalogEntries.length}
          description={translations('metrics.gamesDescription')}
        />
        <KangurMetricCard
          accent='rose'
          label={translations('metrics.engines')}
          value={engineCount}
          description={translations('metrics.enginesDescription')}
        />
        <KangurMetricCard
          accent='emerald'
          label={translations('metrics.variants')}
          value={variantCount}
          description={translations('metrics.variantsDescription')}
        />
        <KangurMetricCard
          accent='amber'
          label={translations('metrics.lessonLinked')}
          value={lessonLinkedCount}
          description={translations('metrics.lessonLinkedDescription')}
        />
      </div>

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
              const engineTitle = engine?.title ?? group.engineId;
              const engineDescription =
                engine?.description ??
                translations('engineGroups.gameCount', { count: group.entries.length });
              const mechanics = engine?.mechanics ?? group.mechanics;
              const surfaces = engine?.surfaces ?? group.surfaces;

              return (
                <KangurInfoCard
                  key={group.engineId}
                  accent='sky'
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
                    <KangurStatusChip
                      accent={group.entries.length > 1 ? 'emerald' : 'sky'}
                      className='uppercase tracking-[0.14em]'
                      size='sm'
                    >
                      {group.entries.length > 1
                        ? translations('engineGroups.sharedChip')
                        : translations('engineGroups.singleChip')}
                    </KangurStatusChip>
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
                </KangurInfoCard>
              );
            })}
          </div>
        </section>
      ) : null}

      {groupedGames.length === 0 ? (
        <KangurEmptyState
          title={translations('emptyTitle')}
          description={translations('emptyDescription')}
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
                const linkedLessonTitles = getLinkedLessonTitles(game, locale);
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
                      <div className='text-sm [color:var(--kangur-page-text)]'>
                        {linkedLessonTitles.length > 0
                          ? linkedLessonTitles.join(', ')
                          : translations('labels.none')}
                      </div>
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
