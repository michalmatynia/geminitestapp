'use client';

import { useMemo, useRef } from 'react';

import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurLearnerProfileAiTutorMoodWidget } from '@/features/kangur/ui/components/KangurLearnerProfileAiTutorMoodWidget';
import { KangurLearnerProfileAssignmentsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileAssignmentsWidget';
import { KangurLearnerProfileHeroWidget } from '@/features/kangur/ui/components/KangurLearnerProfileHeroWidget';
import { KangurLearnerProfileLevelProgressWidget } from '@/features/kangur/ui/components/KangurLearnerProfileLevelProgressWidget';
import { KangurLearnerProfileMasteryWidget } from '@/features/kangur/ui/components/KangurLearnerProfileMasteryWidget';
import { KangurLearnerProfileOverviewWidget } from '@/features/kangur/ui/components/KangurLearnerProfileOverviewWidget';
import { KangurLearnerProfilePerformanceWidget } from '@/features/kangur/ui/components/KangurLearnerProfilePerformanceWidget';
import { KangurLearnerProfileRecommendationsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileRecommendationsWidget';
import { KangurLearnerProfileSessionsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileSessionsWidget';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import {
  KangurLearnerProfileRuntimeBoundary,
  getKangurLearnerProfileDisplayName,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurPageContainer,
  KangurPageShell,
} from '@/features/kangur/ui/design/primitives';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { useKangurTutorAnchor } from '@/features/kangur/ui/hooks/useKangurTutorAnchor';

function LearnerProfileContent(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const { user, navigateToLogin, logout } = useKangurAuth();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { isLoadingScores, user: profileUser } = useKangurLearnerProfileRuntime();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('profile');
  const heroAnchorRef = useRef<HTMLDivElement | null>(null);
  const moodAnchorRef = useRef<HTMLDivElement | null>(null);
  const levelProgressAnchorRef = useRef<HTMLDivElement | null>(null);
  const overviewAnchorRef = useRef<HTMLDivElement | null>(null);
  const recommendationsAnchorRef = useRef<HTMLDivElement | null>(null);
  const assignmentsAnchorRef = useRef<HTMLDivElement | null>(null);
  const masteryAnchorRef = useRef<HTMLDivElement | null>(null);
  const performanceAnchorRef = useRef<HTMLDivElement | null>(null);
  const sessionsAnchorRef = useRef<HTMLDivElement | null>(null);
  const activeLearnerId = profileUser?.activeLearner?.id?.trim() || null;
  const profileContentId = activeLearnerId ? `profile:${activeLearnerId}` : 'profile:guest';
  const profileTitle = getKangurLearnerProfileDisplayName(profileUser);

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
    id: 'kangur-profile-ai-tutor-mood',
    kind: 'screen',
    ref: moodAnchorRef,
    surface: 'profile',
    enabled: true,
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
    enabled: true,
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
    enabled: true,
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
    enabled: true,
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
    enabled: true,
    priority: 76,
    metadata: {
      contentId: profileContentId,
      label: 'Zadania ucznia',
    },
  });
  useKangurTutorAnchor({
    id: 'kangur-profile-mastery',
    kind: 'screen',
    ref: masteryAnchorRef,
    surface: 'profile',
    enabled: true,
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
    enabled: true,
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
    enabled: true,
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
      onCreateAccount: () => navigateToLogin({ authMode: 'create-account' }),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: navigateToLogin,
      onLogout: () => logout(false),
    }),
    [basePath, guestPlayerName, logout, navigateToLogin, setGuestPlayerName, user]
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

      <KangurPageContainer id='kangur-learner-profile-main' className='flex flex-col gap-6'>
        <h2 className='sr-only'>Statystyki ucznia</h2>
        <div ref={heroAnchorRef}>
          <KangurLearnerProfileHeroWidget />
        </div>
        <div ref={moodAnchorRef}>
          <KangurLearnerProfileAiTutorMoodWidget />
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
