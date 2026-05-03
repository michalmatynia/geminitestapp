'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useMemo, useRef, useState } from 'react';

import type { IdLabelOptionDto } from '@/shared/contracts/base';
import { KangurDocsTooltipEnhancer, useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurLearnerProfileAiTutorMoodWidget } from '@/features/kangur/ui/components/learner-profile/KangurLearnerProfileAiTutorMoodWidget';
import { KangurLearnerProfileAssignmentsWidget } from '@/features/kangur/ui/components/learner-profile/KangurLearnerProfileAssignmentsWidget';
import { KangurLearnerProfileHeroWidget } from '@/features/kangur/ui/components/learner-profile/KangurLearnerProfileHeroWidget';
import { KangurLearnerProfileLevelProgressWidget } from '@/features/kangur/ui/components/learner-profile/KangurLearnerProfileLevelProgressWidget';
import { KangurLearnerProfileMasteryWidget } from '@/features/kangur/ui/components/learner-profile/KangurLearnerProfileMasteryWidget';
import { KangurLearnerProfileOverviewWidget } from '@/features/kangur/ui/components/learner-profile/KangurLearnerProfileOverviewWidget';
import { KangurLearnerProfilePerformanceWidget } from '@/features/kangur/ui/components/learner-profile/KangurLearnerProfilePerformanceWidget';
import { KangurLearnerProfileQuestSummaryWidget } from '@/features/kangur/ui/components/learner-profile/KangurLearnerProfileQuestSummaryWidget';
import { KangurLearnerProfileRecommendationsWidget } from '@/features/kangur/ui/components/learner-profile/KangurLearnerProfileRecommendationsWidget';
import { KangurLearnerProfileResultsWidget } from '@/features/kangur/ui/components/learner-profile/KangurLearnerProfileResultsWidget';
import { KangurLearnerProfileSessionsWidget } from '@/features/kangur/ui/components/learner-profile/KangurLearnerProfileSessionsWidget';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/primary-navigation/KangurTopNavigationController';
import type { KangurPrimaryNavigationProps } from '@/features/kangur/ui/components/primary-navigation/KangurPrimaryNavigation.types';
import { useKangurAiTutorSessionSync } from '@/features/kangur/ui/context/KangurAiTutorContext';
import {
  useKangurAuthActions,
  useKangurAuthSessionState,
} from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurLoginModalActions } from '@/features/kangur/ui/context/KangurLoginModalContext';
import {
  KangurLearnerProfileRuntimeBoundary,
  useKangurLearnerProfileRuntime,
} from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
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
import type { KangurUser } from '@kangur/platform';

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
const getLearnerProfileTabIds = (
  tabId: LearnerProfileTabId
): { tabId: string; panelId: string } => ({
  tabId: `kangur-learner-profile-tab-${tabId}`,
  panelId: `kangur-learner-profile-panel-${tabId}`,
});

const resolveLearnerProfileNextTabIndex = (
  currentIndex: number,
  key: string
): number | null => {
  switch (key) {
    case 'ArrowRight':
    case 'ArrowDown':
      return (currentIndex + 1) % PROFILE_TABS.length;
    case 'ArrowLeft':
    case 'ArrowUp':
      return (currentIndex - 1 + PROFILE_TABS.length) % PROFILE_TABS.length;
    case 'Home':
      return 0;
    case 'End':
      return PROFILE_TABS.length - 1;
    default:
      return null;
  }
};

function useLearnerProfileTabs(): {
  activeTab: LearnerProfileTabId;
  handlePointerTabMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleTabChange: (tabId: LearnerProfileTabId) => void;
  handleTabKeyDown: (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => void;
  tabRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
} {
  const [activeTab, setActiveTab] = useState<LearnerProfileTabId>('overview');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleTabChange = useCallback((tabId: LearnerProfileTabId) => {
    setActiveTab(tabId);
  }, []);
  const focusTabAt = useCallback((index: number): void => {
    tabRefs.current[index]?.focus();
  }, []);
  const handleTabKeyDown = useCallback(
    (index: number, event: React.KeyboardEvent<HTMLButtonElement>): void => {
      const nextIndex = resolveLearnerProfileNextTabIndex(index, event.key);
      if (nextIndex === null) {
        return;
      }

      event.preventDefault();
      const nextTab = PROFILE_TABS[nextIndex];
      if (!nextTab) {
        return;
      }
      handleTabChange(nextTab.id);
      focusTabAt(nextIndex);
    },
    [focusTabAt, handleTabChange]
  );
  const handlePointerTabMouseDown = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>): void => {
      event.preventDefault();
    },
    []
  );

  return {
    activeTab,
    handlePointerTabMouseDown,
    handleTabChange,
    handleTabKeyDown,
    tabRefs,
  };
}

function LearnerProfileLoadErrorState(props: {
  basePath: string;
  navigateTo: (href: string) => void;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const { basePath, navigateTo, translations } = props;

  return (
    <div className='flex h-[60vh] flex-col items-center justify-center gap-4 text-center'>
      <p className='text-orange-200/60'>{translations('loadError')}</p>
      <KangurButton variant='surface' onClick={() => navigateTo(basePath)}>
        {translations('backToHome')}
      </KangurButton>
    </div>
  );
}

function LearnerProfileTabs(props: {
  activeTab: LearnerProfileTabId;
  handlePointerTabMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleTabChange: (tabId: LearnerProfileTabId) => void;
  handleTabKeyDown: (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => void;
  tabRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const {
    activeTab,
    handlePointerTabMouseDown,
    handleTabChange,
    handleTabKeyDown,
    tabRefs,
    translations,
  } = props;

  return (
    <div className='w-full'>
      <div
        className={`${KANGUR_SEGMENTED_CONTROL_CLASSNAME} w-full`}
        role='tablist'
        aria-label={translations('tabListLabel')}
      >
        {PROFILE_TABS.map((tab, index) => {
          const { tabId, panelId } = getLearnerProfileTabIds(tab.id);
          return (
            <KangurButton
              id={tabId}
              key={tab.id}
              size='sm'
              variant={activeTab === tab.id ? 'segmentActive' : 'segment'}
              onMouseDown={handlePointerTabMouseDown}
              onKeyDown={(event) => handleTabKeyDown(index, event)}
              onClick={() => handleTabChange(tab.id)}
              data-doc-id={tab.docId}
              role='tab'
              aria-selected={activeTab === tab.id}
              aria-controls={panelId}
              tabIndex={activeTab === tab.id ? 0 : -1}
              ref={(node) => {
                tabRefs.current[index] = node;
              }}
              type='button'
            >
              <span className='hidden sm:inline'>{translations(tab.labelKey)}</span>
              <span className='sm:hidden'>{translations(tab.mobileLabelKey)}</span>
            </KangurButton>
          );
        })}
      </div>
    </div>
  );
}

function LearnerProfilePanels(props: {
  activeTab: LearnerProfileTabId;
}): React.JSX.Element {
  const { activeTab } = props;

  return (
    <div
      className={`grid w-full items-start ${KANGUR_PANEL_GAP_CLASSNAME} xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,28rem)]`}
    >
      <div className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        {activeTab === 'overview' ? (
          <div
            id={getLearnerProfileTabIds('overview').panelId}
            role='tabpanel'
            aria-labelledby={getLearnerProfileTabIds('overview').tabId}
            tabIndex={0}
            className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
          >
            <div className='grid gap-6 sm:grid-cols-2'>
              <KangurLearnerProfileLevelProgressWidget />
              <KangurLearnerProfileQuestSummaryWidget />
            </div>
            <KangurLearnerProfileOverviewWidget />
            <KangurLearnerProfileResultsWidget />
            <KangurLearnerProfileRecommendationsWidget />
            <KangurLearnerProfileMasteryWidget />
          </div>
        ) : null}
        {activeTab === 'ai-mood' ? (
          <div
            id={getLearnerProfileTabIds('ai-mood').panelId}
            role='tabpanel'
            aria-labelledby={getLearnerProfileTabIds('ai-mood').tabId}
            tabIndex={0}
            className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
          >
            <KangurLearnerProfileAiTutorMoodWidget />
          </div>
        ) : null}
      </div>

      <div className={`flex min-w-0 flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}>
        <KangurLearnerProfileAssignmentsWidget />
        <KangurLearnerProfilePerformanceWidget />
        <KangurLearnerProfileSessionsWidget />
      </div>
    </div>
  );
}

function LearnerProfileStatsSection(props: {
  activeTab: LearnerProfileTabId;
  handlePointerTabMouseDown: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleTabChange: (tabId: LearnerProfileTabId) => void;
  handleTabKeyDown: (index: number, event: React.KeyboardEvent<HTMLButtonElement>) => void;
  tabRefs: React.MutableRefObject<Array<HTMLButtonElement | null>>;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  const {
    activeTab,
    handlePointerTabMouseDown,
    handleTabChange,
    handleTabKeyDown,
    tabRefs,
    translations,
  } = props;

  return (
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

      <LearnerProfileTabs
        activeTab={activeTab}
        handlePointerTabMouseDown={handlePointerTabMouseDown}
        handleTabChange={handleTabChange}
        handleTabKeyDown={handleTabKeyDown}
        tabRefs={tabRefs}
        translations={translations}
      />

      <LearnerProfilePanels activeTab={activeTab} />
    </section>
  );
}

const resolveLearnerProfileIsAuthenticated = ({
  isAuthenticated,
  user,
}: {
  isAuthenticated: boolean;
  user: KangurUser | null;
}): boolean => isAuthenticated || Boolean(user);

const resolveLearnerProfileTutorSessionSyncInput = ({
  activeTab,
  user,
}: {
  activeTab: LearnerProfileTabId;
  user: ReturnType<typeof useKangurLearnerProfileRuntime>['user'];
}): Parameters<typeof useKangurAiTutorSessionSync>[0] =>
  activeTab === 'ai-mood'
    ? {
        learnerId: user?.activeLearner?.id ?? null,
        sessionContext: { surface: 'profile' },
      }
    : {
        learnerId: null,
        sessionContext: null,
      };

function LearnerProfileContent(): React.JSX.Element {
  const { user } = useKangurLearnerProfileRuntime();
  const { isAuthenticated } = useKangurAuthSessionState();
  const resolvedIsAuthenticated = resolveLearnerProfileIsAuthenticated({
    isAuthenticated,
    user,
  });
  const { push: navigateTo } = useKangurRouteNavigator();
  const { basePath } = useKangurRouting();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('profile');
  const translations = useTranslations('KangurLearnerProfilePage');
  const tutorAnchorRef = useRef<HTMLDivElement>(null);
  const { activeTab, handlePointerTabMouseDown, handleTabChange, handleTabKeyDown, tabRefs } =
    useLearnerProfileTabs();

  useKangurTutorAnchor({
    id: 'learner-profile-root',
    kind: 'screen',
    ref: tutorAnchorRef,
    surface: 'profile',
    enabled: true,
  });

  useKangurAiTutorSessionSync(
    resolveLearnerProfileTutorSessionSyncInput({
      activeTab,
      user,
    })
  );

  useKangurRoutePageReady({
    pageKey: 'LearnerProfile',
    ready: true,
  });

  if (resolvedIsAuthenticated && !user) {
    return (
      <LearnerProfileLoadErrorState
        basePath={basePath}
        navigateTo={navigateTo}
        translations={translations}
      />
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

      <LearnerProfileStatsSection
        activeTab={activeTab}
        handlePointerTabMouseDown={handlePointerTabMouseDown}
        handleTabChange={handleTabChange}
        handleTabKeyDown={handleTabKeyDown}
        tabRefs={tabRefs}
        translations={translations}
      />

      <KangurDocsTooltipEnhancer enabled={docsTooltipsEnabled} rootId='learner-profile-root' />
    </div>
  );
}

export default function LearnerProfilePage(): React.JSX.Element {
  const { basePath } = useKangurRouting();
  const { user, isAuthenticated } = useKangurAuthSessionState();
  const { logout } = useKangurAuthActions();
  const { openLoginModal } = useKangurLoginModalActions();
  const resolvedIsAuthenticated = isAuthenticated || Boolean(user);

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
