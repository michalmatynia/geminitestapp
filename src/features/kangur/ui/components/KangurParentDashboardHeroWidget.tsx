'use client';

import {
  BookOpen,
  Home,
  LayoutGrid,
  LogIn,
  LogOut,
  UserRound,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type RefObject, useMemo } from 'react';

import { getKangurHomeHref, getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { KangurParentDashboardLearnerManagementWidget } from '@/features/kangur/ui/components/KangurParentDashboardLearnerManagementWidget';
import { KangurNavAction } from '@/features/kangur/ui/components/KangurNavAction';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurParentDashboardWordmark } from '@/features/kangur/ui/components/KangurParentDashboardWordmark';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurSummaryPanel,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurLearnerActivityStatus } from '@/features/kangur/ui/hooks/useKangurLearnerActivity';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { buildKangurLearnerLiveState } from '@/features/kangur/ui/services/learner-live-state';
import {
  KANGUR_PANEL_GRID_TO_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';

const LEARNER_ACTIVITY_REFRESH_MS = 10_000;

export function KangurParentDashboardHeroWidget({
  showActions = true,
  showLearnerManagement = false,
  learnerManagementAnchorRef,
}: {
  showActions?: boolean;
  showLearnerManagement?: boolean;
  learnerManagementAnchorRef?: RefObject<HTMLDivElement | null>;
}): React.JSX.Element {
  const locale = useLocale();
  const translations = useTranslations('KangurParentDashboard');
  const routeNavigator = useKangurRouteNavigator();
  const isCoarsePointer = useKangurCoarsePointer();
  const {
    activeLearner,
    basePath,
    canManageLearners,
    isAuthenticated,
    logout,
    progress,
    setCreateLearnerModalOpen,
    viewerName,
    viewerRoleLabel,
  } = useKangurParentDashboardRuntime();
  const activeLearnerId = activeLearner?.id ?? null;
  const hasActiveLearner = Boolean(activeLearnerId);
  const activeLearnerLabel =
    activeLearner?.displayName?.trim() ||
    activeLearner?.loginName?.trim() ||
    translations('hero.learnerFallback');
  const { status: learnerActivityStatus, isLoading: isActivityLoading } =
    useKangurLearnerActivityStatus({
      enabled: canManageLearners && hasActiveLearner,
      learnerId: activeLearnerId,
      refreshIntervalMs: LEARNER_ACTIVITY_REFRESH_MS,
    });
  const { ageGroup } = useKangurAgeGroupFocus();
  const lessonsQuery = useKangurLessons({ ageGroup });
  const lessons = useMemo(() => lessonsQuery.data ?? [], [lessonsQuery.data]);
  const learnerLiveState = useMemo(
    () =>
      buildKangurLearnerLiveState({
        activityStatus: learnerActivityStatus,
        isActivityLoading,
        progress,
        lessons,
        basePath,
        locale,
        translate: (key, values) => translations(key, values),
      }),
    [basePath, isActivityLoading, learnerActivityStatus, lessons, locale, progress, translations]
  );
  const isLearnerOnline = learnerLiveState.isOnline;
  const activityLabel = learnerLiveState.label;
  const activityDescription = learnerLiveState.description;
  const activityHref = learnerLiveState.href;
  const shouldShowActivityLink = learnerLiveState.showLink;
  const { openLoginModal } = useKangurLoginModal();
  const { entry: guestHeroContent } = useKangurPageContentEntry('parent-dashboard-guest-hero');
  const { entry: dashboardHeroContent } = useKangurPageContentEntry('parent-dashboard-hero');
  const parentWordmarkLabel = translations('hero.parentTitle');
  const compactActionClassName = isCoarsePointer
    ? 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
    : undefined;
  const compactWideActionClassName = isCoarsePointer
    ? 'w-full sm:w-auto min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
    : 'w-full sm:w-auto';
  const handleGoHome = (): void => {
    routeNavigator.push(getKangurHomeHref(basePath), {
      pageKey: 'Game',
      sourceId: 'parent-dashboard-hero:back-home',
    });
  };
  const handleGoToProfile = (): void => {
    routeNavigator.push(createPageUrl('LearnerProfile', basePath), {
      pageKey: 'LearnerProfile',
      sourceId: 'parent-dashboard-hero:back-profile',
    });
  };
  const handleCreateLearner = (): void => {
    setCreateLearnerModalOpen(true);
  };

  if (!isAuthenticated) {
    const guestDescription = guestHeroContent?.summary
      ? `${guestHeroContent.summary} ${translations('hero.unauthenticated.summarySuffix')}`
      : translations('hero.unauthenticated.description');

    return (
      <KangurPageIntroCard
        accent='indigo'
        className='mx-auto w-full max-w-2xl'
        description={guestDescription}
        headingAs='h1'
        showBackButton={false}
        onBack={handleGoHome}
        testId='kangur-parent-dashboard-hero'
        title={guestHeroContent?.title ?? translations('hero.unauthenticated.title')}
        visualTitle={
          <KangurParentDashboardWordmark
            className='mx-auto'
            data-testid='kangur-parent-dashboard-heading-art'
            idPrefix='kangur-parent-dashboard-heading'
            label={parentWordmarkLabel}
            locale={locale}
          />
        }
      >
        <div className={KANGUR_PANEL_GRID_TO_ROW_CLASSNAME}>
          <KangurButton
            className={compactWideActionClassName}
            onClick={() => {
              openLoginModal();
            }}
            size='lg'
            variant='primary'
            data-doc-id='profile_login'
          >
            <LogIn className='h-5 w-5' />
            {translations('hero.signIn')}
          </KangurButton>
          <KangurButton
            asChild
            className={compactWideActionClassName}
            size='lg'
            variant='surface'
          >
            <button
              onClick={() => {
                openLoginModal(null, { authMode: 'create-account' });
              }}
              type='button'
              aria-label={translations('hero.createParentAccountAria')}
            >
              {translations('hero.createParentAccount')}
            </button>
          </KangurButton>
        </div>
      </KangurPageIntroCard>
    );
  }

  if (!canManageLearners) {
    const restrictedDescription = guestHeroContent?.summary
      ? `${guestHeroContent.summary} ${translations('hero.restricted.summarySuffix')}`
      : translations('hero.restricted.description');

    return (
      <KangurPageIntroCard
        accent='slate'
        className='mx-auto w-full max-w-2xl'
        description={restrictedDescription}
        headingAs='h1'
        showBackButton={false}
        onBack={handleGoToProfile}
        testId='kangur-parent-dashboard-hero'
        title={translations('hero.restricted.title')}
        visualTitle={
          <KangurParentDashboardWordmark
            className='mx-auto'
            data-testid='kangur-parent-dashboard-heading-art'
            idPrefix='kangur-parent-dashboard-heading'
            label={parentWordmarkLabel}
            locale={locale}
          />
        }
      >
        <KangurButton
          className={compactWideActionClassName}
          onClick={handleGoToProfile}
          size='lg'
          variant='primary'
          data-doc-id='top_nav_profile'
        >
          {translations('hero.backToLearnerProfile')}
        </KangurButton>
      </KangurPageIntroCard>
    );
  }

  const shouldShowCreateLearner = showLearnerManagement && canManageLearners;

  return (
    <KangurPageIntroCard
      accent='indigo'
      className='mx-auto w-full max-w-2xl'
      description={
        <>
          {translations('hero.selectedLearner')}:{' '}
          <span className='break-words font-semibold [color:var(--kangur-page-text)]'>
            {activeLearner?.displayName ?? translations('hero.noLearnerTitle')}
          </span>
          .
          <span className='mt-1 block text-xs [color:var(--kangur-page-muted-text)]'>
            {viewerRoleLabel ?? translations('hero.viewerRoleFallback')}:{' '}
            <span className='break-words font-semibold [color:var(--kangur-page-text)]'>
              {viewerName}
            </span>
          </span>
        </>
      }
      headingAs='h1'
      headingAction={
        shouldShowCreateLearner ? (
          <KangurButton
            className={compactWideActionClassName}
            onClick={handleCreateLearner}
            size='sm'
            variant='surface'
            data-doc-id='parent_open_create_learner'
          >
            {translations('hero.addLearner')}
          </KangurButton>
        ) : null
      }
      showBackButton={false}
      onBack={handleGoToProfile}
      testId='kangur-parent-dashboard-hero'
      title={dashboardHeroContent?.title ?? translations('hero.parentTitle')}
      visualTitle={
        <KangurParentDashboardWordmark
          className='mx-auto'
          data-testid='kangur-parent-dashboard-heading-art'
          idPrefix='kangur-parent-dashboard-heading'
          label={parentWordmarkLabel}
          locale={locale}
        />
      }
    >
      {showLearnerManagement ? (
        <div className='mt-4 text-left' ref={learnerManagementAnchorRef}>
          <KangurParentDashboardLearnerManagementWidget />
          {!hasActiveLearner ? (
            <div className='mt-4'>
              <KangurEmptyState
                align='left'
                className='text-left'
                padding='md'
                title={translations('hero.noLearnerTitle')}
                description={translations('hero.noLearnerDescription')}
              />
            </div>
          ) : null}
        </div>
      ) : null}

      {hasActiveLearner ? (
        <KangurSummaryPanel
          accent={isLearnerOnline ? 'emerald' : 'slate'}
          className='mt-4 text-left'
          data-testid='kangur-parent-dashboard-learner-activity'
          description={activityDescription}
          label={activityLabel}
          padding='sm'
          tone='accent'
        >
          {shouldShowActivityLink ? (
            <KangurButton asChild className={compactWideActionClassName} size='sm' variant='surface'>
            <Link
              href={activityHref ?? createPageUrl('Game', basePath)}
                transitionSourceId='parent-dashboard-hero:learner-activity'
              >
                {translations('hero.openActivity')}
              </Link>
            </KangurButton>
          ) : null}
        </KangurSummaryPanel>
      ) : null}

      {hasActiveLearner ? (
        <div className={`mt-3 ${KANGUR_WRAP_CENTER_ROW_CLASSNAME}`}>
          <KangurButton asChild className={compactActionClassName} size='sm' variant='surface'>
            <Link
              href={createPageUrl('LearnerProfile', basePath)}
              targetPageKey='LearnerProfile'
              transitionSourceId='parent-dashboard-hero:profile'
              data-doc-id='top_nav_profile'
            >
              <UserRound className='h-4 w-4' />
              {translations('hero.profile', { learner: activeLearnerLabel })}
            </Link>
          </KangurButton>
        </div>
      ) : null}

      {showActions ? (
        <div className='flex flex-col items-center gap-2'>
          <div className='flex w-full justify-center'>
            <KangurTopNavGroup
              label={translations('hero.quickActions')}
              className='w-full sm:w-auto'
            >
              <KangurNavAction
                className={compactActionClassName}
                docId='top_nav_home'
                href={getKangurHomeHref(basePath)}
                size='sm'
                targetPageKey='Game'
                transition={{
                  sourceId: 'parent-dashboard-nav:home',
                }}
                variant='navigation'
              >
                <Home className='h-4 w-4' /> {translations('hero.nav.game')}
              </KangurNavAction>
              <KangurNavAction
                className={compactActionClassName}
                docId='top_nav_lessons'
                href={createPageUrl('Lessons', basePath)}
                size='sm'
                targetPageKey='Lessons'
                transition={{
                  sourceId: 'parent-dashboard-nav:lessons',
                }}
                variant='navigation'
              >
                <BookOpen className='h-4 w-4' /> {translations('hero.nav.lessons')}
              </KangurNavAction>
              <KangurNavAction
                className={compactActionClassName}
                docId='top_nav_profile'
                href={createPageUrl('LearnerProfile', basePath)}
                size='sm'
                targetPageKey='LearnerProfile'
                transition={{
                  sourceId: 'parent-dashboard-nav:profile',
                }}
                variant='navigation'
              >
                <UserRound className='h-4 w-4' /> {translations('hero.nav.profile')}
              </KangurNavAction>
              <KangurNavAction
                className={compactActionClassName}
                docId='top_nav_parent_dashboard'
                href={createPageUrl('ParentDashboard', basePath)}
                size='sm'
                targetPageKey='ParentDashboard'
                transition={{
                  sourceId: 'parent-dashboard-nav:dashboard',
                }}
                variant='navigationActive'
              >
                <LayoutGrid className='h-4 w-4' /> {translations('hero.nav.parent')}
              </KangurNavAction>
            </KangurTopNavGroup>
          </div>
          <KangurButton
            className={compactWideActionClassName}
            onClick={() => logout(false)}
            size='sm'
            type='button'
            variant='ghost'
            data-doc-id='profile_logout'
          >
            <LogOut className='h-4 w-4' /> {translations('hero.logout')}
          </KangurButton>
        </div>
      ) : null}
    </KangurPageIntroCard>
  );
}
