'use client';

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
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurButton,
  KangurPageShell,
  KangurPageContainer,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_SEGMENTED_CONTROL_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';

type LearnerProfileTabId = 'overview' | 'ai-mood';

const PROFILE_TABS: Array<
  IdLabelOptionDto<LearnerProfileTabId> & { mobileLabel: string; docId: string }
> = [
  {
    id: 'overview',
    label: 'Profil ucznia',
    mobileLabel: 'Profil',
    docId: 'learner_profile_tab_overview',
  },
  {
    id: 'ai-mood',
    label: 'Relacja z AI Tutorem',
    mobileLabel: 'AI Tutor',
    docId: 'learner_profile_tab_ai_mood',
  },
];

const PROFILE_MAIN_ID = 'kangur-learner-profile-main';

function LearnerProfileContent(): React.JSX.Element {
  const { user, isLoadingScores, scoresError } = useKangurLearnerProfileRuntime();
  const auth = useKangurAuth();
  const isAuthenticated = auth.isAuthenticated ?? Boolean(auth.user);
  const { push: navigateTo } = useKangurRouteNavigator();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('profile');

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

  useKangurRoutePageReady({ pageKey: 'LearnerProfile', ready: !isLoadingScores });

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
        <p className='text-orange-200/60'>Nie udało się załadować profilu.</p>
        <KangurButton variant='surface' onClick={() => navigateTo('/kangur')}>
          Wróć do strony głównej
        </KangurButton>
      </div>
    );
  }

  return (
    <div
      ref={tutorAnchorRef}
      id='learner-profile-root'
      className={`w-full ${KANGUR_PANEL_GAP_CLASSNAME} flex flex-col`}
    >
      <KangurLearnerProfileHeroWidget />
      <h2 className='text-[11px] font-bold uppercase tracking-[0.22em] [color:var(--kangur-page-muted-text)]'>
        Statystyki ucznia
      </h2>

      <div className='flex flex-col gap-6 lg:flex-row'>
        <div className='flex flex-1 flex-col gap-6'>
          <div
            className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} self-start`}
            role='tablist'
            aria-label='Profil ucznia'
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
                <span className='hidden sm:inline'>{tab.label}</span>
                <span className='sm:hidden'>{tab.mobileLabel}</span>
              </KangurButton>
            ))}
          </div>

          {activeTab === 'overview' ? (
            <>
              <div className='grid gap-6 sm:grid-cols-2'>
                <KangurLearnerProfileLevelProgressWidget />
                <KangurLearnerProfileQuestSummaryWidget />
              </div>
              <KangurLearnerProfileOverviewWidget />
              <KangurLearnerProfileRecommendationsWidget />
              <KangurLearnerProfileMasteryWidget />
            </>
          ) : (
            <KangurLearnerProfileAiTutorMoodWidget />
          )}
        </div>

        <div className='flex w-full flex-col gap-6 lg:w-[380px] xl:w-[420px]'>
          <KangurLearnerProfileAssignmentsWidget />
          <KangurLearnerProfilePerformanceWidget />
          <KangurLearnerProfileSessionsWidget />
        </div>
      </div>

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
      onCreateAccount: () => openLoginModal(null, { authMode: 'create-account' }),
      onLogin: openLoginModal,
      onLogout: () => logout(false),
    }),
    [basePath, logout, openLoginModal, resolvedIsAuthenticated, user]
  );

  return (
    <KangurLearnerProfileRuntimeBoundary enabled={true}>
      <KangurPageShell tone='profile' skipLinkTargetId={PROFILE_MAIN_ID}>
        <KangurTopNavigationController navigation={navigation} />
        <KangurPageContainer id={PROFILE_MAIN_ID}>
          <LearnerProfileContent />
        </KangurPageContainer>
      </KangurPageShell>
    </KangurLearnerProfileRuntimeBoundary>
  );
}
