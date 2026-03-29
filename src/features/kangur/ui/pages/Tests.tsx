'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useLocale, useTranslations } from 'next-intl';
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
import { KangurTestSuitePlayer } from '@/features/kangur/ui/components/KangurTestSuitePlayer';
import { KangurTestsWordmark } from '@/features/kangur/ui/components/KangurTestsWordmark';
import { KangurTopNavigationController } from '@/features/kangur/ui/components/KangurTopNavigationController';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurGuestPlayer } from '@/features/kangur/ui/context/KangurGuestPlayerContext';
import { useKangurLoginModal } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useOptionalKangurRouteTransitionState } from '@/features/kangur/ui/context/KangurRouteTransitionContext';
import {
  KangurButton,
  KangurEmptyState,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX,
  KANGUR_TOP_BAR_HEIGHT_VAR_NAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurLearnerActivityPing } from '@/features/kangur/ui/hooks/useKangurLearnerActivity';
import { useKangurRouteNavigator } from '@/features/kangur/ui/hooks/useKangurRouteNavigator';
import { useKangurRoutePageReady } from '@/features/kangur/ui/hooks/useKangurRoutePageReady';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import {
  LESSONS_LIBRARY_LAYOUT_CLASSNAME,
  LESSONS_LIBRARY_LIST_CLASSNAME,
} from '@/features/kangur/ui/pages/lessons/Lessons.constants';
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

const TESTS_MAIN_ID = 'kangur-tests-main';
const ACTIVE_TESTS_SCROLL_MAX_FRAMES = 18;
const ACTIVE_TESTS_ANCHOR_ID = 'kangur-tests-active-intro';

type TestsTranslations = ReturnType<typeof useTranslations>;
type TestsEmptyStateCopy = {
  description: string;
  title: string;
};

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

const resolveVisibleTestSuites = ({
  isAdultFocus,
  isDeferredContentReady,
  rawSuites,
}: {
  isAdultFocus: boolean;
  isDeferredContentReady: boolean;
  rawSuites: unknown;
}): KangurTestSuite[] =>
  isDeferredContentReady && !isAdultFocus
    ? parseKangurTestSuites(rawSuites)
      .filter((suite) => isLiveKangurTestSuite(suite))
      .sort((left, right) => left.sortOrder - right.sortOrder)
    : [];

const resolveVisibleQuestionStore = ({
  isAdultFocus,
  isDeferredContentReady,
  rawQuestions,
}: {
  isAdultFocus: boolean;
  isDeferredContentReady: boolean;
  rawQuestions: unknown;
}) =>
  parseKangurTestQuestionStore(
    isDeferredContentReady && !isAdultFocus ? rawQuestions : undefined
  );

const buildQuestionCountBySuiteMap = ({
  questionStore,
  suites,
}: {
  questionStore: ReturnType<typeof parseKangurTestQuestionStore>;
  suites: KangurTestSuite[];
}): Map<string, number> => {
  const next = new Map<string, number>();
  suites.forEach((suite) => {
    next.set(suite.id, getPublishedQuestionsForSuite(questionStore, suite.id).length);
  });
  return next;
};

const resolveActiveSuite = ({
  activeSuiteId,
  suites,
}: {
  activeSuiteId: string | null;
  suites: KangurTestSuite[];
}): KangurTestSuite | null => suites.find((suite) => suite.id === activeSuiteId) ?? null;

const resolveActiveQuestions = ({
  activeSuite,
  questionStore,
}: {
  activeSuite: KangurTestSuite | null;
  questionStore: ReturnType<typeof parseKangurTestQuestionStore>;
}) => (activeSuite ? getQuestionsForSuite(questionStore, activeSuite.id) : []);

const resolveLearnerId = (user: ReturnType<typeof useKangurAuth>['user']): string | null =>
  user?.activeLearner?.id ?? null;

const resolveTestsNavigation = ({
  basePath,
  guestPlayerName,
  logout,
  openLoginModal,
  setGuestPlayerName,
  user,
}: {
  basePath: string;
  guestPlayerName: string;
  logout: (redirect?: boolean) => Promise<void> | void;
  openLoginModal: () => void;
  setGuestPlayerName: (value: string) => void;
  user: ReturnType<typeof useKangurAuth>['user'];
}) => ({
  basePath,
  canManageLearners: Boolean(user?.canManageLearners),
  currentPage: 'Tests' as const,
  guestPlayerName: user ? undefined : guestPlayerName,
  isAuthenticated: Boolean(user),
  onGuestPlayerNameChange: user ? undefined : setGuestPlayerName,
  onLogin: openLoginModal,
  onLogout: () => logout(false),
});

const resolveTestsPageReady = ({
  isDeferredContentReady,
  routeTransitionState,
}: {
  isDeferredContentReady: boolean;
  routeTransitionState: ReturnType<typeof useOptionalKangurRouteTransitionState>;
}): boolean =>
  routeTransitionState?.activeTransitionKind === 'locale-switch' || isDeferredContentReady;

const resolveLearnerActivityTitle = ({
  activeSuiteTitle,
  translations,
}: {
  activeSuiteTitle: string | undefined;
  translations: TestsTranslations;
}): string =>
  activeSuiteTitle
    ? translations('activityTitleWithSuite', { title: activeSuiteTitle })
    : translations('activityTitleDefault');

const resolveLearnerActivityHref = ({
  activeSuite,
  basePath,
}: {
  activeSuite: KangurTestSuite | null;
  basePath: string;
}): string => {
  const baseHref = createPageUrl('Tests', basePath);
  return activeSuite
    ? appendKangurUrlParams(baseHref, { focus: activeSuite.id }, basePath)
    : baseHref;
};

const resolveTestsEmptyStateCopy = ({
  isAdultFocus,
  translations,
}: {
  isAdultFocus: boolean;
  translations: TestsTranslations;
}): TestsEmptyStateCopy =>
  isAdultFocus
    ? {
        title: translations('emptyAdultTitle'),
        description: translations('emptyAdultDescription'),
      }
    : {
        title: translations('emptyTitle'),
        description: translations('emptyDescription'),
      };

const resolveSuiteSummaryParts = ({
  suite,
  translations,
}: {
  suite: KangurTestSuite;
  translations: TestsTranslations;
}): string[] =>
  [
    suite.year ? translations('summary.year', { year: suite.year }) : null,
    suite.gradeLevel ? translations('summary.gradeLevel', { value: suite.gradeLevel }) : null,
    suite.category ? translations('summary.category', { value: suite.category }) : null,
  ].filter((part): part is string => Boolean(part));

const resolvePublishedCountAccent = (publishedCount: number): 'amber' | 'emerald' =>
  publishedCount > 0 ? 'emerald' : 'amber';

const resolvePublishedCountLabel = ({
  publishedCount,
  translations,
}: {
  publishedCount: number;
  translations: TestsTranslations;
}): string =>
  publishedCount > 0
    ? translations('questionsCount', { count: publishedCount })
    : translations('noQuestions');

const readFocusedSuiteTokenFromWindow = (basePath: string): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  return readKangurUrlParam(new URL(window.location.href).searchParams, 'focus', basePath)
    ?.trim()
    .toLowerCase() ?? null;
};

const clearFocusedSuiteTokenFromWindow = (basePath: string): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const currentUrl = new URL(window.location.href);
  currentUrl.searchParams.delete(getKangurInternalQueryParamName('focus', basePath));
  const nextHref = `${currentUrl.pathname}${currentUrl.search}${currentUrl.hash}`;
  window.history.replaceState({}, '', nextHref);
};

const resolveTestsTopOffset = (): number => {
  const styles = window.getComputedStyle(document.documentElement);
  let topBarHeight = Number.parseFloat(styles.getPropertyValue(KANGUR_TOP_BAR_HEIGHT_VAR_NAME));
  if (!topBarHeight) {
    const topBar = document.querySelector('[data-testid="kangur-page-top-bar"]');
    if (topBar instanceof HTMLElement) {
      topBarHeight = topBar.getBoundingClientRect().height;
    }
  }
  return topBarHeight || KANGUR_TOP_BAR_DEFAULT_HEIGHT_PX;
};

const scrollActiveSuiteTargetOnce = (input: {
  testsActiveIntroRef: React.RefObject<HTMLDivElement | null>;
  testsPlayerRef: React.RefObject<HTMLDivElement | null>;
}): boolean => {
  const target = input.testsActiveIntroRef.current ?? input.testsPlayerRef.current;
  if (!target) {
    return false;
  }

  const desiredOffset = resolveTestsTopOffset();
  const delta = target.getBoundingClientRect().top - desiredOffset;
  if (Math.abs(delta) <= 4) {
    return true;
  }

  const nextTop = Math.max(0, window.scrollY + delta);
  window.scrollTo({ top: nextTop, left: 0, behavior: 'auto' });
  return Math.abs(delta) <= 8;
};

function useDeferredTestsContentReady(): boolean {
  const [isDeferredContentReady, setIsDeferredContentReady] = useState(false);

  useEffect(() => {
    setIsDeferredContentReady(true);
  }, []);

  return isDeferredContentReady;
}

function useResetMissingActiveSuite(
  activeSuiteId: string | null,
  suites: KangurTestSuite[],
  setActiveSuiteId: (suiteId: string | null) => void
): void {
  useEffect(() => {
    if (!activeSuiteId) {
      return;
    }

    if (!suites.some((suite) => suite.id === activeSuiteId)) {
      setActiveSuiteId(null);
    }
  }, [activeSuiteId, setActiveSuiteId, suites]);
}

function useBootstrapFocusedSuiteSelection(input: {
  activeSuiteId: string | null;
  basePath: string;
  setActiveSuiteId: (suiteId: string | null) => void;
  suites: KangurTestSuite[];
}): void {
  const { activeSuiteId, basePath, setActiveSuiteId, suites } = input;

  useEffect(() => {
    if (activeSuiteId || suites.length === 0) {
      return;
    }

    const focusToken = readFocusedSuiteTokenFromWindow(basePath);
    if (!focusToken) {
      return;
    }

    const focusedSuiteId = resolveFocusedSuiteId(focusToken, suites);
    if (!focusedSuiteId) {
      return;
    }

    setActiveSuiteId(focusedSuiteId);
    clearFocusedSuiteTokenFromWindow(basePath);
  }, [activeSuiteId, basePath, setActiveSuiteId, suites]);
}

function useSyncActiveSuiteScroll(input: {
  activeSuiteId: string | undefined;
  testsActiveIntroRef: React.RefObject<HTMLDivElement | null>;
  testsPlayerRef: React.RefObject<HTMLDivElement | null>;
}): void {
  const { activeSuiteId, testsActiveIntroRef, testsPlayerRef } = input;

  useLayoutEffect(() => {
    if (!activeSuiteId) {
      return;
    }

    let frameId: number | null = null;
    let remainingFrames = ACTIVE_TESTS_SCROLL_MAX_FRAMES;

    const scrollTestsIntoView = (): void => {
      if (
        scrollActiveSuiteTargetOnce({
          testsActiveIntroRef,
          testsPlayerRef,
        })
      ) {
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

    if (
      !scrollActiveSuiteTargetOnce({
        testsActiveIntroRef,
        testsPlayerRef,
      })
    ) {
      frameId = window.requestAnimationFrame(scrollTestsIntoView);
    }

    return () => {
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [activeSuiteId, testsActiveIntroRef, testsPlayerRef]);
}

function useSyncActiveSuiteHash(activeSuiteId: string | undefined): void {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const url = new URL(window.location.href);
    const targetHash = `#${ACTIVE_TESTS_ANCHOR_ID}`;
    if (activeSuiteId) {
      if (url.hash !== targetHash) {
        url.hash = ACTIVE_TESTS_ANCHOR_ID;
        window.history.replaceState(window.history.state, '', url.toString());
      }
      return;
    }

    if (url.hash === targetHash) {
      url.hash = '';
      window.history.replaceState(window.history.state, '', url.toString());
    }
  }, [activeSuiteId]);
}

function TestsSuiteCard(props: {
  onSelect: (suiteId: string) => void;
  publishedCount: number;
  suite: KangurTestSuite;
  translations: TestsTranslations;
}): React.JSX.Element {
  const { onSelect, publishedCount, suite, translations } = props;
  const summaryParts = resolveSuiteSummaryParts({
    suite,
    translations,
  });

  return (
    <li className='w-full list-none' role='listitem'>
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
            accent={resolvePublishedCountAccent(publishedCount)}
            className='whitespace-nowrap'
            size='sm'
          >
            {resolvePublishedCountLabel({
              publishedCount,
              translations,
            })}
          </KangurStatusChip>
        </div>
        {summaryParts.length > 0 ? (
          <div className={`${KANGUR_WRAP_ROW_CLASSNAME} text-xs text-slate-500`}>
            {summaryParts.map((part) => (
              <span key={part}>{part}</span>
            ))}
          </div>
        ) : null}
        <div
          className={`${KANGUR_TIGHT_ROW_CLASSNAME} w-full justify-center sm:items-center sm:justify-center`}
        >
          <KangurButton
            className='w-full sm:w-auto'
            onClick={() => onSelect(suite.id)}
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
}

function TestsSuiteList(props: {
  onSelect: (suiteId: string) => void;
  questionCountBySuite: Map<string, number>;
  suites: KangurTestSuite[];
  testsListRef: React.RefObject<HTMLUListElement | null>;
  translations: TestsTranslations;
}): React.JSX.Element {
  const { onSelect, questionCountBySuite, suites, testsListRef, translations } = props;

  return (
    <ul
      className={LESSONS_LIBRARY_LIST_CLASSNAME}
      id='kangur-tests-list'
      ref={testsListRef}
      role='list'
      aria-label={translations('listAria')}
    >
      {suites.map((suite) => (
        <TestsSuiteCard
          key={suite.id}
          onSelect={onSelect}
          publishedCount={questionCountBySuite.get(suite.id) ?? 0}
          suite={suite}
          translations={translations}
        />
      ))}
    </ul>
  );
}

function TestsListView(props: {
  emptyStateCopy: TestsEmptyStateCopy;
  handleGoBack: () => void;
  handleSelectSuite: (suiteId: string) => void;
  locale: string;
  pageMotionProps: ReturnType<typeof createKangurPageTransitionMotionProps>;
  questionCountBySuite: Map<string, number>;
  suites: KangurTestSuite[];
  testsListIntroRef: React.RefObject<HTMLDivElement | null>;
  testsListRef: React.RefObject<HTMLUListElement | null>;
  translations: TestsTranslations;
}): React.JSX.Element {
  const {
    emptyStateCopy,
    handleGoBack,
    handleSelectSuite,
    locale,
    pageMotionProps,
    questionCountBySuite,
    suites,
    testsListIntroRef,
    testsListRef,
    translations,
  } = props;

  return (
    <motion.div
      key='tests-list'
      {...pageMotionProps}
      className={LESSONS_LIBRARY_LAYOUT_CLASSNAME}
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
          visualTitle={
            <KangurTestsWordmark
              className='mx-auto'
              data-testid='kangur-tests-heading-art'
              idPrefix='kangur-tests-heading'
              label={translations('title')}
              locale={locale}
            />
          }
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
        <TestsSuiteList
          onSelect={handleSelectSuite}
          questionCountBySuite={questionCountBySuite}
          suites={suites}
          testsListRef={testsListRef}
          translations={translations}
        />
      )}
    </motion.div>
  );
}

function TestsActiveView(props: {
  activeQuestions: ReturnType<typeof resolveActiveQuestions>;
  activeSuite: KangurTestSuite;
  handleBackToList: () => void;
  learnerId: string | null;
  pageMotionProps: ReturnType<typeof createKangurPageTransitionMotionProps>;
  testsActiveIntroRef: React.RefObject<HTMLDivElement | null>;
  testsPlayerRef: React.RefObject<HTMLDivElement | null>;
  translations: TestsTranslations;
}): React.JSX.Element {
  const {
    activeQuestions,
    activeSuite,
    handleBackToList,
    learnerId,
    pageMotionProps,
    testsActiveIntroRef,
    testsPlayerRef,
    translations,
  } = props;

  return (
    <motion.div
      key={activeSuite.id}
      {...pageMotionProps}
      className={`flex w-full flex-col items-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
      data-testid='tests-active-transition'
    >
      <div ref={testsActiveIntroRef} id={ACTIVE_TESTS_ANCHOR_ID} className='w-full max-w-5xl'>
        <KangurPageIntroCard
          description={activeSuite.description || translations('activeDescriptionFallback')}
          headingAs='h1'
          headingTestId='kangur-tests-active-heading'
          onBack={handleBackToList}
          testId='tests-active-intro-card'
          title={activeSuite.title}
          backButtonLabel={translations('backToList')}
        />
      </div>
      <div ref={testsPlayerRef} id='kangur-tests-player' className='w-full max-w-5xl'>
        <KangurTestSuitePlayer
          suite={activeSuite}
          questions={activeQuestions}
          learnerId={learnerId}
        />
      </div>
    </motion.div>
  );
}

function TestsPageContent(props: {
  activeQuestions: ReturnType<typeof resolveActiveQuestions>;
  activeSuite: KangurTestSuite | null;
  emptyStateCopy: TestsEmptyStateCopy;
  handleBackToList: () => void;
  handleGoBack: () => void;
  handleSelectSuite: (suiteId: string) => void;
  learnerId: string | null;
  locale: string;
  pageMotionProps: ReturnType<typeof createKangurPageTransitionMotionProps>;
  questionCountBySuite: Map<string, number>;
  suites: KangurTestSuite[];
  testsActiveIntroRef: React.RefObject<HTMLDivElement | null>;
  testsListIntroRef: React.RefObject<HTMLDivElement | null>;
  testsListRef: React.RefObject<HTMLUListElement | null>;
  testsPlayerRef: React.RefObject<HTMLDivElement | null>;
  translations: TestsTranslations;
}): React.JSX.Element {
  const {
    activeQuestions,
    activeSuite,
    emptyStateCopy,
    handleBackToList,
    handleGoBack,
    handleSelectSuite,
    learnerId,
    locale,
    pageMotionProps,
    questionCountBySuite,
    suites,
    testsActiveIntroRef,
    testsListIntroRef,
    testsListRef,
    testsPlayerRef,
    translations,
  } = props;

  return (
    <AnimatePresence mode='wait'>
      {activeSuite ? (
        <TestsActiveView
          activeQuestions={activeQuestions}
          activeSuite={activeSuite}
          handleBackToList={handleBackToList}
          learnerId={learnerId}
          pageMotionProps={pageMotionProps}
          testsActiveIntroRef={testsActiveIntroRef}
          testsPlayerRef={testsPlayerRef}
          translations={translations}
        />
      ) : (
        <TestsListView
          emptyStateCopy={emptyStateCopy}
          handleGoBack={handleGoBack}
          handleSelectSuite={handleSelectSuite}
          locale={locale}
          pageMotionProps={pageMotionProps}
          questionCountBySuite={questionCountBySuite}
          suites={suites}
          testsListIntroRef={testsListIntroRef}
          testsListRef={testsListRef}
          translations={translations}
        />
      )}
    </AnimatePresence>
  );
}

export default function Tests(): React.JSX.Element {
  const locale = useLocale();
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
  const routeTransitionState = useOptionalKangurRouteTransitionState();
  const isAdultFocus = ageGroup === 'grown_ups';
  const isDeferredContentReady = useDeferredTestsContentReady();
  const [activeSuiteId, setActiveSuiteId] = useState<string | null>(null);
  const testsListIntroRef = useRef<HTMLDivElement | null>(null);
  const testsListRef = useRef<HTMLUListElement | null>(null);
  const testsActiveIntroRef = useRef<HTMLDivElement | null>(null);
  const testsPlayerRef = useRef<HTMLDivElement | null>(null);

  const rawSuites = settingsStore.get(KANGUR_TEST_SUITES_SETTING_KEY);
  const rawQuestions = settingsStore.get(KANGUR_TEST_QUESTIONS_SETTING_KEY);
  const suites = useMemo(
    () =>
      resolveVisibleTestSuites({
        isAdultFocus,
        isDeferredContentReady,
        rawSuites,
      }),
    [isAdultFocus, isDeferredContentReady, rawSuites]
  );
  const questionStore = useMemo(
    () =>
      resolveVisibleQuestionStore({
        isAdultFocus,
        isDeferredContentReady,
        rawQuestions,
      }),
    [isAdultFocus, isDeferredContentReady, rawQuestions]
  );
  const questionCountBySuite = useMemo(
    () =>
      buildQuestionCountBySuiteMap({
        questionStore,
        suites,
      }),
    [questionStore, suites]
  );

  useResetMissingActiveSuite(activeSuiteId, suites, setActiveSuiteId);
  useBootstrapFocusedSuiteSelection({
    activeSuiteId,
    basePath,
    setActiveSuiteId,
    suites,
  });

  const activeSuite = resolveActiveSuite({
    activeSuiteId,
    suites,
  });
  const activeQuestions = resolveActiveQuestions({
    activeSuite,
    questionStore,
  });
  const learnerId = resolveLearnerId(user);

  useSyncActiveSuiteScroll({
    activeSuiteId: activeSuite?.id,
    testsActiveIntroRef,
    testsPlayerRef,
  });
  useSyncActiveSuiteHash(activeSuite?.id);

  const navigation = useMemo(
    () =>
      resolveTestsNavigation({
        basePath,
        guestPlayerName,
        logout,
        openLoginModal,
        setGuestPlayerName,
        user,
      }),
    [basePath, guestPlayerName, logout, openLoginModal, setGuestPlayerName, user]
  );

  const isTestsPageReady = resolveTestsPageReady({
    isDeferredContentReady,
    routeTransitionState,
  });

  useKangurRoutePageReady({
    pageKey: 'Tests',
    ready: isTestsPageReady,
  });

  const learnerActivityTitle = useMemo(
    () =>
      resolveLearnerActivityTitle({
        activeSuiteTitle: activeSuite?.title,
        translations,
      }),
    [activeSuite?.title, translations]
  );
  const learnerActivityHref = useMemo(
    () =>
      resolveLearnerActivityHref({
        activeSuite,
        basePath,
      }),
    [activeSuite, basePath]
  );

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
  const emptyStateCopy = resolveTestsEmptyStateCopy({
    isAdultFocus,
    translations,
  });

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
      <TestsPageContent
        activeQuestions={activeQuestions}
        activeSuite={activeSuite}
        emptyStateCopy={emptyStateCopy}
        handleBackToList={handleBackToList}
        handleGoBack={handleGoBack}
        handleSelectSuite={handleSelectSuite}
        learnerId={learnerId}
        locale={locale}
        pageMotionProps={pageMotionProps}
        questionCountBySuite={questionCountBySuite}
        suites={suites}
        testsActiveIntroRef={testsActiveIntroRef}
        testsListIntroRef={testsListIntroRef}
        testsListRef={testsListRef}
        testsPlayerRef={testsPlayerRef}
        translations={translations}
      />
    </KangurStandardPageLayout>
  );
}
