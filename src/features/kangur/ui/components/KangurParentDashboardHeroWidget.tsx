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
import { memo, type RefObject, useMemo } from 'react';

import {
  getKangurHomeHref,
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { KangurParentDashboardLearnerManagementWidget } from '@/features/kangur/ui/components/KangurParentDashboardLearnerManagementWidget';
import { KangurNavAction } from '@/features/kangur/ui/components/KangurNavAction';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/lesson-library/KangurPageIntroCard';
import { KangurParentDashboardWordmark } from '@/features/kangur/ui/components/KangurParentDashboardWordmark';
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

function KangurParentDashboardGuestActions({
  compactWideActionClassName,
  onOpenCreateAccount,
  onOpenLogin,
  translations,
}: {
  compactWideActionClassName: string;
  onOpenCreateAccount: () => void;
  onOpenLogin: () => void;
  translations: ParentDashboardHeroTranslations;
}): React.JSX.Element {
  return (
    <div className={KANGUR_PANEL_GRID_TO_ROW_CLASSNAME}>
      <KangurButton
        className={compactWideActionClassName}
        onClick={onOpenLogin}
        size='lg'
        variant='primary'
        data-doc-id='profile_login'
      >
        <LogIn className='h-5 w-5' />
        {translations('hero.signIn')}
      </KangurButton>
      <KangurButton asChild className={compactWideActionClassName} size='lg' variant='surface'>
        <button
          onClick={onOpenCreateAccount}
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
  compactWideActionClassName,
  heroContent,
  locale,
  onBack,
  onOpenCreateAccount,
  onOpenLogin,
  parentWordmarkLabel,
  translations,
}: {
  compactWideActionClassName: string;
  heroContent: ParentDashboardHeroContent;
  locale: string;
  onBack: () => void;
  onOpenCreateAccount: () => void;
  onOpenLogin: () => void;
  parentWordmarkLabel: string;
  translations: ParentDashboardHeroTranslations;
}): React.JSX.Element {
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
      <KangurParentDashboardGuestActions
        compactWideActionClassName={compactWideActionClassName}
        onOpenCreateAccount={onOpenCreateAccount}
        onOpenLogin={onOpenLogin}
        translations={translations}
      />
    </KangurPageIntroCard>
  );
}

function KangurParentDashboardRestrictedCard({
  compactWideActionClassName,
  heroContent,
  locale,
  onBack,
  onGoToProfile,
  parentWordmarkLabel,
  translations,
}: {
  compactWideActionClassName: string;
  heroContent: ParentDashboardHeroContent;
  locale: string;
  onBack: () => void;
  onGoToProfile: () => void;
  parentWordmarkLabel: string;
  translations: ParentDashboardHeroTranslations;
}): React.JSX.Element {
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

function KangurParentDashboardLearnerManagementSection({
  hasActiveLearner,
  learnerManagementAnchorRef,
  translations,
}: {
  hasActiveLearner: boolean;
  learnerManagementAnchorRef?: RefObject<HTMLDivElement | null>;
  translations: ParentDashboardHeroTranslations;
}): React.JSX.Element {
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

function KangurParentDashboardLearnerActivitySection({
  activityDescription,
  activityHref,
  activityLabel,
  basePath,
  compactWideActionClassName,
  isLearnerOnline,
  shouldShowActivityLink,
  translations,
}: {
  activityDescription: string;
  activityHref: string | null;
  activityLabel: string;
  basePath: string;
  compactWideActionClassName: string;
  isLearnerOnline: boolean;
  shouldShowActivityLink: boolean;
  translations: ParentDashboardHeroTranslations;
}): React.JSX.Element {
  return (
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
  );
}

function KangurParentDashboardLearnerProfileAction({
  activeLearnerLabel,
  basePath,
  compactActionClassName,
  translations,
}: {
  activeLearnerLabel: string;
  basePath: string;
  compactActionClassName: string | undefined;
  translations: ParentDashboardHeroTranslations;
}): React.JSX.Element {
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

function KangurParentDashboardQuickActions({
  basePath,
  compactActionClassName,
  compactWideActionClassName,
  onLogout,
  translations,
}: {
  basePath: string;
  compactActionClassName: string | undefined;
  compactWideActionClassName: string;
  onLogout: () => void;
  translations: ParentDashboardHeroTranslations;
}): React.JSX.Element {
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
        onClick={onLogout}
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

function KangurParentDashboardAuthenticatedBody({
  activeLearnerLabel,
  activityDescription,
  activityHref,
  activityLabel,
  basePath,
  compactActionClassName,
  compactWideActionClassName,
  hasActiveLearner,
  isLearnerOnline,
  learnerManagementAnchorRef,
  onLogout,
  shouldShowActivityLink,
  showActions,
  showLearnerManagement,
  translations,
}: {
  activeLearnerLabel: string;
  activityDescription: string;
  activityHref: string | null;
  activityLabel: string;
  basePath: string;
  compactActionClassName: string | undefined;
  compactWideActionClassName: string;
  hasActiveLearner: boolean;
  isLearnerOnline: boolean;
  learnerManagementAnchorRef?: RefObject<HTMLDivElement | null>;
  onLogout: () => void;
  shouldShowActivityLink: boolean;
  showActions: boolean;
  showLearnerManagement: boolean;
  translations: ParentDashboardHeroTranslations;
}): React.JSX.Element {
  return (
    <>
      {showLearnerManagement ? (
        <KangurParentDashboardLearnerManagementSection
          hasActiveLearner={hasActiveLearner}
          learnerManagementAnchorRef={learnerManagementAnchorRef}
          translations={translations}
        />
      ) : null}

      {hasActiveLearner ? (
        <KangurParentDashboardLearnerActivitySection
          activityDescription={activityDescription}
          activityHref={activityHref}
          activityLabel={activityLabel}
          basePath={basePath}
          compactWideActionClassName={compactWideActionClassName}
          isLearnerOnline={isLearnerOnline}
          shouldShowActivityLink={shouldShowActivityLink}
          translations={translations}
        />
      ) : null}

      {hasActiveLearner ? (
        <KangurParentDashboardLearnerProfileAction
          activeLearnerLabel={activeLearnerLabel}
          basePath={basePath}
          compactActionClassName={compactActionClassName}
          translations={translations}
        />
      ) : null}

      {showActions ? (
        <KangurParentDashboardQuickActions
          basePath={basePath}
          compactActionClassName={compactActionClassName}
          compactWideActionClassName={compactWideActionClassName}
          onLogout={onLogout}
          translations={translations}
        />
      ) : null}
    </>
  );
}

function KangurParentDashboardManagedDescription({
  activeLearnerName,
  translations,
  viewerName,
  viewerRoleLabel,
}: {
  activeLearnerName: string;
  translations: ParentDashboardHeroTranslations;
  viewerName: string;
  viewerRoleLabel: string | null | undefined;
}): React.JSX.Element {
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

function KangurParentDashboardCreateLearnerAction({
  compactWideActionClassName,
  onCreateLearner,
  translations,
}: {
  compactWideActionClassName: string;
  onCreateLearner: () => void;
  translations: ParentDashboardHeroTranslations;
}): React.JSX.Element {
  return (
    <KangurButton
      className={compactWideActionClassName}
      onClick={onCreateLearner}
      size='sm'
      variant='surface'
      data-doc-id='parent_open_create_learner'
    >
      {translations('hero.addLearner')}
    </KangurButton>
  );
}

function KangurParentDashboardManagedCard({
  activeLearnerLabel,
  activeLearnerName,
  activityDescription,
  activityHref,
  activityLabel,
  basePath,
  compactActionClassName,
  compactWideActionClassName,
  hasActiveLearner,
  heroContent,
  isLearnerOnline,
  learnerManagementAnchorRef,
  locale,
  onBack,
  onCreateLearner,
  onLogout,
  parentWordmarkLabel,
  shouldShowActivityLink,
  showActions,
  showLearnerManagement,
  translations,
  viewerName,
  viewerRoleLabel,
}: {
  activeLearnerLabel: string;
  activeLearnerName: string;
  activityDescription: string;
  activityHref: string | null;
  activityLabel: string;
  basePath: string;
  compactActionClassName: string | undefined;
  compactWideActionClassName: string;
  hasActiveLearner: boolean;
  heroContent: ParentDashboardHeroContent;
  isLearnerOnline: boolean;
  learnerManagementAnchorRef?: RefObject<HTMLDivElement | null>;
  locale: string;
  onBack: () => void;
  onCreateLearner: () => void;
  onLogout: () => void;
  parentWordmarkLabel: string;
  shouldShowActivityLink: boolean;
  showActions: boolean;
  showLearnerManagement: boolean;
  translations: ParentDashboardHeroTranslations;
  viewerName: string;
  viewerRoleLabel: string | null | undefined;
}): React.JSX.Element {
  return (
    <KangurPageIntroCard
      accent='indigo'
      className='mx-auto w-full max-w-2xl'
      description={
        <KangurParentDashboardManagedDescription
          activeLearnerName={activeLearnerName}
          translations={translations}
          viewerName={viewerName}
          viewerRoleLabel={viewerRoleLabel}
        />
      }
      headingAs='h1'
      headingAction={
        showLearnerManagement ? (
          <KangurParentDashboardCreateLearnerAction
            compactWideActionClassName={compactWideActionClassName}
            onCreateLearner={onCreateLearner}
            translations={translations}
          />
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
      <KangurParentDashboardAuthenticatedBody
        activeLearnerLabel={activeLearnerLabel}
        activityDescription={activityDescription}
        activityHref={activityHref}
        activityLabel={activityLabel}
        basePath={basePath}
        compactActionClassName={compactActionClassName}
        compactWideActionClassName={compactWideActionClassName}
        hasActiveLearner={hasActiveLearner}
        isLearnerOnline={isLearnerOnline}
        learnerManagementAnchorRef={learnerManagementAnchorRef}
        onLogout={onLogout}
        shouldShowActivityLink={shouldShowActivityLink}
        showActions={showActions}
        showLearnerManagement={showLearnerManagement}
        translations={translations}
      />
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
  const isCoarsePointer = useKangurCoarsePointer();
  const {
    activeLearner,
    basePath,
    canManageLearners,
    isAuthenticated,
    progress,
    viewerName,
    viewerRoleLabel,
    lessons = [],
  } = useKangurParentDashboardRuntimeHeroState();
  const { logout, setCreateLearnerModalOpen } = useKangurParentDashboardRuntimeShellActions();
  const { openLoginModal } = useKangurLoginModal();
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
  const { compactActionClassName, compactWideActionClassName } =
    resolveHeroActionClassNames(isCoarsePointer);
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
  const handleOpenLogin = (): void => {
    openLoginModal();
  };
  const handleOpenCreateAccount = (): void => {
    openLoginModal(null, { authMode: 'create-account' });
  };
  const handleLogout = (): void => {
    logout(false);
  };
  const activeLearnerName = activeLearner?.displayName ?? translations('hero.noLearnerTitle');

  if (!isAuthenticated) {
    return (
      <KangurParentDashboardGuestCard
        compactWideActionClassName={compactWideActionClassName}
        heroContent={heroContent}
        locale={locale}
        onBack={handleGoHome}
        onOpenCreateAccount={handleOpenCreateAccount}
        onOpenLogin={handleOpenLogin}
        parentWordmarkLabel={parentWordmarkLabel}
        translations={translations}
      />
    );
  }

  if (!canManageLearners) {
    return (
      <KangurParentDashboardRestrictedCard
        compactWideActionClassName={compactWideActionClassName}
        heroContent={heroContent}
        locale={locale}
        onBack={handleGoToProfile}
        onGoToProfile={handleGoToProfile}
        parentWordmarkLabel={parentWordmarkLabel}
        translations={translations}
      />
    );
  }

  return (
    <KangurParentDashboardManagedCard
      activeLearnerLabel={activeLearnerLabel}
      activeLearnerName={activeLearnerName}
      activityDescription={learnerLiveState.description}
      activityHref={learnerLiveState.href}
      activityLabel={learnerLiveState.label}
      basePath={basePath}
      compactActionClassName={compactActionClassName}
      compactWideActionClassName={compactWideActionClassName}
      hasActiveLearner={hasActiveLearner}
      heroContent={heroContent}
      isLearnerOnline={learnerLiveState.isOnline}
      learnerManagementAnchorRef={learnerManagementAnchorRef}
      locale={locale}
      onBack={handleGoToProfile}
      onCreateLearner={handleCreateLearner}
      onLogout={handleLogout}
      parentWordmarkLabel={parentWordmarkLabel}
      shouldShowActivityLink={learnerLiveState.showLink}
      showActions={showActions}
      showLearnerManagement={showLearnerManagement}
      translations={translations}
      viewerName={viewerName}
      viewerRoleLabel={viewerRoleLabel}
    />
  );
});
