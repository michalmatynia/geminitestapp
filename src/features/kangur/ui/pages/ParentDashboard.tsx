'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, Home, LayoutGrid, LogOut } from 'lucide-react';
import Link from 'next/link';

import { getKangurPageHref as createPageUrl } from '@/features/kangur/config/routing';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurParentDashboardAssignmentsWidget } from '@/features/kangur/ui/components/KangurParentDashboardAssignmentsWidget';
import { KangurParentDashboardHeroWidget } from '@/features/kangur/ui/components/KangurParentDashboardHeroWidget';
import { KangurParentDashboardLearnerManagementWidget } from '@/features/kangur/ui/components/KangurParentDashboardLearnerManagementWidget';
import { KangurParentDashboardProgressWidget } from '@/features/kangur/ui/components/KangurParentDashboardProgressWidget';
import { KangurParentDashboardScoresWidget } from '@/features/kangur/ui/components/KangurParentDashboardScoresWidget';
import { KangurParentDashboardTabsWidget } from '@/features/kangur/ui/components/KangurParentDashboardTabsWidget';
import { KangurProfileMenu } from '@/features/kangur/ui/components/KangurProfileMenu';
import {
  KangurButton,
  KangurPageContainer,
  KangurPageShell,
  KangurPageTopBar,
  KangurStatusChip,
  KangurTopNavGroup,
} from '@/features/kangur/ui/design/primitives';
import {
  KangurParentDashboardRuntimeBoundary,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';

function ParentDashboardContent(): React.JSX.Element {
  const { activeTab, basePath, canAccessDashboard, isAuthenticated, logout, navigateToLogin, viewerRoleLabel } =
    useKangurParentDashboardRuntime();
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
      <KangurPageTopBar
        left={
          <KangurTopNavGroup>
            <KangurButton asChild size='md' variant='navigation' data-doc-id='top_nav_home'>
              <Link href={createPageUrl('Game', basePath)}>
                <Home className='h-[22px] w-[22px]' strokeWidth={2.1} />
                <span>Strona glowna</span>
              </Link>
            </KangurButton>
            <KangurProfileMenu
              basePath={basePath}
              isAuthenticated={isAuthenticated}
              onLogout={() => logout(false)}
              onLogin={navigateToLogin}
              isActive={false}
            />
            <KangurButton asChild size='md' variant='navigation' data-doc-id='top_nav_lessons'>
              <Link href={createPageUrl('Lessons', basePath)}>
                <BookOpen className='h-[22px] w-[22px]' strokeWidth={2.1} />
                <span>Lekcje</span>
              </Link>
            </KangurButton>
            <KangurButton
              asChild
              size='md'
              variant='navigationActive'
              aria-current='page'
              data-doc-id='top_nav_parent_dashboard'
            >
              <Link href={createPageUrl('ParentDashboard', basePath)}>
                <LayoutGrid className='h-[22px] w-[22px]' strokeWidth={2.1} />
                <span>Rodzic</span>
              </Link>
            </KangurButton>
          </KangurTopNavGroup>
        }
        right={
          <>
            <KangurStatusChip
              accent='slate'
              className='hidden uppercase tracking-[0.18em] sm:inline-flex'
              data-testid='parent-dashboard-role-chip'
              size='sm'
            >
              Rola: {viewerRoleLabel}
            </KangurStatusChip>
            <KangurButton
              onClick={() => logout(false)}
              size='sm'
              variant='ghost'
              data-doc-id='profile_logout'
            >
              <LogOut className='h-4 w-4' /> Wyloguj
            </KangurButton>
          </>
        }
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
