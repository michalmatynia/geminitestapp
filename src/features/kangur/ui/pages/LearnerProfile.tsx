'use client';

import { useMemo } from 'react';

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
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import {
  KangurLearnerProfileRuntimeBoundary,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurPageContainer,
  KangurPageShell,
} from '@/features/kangur/ui/design/primitives';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';

function LearnerProfileContent(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const { user, navigateToLogin, logout } = useKangurAuth();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { isLoadingScores } = useKangurLearnerProfileRuntime();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('profile');
  useKangurRoutePageReady({
    pageKey: 'LearnerProfile',
    ready: !isLoadingScores,
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
        <KangurLearnerProfileHeroWidget />
        <KangurLearnerProfileAiTutorMoodWidget />
        <KangurLearnerProfileLevelProgressWidget />
        <KangurLearnerProfileOverviewWidget />
        <KangurLearnerProfileRecommendationsWidget />
        <KangurLearnerProfileAssignmentsWidget />
        <KangurLearnerProfileMasteryWidget />
        <KangurLearnerProfilePerformanceWidget />
        <KangurLearnerProfileSessionsWidget />
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
