'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';

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
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
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
  const routeNavigator = useKangurRouteNavigator();
  const { basePath } = useKangurRouting();
  const auth = useKangurAuth();
  const { user, logout } = auth;
  const { openLoginModal } = useKangurLoginModal();
  const { guestPlayerName, setGuestPlayerName } = useKangurGuestPlayer();
  const prefersReducedMotion = useReducedMotion();
  const { enabled: docsTooltipsEnabled } = useKangurDocsTooltips('tests');
  const settingsStore = useSettingsStore();
  const [isDeferredContentReady, setIsDeferredContentReady] = useState(false);
  const [activeSuiteId, setActiveSuiteId] = useState<string | null>(null);

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
      isDeferredContentReady
        ? parseKangurTestSuites(rawSuites)
          .filter((suite) => isLiveKangurTestSuite(suite))
          .sort((left, right) => left.sortOrder - right.sortOrder)
        : [],
    [isDeferredContentReady, rawSuites]
  );
  const questionStore = useMemo(
    () => parseKangurTestQuestionStore(isDeferredContentReady ? rawQuestions : undefined),
    [isDeferredContentReady, rawQuestions]
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
      return `Test: ${activeSuite.title}`;
    }
    return 'Testy';
  }, [activeSuite?.title]);
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
            <KangurPageIntroCard
              description='Wybierz zestaw testowy i przejdź przez pytania krok po kroku.'
              headingAs='h1'
              headingTestId='kangur-tests-list-heading'
              onBack={handleGoBack}
              testId='tests-list-intro-card'
              title='Testy'
            />
            {suites.length === 0 ? (
              <KangurEmptyState
                accent='indigo'
                className='w-full'
                description='Włącz testy w panelu admina, aby pojawiły się tutaj.'
                padding='xl'
                title='Brak aktywnych testów'
              />
            ) : (
              <div
                className={`flex w-full flex-col ${KANGUR_PANEL_GAP_CLASSNAME}`}
                role='list'
                aria-label='Lista testów'
              >
                {suites.map((suite) => {
                  const publishedCount = questionCountBySuite.get(suite.id) ?? 0;
                  const summaryParts = [
                    suite.year ? `Rok ${suite.year}` : null,
                    suite.gradeLevel ? `Poziom: ${suite.gradeLevel}` : null,
                    suite.category ? `Kategoria: ${suite.category}` : null,
                  ].filter(Boolean);

                  return (
                    <KangurInfoCard
                      key={suite.id}
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
                            ? `${publishedCount} pytań`
                            : 'Brak pytań'}
                        </KangurStatusChip>
                      </div>
                      {summaryParts.length > 0 ? (
                        <div className='flex flex-wrap gap-2 text-xs text-slate-500'>
                          {summaryParts.map((part) => (
                            <span key={part}>{part}</span>
                          ))}
                        </div>
                      ) : null}
                      <div className='flex w-full flex-col gap-2 sm:flex-row sm:items-center'>
                        <KangurButton
                          className='w-full sm:w-auto'
                          onClick={() => handleSelectSuite(suite.id)}
                          size='sm'
                          type='button'
                          variant='primary'
                        >
                          Rozpocznij test
                        </KangurButton>
                      </div>
                    </KangurInfoCard>
                  );
                })}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key={activeSuite.id}
            {...pageMotionProps}
            className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
            data-testid='tests-active-transition'
          >
            <div className='w-full max-w-5xl'>
              <KangurPageIntroCard
                description={
                  activeSuite.description ||
                  'Przejdź przez pytania testowe i sprawdź wynik końcowy.'
                }
                headingAs='h1'
                headingTestId='kangur-tests-active-heading'
                onBack={handleBackToList}
                testId='tests-active-intro-card'
                title={activeSuite.title}
                backButtonLabel='Wróć do listy testów'
              />
            </div>
            <div className='w-full max-w-5xl'>
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
