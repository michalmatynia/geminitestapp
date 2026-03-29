'use client';

import type { CSSProperties } from 'react';

import { usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

import { cn } from '@/features/kangur/shared/utils';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { KangurTopNavigationSkeleton } from '@/features/kangur/ui/components/KangurTopNavigationSkeleton';
import {
  HOME_ACTION_SKELETONS,
  HomeActionSkeletonCard,
  KANGUR_SKELETON_COPY_BY_LOCALE,
  SkeletonBlock,
  SkeletonChip,
  SkeletonGlassPanel,
  SkeletonLine,
  resolveSkeletonLocale,
  type KangurSkeletonPageKey,
} from '@/features/kangur/ui/components/KangurPageTransitionSkeleton.shared';
import {
  GameSessionSkeleton,
  LearnerProfileSkeleton,
  ParentDashboardSkeleton,
} from '@/features/kangur/ui/components/KangurPageTransitionSkeleton.secondary';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX,
} from '@/features/kangur/ui/design/tokens';
import {
  GAME_HOME_ACTIONS_LIST_CLASSNAME,
  GAME_HOME_ACTIONS_SHELL_CLASSNAME,
  GAME_HOME_ASSIGNMENT_SPOTLIGHT_INNER_SHELL_CLASSNAME,
  GAME_HOME_ASSIGNMENT_SPOTLIGHT_SHELL_CLASSNAME,
  GAME_HOME_DUELS_SHELL_CLASSNAME,
  GAME_HOME_HERO_SHELL_CLASSNAME,
  GAME_HOME_LAYOUT_CLASSNAME,
  GAME_HOME_LEADERBOARD_SHELL_CLASSNAME,
  GAME_HOME_PLAYER_PROGRESS_SHELL_CLASSNAME,
  GAME_HOME_QUEST_SHELL_CLASSNAME,
} from '@/features/kangur/ui/pages/GameHome.constants';
import {
  KangurGameHomeSections,
  resolveKangurGameHomeVisibility,
} from '@/features/kangur/ui/pages/GameHome.layout';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  LESSONS_ACTIVE_LAYOUT_CLASSNAME,
  LESSONS_ACTIVE_SECTION_CLASSNAME,
  LESSONS_LIBRARY_LAYOUT_CLASSNAME,
  LESSONS_LIBRARY_LIST_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
import type { KangurRouteTransitionSkeletonVariant } from '@/features/kangur/ui/routing/route-transition-skeletons';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import { readKangurTopBarHeightCssValue } from '@/features/kangur/ui/utils/readKangurTopBarHeightCssValue';

const FALLBACK_PAGE_LABELS: Record<KangurRouteTransitionSkeletonVariant, string> = {
  'game-home': 'Game',
  'game-session': 'Game',
  'learner-profile': 'Learner profile',
  'lessons-focus': 'Lessons',
  'lessons-library': 'Lessons',
  'parent-dashboard': 'Parent dashboard',
};

const resolveNormalizedTopBarHeightCssValue = (value: string | null | undefined): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

type KangurTopBarHeightStyle = CSSProperties & {
  '--kangur-top-bar-height': string;
};

const resolveDefaultSkeletonVariant = (
  pageKey: string | null | undefined
): KangurRouteTransitionSkeletonVariant => {
  switch (pageKey) {
    case 'Competition':
      return 'game-session';
    case 'GamesLibrary':
    case 'Lessons':
    case 'Tests':
      return 'lessons-library';
    case 'LearnerProfile':
      return 'learner-profile';
    case 'ParentDashboard':
      return 'parent-dashboard';
    case 'Game':
    default:
      return 'game-home';
  }
};

const SkeletonStatusHeader = ({
  loadingMessage,
  pageLabel,
  className,
}: {
  loadingMessage: string;
  pageLabel: string;
  className?: string;
}): React.JSX.Element => (
  <div className={cn('space-y-2 text-center', className)}>
    <p className='text-sm font-semibold tracking-[-0.02em] text-slate-600'>{pageLabel}</p>
    <p role='status' className='text-sm text-slate-500'>
      {loadingMessage}
    </p>
  </div>
);

const LessonsLibraryTransitionSkeleton = ({
  loadingMessage,
  pageLabel,
}: {
  loadingMessage: string;
  pageLabel: string;
}): React.JSX.Element => (
  <div
    className={LESSONS_LIBRARY_LAYOUT_CLASSNAME}
    data-testid='kangur-page-transition-skeleton-lessons-library-layout'
  >
    <div className='w-full' data-testid='kangur-page-transition-skeleton-lessons-library-intro'>
      <SkeletonGlassPanel
        className='w-full text-center'
        data-testid='kangur-page-transition-skeleton-lessons-library-intro-card'
        padding='lg'
        surface='mist'
        variant='soft'
      >
        <div
          className='relative mx-auto w-full max-w-[272px] sm:max-w-[356px]'
          data-testid='kangur-page-transition-skeleton-lessons-library-intro-art'
        >
          <SkeletonBlock className='h-40 rounded-[32px] bg-slate-200/78 sm:h-52' />
          <SkeletonBlock className='absolute -bottom-2 left-[12%] h-12 w-12 rounded-full bg-amber-100/80 sm:h-14 sm:w-14' />
          <SkeletonBlock className='absolute right-[10%] top-[14%] h-10 w-10 rounded-full bg-sky-100/80 sm:h-12 sm:w-12' />
        </div>
        <div className='mt-6'>
          <SkeletonStatusHeader loadingMessage={loadingMessage} pageLabel={pageLabel} />
        </div>
        <div
          className='mt-6'
          data-testid='kangur-page-transition-skeleton-lessons-library-intro-back-button'
        >
          <div className='relative mx-auto w-full max-w-fit'>
            <SkeletonChip className='h-11 w-36' />
          </div>
        </div>
      </SkeletonGlassPanel>
    </div>
    <div
      className={cn(LESSONS_LIBRARY_LIST_CLASSNAME, 'w-full flex-col')}
      data-testid='kangur-page-transition-skeleton-lessons-library-list'
    >
      {Array.from({ length: 4 }).map((_, index) => (
        <SkeletonGlassPanel
          key={index}
          className='w-full'
          padding='lg'
          surface='solid'
          variant='soft'
        >
          <div className='space-y-4'>
            <SkeletonLine className='h-8 w-1/2 max-w-[240px]' />
            <SkeletonLine className='w-full max-w-[340px]' />
            <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
          </div>
        </SkeletonGlassPanel>
      ))}
    </div>
  </div>
);

const LessonsFocusTransitionSkeleton = ({
  loadingMessage,
  pageLabel,
}: {
  loadingMessage: string;
  pageLabel: string;
}): React.JSX.Element => (
  <div
    className={cn(LESSONS_ACTIVE_LAYOUT_CLASSNAME, 'w-full')}
    data-testid='kangur-page-transition-skeleton-lessons-focus-layout'
  >
    <div
      className='w-full max-w-5xl'
      data-testid='kangur-page-transition-skeleton-lessons-focus-header'
    >
      <SkeletonGlassPanel padding='lg' surface='mist' variant='soft'>
        <div className='space-y-4'>
          <SkeletonStatusHeader loadingMessage={loadingMessage} pageLabel={pageLabel} />
          <SkeletonLine className='mx-auto h-10 w-full max-w-[420px]' />
          <SkeletonLine className='mx-auto w-full max-w-[560px]' />
        </div>
      </SkeletonGlassPanel>
    </div>
    <div
      className='w-full max-w-5xl'
      data-testid='kangur-page-transition-skeleton-lessons-focus-navigation'
    >
      <div className='flex w-full flex-wrap items-center justify-center gap-2'>
        <SkeletonChip className='h-10 w-28' />
        <SkeletonChip className='h-10 w-32' />
        <SkeletonChip className='h-10 w-24' />
        <SkeletonChip className='h-10 w-28' />
      </div>
    </div>
    <div className='w-full' data-testid='kangur-page-transition-skeleton-lessons-focus-content'>
      <div className={LESSONS_ACTIVE_SECTION_CLASSNAME}>
        <SkeletonGlassPanel padding='lg' surface='solid' variant='soft'>
          <div className='space-y-5'>
            <SkeletonBlock className='h-52 rounded-[28px] bg-slate-200/76' />
            <div className='grid gap-4 sm:grid-cols-2'>
              <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
              <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
            </div>
          </div>
        </SkeletonGlassPanel>
      </div>
    </div>
  </div>
);

const GameHomeTransitionSkeleton = ({
  loadingMessage,
  pageLabel,
}: {
  loadingMessage: string;
  pageLabel: string;
}): React.JSX.Element => {
  const auth = useOptionalKangurAuth();
  const progress = useKangurProgressState();
  const canAccessParentAssignments =
    auth?.canAccessParentAssignments ??
    Boolean(auth?.isAuthenticated && auth.user?.activeLearner?.id);
  const homeVisibility = resolveKangurGameHomeVisibility({
    canAccessParentAssignments,
    progress,
    user: auth?.user,
  });

  return (
    <div
      className={GAME_HOME_LAYOUT_CLASSNAME}
      data-testid='kangur-page-transition-skeleton-game-home-layout'
    >
      <div className='w-full max-w-[900px]'>
        <SkeletonStatusHeader loadingMessage={loadingMessage} pageLabel={pageLabel} />
      </div>
      <KangurGameHomeSections
        visibility={homeVisibility}
        parentSpotlight={(
          <SkeletonGlassPanel
            className={GAME_HOME_ASSIGNMENT_SPOTLIGHT_SHELL_CLASSNAME}
            data-testid='kangur-page-transition-skeleton-game-home-parent-spotlight-shell'
            padding='md'
            surface='mist'
            variant='elevated'
          >
            <div className='px-3 pt-2 sm:px-4'>
              <SkeletonLine className='h-8 w-44 max-w-full' />
            </div>
            <SkeletonGlassPanel
              className={GAME_HOME_ASSIGNMENT_SPOTLIGHT_INNER_SHELL_CLASSNAME}
              data-testid='kangur-page-transition-skeleton-game-home-parent-spotlight-inner-shell'
              padding='lg'
              surface='solid'
              variant='subtle'
            >
              <SkeletonChip className='mb-3 h-10 w-16 sm:absolute sm:right-5 sm:top-5 sm:mb-0' />
              <div className='space-y-4 sm:pr-24'>
                <div className='flex flex-wrap gap-2'>
                  <SkeletonChip className='h-6 w-24' />
                  <SkeletonChip className='h-6 w-20' />
                </div>
                <SkeletonBlock className='h-16 rounded-[28px] bg-amber-100/80' />
                <SkeletonBlock className='h-12 rounded-[22px] bg-slate-200/76' />
              </div>
            </SkeletonGlassPanel>
          </SkeletonGlassPanel>
        )}
        parentSpotlightSectionProps={{
          testId: 'kangur-page-transition-skeleton-game-home-parent-spotlight',
        }}
        actionsColumn={(
          <>
            <SkeletonGlassPanel
              className={GAME_HOME_ACTIONS_SHELL_CLASSNAME}
              data-testid='kangur-page-transition-skeleton-game-home-actions-shell'
              padding='lg'
              surface='mist'
              variant='soft'
            >
              <div className={GAME_HOME_ACTIONS_LIST_CLASSNAME}>
                {HOME_ACTION_SKELETONS.map((action) => (
                  <HomeActionSkeletonCard
                    key={action.id}
                    actionId={action.id}
                    themeClassName={action.themeClassName}
                  />
                ))}
              </div>
            </SkeletonGlassPanel>
            <SkeletonGlassPanel
              className={GAME_HOME_DUELS_SHELL_CLASSNAME}
              data-testid='kangur-page-transition-skeleton-game-home-duels-shell'
              padding='lg'
              surface='solid'
              variant='soft'
            >
              <div className='space-y-4'>
                <SkeletonLine className='h-7 w-40' />
                <div className='grid gap-3 sm:grid-cols-2'>
                  <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
                  <SkeletonBlock className='h-20 rounded-[24px] bg-slate-200/76' />
                </div>
              </div>
            </SkeletonGlassPanel>
            {homeVisibility.hideLearnerWidgetsForParent ? (
              <SkeletonGlassPanel
                data-testid='kangur-page-transition-skeleton-game-home-missing-learner-shell'
                padding='lg'
                surface='mist'
                variant='soft'
              >
                <div className='space-y-3'>
                  <SkeletonLine className='h-8 w-2/3 max-w-[240px]' />
                  <SkeletonLine className='w-full max-w-[320px]' />
                  <SkeletonChip className='h-11 w-40' />
                </div>
              </SkeletonGlassPanel>
            ) : null}
          </>
        )}
        actionsColumnProps={{
          testId: 'kangur-page-transition-skeleton-game-home-actions-column',
        }}
        quest={(
          <SkeletonGlassPanel
            className={GAME_HOME_QUEST_SHELL_CLASSNAME}
            data-testid='kangur-page-transition-skeleton-game-home-quest-shell'
            padding='lg'
            surface='mistStrong'
            variant='soft'
          >
            <div className='space-y-4'>
              <SkeletonLine className='h-8 w-48' />
              <SkeletonBlock className='h-24 rounded-[28px] bg-white/55' />
            </div>
          </SkeletonGlassPanel>
        )}
        questSectionProps={{
          testId: 'kangur-page-transition-skeleton-game-home-quest',
        }}
        summary={(
          <div
            className={GAME_HOME_HERO_SHELL_CLASSNAME}
            data-testid='kangur-page-transition-skeleton-game-home-summary-shell'
          >
            <SkeletonLine className='h-8 w-3/4 max-w-[420px]' />
            <SkeletonLine className='w-full max-w-[560px]' />
            <SkeletonBlock className='h-28 rounded-[28px] bg-slate-200/76' />
          </div>
        )}
        summarySectionProps={{
          testId: 'kangur-page-transition-skeleton-game-home-summary',
        }}
        assignments={(
          <SkeletonGlassPanel
            data-testid='kangur-page-transition-skeleton-game-home-assignments-shell'
            padding='lg'
            surface='mist'
            variant='soft'
          >
            <div className='space-y-4'>
              <SkeletonLine className='h-8 w-52' />
              <div className='grid gap-4 lg:grid-cols-2'>
                <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
                <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
              </div>
            </div>
          </SkeletonGlassPanel>
        )}
        assignmentsSectionProps={{
          testId: 'kangur-page-transition-skeleton-game-home-assignments',
        }}
        leaderboard={(
          <SkeletonGlassPanel
            className={GAME_HOME_LEADERBOARD_SHELL_CLASSNAME}
            data-testid='kangur-page-transition-skeleton-game-home-leaderboard-shell'
            padding='lg'
            surface='solid'
            variant='soft'
          >
            <div className='space-y-3'>
              <SkeletonLine className='h-7 w-40' />
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock
                  key={index}
                  className='h-14 rounded-[20px] bg-slate-200/76'
                />
              ))}
            </div>
          </SkeletonGlassPanel>
        )}
        playerProgress={(
          <SkeletonGlassPanel
            className={GAME_HOME_PLAYER_PROGRESS_SHELL_CLASSNAME}
            data-testid='kangur-page-transition-skeleton-game-home-player-progress-shell'
            padding='lg'
            surface='solid'
            variant='soft'
          >
            <div className='space-y-4'>
              <SkeletonLine className='h-7 w-40' />
              <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
              <SkeletonBlock className='h-24 rounded-[24px] bg-slate-200/76' />
            </div>
          </SkeletonGlassPanel>
        )}
        progressSectionProps={{
          testId: 'kangur-page-transition-skeleton-game-home-progress-grid',
        }}
      />
    </div>
  );
};

const StandardTransitionSkeleton = ({
  children,
  loadingMessage,
  pageLabel,
}: {
  children: React.ReactNode;
  loadingMessage: string;
  pageLabel: string;
}): React.JSX.Element => (
  <div className={cn('flex w-full flex-col items-center', KANGUR_PANEL_GAP_CLASSNAME)}>
    <div className='w-full max-w-5xl'>
      <SkeletonStatusHeader loadingMessage={loadingMessage} pageLabel={pageLabel} />
    </div>
    <div className='w-full'>{children}</div>
  </div>
);

export type KangurPageTransitionSkeletonProps = {
  embeddedOverride?: boolean | null;
  pageKey?: string | null;
  reason?: string;
  renderInlineTopNavigationSkeleton?: boolean;
  topBarHeightCssValue?: string | null;
  variant?: KangurRouteTransitionSkeletonVariant;
  forcePageKey?: KangurSkeletonPageKey;
};

export function KangurPageTransitionSkeleton(
  props: KangurPageTransitionSkeletonProps
): React.JSX.Element {
  const pathname = usePathname();
  const routing = useOptionalKangurRouting();
  const { data: session } = useSession();
  const { resolveRoutePageKey } = useKangurRouteAccess();

  const requestedPageKey =
    props.forcePageKey ?? props.pageKey ?? resolveRoutePageKey(pathname, routing?.basePath);
  const isSuperAdmin = session?.user?.role === 'super_admin';
  const resolvedPageKey =
    requestedPageKey === 'GamesLibrary' && !isSuperAdmin ? 'Game' : requestedPageKey;
  const resolvedVariant =
    requestedPageKey === 'GamesLibrary' && !isSuperAdmin
      ? 'game-home'
      : props.variant ?? resolveDefaultSkeletonVariant(resolvedPageKey);
  const isInlineTopNavigationSkeleton = Boolean(props.renderInlineTopNavigationSkeleton);
  const isEmbedded = props.embeddedOverride ?? routing?.embedded ?? false;
  const skeletonLocale = resolveSkeletonLocale(pathname);
  const skeletonCopy = KANGUR_SKELETON_COPY_BY_LOCALE[skeletonLocale];
  const loadingMessage =
    props.reason === 'locale-switch'
      ? skeletonCopy.loadingLanguage
      : skeletonCopy.loadingPage;
  const pageLabel =
    resolvedVariant === 'lessons-library' || resolvedVariant === 'lessons-focus'
      ? skeletonCopy.lessonsPageTitle
      : FALLBACK_PAGE_LABELS[resolvedVariant];
  const topBarHeightCssValue =
    resolveNormalizedTopBarHeightCssValue(props.topBarHeightCssValue) ??
    readKangurTopBarHeightCssValue() ??
    `${KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX}px`;

  const rootClassName = cn(
    'z-40 overflow-hidden',
    props.reason === 'locale-switch'
      ? 'bg-[color:var(--kangur-page-background)]/90 backdrop-blur-md'
      : 'bg-[color:var(--kangur-page-background)]',
    isInlineTopNavigationSkeleton
      ? 'fixed inset-0 flex flex-col'
      : isEmbedded
        ? 'absolute inset-0'
        : 'fixed inset-x-0 bottom-0'
  );
  const rootStyle: CSSProperties | undefined = isInlineTopNavigationSkeleton
    ? ({
        '--kangur-top-bar-height': topBarHeightCssValue,
      } as KangurTopBarHeightStyle)
    : isEmbedded
      ? undefined
      : { top: topBarHeightCssValue };

  const renderContent = (): React.JSX.Element => {
    switch (resolvedVariant) {
      case 'game-home':
        return (
          <GameHomeTransitionSkeleton
            loadingMessage={loadingMessage}
            pageLabel={pageLabel}
          />
        );
      case 'game-session':
        return (
          <StandardTransitionSkeleton
            loadingMessage={loadingMessage}
            pageLabel={pageLabel}
          >
            <GameSessionSkeleton />
          </StandardTransitionSkeleton>
        );
      case 'learner-profile':
        return (
          <StandardTransitionSkeleton
            loadingMessage={loadingMessage}
            pageLabel={pageLabel}
          >
            <LearnerProfileSkeleton />
          </StandardTransitionSkeleton>
        );
      case 'parent-dashboard':
        return (
          <StandardTransitionSkeleton
            loadingMessage={loadingMessage}
            pageLabel={pageLabel}
          >
            <ParentDashboardSkeleton />
          </StandardTransitionSkeleton>
        );
      case 'lessons-focus':
        return (
          <LessonsFocusTransitionSkeleton
            loadingMessage={loadingMessage}
            pageLabel={pageLabel}
          />
        );
      case 'lessons-library':
      default:
        return (
          <LessonsLibraryTransitionSkeleton
            loadingMessage={loadingMessage}
            pageLabel={pageLabel}
          />
        );
    }
  };

  return (
    <div
      className={rootClassName}
      data-kangur-skeleton-reason={props.reason ?? undefined}
      data-kangur-skeleton-variant={resolvedVariant}
      data-testid='kangur-page-transition-skeleton'
      style={rootStyle}
    >
      {isInlineTopNavigationSkeleton ? (
        <div
          className='shrink-0 overflow-hidden'
          data-testid='kangur-page-transition-skeleton-inline-top-navigation'
          style={props.topBarHeightCssValue ? { height: topBarHeightCssValue } : undefined}
        >
          <KangurTopNavigationSkeleton
            publishHeight={false}
            topBarHeightCssValue={topBarHeightCssValue}
          />
        </div>
      ) : null}
      <div
        className={cn(
          'min-h-0 overflow-auto px-4 sm:px-6 lg:px-8',
          isInlineTopNavigationSkeleton ? 'flex-1' : 'h-full'
        )}
        data-testid='kangur-page-transition-skeleton-body'
      >
        <div
          className={cn(
            'min-h-full',
            isInlineTopNavigationSkeleton ? 'h-full [&>div]:h-full [&>div]:!min-h-full' : null
          )}
          data-testid='kangur-page-transition-skeleton-shell'
        >
          <div
            className={cn(
              'flex w-full min-w-0 max-w-full flex-col items-center overflow-x-clip',
              KANGUR_PANEL_GAP_CLASSNAME,
              'pb-[calc(var(--kangur-mobile-bottom-clearance,env(safe-area-inset-bottom))+32px)]',
              resolvedVariant === 'game-session' ? 'pt-24 sm:pt-28' : 'pt-8 sm:pt-10'
            )}
            data-kangur-route-main='false'
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default KangurPageTransitionSkeleton;
