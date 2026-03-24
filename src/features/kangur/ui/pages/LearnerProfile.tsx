'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { IdLabelOptionDto } from '@/shared/contracts/base';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurLearnerProfileAiTutorMoodWidget } from '@/features/kangur/ui/components/KangurLearnerProfileAiTutorMoodWidget';
import { KangurLearnerProfileAssignmentsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileAssignmentsWidget';
import { KangurLearnerProfileHeroWidget } from '@/features/kangur/ui/components/KangurLearnerProfileHeroWidget';
import { KangurLearnerProfileLevelProgressWidget } from '@/features/kangur/ui/components/KangurLearnerProfileLevelProgressWidget';
import { KangurLearnerProfileMasteryWidget } from '@/features/kangur/ui/components/KangurLearnerProfileMasteryWidget';
import { KangurLearnerProfileOverviewWidget } from '@/features/kangur/ui/components/KangurLearnerProfileOverviewWidget';
import { KangurLearnerProfilePerformanceWidget } from '@/features/kangur/ui/components/KangurLearnerProfilePerformanceWidget';
import { KangurLearnerProfileQuestSummaryWidget } from '@/features/kangur/ui/components/KangurLearnerProfileQuestSummaryWidget';
import { KangurLearnerProfileRecommendationsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileRecommendationsWidget';
import { KangurLearnerProfileResultsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileResultsWidget';
import { KangurLearnerProfileSessionsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileSessionsWidget';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import type { KangurPrimaryNavigationProps } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import {
  KangurLearnerProfileRuntimeBoundary,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurButton,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';

type LearnerProfileTabId = 'overview' | 'ai-mood';

const PROFILE_TABS: Array<
  IdLabelOptionDto<LearnerProfileTabId> & { labelKey: string; mobileLabelKey: string; docId: string }
> = [
  {
    id: 'overview',
    label: '',
    labelKey: 'tabs.overview',
    mobileLabelKey: 'tabs.overviewMobile',
    docId: 'learner_profile_tab_overview',
  },
  {
    id: 'ai-mood',
    label: '',
    labelKey: 'tabs.aiMood',
    mobileLabelKey: 'tabs.aiMoodMobile',
    docId: 'learner_profile_tab_ai_mood',
  },
];

const PROFILE_MAIN_ID = 'kangur-learner-profile-main';
const PROFILE_PAGE_ID = 'kangur-learner-profile-page';

function LearnerProfileContent(): React.JSX.Element {
  const { user, isLoadingScores } = useKangurLearnerProfileRuntime();
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const auth = useKangurAuth();
  const isAuthenticated = auth.isAuthenticated ?? Boolean(auth.user);
  const { push: navigateTo } = useKangurRouteNavigator();
  const { basePath } = useKangurRouting();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('profile');
  const translations = useTranslations('KangurLearnerProfilePage');

  const [activeTab, setActiveTab] = useState<LearnerProfileTabId>('overview');
  const tutorAnchorRef = useRef<HTMLDivElement>(null);

  useKangurTutorAnchor({
    id: 'learner-profile-root',
    kind: 'screen',
    ref: tutorAnchorRef,
    surface: 'profile',
    enabled: true,
  });

  useKangurAiTutorSessionSync({
    learnerId: user?.activeLearner?.id ?? null,
    sessionContext: { surface: 'profile' },
  });

  useKangurRoutePageReady({
    pageKey: 'LearnerProfile',
    ready: routeTransitionState?.activeTransitionKind === 'locale-switch' || !isLoadingScores,
  });

  const handleTabChange = useCallback((tabId: LearnerProfileTabId) => {
    setActiveTab(tabId);
  }, []);

  if (isLoadingScores) {
    return (
      <div className='flex h-[60vh] items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-4 border-orange-400 border-t-transparent' />
      </div>
    );
  }

  if (isAuthenticated && !user) {
    return (
      <div className='flex h-[60vh] flex-col items-center justify-center gap-4 text-center'>
        <p className='text-orange-200/60'>{translations('loadError')}</p>
        <KangurButton variant='surface' onClick={() => navigateTo(basePath)}>
          {translations('backToHome')}
        </KangurButton>
      </div>
    );
  }

  return (
    <div
      ref={tutorAnchorRef}
      id='learner-profile-root'
      className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
    >
      <section className='w-full'>
        <KangurLearnerProfileHeroWidget />
      </section>

      <section
        className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
        aria-labelledby='kangur-learner-profile-stats-heading'
      >
        <h2
          id='kangur-learner-profile-stats-heading'
          className='text-[11px] font-bold uppercase tracking-[0.22em] [color:var(--kangur-page-muted-text)]'
        >
          {translations('statsHeading')}
        </h2>

        <div className='w-full'>
          <div
            className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full`}
            role='tablist'
            aria-label={translations('tabListLabel')}
          >
            {PROFILE_TABS.map((tab) => (
              <KangurButton
                key={tab.id}
                size='sm'
                variant={activeTab === tab.id ? 'segmentActive' : 'segment'}
                onClick={() => handleTabChange(tab.id)}
                data-doc-id={tab.docId}
                role='tab'
                aria-selected={activeTab === tab.id}
                tabIndex={activeTab === tab.id ? 0 : -1}
              >
                <span className='hidden sm:inline'>{translations(tab.labelKey)}</span>
                <span className='sm:hidden'>{translations(tab.mobileLabelKey)}</span>
              </KangurButton>
            ))}
          </div>
        </div>

        <div
          className={`grid w-full items-start ${KANGUR_PANEL_GAP_CLASSNAME} xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,28rem)]`}
        >
          <div className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
            {activeTab === 'overview' ? (
              <>
                <div className='grid gap-6 sm:grid-cols-2'>
                  <KangurLearnerProfileLevelProgressWidget />
                  <KangurLearnerProfileQuestSummaryWidget />
                </div>
                <KangurLearnerProfileOverviewWidget />
                <KangurLearnerProfileResultsWidget />
                <KangurLearnerProfileRecommendationsWidget />
                <KangurLearnerProfileMasteryWidget />
              </>
            ) : (
              <KangurLearnerProfileAiTutorMoodWidget />
            )}
          </div>

          <div className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
            <KangurLearnerProfileAssignmentsWidget />
            <KangurLearnerProfilePerformanceWidget />
            <KangurLearnerProfileSessionsWidget />
          </div>
        </div>
      </section>

      <KangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId='learner-profile-root' />
    </div>
  );
}

export default function LearnerProfilePage(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const { user, isAuthenticated, logout } = useKangurAuth();
  const { openLoginModal } = useKangurLoginModal();
  const resolvedIsAuthenticated = isAuthenticated ?? Boolean(user);

  const navigation = useMemo<KangurPrimaryNavigationProps>(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      currentPage: 'LearnerProfile' as const,
      isAuthenticated: resolvedIsAuthenticated,
      onLogin: openLoginModal,
      onLogout: () => logout(false),
    }),
    [basePath, logout, openLoginModal, resolvedIsAuthenticated, user]
  );

  return (
    <KangurLearnerProfileRuntimeBoundary enabled={true}>
      <KangurStandardPageLayout
        tone='profile'
        id={PROFILE_PAGE_ID}
        skipLinkTargetId={PROFILE_MAIN_ID}
        docsRootId={PROFILE_PAGE_ID}
        docsTooltipsEnabled={false}
        navigation={<KangurTopNavigationController navigation={navigation} />}
        containerProps={{
          as: 'section',
          id: PROFILE_MAIN_ID,
          className: `flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`,
        }}
      >
          <LearnerProfileContent />
      </KangurStandardPageLayout>
    </KangurLearnerProfileRuntimeBoundary>
  );
}
