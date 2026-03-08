'use client';

import { AnimatePresence, motion } from 'framer-motion';

import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurParentDashboardAssignmentsWidget } from '@/features/kangur/ui/components/KangurParentDashboardAssignmentsWidget';
import { KangurParentDashboardAiTutorWidget } from '@/features/kangur/ui/components/KangurParentDashboardAiTutorWidget';
import { KangurParentDashboardHeroWidget } from '@/features/kangur/ui/components/KangurParentDashboardHeroWidget';
import { KangurParentDashboardLearnerManagementWidget } from '@/features/kangur/ui/components/KangurParentDashboardLearnerManagementWidget';
import { KangurParentDashboardProgressWidget } from '@/features/kangur/ui/components/KangurParentDashboardProgressWidget';
import { KangurParentDashboardScoresWidget } from '@/features/kangur/ui/components/KangurParentDashboardScoresWidget';
import { KangurParentDashboardTabsWidget } from '@/features/kangur/ui/components/KangurParentDashboardTabsWidget';
import { KangurPrimaryNavigation } from '@/features/kangur/ui/components/KangurPrimaryNavigation';
import {
  KangurPageContainer,
  KangurPageShell,
} from '@/features/kangur/ui/design/primitives';
import {
  KangurParentDashboardRuntimeBoundary,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';

function ParentDashboardContent(): React.JSX.Element {
  const {
    activeTab,
    basePath,
    canAccessDashboard,
    isAuthenticated,
    logout,
    navigateToLogin,
  } = useKangurParentDashboardRuntime();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('parentDashboard');

  if (!canAccessDashboard) {
    return (
      <KangurPageShell
        tone='dashboard'
        className='justify-center px-4'
        id='kangur-parent-dashboard-page'
      >
        <KangurDocsTooltipEnhancer
          enabled={docsTooltipsEnabled}
          rootId='kangur-parent-dashboard-page'
        />
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className='w-full max-w-lg'
        >
          <KangurParentDashboardHeroWidget />
        </motion.div>
      </KangurPageShell>
    );
  }

  return (
    <KangurPageShell
      tone='dashboard'
      id='kangur-parent-dashboard-page'
      skipLinkTargetId='kangur-parent-dashboard-main'
    >
      <KangurDocsTooltipEnhancer
        enabled={docsTooltipsEnabled}
        rootId='kangur-parent-dashboard-page'
      />
      <KangurPrimaryNavigation
        basePath={basePath}
        canManageLearners
        currentPage='ParentDashboard'
        isAuthenticated={isAuthenticated}
        onLogin={navigateToLogin}
        onLogout={() => logout(false)}
      />

      <KangurPageContainer
        id='kangur-parent-dashboard-main'
        className='max-w-2xl flex flex-col gap-6'
      >
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <KangurParentDashboardHeroWidget showActions={false} />
        </motion.div>

        <KangurParentDashboardLearnerManagementWidget />
        <KangurParentDashboardTabsWidget />

        <AnimatePresence mode='wait'>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
          >
            <KangurParentDashboardProgressWidget displayMode='active-tab' />
            <KangurParentDashboardScoresWidget displayMode='active-tab' />
            <KangurParentDashboardAssignmentsWidget displayMode='active-tab' />
            <KangurParentDashboardAiTutorWidget displayMode='active-tab' />
          </motion.div>
        </AnimatePresence>
      </KangurPageContainer>
    </KangurPageShell>
  );
}

export default function ParentDashboard(): React.JSX.Element {
  return (
    <KangurParentDashboardRuntimeBoundary enabled>
      <ParentDashboardContent />
    </KangurParentDashboardRuntimeBoundary>
  );
}
