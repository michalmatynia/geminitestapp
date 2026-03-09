import type { KangurTestQuestion, KangurTestSuite } from '@/shared/contracts/kangur-tests';
import { getQuestionAuthoringSummary } from './question-authoring-insights';

export type KangurTestSuiteHealth = {
  questionCount: number;
  readyQuestionCount: number;
  needsReviewQuestionCount: number;
  needsFixQuestionCount: number;
  richQuestionCount: number;
  status: 'empty' | 'ready' | 'needs-review' | 'needs-fix';
};

export type KangurTestLibraryHealthSummary = {
  suiteCount: number;
  readySuiteCount: number;
  suitesNeedingReviewCount: number;
  suitesNeedingFixCount: number;
  totalQuestionCount: number;
  reviewQueueQuestionCount: number;
  richQuestionCount: number;
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

  return {
    questionCount: suiteQuestions.length,
    readyQuestionCount,
    needsReviewQuestionCount,
    needsFixQuestionCount,
    richQuestionCount,
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
    totalQuestionCount: suiteHealthList.reduce((sum, health) => sum + (health?.questionCount ?? 0), 0),
    reviewQueueQuestionCount: suiteHealthList.reduce(
      (sum, health) => sum + (health?.needsFixQuestionCount ?? 0) + (health?.needsReviewQuestionCount ?? 0),
      0
    ),
    richQuestionCount: suiteHealthList.reduce((sum, health) => sum + (health?.richQuestionCount ?? 0), 0),
  };
};
