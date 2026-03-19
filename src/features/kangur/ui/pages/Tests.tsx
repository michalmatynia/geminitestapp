'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  appendKangurUrlParams,
  getKangurHomeHref,
  getKangurInternalQueryParamName,
  getKangurPageHref as createPageUrl,
  readKangurUrlParam,
} from '@/features/kangur/config/routing';
import { useKangurDocsTooltips } from '@/features/kangur/docs/tooltips';
import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';
import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { KangurTestSuitePlayer } from '@/features/kangur/ui/components/KangurTestSuitePlayer';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurLearnerActivityPing } from '@/features/kangur/ui/hooks/useKangurLearnerActivity';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import type { KangurTestSuite } from '@/features/kangur/shared/contracts/kangur-tests';
import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  KANGUR_TEST_SUITES_SETTING_KEY,
  isLiveKangurTestSuite,
  parseKangurTestSuites,
} from '@/features/kangur/test-suites';
import {
  getQuestionsForSuite,
  getPublishedQuestionsForSuite,
  parseKangurTestQuestionStore,
} from '@/features/kangur/test-questions';

const TESTS_ROUTE_ACKNOWLEDGE_MS = 110;
const TESTS_MAIN_ID = 'kangur-tests-main';
const ACTIVE_TESTS_SCROLL_MAX_FRAMES = 18;
const ACTIVE_TESTS_ANCHOR_ID = 'kangur-tests-active-intro';

const resolveFocusedSuiteId = (
  focusToken: string,
  suites: KangurTestSuite[]
): string | null => {
  const normalized = focusToken.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const byId = suites.find((suite) => suite.id.toLowerCase() === normalized);
  if (byId) return byId.id;

  const byTitle = suites.find((suite) => suite.title.toLowerCase().includes(normalized));
  if (byTitle) return byTitle.id;

  const byCategory = suites.find((suite) => suite.category.toLowerCase().includes(normalized));
  if (byCategory) return byCategory.id;

  const byYear = suites.find(
    (suite) => typeof suite.year === 'number' && String(suite.year) === normalized
  );
  if (byYear) return byYear.id;

  return null;
};

export default function Tests(): React.JSX.Element {
  const translations = useTranslations('KangurTests');
  const routeNavigator = useKangurRouteNavigator();
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { user, logout } = auth;
  const { openLoginModal } = useKangurLoginModal();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const prefersReducedMotion = useReducedMotion();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('tests');
  const settingsStore = useSettingsStore();
  const { ageGroup } = useKangurAgeGroupFocus();
  const isAdultFocus = ageGroup === 'grown_ups';
  const [isDeferredContentReady, setIsDeferredContentReady] = useState(false);
  const [activeSuiteId, setActiveSuiteId] = useState<string | null>(null);
  const testsListIntroRef = useRef<HTMLDivElement | null>(null);
  const testsListRef = useRef<HTMLUListElement | null>(null);
  const testsActiveIntroRef = useRef<HTMLDivElement | null>(null);
  const testsPlayerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setIsDeferredContentReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, []);

  const rawSuites = settingsStore.get(KANGUR_TEST_SUITES_SETTING_KEY);
  const rawQuestions = settingsStore.get(KANGUR_TEST_QUESTIONS_SETTING_KEY);
  const suites = useMemo(
    () =>
      isDeferredContentReady && !isAdultFocus
        ? parseKangurTestSuites(rawSuites)
          .filter((suite) => isLiveKangurTestSuite(suite))
          .sort((left, right) => left.sortOrder - right.sortOrder)
        : [],
    [isAdultFocus, isDeferredContentReady, rawSuites]
  );
  const questionStore = useMemo(
    () =>
      parseKangurTestQuestionStore(
        isDeferredContentReady && !isAdultFocus ? rawQuestions : undefined
      ),
    [isAdultFocus, isDeferredContentReady, rawQuestions]
  );
  const questionCountBySuite = useMemo(() => {
    const next = new Map<string, number>();
    suites.forEach((suite) => {
      next.set(suite.id, getPublishedQuestionsForSuite(questionStore, suite.id).length);
    });
    return next;
  }, [questionStore, suites]);

  useEffect(() => {
    if (!activeSuiteId) {
      return;
    }

    const exists = suites.some((suite) => suite.id === activeSuiteId);
    if (!exists) {
      setActiveSuiteId(null);
    }
  }, [activeSuiteId, suites]);

  useEffect(() => {
    if (activeSuiteId || suites.length === 0 || typeof window === 'undefined') {
      return;
    }

    const currentUrl = new URL(window.location.href);
    const focusToken = readKangurUrlParam(currentUrl.searchParams, 'focus', basePath)
      ?.trim()
      .toLowerCase();
    if (!focusToken) {
      return;
    }

    const focusedSuiteId = resolveFocusedSuiteId(focusToken, suites);
    if (!focusedSuiteId) {
      return;
    }

    setActiveSuiteId(focusedSuiteId);
    currentUrl.searchParams.delete(getKangurInternalQueryParamName('focus', basePath));
    const nextHref = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
    window.history.replaceState({}, '', nextHref);
  }, [activeSuiteId, basePath, suites]);

  const activeSuite = suites.find((suite) => suite.id === activeSuiteId) ?? null;
  const activeQuestions = activeSuite
    ? getQuestionsForSuite(questionStore, activeSuite.id)
    : [];
  const learnerId = user?.activeLearner?.id ?? null;

  useLayoutEffect(() => {
    if (!activeSuite) {
      return;
    }

    let frameId: number | null = null;
    let remainingFrames = ACTIVE_TESTS_SCROLL_MAX_FRAMES;

    const resolveTopOffset = (): number => {
      const styles = window.getComputedStyle(document.documentElement);
      let topBarHeight =
        Number.parseFloat(styles.getPropertyValue('--kangur-top-bar-height')) || 0;
      if (!topBarHeight) {
        const topBar = document.querySelector('[data-testid="kangur-page-top-bar"]');
        if (topBar instanceof HTMLElement) {
          topBarHeight = topBar.getBoundingClientRect().height;
        }
      }
      return topBarHeight;
    };

    const scrollToTarget = (): boolean => {
      const target = testsActiveIntroRef.current ?? testsPlayerRef.current;
      if (!target) {
        return false;
      }

      const desiredOffset = resolveTopOffset();
      const delta = target.getBoundingClientRect().top - desiredOffset;
      if (Math.abs(delta) <= 4) {
        return true;
      }

      const nextTop = Math.max(0, window.scrollY + delta);
      window.scrollTo({ top: nextTop, left: 0, behavior: 'auto' });

      return Math.abs(delta) <= 8;
    };

    const scrollTestsIntoView = (): void => {
      if (scrollToTarget()) {
        frameId = null;
        return;
      }

      remainingFrames -= 1;
      if (remainingFrames <= 0) {
        frameId = null;
        return;
      }

      frameId = window.requestAnimationFrame(scrollTestsIntoView);
    };

    if (!scrollToTarget()) {
      frameId = window.requestAnimationFrame(scrollTestsIntoView);
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [activeSuite?.id]);
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const targetHash = `#${ACTIVE_TESTS_ANCHOR_ID}`;
    if (activeSuite) {
      if (url.hash === targetHash) {
        return;
      }
      url.hash = ACTIVE_TESTS_ANCHOR_ID;
      window.history.replaceState(window.history.state, '', url.toString());
      return;
    }

    if (url.hash === targetHash) {
      url.hash = '';
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, [activeSuite?.id]);

  const navigation = useMemo(
    () => ({
      basePath,
      canManageLearners: Boolean(user?.canManageLearners),
      currentPage: 'Tests' as const,
      guestPlayerName: user ? undefined : guestPlayerName,
      isAuthenticated: Boolean(user),
      onCreateAccount: () => openLoginModal(null, { authMode: 'create-account' }),
      onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
      onLogin: openLoginModal,
      onLogout: () => logout(false),
    }),
    [basePath, guestPlayerName, logout, openLoginModal, setGuestPlayerName, user]
  );

  const isTestsPageReady = isDeferredContentReady;

  useKangurRoutePageReady({
    pageKey: 'Tests',
    ready: isTestsPageReady,
  });

  const learnerActivityTitle = useMemo(() => {
    if (activeSuite?.title) {
      return translations('activityTitleWithSuite', { title: activeSuite.title });
    }
    return translations('activityTitleDefault');
  }, [activeSuite?.title, translations]);
  const learnerActivityHref = useMemo(() => {
    const baseHref = createPageUrl('Tests', basePath);
    if (!activeSuite) {
      return baseHref;
    }
    return appendKangurUrlParams(baseHref, { focus: activeSuite.id }, basePath);
  }, [activeSuite, basePath]);

  useKangurLearnerActivityPing({
    activity: {
      kind: 'test',
      title: learnerActivityTitle,
      href: learnerActivityHref,
    },
    enabled: user?.actorType === 'learner',
  });

  const handleGoBack = (): void => {
    routeNavigator.back({
      acknowledgeMs: TESTS_ROUTE_ACKNOWLEDGE_MS,
      fallbackHref: getKangurHomeHref(basePath),
      fallbackPageKey: 'Game',
      sourceId: 'tests:list-back',
    });
  };

  const handleSelectSuite = useCallback((suiteId: string): void => {
    setActiveSuiteId(suiteId);
  }, []);

  const handleBackToList = useCallback((): void => {
    setActiveSuiteId(null);
  }, []);

  const pageMotionProps = useMemo(
    () => createKangurPageTransitionMotionProps(prefersReducedMotion),
    [prefersReducedMotion]
  );
  const emptyStateCopy = isAdultFocus
    ? {
        title: translations('emptyAdultTitle'),
        description: translations('emptyAdultDescription'),
      }
    : {
        title: translations('emptyTitle'),
        description: translations('emptyDescription'),
      };

  return (
    <KangurStandardPageLayout
      tone='learn'
      id='kangur-tests-page'
      skipLinkTargetId={TESTS_MAIN_ID}
      docsRootId='kangur-tests-page'
      docsTooltipsEnabled={docsTooltipsEnabled}
      navigation={<KangurTopNavigationController navigation={navigation} />}
      containerProps={{
        as: 'section',
        'data-kangur-route-main': true,
        id: TESTS_MAIN_ID,
        className: `flex flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`,
      }}
    >
      <AnimatePresence mode='wait'>
        {!activeSuite ? (
          <motion.div
            key='tests-list'
            {...pageMotionProps}
            className={`flex w-full max-w-lg flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
            data-testid='tests-list-transition'
          >
            <div ref={testsListIntroRef} id='kangur-tests-intro' className='w-full'>
              <KangurPageIntroCard
                description={translations('introDescription')}
                headingAs='h1'
                headingTestId='kangur-tests-list-heading'
                onBack={handleGoBack}
                testId='tests-list-intro-card'
                title={translations('title')}
              />
            </div>
            {suites.length === 0 ? (
              <KangurEmptyState
                accent='indigo'
                className='w-full'
                description={emptyStateCopy.description}
                padding='xl'
                title={emptyStateCopy.title}
              />
            ) : (
              <ul
                className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
                id='kangur-tests-list'
                ref={testsListRef}
                role='list'
                aria-label={translations('listAria')}
              >
                {suites.map((suite) => {
                  const publishedCount = questionCountBySuite.get(suite.id) ?? 0;
                  const summaryParts = [
                    suite.year ? translations('summary.year', { year: suite.year }) : null,
                    suite.gradeLevel
                      ? translations('summary.gradeLevel', { value: suite.gradeLevel })
                      : null,
                    suite.category
                      ? translations('summary.category', { value: suite.category })
                      : null,
                  ].filter(Boolean);

                  return (
                    <li key={suite.id} className='list-none' role='listitem'>
                      <KangurInfoCard
                        className='flex w-full flex-col gap-3'
                        data-testid={`kangur-test-suite-card-${suite.id}`}
                        padding='lg'
                      >
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div className='min-w-0'>
                            <h3 className='text-lg font-semibold text-slate-800'>{suite.title}</h3>
                            {suite.description ? (
                              <p className='mt-1 text-sm text-slate-500'>{suite.description}</p>
                            ) : null}
                          </div>
                          <KangurStatusChip
                            accent={publishedCount > 0 ? 'emerald' : 'amber'}
                            className='whitespace-nowrap'
                            size='sm'
                          >
                            {publishedCount > 0
                              ? translations('questionsCount', { count: publishedCount })
                              : translations('noQuestions')}
                          </KangurStatusChip>
                        </div>
                        {summaryParts.length > 0 ? (
                          <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs text-slate-500`}>
                            {summaryParts.map((part) => (
                              <span key={part}>{part}</span>
                            ))}
                          </div>
                        ) : null}
                        <div className={`${KANGUR_TIGHT_ROW_CLASSNAME} w-full sm:items-center`}>
                          <KangurButton
                            className='w-full sm:w-auto'
                            onClick={() => handleSelectSuite(suite.id)}
                            size='sm'
                            type='button'
                            variant='primary'
                          >
                            {translations('startTest')}
                          </KangurButton>
                        </div>
                      </KangurInfoCard>
                    </li>
                  );
                })}
              </ul>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={activeSuite.id}
            {...pageMotionProps}
            className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
            data-testid='tests-active-transition'
          >
            <div
              ref={testsActiveIntroRef}
              id={ACTIVE_TESTS_ANCHOR_ID}
              className='w-full max-w-5xl'
            >
              <KangurPageIntroCard
                description={
                  activeSuite.description ||
                  translations('activeDescriptionFallback')
                }
                headingAs='h1'
                headingTestId='kangur-tests-active-heading'
                onBack={handleBackToList}
                testId='tests-active-intro-card'
                title={activeSuite.title}
                backButtonLabel={translations('backToList')}
              />
            </div>
            <div
              ref={testsPlayerRef}
              id='kangur-tests-player'
              className='w-full max-w-5xl'
            >
              <KangurTestSuitePlayer
                suite={activeSuite}
                questions={activeQuestions}
                learnerId={learnerId}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </KangurStandardPageLayout>
  );
}
