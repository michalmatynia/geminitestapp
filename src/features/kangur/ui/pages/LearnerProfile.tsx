'use client';

import { BookOpen, Home, LayoutGrid } from 'lucide-react';
import Link from 'next/link';

import {
  getKangurPageHref as createPageUrl,
} from '@/features/kangur/config/routing';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import { KangurLearnerProfileAssignmentsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileAssignmentsWidget';
import { KangurLearnerProfileHeroWidget } from '@/features/kangur/ui/components/KangurLearnerProfileHeroWidget';
import { KangurLearnerProfileLevelProgressWidget } from '@/features/kangur/ui/components/KangurLearnerProfileLevelProgressWidget';
import { KangurLearnerProfileMasteryWidget } from '@/features/kangur/ui/components/KangurLearnerProfileMasteryWidget';
import { KangurLearnerProfileOverviewWidget } from '@/features/kangur/ui/components/KangurLearnerProfileOverviewWidget';
import { KangurLearnerProfilePerformanceWidget } from '@/features/kangur/ui/components/KangurLearnerProfilePerformanceWidget';
import { KangurLearnerProfileRecommendationsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileRecommendationsWidget';
import { KangurLearnerProfileSessionsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileSessionsWidget';
import {
  KangurButton,
  KangurPageContainer,
  KangurPageShell,
  KangurPageTopBar,
  KangurTopNavGroup,
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
        <KangurPageTopBar
          contentClassName='justify-center'
          left={
            <KangurTopNavGroup>
              <KangurButton asChild size='md' variant='navigation' data-doc-id='top_nav_home'>
                <Link href={createPageUrl('Game', basePath)}>
                  <Home className='h-[22px] w-[22px]' strokeWidth={2.1} />
                  <span>Strona glowna</span>
                </Link>
              </KangurButton>
              <KangurButton asChild size='md' variant='navigation' data-doc-id='top_nav_lessons'>
                <Link href={createPageUrl('Lessons', basePath)}>
                  <BookOpen className='h-[22px] w-[22px]' strokeWidth={2.1} />
                  <span>Lekcje</span>
                </Link>
              </KangurButton>
              <KangurProfileMenu
                basePath={basePath}
                isAuthenticated={Boolean(user)}
                onLogout={() => logout(false)}
                onLogin={navigateToLogin}
                isActive
              />
              {user?.canManageLearners ? (
                <KangurButton
                  asChild
                  size='md'
                  variant='navigation'
                  data-doc-id='top_nav_parent_dashboard'
                >
                  <Link href={createPageUrl('ParentDashboard', basePath)}>
                    <LayoutGrid className='h-[22px] w-[22px]' strokeWidth={2.1} />
                    <span>Rodzic</span>
                  </Link>
                </KangurButton>
              ) : null}
            </KangurTopNavGroup>
          }
        />

        <KangurPageContainer id='kangur-learner-profile-main' className='flex flex-col gap-6'>
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
