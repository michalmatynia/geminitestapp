'use client';

import { useMemo } from 'react';

import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurLearnerProfileAssignmentsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileAssignmentsWidget';
import { KangurLearnerProfileAiTutorMoodWidget } from '@/features/kangur/ui/components/KangurLearnerProfileAiTutorMoodWidget';
import { KangurLearnerProfileHeroWidget } from '@/features/kangur/ui/components/KangurLearnerProfileHeroWidget';
import { KangurLearnerProfileLevelProgressWidget } from '@/features/kangur/ui/components/KangurLearnerProfileLevelProgressWidget';
import { KangurLearnerProfileMasteryWidget } from '@/features/kangur/ui/components/KangurLearnerProfileMasteryWidget';
import { KangurLearnerProfileOverviewWidget } from '@/features/kangur/ui/components/KangurLearnerProfileOverviewWidget';
import { KangurLearnerProfilePerformanceWidget } from '@/features/kangur/ui/components/KangurLearnerProfilePerformanceWidget';
import { KangurLearnerProfileRecommendationsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileRecommendationsWidget';
import { KangurLearnerProfileSessionsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileSessionsWidget';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import {
  KangurPageContainer,
  KangurPageShell,
} from '@/features/kangur/ui/design/primitives';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { KangurLearnerProfileRuntimeBoundary } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';

export default function LearnerProfile(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const { user, navigateToLogin, logout } = useKangurAuth();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('profile');
  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      contentClassName: 'justify-center',
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
    <KangurLearnerProfileRuntimeBoundary enabled>
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
    </KangurLearnerProfileRuntimeBoundary>
  );
}
