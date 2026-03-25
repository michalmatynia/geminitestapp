'use client';

import { useLocale, useTranslations } from 'next-intl';

import { KANGUR_LESSON_LIBRARY, KANGUR_SUBJECTS } from '@/features/kangur/lessons/lesson-catalog';
import {
  getLocalizedKangurAgeGroupLabel,
  getLocalizedKangurLessonTitle,
  getLocalizedKangurSubjectLabel,
} from '@/features/kangur/lessons/lesson-catalog-i18n';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurEmptyState,
  KangurInfoCard,
  KangurMetricCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurGames } from '@/features/kangur/ui/hooks/useKangurGames';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
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
  const gamesQuery = useKangurGames();
  const games = gamesQuery.data ?? [];

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

  const engineCount = new Set(games.map((game) => game.engineId)).size;
  const variantCount = games.reduce((sum, game) => sum + game.variants.length, 0);
  const lessonLinkedCount = games.filter((game) => game.lessonComponentIds.length > 0).length;
  const groupedGames = KANGUR_SUBJECTS.map((subject) => ({
    subject,
    games: games.filter((game) => game.subject === subject.id),
  })).filter((group) => group.games.length > 0);

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
          value={games.length}
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

      {groupedGames.length === 0 ? (
        <KangurEmptyState
          title={translations('emptyTitle')}
          description={translations('emptyDescription')}
          padding='lg'
        />
      ) : (
        groupedGames.map(({ subject, games: subjectGames }) => (
          <section key={subject.id} className='space-y-4'>
            <div className='space-y-1'>
              <div className='text-xs font-semibold uppercase tracking-[0.18em] [color:var(--kangur-page-muted-text)]'>
                {translations('groupEyebrow')}
              </div>
              <div className='text-2xl font-black [color:var(--kangur-page-text)]'>
                {getLocalizedKangurSubjectLabel(subject.id, locale, subject.label)}
              </div>
              <div className='text-sm [color:var(--kangur-page-muted-text)]'>
                {translations('groupDescription', { count: subjectGames.length })}
              </div>
            </div>

            <div className='grid gap-4 lg:grid-cols-2'>
              {subjectGames.map((game) => {
                const linkedLessonTitles = getLinkedLessonTitles(game, locale);
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
