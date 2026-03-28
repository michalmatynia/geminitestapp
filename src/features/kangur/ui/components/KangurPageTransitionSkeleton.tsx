'use client';

import { usePathname } from 'next/navigation';
import { useOptionalKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  GameSessionSkeleton,
  GamesLibrarySkeleton,
  LearnerProfileSkeleton,
  LessonsSkeleton,
  ParentDashboardSkeleton,
} from './KangurPageTransitionSkeleton.secondary';
import { KangurTopNavigationSkeleton } from '@/features/kangur/ui/components/KangurTopNavigationSkeleton';
import {
  HOME_ACTION_SKELETONS,
  HomeActionSkeletonCard,
  KANGUR_SKELETON_COPY_BY_LOCALE,
  type KangurSkeletonLocale,
  type KangurSkeletonPageKey,
  resolveSkeletonLocale,
  SkeletonBlock,
  SkeletonChip,
  SkeletonGlassPanel,
  SkeletonLine,
} from '@/features/kangur/ui/components/KangurPageTransitionSkeleton.shared';
import {
  GAME_HOME_ACTIONS_LIST_CLASSNAME,
  GAME_HOME_ACTIONS_SHELL_CLASSNAME,
  GAME_HOME_ASSIGNMENT_SPOTLIGHT_INNER_SHELL_CLASSNAME,
  GAME_HOME_ASSIGNMENT_SPOTLIGHT_SHELL_CLASSNAME,
  GAME_HOME_DUELS_SHELL_CLASSNAME,
  GAME_HOME_HERO_SHELL_CLASSNAME,
  GAME_HOME_LAYOUT_CLASSNAME,
  GAME_PAGE_STANDARD_CONTAINER_CLASSNAME,
} from '@/features/kangur/ui/pages/GameHome.constants';
import {
  KangurGameHomeSections,
  resolveKangurGameHomeVisibility,
} from '@/features/kangur/ui/pages/GameHome.layout';
import {
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import {
  type KangurRouteTransitionSkeletonVariant,
} from '@/features/kangur/ui/routing/route-transition-skeletons';
import { useKangurRouteAccess } from '@/features/kangur/ui/routing/useKangurRouteAccess';
import { cn } from '@/features/kangur/shared/utils';

const GameHomeSkeleton = (): React.JSX.Element => {
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
              <div className='sm:pr-24'>
                <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                  <SkeletonChip className='h-6 w-24' />
                  <SkeletonChip className='h-6 w-20' />
                </div>
              </div>
              <div className='mt-6 flex justify-center'>
                <SkeletonBlock className='h-16 w-full max-w-[360px] rounded-[28px] bg-amber-100/80' />
              </div>
              <SkeletonBlock className='mt-5 h-12 w-full rounded-[22px] bg-slate-200/76' />
            </SkeletonGlassPanel>
          </SkeletonGlassPanel>
        )}
        actionsColumn={(
          <SkeletonGlassPanel
            className={GAME_HOME_ACTIONS_SHELL_CLASSNAME}
            data-testid='kangur-page-transition-skeleton-game-home-actions-shell'
            padding='lg'
            surface='mist'
            variant='soft'
          >
            <div
              className={GAME_HOME_ACTIONS_LIST_CLASSNAME}
              data-testid='kangur-page-transition-skeleton-game-home-actions-list'
            >
              {HOME_ACTION_SKELETONS.map((action) => (
                <HomeActionSkeletonCard
                  key={action.id}
                  actionId={action.id}
                  themeClassName={action.themeClassName}
                />
              ))}
            </div>
          </SkeletonGlassPanel>
        )}
        summary={(
          <div
            className={GAME_HOME_HERO_SHELL_CLASSNAME}
            data-testid='kangur-page-transition-skeleton-game-home-summary-shell'
          >
            <SkeletonLine className='h-8 w-3/4 max-w-[420px]' />
            <SkeletonLine className='w-full max-w-[560px]' />
          </div>
        )}
      />
    </div>
  );
};

export type KangurPageTransitionSkeletonProps = {
  variant?: KangurRouteTransitionSkeletonVariant;
  forcePageKey?: KangurSkeletonPageKey;
};

export function KangurPageTransitionSkeleton(
  props: KangurPageTransitionSkeletonProps
): React.JSX.Element {
  const pathname = usePathname();
  const routing = useOptionalKangurRouting();
  const { resolveRoutePageKey } = useKangurRouteAccess();

  const pageKey = props.forcePageKey ?? resolveRoutePageKey(pathname, routing?.basePath);
  const skeletonLocale = resolveSkeletonLocale();
  const copy = KANGUR_SKELETON_COPY_BY_LOCALE[skeletonLocale];

  const renderContent = (): React.JSX.Element => {
    switch (pageKey) {
      case 'Game':
        return <GameHomeSkeleton />;
      case 'Lessons':
        return <LessonsSkeleton />;
      case 'GamesLibrary':
        return <GamesLibrarySkeleton />;
      case 'LearnerProfile':
        return <LearnerProfileSkeleton />;
      case 'ParentDashboard':
        return <ParentDashboardSkeleton />;
      default:
        return <GameSessionSkeleton />;
    }
  };

  return (
    <div
      className={cn('min-h-screen bg-[color:var(--kangur-page-background)]')}
      data-testid='kangur-page-transition-skeleton'
    >
      <KangurTopNavigationSkeleton
        copy={copy}
        currentPage={pageKey === 'Game' ? 'Game' : pageKey === 'Lessons' ? 'Lessons' : 'Game'}
      />
      <main className={cn(GAME_PAGE_STANDARD_CONTAINER_CLASSNAME, 'py-6 sm:py-8')}>
        {renderContent()}
      </main>
    </div>
  );
}

export default KangurPageTransitionSkeleton;
