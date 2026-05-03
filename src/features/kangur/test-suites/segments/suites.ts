import {
  kangurTestSuiteSchema,
  type KangurTestQuestionStore,
  type KangurTestSuite,
  type KangurTestSuites,
} from '@/features/kangur/shared/contracts/kangur-tests';
import {
  KANGUR_TEST_SUITE_SORT_ORDER_GAP,
  normalizeKangurTestGroupTitle,
} from './shared';
import { hasFullyPublishedQuestionSetForSuite } from '../questions';

export const canonicalizeKangurTestSuites = (suites: KangurTestSuite[]): KangurTestSuites =>
  [...suites]
    .sort((a, b) => {
      const orderDelta = a.sortOrder - b.sortOrder;
      if (orderDelta !== 0) return orderDelta;
      return a.id.localeCompare(b.id);
    })
    .map((suite, index) => ({
      ...suite,
      sortOrder: (index + 1) * KANGUR_TEST_SUITE_SORT_ORDER_GAP,
    }));

export const createKangurTestSuiteId = (): string =>
  `kts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createKangurTestSuite = (
  overrides: Partial<
    Pick<KangurTestSuite, 'title' | 'description' | 'year' | 'gradeLevel' | 'category'>
  >,
  sortOrder = 0
): KangurTestSuite =>
  kangurTestSuiteSchema.parse({
    id: createKangurTestSuiteId(),
    title: overrides.title ?? 'New Test Suite',
    description: overrides.description ?? '',
    year: overrides.year ?? null,
    gradeLevel: overrides.gradeLevel ?? '',
    category: normalizeKangurTestGroupTitle(overrides.category ?? 'custom'),
    enabled: true,
    publicationStatus: 'draft',
    sortOrder,
  });

export const isLiveKangurTestSuite = (suite: Pick<KangurTestSuite, 'enabled' | 'publicationStatus'>): boolean =>
  suite.enabled && suite.publicationStatus === 'live';

export const promoteKangurTestSuitesLive = (
  suites: KangurTestSuite[],
  options?: {
    suiteIds?: string[];
    publishedAt?: string;
  }
): {
  suites: KangurTestSuite[];
  publishedSuiteIds: string[];
} => {
  const suiteIds = options?.suiteIds ? new Set(options.suiteIds) : null;
  const publishedAt = options?.publishedAt ?? new Date().toISOString();
  const publishedSuiteIds: string[] = [];

  const nextSuites = suites.map((suite) => {
    if (suiteIds && !suiteIds.has(suite.id)) {
      return suite;
    }

    if (suite.publicationStatus === 'live') {
      return suite;
    }

    publishedSuiteIds.push(suite.id);
    return {
      ...suite,
      publicationStatus: 'live' as const,
      publishedAt: suite.publishedAt ?? publishedAt,
    };
  });

  return {
    suites: publishedSuiteIds.length > 0 ? nextSuites : suites,
    publishedSuiteIds,
  };
};

export const demoteKangurTestSuitesToDraft = (
  suites: KangurTestSuite[],
  options?: {
    suiteIds?: string[];
  }
): {
  suites: KangurTestSuite[];
  draftSuiteIds: string[];
} => {
  const suiteIds = options?.suiteIds ? new Set(options.suiteIds) : null;
  const draftSuiteIds: string[] = [];

  const nextSuites = suites.map((suite) => {
    if (suiteIds && !suiteIds.has(suite.id)) {
      return suite;
    }

    if (suite.publicationStatus !== 'live') {
      return suite;
    }

    draftSuiteIds.push(suite.id);
    return {
      ...suite,
      publicationStatus: 'draft' as const,
      publishedAt: undefined,
    };
  });

  return {
    suites: draftSuiteIds.length > 0 ? nextSuites : suites,
    draftSuiteIds,
  };
};

export const demoteInvalidLiveKangurTestSuites = (
  suites: KangurTestSuite[],
  questionStore: KangurTestQuestionStore,
  options?: {
    suiteIds?: string[];
  }
): {
  suites: KangurTestSuite[];
  draftSuiteIds: string[];
} => {
  const liveSuiteIds = suites
    .filter((suite) => isLiveKangurTestSuite(suite))
    .filter((suite) => hasFullyPublishedQuestionSetForSuite(questionStore, suite.id) === false)
    .map((suite) => suite.id);

  if (liveSuiteIds.length === 0) {
    return {
      suites,
      draftSuiteIds: [],
    };
  }

  const allowedSuiteIds = options?.suiteIds ? new Set(options.suiteIds) : null;
  const targetSuiteIds = allowedSuiteIds
    ? liveSuiteIds.filter((suiteId) => allowedSuiteIds.has(suiteId))
    : liveSuiteIds;

  if (targetSuiteIds.length === 0) {
    return {
      suites,
      draftSuiteIds: [],
    };
  }

  return demoteKangurTestSuitesToDraft(suites, {
    suiteIds: targetSuiteIds,
  });
};

export const upsertKangurTestSuite = (
  suites: KangurTestSuite[],
  next: KangurTestSuite
): KangurTestSuite[] => {
  const existingIndex = suites.findIndex((s) => s.id === next.id);
  if (existingIndex === -1) return [...suites, next];
  return suites.map((s) => (s.id === next.id ? next : s));
};
