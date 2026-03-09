import type { KangurTestQuestion, KangurTestSuite } from '@/shared/contracts/kangur-tests';
import { getQuestionAuthoringSummary } from './question-authoring-insights';
import { isLiveKangurTestSuite } from '../test-suites';

export type KangurTestSuiteHealth = {
  questionCount: number;
  readyQuestionCount: number;
  needsReviewQuestionCount: number;
  needsFixQuestionCount: number;
  richQuestionCount: number;
  draftQuestionCount: number;
  readyToPublishQuestionCount: number;
  publishableQuestionCount: number;
  publishedQuestionCount: number;
  publishStatus: 'empty' | 'unpublished' | 'partial' | 'published';
  publicationStatus: KangurTestSuite['publicationStatus'];
  isLive: boolean;
  canGoLive: boolean;
  liveNeedsAttention: boolean;
  status: 'empty' | 'ready' | 'needs-review' | 'needs-fix';
};

export type KangurTestLibraryHealthSummary = {
  suiteCount: number;
  readySuiteCount: number;
  suitesNeedingReviewCount: number;
  suitesNeedingFixCount: number;
  liveSuiteCount: number;
  liveReadySuiteCount: number;
  unstableLiveSuiteCount: number;
  partiallyPublishedSuiteCount: number;
  unpublishedSuiteCount: number;
  totalQuestionCount: number;
  reviewQueueQuestionCount: number;
  richQuestionCount: number;
  draftQuestionCount: number;
  readyToPublishQuestionCount: number;
  publishableQuestionCount: number;
  publishedQuestionCount: number;
};

export const getKangurTestSuiteHealth = (
  suite: KangurTestSuite,
  questions: KangurTestQuestion[]
): KangurTestSuiteHealth => {
  const suiteQuestions = questions.filter((question) => question.suiteId === suite.id);
  const summaries = suiteQuestions.map((question) => getQuestionAuthoringSummary(question));
  const needsFixQuestionCount = summaries.filter((summary) => summary.status === 'needs-fix').length;
  const needsReviewQuestionCount = summaries.filter(
    (summary) => summary.status === 'needs-review'
  ).length;
  const readyQuestionCount = summaries.filter((summary) => summary.status === 'ready').length;
  const draftQuestionCount = summaries.filter((summary) => summary.workflowStatus === 'draft').length;
  const readyToPublishQuestionCount = summaries.filter(
    (summary) => summary.workflowStatus === 'ready'
  ).length;
  const publishableQuestionCount = summaries.filter(
    (summary) => summary.workflowStatus === 'ready' && summary.status === 'ready'
  ).length;
  const publishedQuestionCount = summaries.filter(
    (summary) => summary.workflowStatus === 'published'
  ).length;
  const richQuestionCount = suiteQuestions.filter(
    (question) =>
      question.presentation.layout !== 'classic' ||
      question.presentation.choiceStyle !== 'list' ||
      question.choices.some(
        (choice) =>
          (choice.description?.trim().length ?? 0) > 0 || (choice.svgContent?.trim().length ?? 0) > 0
      )
  ).length;

  const status =
    suiteQuestions.length === 0
      ? 'empty'
      : needsFixQuestionCount > 0
        ? 'needs-fix'
        : needsReviewQuestionCount > 0
          ? 'needs-review'
          : 'ready';
  const publishStatus =
    suiteQuestions.length === 0
      ? 'empty'
      : publishedQuestionCount === 0
        ? 'unpublished'
        : publishedQuestionCount === suiteQuestions.length
          ? 'published'
          : 'partial';
  const isLive = isLiveKangurTestSuite(suite);
  const canGoLive =
    suite.enabled &&
    !isLive &&
    suiteQuestions.length > 0 &&
    status === 'ready' &&
    publishStatus === 'published';
  const liveNeedsAttention = isLive && (status !== 'ready' || publishStatus !== 'published');

  return {
    questionCount: suiteQuestions.length,
    readyQuestionCount,
    needsReviewQuestionCount,
    needsFixQuestionCount,
    richQuestionCount,
    draftQuestionCount,
    readyToPublishQuestionCount,
    publishableQuestionCount,
    publishedQuestionCount,
    publishStatus,
    publicationStatus: suite.publicationStatus,
    isLive,
    canGoLive,
    liveNeedsAttention,
    status,
  };
};

export const buildKangurTestSuiteHealthMap = (
  suites: KangurTestSuite[],
  questions: KangurTestQuestion[]
): Map<string, KangurTestSuiteHealth> =>
  new Map(suites.map((suite) => [suite.id, getKangurTestSuiteHealth(suite, questions)] as const));

export const getKangurTestLibraryHealthSummary = (
  suites: KangurTestSuite[],
  suiteHealthById: Map<string, KangurTestSuiteHealth>
): KangurTestLibraryHealthSummary => {
  const suiteHealthList = suites.map((suite) => suiteHealthById.get(suite.id)).filter(Boolean);

  return {
    suiteCount: suites.length,
    readySuiteCount: suiteHealthList.filter((health) => health?.status === 'ready').length,
    suitesNeedingReviewCount: suiteHealthList.filter((health) => health?.status === 'needs-review').length,
    suitesNeedingFixCount: suiteHealthList.filter((health) => health?.status === 'needs-fix').length,
    liveSuiteCount: suiteHealthList.filter((health) => health?.isLive).length,
    liveReadySuiteCount: suiteHealthList.filter((health) => health?.canGoLive).length,
    unstableLiveSuiteCount: suiteHealthList.filter((health) => health?.liveNeedsAttention).length,
    partiallyPublishedSuiteCount: suiteHealthList.filter(
      (health) => health?.publishStatus === 'partial'
    ).length,
    unpublishedSuiteCount: suiteHealthList.filter(
      (health) => health?.publishStatus === 'unpublished'
    ).length,
    totalQuestionCount: suiteHealthList.reduce((sum, health) => sum + (health?.questionCount ?? 0), 0),
    reviewQueueQuestionCount: suiteHealthList.reduce(
      (sum, health) => sum + (health?.needsFixQuestionCount ?? 0) + (health?.needsReviewQuestionCount ?? 0),
      0
    ),
    richQuestionCount: suiteHealthList.reduce((sum, health) => sum + (health?.richQuestionCount ?? 0), 0),
    draftQuestionCount: suiteHealthList.reduce(
      (sum, health) => sum + (health?.draftQuestionCount ?? 0),
      0
    ),
    readyToPublishQuestionCount: suiteHealthList.reduce(
      (sum, health) => sum + (health?.readyToPublishQuestionCount ?? 0),
      0
    ),
    publishableQuestionCount: suiteHealthList.reduce(
      (sum, health) => sum + (health?.publishableQuestionCount ?? 0),
      0
    ),
    publishedQuestionCount: suiteHealthList.reduce(
      (sum, health) => sum + (health?.publishedQuestionCount ?? 0),
      0
    ),
  };
};
