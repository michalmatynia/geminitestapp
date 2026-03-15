'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

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
import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import {
  KangurLearnerProfileRuntimeBoundary,
  getKangurLearnerProfileDisplayName,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurButton,
  KangurPageContainer,
  KangurPageShell,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_SEGMENTED_CONTROL_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';
import { cn } from '@/shared/utils';

type LearnerProfileTabId = 'overview' | 'ai-mood';

const PROFILE_TABS: Array<{
  id: LearnerProfileTabId;
  label: string;
  mobileLabel: string;
  docId: string;
}> = [
  {
    id: 'overview',
    label: 'Profil ucznia',
    mobileLabel: 'Profil',
    docId: 'learner_profile_tab_overview',
  },
  {
    id: 'ai-mood',
    label: 'Nastrój Tutor-AI',
    mobileLabel: 'Nastrój',
    docId: 'learner_profile_tab_mood',
  },
];

const getLearnerProfileTabIds = (
  tabId: LearnerProfileTabId
): { tabId: string; panelId: string } => ({
  tabId: `learner-profile-tab-${tabId}`,
  panelId: `learner-profile-panel-${tabId}`,
});

function LearnerProfileContent(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const { user, logout } = useKangurAuth();
  const { openLoginModal } = useKangurLoginModal();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { isLoadingScores, progress, user: profileUser } = useKangurLearnerProfileRuntime();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('profile');
  const heroAnchorRef = useRef<HTMLDivElement | null>(null);
  const questSummaryAnchorRef = useRef<HTMLDivElement | null>(null);
  const moodAnchorRef = useRef<HTMLDivElement | null>(null);
  const levelProgressAnchorRef = useRef<HTMLDivElement | null>(null);
  const overviewAnchorRef = useRef<HTMLDivElement | null>(null);
  const recommendationsAnchorRef = useRef<HTMLDivElement | null>(null);
  const assignmentsAnchorRef = useRef<HTMLDivElement | null>(null);
  const masteryAnchorRef = useRef<HTMLDivElement | null>(null);
  const performanceAnchorRef = useRef<HTMLDivElement | null>(null);
  const sessionsAnchorRef = useRef<HTMLDivElement | null>(null);
  const [activeTab, setActiveTab] = useState<LearnerProfileTabId>('overview');
  const activeLearnerId = profileUser?.activeLearner?.id?.trim() || null;
  const profileContentId = activeLearnerId ? `profile:${activeLearnerId}` : 'profile:guest';
  const profileTitle = getKangurLearnerProfileDisplayName(profileUser);
  const isOverviewTab = activeTab === 'overview';
  const isMoodTab = activeTab === 'ai-mood';
  const hasMeaningfulProgress =
    progress.totalXp > 0 ||
    progress.gamesPlayed > 0 ||
    progress.lessonsCompleted > 0 ||
    (progress.dailyQuestsCompleted ?? 0) > 0;
  const shouldRenderHero = !profileUser || hasMeaningfulProgress;
  const containerStyle = shouldRenderHero ? undefined : { paddingTop: 0 };

  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const focusTabAt = useCallback((index: number): void => {
    tabRefs.current[index]?.focus();
  }, []);
  const handleTabChange = useCallback((tabId: LearnerProfileTabId): void => {
    setActiveTab(tabId);
  }, []);
  const handleTabKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLButtonElement>): void => {
      if (PROFILE_TABS.length === 0) {
        return;
      }

      let nextIndex = index;
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (index + 1) % PROFILE_TABS.length;
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (index - 1 + PROFILE_TABS.length) % PROFILE_TABS.length;
          break;
        case 'Home':
          nextIndex = 0;
          break;
        case 'End':
          nextIndex = PROFILE_TABS.length - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      const nextTab = PROFILE_TABS[nextIndex];
      if (!nextTab) {
        return;
      }
      handleTabChange(nextTab.id);
      requestAnimationFrame(() => focusTabAt(nextIndex));
    },
    [focusTabAt, handleTabChange]
  );
  const handlePointerTabMouseDown = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      event.preventDefault();
    },
    []
  );

  useKangurRoutePageReady({
    pageKey: 'LearnerProfile',
    ready: !isLoadingScores,
  });
  useKangurAiTutorSessionSync({
    learnerId: activeLearnerId,
    sessionContext: {
      surface: 'profile',
      contentId: profileContentId,
      title: profileTitle,
      description: 'Profil ucznia z postępem, rekomendacjami i historią sesji.',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-profile-hero',
    kind: 'hero',
    ref: heroAnchorRef,
    surface: 'profile',
    enabled: true,
    priority: 90,
    metadata: {
      contentId: profileContentId,
      label: 'Hero profilu ucznia',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-profile-quest-summary',
    kind: 'summary',
    ref: questSummaryAnchorRef,
    surface: 'profile',
    enabled: isOverviewTab,
    priority: 86,
    metadata: {
      contentId: profileContentId,
      label: 'Misja dnia i ścieżki postępu',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-profile-ai-tutor-mood',
    kind: 'screen',
    ref: moodAnchorRef,
    surface: 'profile',
    enabled: isMoodTab,
    priority: 84,
    metadata: {
      contentId: profileContentId,
      label: 'Nastrój i wskazówki Tutor-AI',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-profile-level-progress',
    kind: 'progress',
    ref: levelProgressAnchorRef,
    surface: 'profile',
    enabled: isOverviewTab,
    priority: 82,
    metadata: {
      contentId: profileContentId,
      label: 'Postęp poziomu ucznia',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-profile-overview',
    kind: 'summary',
    ref: overviewAnchorRef,
    surface: 'profile',
    enabled: isOverviewTab,
    priority: 80,
    metadata: {
      contentId: profileContentId,
      label: 'Przegląd wyników ucznia',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-profile-recommendations',
    kind: 'screen',
    ref: recommendationsAnchorRef,
    surface: 'profile',
    enabled: isOverviewTab,
    priority: 78,
    metadata: {
      contentId: profileContentId,
      label: 'Rekomendacje dla ucznia',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-profile-assignments',
    kind: 'assignment',
    ref: assignmentsAnchorRef,
    surface: 'profile',
    enabled: isOverviewTab,
    priority: 76,
    metadata: {
      contentId: profileContentId,
      label: 'Sugestie od rodzica',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-profile-mastery',
    kind: 'screen',
    ref: masteryAnchorRef,
    surface: 'profile',
    enabled: isOverviewTab,
    priority: 74,
    metadata: {
      contentId: profileContentId,
      label: 'Opanowanie materiału',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-profile-performance',
    kind: 'summary',
    ref: performanceAnchorRef,
    surface: 'profile',
    enabled: isOverviewTab,
    priority: 72,
    metadata: {
      contentId: profileContentId,
      label: 'Skuteczność ucznia',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-profile-sessions',
    kind: 'screen',
    ref: sessionsAnchorRef,
    surface: 'profile',
    enabled: isOverviewTab,
    priority: 70,
    metadata: {
      contentId: profileContentId,
      label: 'Historia sesji ucznia',
    },
  });

  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      currentPage: 'LearnerProfile' as const,
      guestPlayerName: user ? undefined : guestPlayerName,
      isAuthenticated: Boolean(user),
      onCreateAccount: () => openLoginModal(null, { authMode: 'create-account' }),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: openLoginModal,
      onLogout: () => logout(false),
    }),
    [basePath, guestPlayerName, logout, openLoginModal, setGuestPlayerName, user]
  );

  return (
    <KangurPageShell
      tone='profile'
      id='kangur-learner-profile-page'
      skipLinkTargetId='kangur-learner-profile-main'
    >
      <KangurDocsTooltipEnhancer
        enabled={docsTooltipsEnabled}
        rootId='kangur-learner-profile-page'
      />
      <KangurTopNavigationController navigation={navigation} />

      <KangurPageContainer
        as='section'
        data-kangur-route-main='true'
        id='kangur-learner-profile-main'
        className='flex flex-col gap-6'
        style={containerStyle}
      >
        <h2 className='sr-only'>Statystyki ucznia</h2>
        {shouldRenderHero ? (
          <div ref={heroAnchorRef}>
            <KangurLearnerProfileHeroWidget />
          </div>
        ) : null}
        <div
          className={cn(
            KANGUR_SEGMENTED_CONTROL_CLASSNAME,
            'grid grid-cols-2 sm:w-auto sm:grid-cols-none sm:flex'
          )}
          role='tablist'
          aria-orientation='horizontal'
        >
          {PROFILE_TABS.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const { tabId, panelId } = getLearnerProfileTabIds(tab.id);
            return (
              <KangurButton
                key={tab.id}
                id={tabId}
                onMouseDown={handlePointerTabMouseDown}
                onKeyDown={(event) => handleTabKeyDown(index, event)}
                onClick={() => {
                  if (isActive) {
                    return;
                  }
                  handleTabChange(tab.id);
                }}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                role='tab'
                aria-selected={isActive}
                aria-controls={panelId}
                tabIndex={isActive ? 0 : -1}
                className='min-w-0 flex-1 justify-center px-2 text-center sm:px-4'
                size='sm'
                type='button'
                variant={isActive ? 'segmentActive' : 'segment'}
                data-doc-id={tab.docId}
              >
                <span className='text-[11px] font-semibold leading-tight sm:text-sm'>
                  <span className='sm:hidden'>{tab.mobileLabel}</span>
                  <span className='hidden sm:inline'>{tab.label}</span>
                </span>
              </KangurButton>
            );
          })}
        </div>
        {isOverviewTab ? (
          <div
            id={getLearnerProfileTabIds('overview').panelId}
            role='tabpanel'
            aria-labelledby={getLearnerProfileTabIds('overview').tabId}
            className='flex flex-col gap-6'
          >
            <div ref={questSummaryAnchorRef}>
              <KangurLearnerProfileQuestSummaryWidget />
            </div>
            <div ref={levelProgressAnchorRef}>
              <KangurLearnerProfileLevelProgressWidget />
            </div>
            <div ref={overviewAnchorRef}>
              <KangurLearnerProfileOverviewWidget />
            </div>
            <div ref={recommendationsAnchorRef}>
              <KangurLearnerProfileRecommendationsWidget />
            </div>
            <div ref={assignmentsAnchorRef}>
              <KangurLearnerProfileAssignmentsWidget />
            </div>
            <div ref={masteryAnchorRef}>
              <KangurLearnerProfileMasteryWidget />
            </div>
            <div ref={performanceAnchorRef}>
              <KangurLearnerProfilePerformanceWidget />
            </div>
            <div ref={sessionsAnchorRef}>
              <KangurLearnerProfileSessionsWidget />
            </div>
          </div>
        ) : null}
        {isMoodTab ? (
          <div
            id={getLearnerProfileTabIds('ai-mood').panelId}
            role='tabpanel'
            aria-labelledby={getLearnerProfileTabIds('ai-mood').tabId}
            className='flex flex-col gap-6'
          >
            <div ref={moodAnchorRef}>
              <KangurLearnerProfileAiTutorMoodWidget />
            </div>
          </div>
        ) : null}
      </KangurPageContainer>
    </KangurPageShell>
  );
}

export default function LearnerProfile(): React.JSX.Element {
  return (
    <KangurLearnerProfileRuntimeBoundary enabled>
      <LearnerProfileContent />
    </KangurLearnerProfileRuntimeBoundary>
  );
}
