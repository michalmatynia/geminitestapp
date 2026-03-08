'use client';

import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurPrimaryNavigation } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import { KangurLearnerProfileAssignmentsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileAssignmentsWidget';
import { KangurLearnerProfileHeroWidget } from '@/features/kangur/ui/components/KangurLearnerProfileHeroWidget';
import { KangurLearnerProfileLevelProgressWidget } from '@/features/kangur/ui/components/KangurLearnerProfileLevelProgressWidget';
import { KangurLearnerProfileMasteryWidget } from '@/features/kangur/ui/components/KangurLearnerProfileMasteryWidget';
import { KangurLearnerProfileOverviewWidget } from '@/features/kangur/ui/components/KangurLearnerProfileOverviewWidget';
import { KangurLearnerProfilePerformanceWidget } from '@/features/kangur/ui/components/KangurLearnerProfilePerformanceWidget';
import { KangurLearnerProfileRecommendationsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileRecommendationsWidget';
import { KangurLearnerProfileSessionsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileSessionsWidget';
import {
  KangurPageContainer,
  KangurPageShell,
} from '@/features/kangur/ui/design/primitives';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { KangurLearnerProfileRuntimeBoundary } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';

export default function LearnerProfile(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const { user, navigateToLogin, logout } = useKangurAuth();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('profile');

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
        <KangurPrimaryNavigation
          basePath={basePath}
          canManageLearners={Boolean(user?.canManageLearners)}
          contentClassName='justify-center'
          currentPage='LearnerProfile'
          isAuthenticated={Boolean(user)}
          onLogin={navigateToLogin}
          onLogout={() => logout(false)}
        />

        <KangurPageContainer id='kangur-learner-profile-main' className='flex flex-col gap-6'>
          <h2 className='sr-only'>Statystyki ucznia</h2>
          <KangurLearnerProfileHeroWidget />
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
