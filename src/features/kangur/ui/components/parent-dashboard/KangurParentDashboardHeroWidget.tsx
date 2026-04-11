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
import React, { memo, type RefObject, useMemo } from 'react';

import {
  getKangurHomeHref,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { KangurParentDashboardLearnerManagementWidget } from './KangurParentDashboardLearnerManagementWidget';
import { KangurNavAction } from '@/features/kangur/ui/components/KangurNavAction';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/lesson-library/KangurPageIntroCard';
import { KangurParentDashboardWordmark } from './KangurParentDashboardWordmark';
import { KangurTransitionLink as Link } from '@/features/kangur/ui/components/KangurTransitionLink';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import {
  useKangurParentDashboardRuntimeHeroState,
  useKangurParentDashboardRuntimeShellActions,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurSummaryPanel,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GRID_TO_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurLearnerActivityStatus } from '@/features/kangur/ui/hooks/useKangurLearnerActivity';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { buildKangurLearnerLiveState } from '@/features/kangur/ui/services/learner-live-state';

const LEARNER_ACTIVITY_REFRESH_MS = 10_000;
const LEARNER_ACTIVITY_START_DELAY_MS = 1_200;

type KangurParentDashboardHeroContextValue = {
  activeLearnerLabel: string;
  activeLearnerName: string;
  learnerLiveState: ReturnType<typeof buildKangurLearnerLiveState>;
  learnerManagementAnchorRef?: RefObject<HTMLDivElement | null>;
  showActions: boolean;
  showLearnerManagement: boolean;
};

const KangurParentDashboardHeroContext =
  React.createContext<KangurParentDashboardHeroContextValue | null>(null);

function useKangurParentDashboardHero(): KangurParentDashboardHeroContextValue {
  const context = React.useContext(KangurParentDashboardHeroContext);
  if (!context) {
    throw new Error(
      'useKangurParentDashboardHero must be used within KangurParentDashboardHeroWidget.'
    );
  }
  return context;
}

type KangurParentDashboardHeroWidgetProps = {
  showActions?: boolean;
  showLearnerManagement?: boolean;
  learnerManagementAnchorRef?: RefObject<HTMLDivElement | null>;
};

type ParentDashboardHeroContent = {
  summary?: string | null;
  title?: string | null;
} | null;

type ParentDashboardHeroTranslations = (
  key: string,
  values?: Record<string, string | number>
) => string;

const resolveHeroActionClassNames = (
  isCoarsePointer: boolean
): {
  compactActionClassName: string | undefined;
  compactWideActionClassName: string;
} => ({
  compactActionClassName: isCoarsePointer
    ? 'min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
    : undefined,
  compactWideActionClassName: isCoarsePointer
    ? 'w-full sm:w-auto min-h-11 px-4 touch-manipulation select-none active:scale-[0.97]'
    : 'w-full sm:w-auto',
});

const resolveActiveLearnerLabel = ({
  activeLearner,
  translations,
}: {
  activeLearner: {
    displayName?: string | null;
    loginName?: string | null;
  } | null;
  translations: ParentDashboardHeroTranslations;
}): string =>
  activeLearner?.displayName?.trim() ||
  activeLearner?.loginName?.trim() ||
  translations('hero.learnerFallback');

const resolveActiveLearnerId = ({
  activeLearner,
}: {
  activeLearner: { id?: string | null } | null;
}): string | null => activeLearner?.id ?? null;

const resolveShouldTrackLearnerActivity = ({
  canManageLearners,
  hasActiveLearner,
}: {
  canManageLearners: boolean;
  hasActiveLearner: boolean;
}): boolean => canManageLearners && hasActiveLearner;

const resolveParentDashboardHeroContentEntryId = ({
  canManageLearners,
  isAuthenticated,
}: {
  canManageLearners: boolean;
  isAuthenticated: boolean;
}): string =>
  !isAuthenticated || !canManageLearners ? 'parent-dashboard-guest-hero' : 'parent-dashboard-hero';

function KangurParentDashboardHeroWordmark({
  label,
  locale,
}: {
  label: string;
  locale: string;
}): React.JSX.Element {
  return (
    <KangurParentDashboardWordmark
      className='mx-auto'
      data-testid='kangur-parent-dashboard-heading-art'
      idPrefix='kangur-parent-dashboard-heading'
      label={label}
      locale={locale}
    />
  );
}

function KangurParentDashboardGuestActions(): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const translations = useTranslations('KangurParentDashboard');
  const { openLoginModal } = useKangurLoginModal();
  const { compactWideActionClassName } = resolveHeroActionClassNames(isCoarsePointer);

  const handleOpenLogin = (): void => {
    openLoginModal();
  };
  const handleOpenCreateAccount = (): void => {
    openLoginModal(null, { authMode: 'create-account' });
  };

  return (
    <div className={KANGUR_PANEL_GRID_TO_ROW_CLASSNAME}>
      <KangurButton
        className={compactWideActionClassName}
        onClick={handleOpenLogin}
        size='lg'
        variant='primary'
        data-doc-id='profile_login'
      >
        <LogIn className='h-5 w-5' />
        {translations('hero.signIn')}
      </KangurButton>
      <KangurButton asChild className={compactWideActionClassName} size='lg' variant='surface'>
        <button
          onClick={handleOpenCreateAccount}
          type='button'
          aria-label={translations('hero.createParentAccountAria')}
        >
          {translations('hero.createParentAccount')}
        </button>
      </KangurButton>
    </div>
  );
}

function KangurParentDashboardGuestCard({
  heroContent,
  locale,
  onBack,
  parentWordmarkLabel,
}: {
  heroContent: ParentDashboardHeroContent;
  locale: string;
  onBack: () => void;
  parentWordmarkLabel: string;
}): React.JSX.Element {
  const translations = useTranslations('KangurParentDashboard');
  const guestDescription = heroContent?.summary
    ? `${heroContent.summary} ${translations('hero.unauthenticated.summarySuffix')}`
    : translations('hero.unauthenticated.description');

  return (
    <KangurPageIntroCard
      accent='indigo'
      className='mx-auto w-full max-w-2xl'
      description={guestDescription}
      headingAs='h1'
      showBackButton={false}
      onBack={onBack}
      testId='kangur-parent-dashboard-hero'
      title={heroContent?.title ?? translations('hero.unauthenticated.title')}
      visualTitle={
        <KangurParentDashboardHeroWordmark label={parentWordmarkLabel} locale={locale} />
      }
    >
      <KangurParentDashboardGuestActions />
    </KangurPageIntroCard>
  );
}

function KangurParentDashboardRestrictedCard({
  heroContent,
  locale,
  onBack,
  onGoToProfile,
  parentWordmarkLabel,
}: {
  heroContent: ParentDashboardHeroContent;
  locale: string;
  onBack: () => void;
  onGoToProfile: () => void;
  parentWordmarkLabel: string;
}): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const translations = useTranslations('KangurParentDashboard');
  const { compactWideActionClassName } = resolveHeroActionClassNames(isCoarsePointer);
  const restrictedDescription = heroContent?.summary
    ? `${heroContent.summary} ${translations('hero.restricted.summarySuffix')}`
    : translations('hero.restricted.description');

  return (
    <KangurPageIntroCard
      accent='slate'
      className='mx-auto w-full max-w-2xl'
      description={restrictedDescription}
      headingAs='h1'
      showBackButton={false}
      onBack={onBack}
      testId='kangur-parent-dashboard-hero'
      title={translations('hero.restricted.title')}
      visualTitle={
        <KangurParentDashboardHeroWordmark label={parentWordmarkLabel} locale={locale} />
      }
    >
      <KangurButton
        className={compactWideActionClassName}
        onClick={onGoToProfile}
        size='lg'
        variant='primary'
        data-doc-id='top_nav_profile'
      >
        {translations('hero.backToLearnerProfile')}
      </KangurButton>
    </KangurPageIntroCard>
  );
}

function KangurParentDashboardLearnerManagementSection(): React.JSX.Element {
  const { learnerManagementAnchorRef } = useKangurParentDashboardHero();
  const translations = useTranslations('KangurParentDashboard');
  const { activeLearner } = useKangurParentDashboardRuntimeHeroState();
  const hasActiveLearner = Boolean(activeLearner?.id);

  return (
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
  );
}

function KangurParentDashboardLearnerActivitySection(): React.JSX.Element {
  const { learnerLiveState } = useKangurParentDashboardHero();
  const isCoarsePointer = useKangurCoarsePointer();
  const translations = useTranslations('KangurParentDashboard');
  const { basePath } = useKangurParentDashboardRuntimeHeroState();
  const { compactWideActionClassName } = resolveHeroActionClassNames(isCoarsePointer);

  return (
    <KangurSummaryPanel
      accent={learnerLiveState.isOnline ? 'emerald' : 'slate'}
      className='mt-4 text-left'
      data-testid='kangur-parent-dashboard-learner-activity'
      description={learnerLiveState.description}
      label={learnerLiveState.label}
      padding='sm'
      tone='accent'
    >
      {learnerLiveState.showLink ? (
        <KangurButton asChild className={compactWideActionClassName} size='sm' variant='surface'>
          <Link
            href={learnerLiveState.href ?? createPageUrl('Game', basePath)}
            transitionSourceId='parent-dashboard-hero:learner-activity'
          >
            {translations('hero.openActivity')}
          </Link>
        </KangurButton>
      ) : null}
    </KangurSummaryPanel>
  );
}

function KangurParentDashboardLearnerProfileAction({
  activeLearnerLabel,
}: {
  activeLearnerLabel: string;
}): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const translations = useTranslations('KangurParentDashboard');
  const { basePath } = useKangurParentDashboardRuntimeHeroState();
  const { compactActionClassName } = resolveHeroActionClassNames(isCoarsePointer);

  return (
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
  );
}

function KangurParentDashboardQuickActions(): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const translations = useTranslations('KangurParentDashboard');
  const { basePath } = useKangurParentDashboardRuntimeHeroState();
  const { logout } = useKangurParentDashboardRuntimeShellActions();
  const { compactActionClassName, compactWideActionClassName } =
    resolveHeroActionClassNames(isCoarsePointer);

  const handleLogout = (): void => {
    logout(false);
  };

  return (
    <div className='flex flex-col items-center gap-2'>
      <div className='flex w-full justify-center'>
        <KangurTopNavGroup label={translations('hero.quickActions')} className='w-full sm:w-auto'>
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
        onClick={handleLogout}
        size='sm'
        type='button'
        variant='ghost'
        data-doc-id='profile_logout'
      >
        <LogOut className='h-4 w-4' /> {translations('hero.logout')}
      </KangurButton>
    </div>
  );
}

function KangurParentDashboardAuthenticatedBody(): React.JSX.Element {
  const {
    activeLearnerLabel,
    showActions,
    showLearnerManagement,
  } = useKangurParentDashboardHero();
  const { activeLearner } = useKangurParentDashboardRuntimeHeroState();
  const hasActiveLearner = Boolean(activeLearner?.id);

  return (
    <>
      {showLearnerManagement ? (
        <KangurParentDashboardLearnerManagementSection />
      ) : null}

      {hasActiveLearner ? (
        <KangurParentDashboardLearnerActivitySection />
      ) : null}

      {hasActiveLearner ? (
        <KangurParentDashboardLearnerProfileAction
          activeLearnerLabel={activeLearnerLabel}
        />
      ) : null}

      {showActions ? (
        <KangurParentDashboardQuickActions />
      ) : null}
    </>
  );
}

function KangurParentDashboardManagedDescription({
  activeLearnerName,
}: {
  activeLearnerName: string;
}): React.JSX.Element {
  const translations = useTranslations('KangurParentDashboard');
  const { viewerName, viewerRoleLabel } = useKangurParentDashboardRuntimeHeroState();

  return (
    <>
      {translations('hero.selectedLearner')}:{' '}
      <span className='break-words font-semibold [color:var(--kangur-page-text)]'>
        {activeLearnerName}
      </span>
      .
      <span className='mt-1 block text-xs [color:var(--kangur-page-muted-text)]'>
        {viewerRoleLabel ?? translations('hero.viewerRoleFallback')}:{' '}
        <span className='break-words font-semibold [color:var(--kangur-page-text)]'>
          {viewerName}
        </span>
      </span>
    </>
  );
}

function KangurParentDashboardCreateLearnerAction(): React.JSX.Element {
  const isCoarsePointer = useKangurCoarsePointer();
  const translations = useTranslations('KangurParentDashboard');
  const { setCreateLearnerModalOpen } = useKangurParentDashboardRuntimeShellActions();
  const { compactWideActionClassName } = resolveHeroActionClassNames(isCoarsePointer);

  return (
    <KangurButton
      className={compactWideActionClassName}
      onClick={() => setCreateLearnerModalOpen(true)}
      size='sm'
      variant='surface'
      data-doc-id='parent_open_create_learner'
    >
      {translations('hero.addLearner')}
    </KangurButton>
  );
}

function KangurParentDashboardManagedCard({
  heroContent,
  locale,
  onBack,
  parentWordmarkLabel,
}: {
  heroContent: ParentDashboardHeroContent;
  locale: string;
  onBack: () => void;
  parentWordmarkLabel: string;
}): React.JSX.Element {
  const { activeLearnerName, showLearnerManagement } = useKangurParentDashboardHero();
  const translations = useTranslations('KangurParentDashboard');

  return (
    <KangurPageIntroCard
      accent='indigo'
      className='mx-auto w-full max-w-2xl'
      description={
        <KangurParentDashboardManagedDescription
          activeLearnerName={activeLearnerName}
        />
      }
      headingAs='h1'
      headingAction={
        showLearnerManagement ? (
          <KangurParentDashboardCreateLearnerAction />
        ) : null
      }
      showBackButton={false}
      onBack={onBack}
      testId='kangur-parent-dashboard-hero'
      title={heroContent?.title ?? translations('hero.parentTitle')}
      visualTitle={
        <KangurParentDashboardHeroWordmark label={parentWordmarkLabel} locale={locale} />
      }
    >
      <KangurParentDashboardAuthenticatedBody />
    </KangurPageIntroCard>
  );
}

export const KangurParentDashboardHeroWidget = memo(function KangurParentDashboardHeroWidget({
  showActions = true,
  showLearnerManagement = false,
  learnerManagementAnchorRef,
}: KangurParentDashboardHeroWidgetProps): React.JSX.Element {
  const locale = useLocale();
  const translations = useTranslations('KangurParentDashboard');
  const routeNavigator = useKangurRouteNavigator();
  const {
    activeLearner,
    basePath,
    canManageLearners,
    isAuthenticated,
    progress,
    lessons = [],
  } = useKangurParentDashboardRuntimeHeroState();
  const activeLearnerId = resolveActiveLearnerId({ activeLearner });
  const hasActiveLearner = Boolean(activeLearnerId);
  const activeLearnerLabel = resolveActiveLearnerLabel({
    activeLearner,
    translations,
  });
  const { status: learnerActivityStatus, isLoading: isActivityLoading } =
    useKangurLearnerActivityStatus({
      deferInitialRefreshMs: LEARNER_ACTIVITY_START_DELAY_MS,
      enabled: resolveShouldTrackLearnerActivity({
        canManageLearners,
        hasActiveLearner,
      }),
      learnerId: activeLearnerId,
      refreshIntervalMs: LEARNER_ACTIVITY_REFRESH_MS,
    });
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
  const { entry: heroContent } = useKangurPageContentEntry(
    resolveParentDashboardHeroContentEntryId({
      canManageLearners,
      isAuthenticated,
    })
  );
  const parentWordmarkLabel = translations('hero.parentTitle');
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
  const activeLearnerName = activeLearner?.displayName ?? translations('hero.noLearnerTitle');

  if (!isAuthenticated) {
    return (
      <KangurParentDashboardGuestCard
        heroContent={heroContent}
        locale={locale}
        onBack={handleGoHome}
        parentWordmarkLabel={parentWordmarkLabel}
      />
    );
  }

  if (!canManageLearners) {
    return (
      <KangurParentDashboardRestrictedCard
        heroContent={heroContent}
        locale={locale}
        onBack={handleGoToProfile}
        onGoToProfile={handleGoToProfile}
        parentWordmarkLabel={parentWordmarkLabel}
      />
    );
  }

  return (
    <KangurParentDashboardHeroContext.Provider
      value={{
        activeLearnerLabel,
        activeLearnerName,
        learnerLiveState,
        learnerManagementAnchorRef,
        showActions,
        showLearnerManagement,
      }}
    >
      <KangurParentDashboardManagedCard
        heroContent={heroContent}
        locale={locale}
        onBack={handleGoToProfile}
        parentWordmarkLabel={parentWordmarkLabel}
      />
    </KangurParentDashboardHeroContext.Provider>
  );
});
