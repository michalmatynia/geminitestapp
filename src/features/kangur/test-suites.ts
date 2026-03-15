import {
  KANGUR_TEST_GROUPS_SETTING_KEY,
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  KANGUR_TEST_SUITES_SETTING_KEY,
  kangurTestGroupSchema,
  kangurTestGroupsSchema,
  kangurTestSuiteSchema,
  kangurTestSuitesSchema,
  type KangurTestGroup,
  type KangurTestGroups,
  type KangurTestQuestionStore,
  type KangurTestSuite,
  type KangurTestSuites,
} from '@/shared/contracts/kangur-tests';
import { parseJsonSetting } from '@/features/kangur/utils/settings-json';

import { hasFullyPublishedQuestionSetForSuite } from './test-questions';

export {
  KANGUR_TEST_GROUPS_SETTING_KEY,
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  KANGUR_TEST_SUITES_SETTING_KEY,
};

export const KANGUR_TEST_GROUP_SORT_ORDER_GAP = 1000;
export const KANGUR_TEST_SUITE_SORT_ORDER_GAP = 1000;

export const normalizeKangurTestGroupTitle = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'custom';
};

export const parseKangurTestGroups = (raw: unknown): KangurTestGroup[] => {
  const parsed = kangurTestGroupsSchema.safeParse(
    parseJsonSetting(typeof raw === 'string' ? raw : null, [])
  );
  return parsed.success ? parsed.data : [];
};

export const canonicalizeKangurTestGroups = (groups: KangurTestGroup[]): KangurTestGroups =>
  [...groups]
    .sort((a, b) => {
      const orderDelta = a.sortOrder - b.sortOrder;
      if (orderDelta !== 0) return orderDelta;
      return a.id.localeCompare(b.id);
    })
    .map((group, index) => ({
      ...group,
      title: normalizeKangurTestGroupTitle(group.title),
      sortOrder: (index + 1) * KANGUR_TEST_GROUP_SORT_ORDER_GAP,
    }));

export const createKangurTestGroupId = (): string =>
  `ktg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export const createKangurTestGroup = (
  overrides: Partial<Pick<KangurTestGroup, 'title' | 'description'>>,
  sortOrder = 0
): KangurTestGroup =>
  kangurTestGroupSchema.parse({
    id: createKangurTestGroupId(),
    title: normalizeKangurTestGroupTitle(overrides.title ?? 'custom'),
    description: overrides.description ?? '',
    enabled: true,
    sortOrder,
  });

export const upsertKangurTestGroup = (
  groups: KangurTestGroup[],
  next: KangurTestGroup
): KangurTestGroup[] => {
  const existingIndex = groups.findIndex((group) => group.id === next.id);
  if (existingIndex === -1) return [...groups, next];
  return groups.map((group) => (group.id === next.id ? next : group));
};

export const buildResolvedKangurTestGroups = (
  suites: KangurTestSuite[],
  groups: KangurTestGroup[]
): KangurTestGroup[] => {
  const nextGroups = [...groups];
  const existingTitles = new Set(
    nextGroups.map((group) => normalizeKangurTestGroupTitle(group.title).toLowerCase())
  );

  suites.forEach((suite) => {
    const fallbackTitle = normalizeKangurTestGroupTitle(suite.category);
    if (existingTitles.has(fallbackTitle.toLowerCase())) {
      return;
    }

    existingTitles.add(fallbackTitle.toLowerCase());
    nextGroups.push(
      createKangurTestGroup(
        { title: fallbackTitle },
        (nextGroups.length + 1) * KANGUR_TEST_GROUP_SORT_ORDER_GAP
      )
    );
  });

  return canonicalizeKangurTestGroups(nextGroups);
};

export const resolveKangurTestSuiteGroupTitle = (
  suite: Pick<KangurTestSuite, 'category' | 'groupId'>,
  groupById?: Map<string, KangurTestGroup> | undefined
): string => {
  const group = suite.groupId ? groupById?.get(suite.groupId) : null;
  return normalizeKangurTestGroupTitle(group?.title ?? suite.category);
};

export const ensureKangurTestGroupForTitle = (
  groups: KangurTestGroup[],
  rawTitle: string
): { group: KangurTestGroup; groups: KangurTestGroup[]; created: boolean } => {
  const normalizedTitle = normalizeKangurTestGroupTitle(rawTitle);
  const existing = groups.find(
    (group) =>
      normalizeKangurTestGroupTitle(group.title).toLowerCase() === normalizedTitle.toLowerCase()
  );

  if (existing) {
    return { group: existing, groups, created: false };
  }

  const createdGroup = createKangurTestGroup(
    { title: normalizedTitle },
    (groups.length + 1) * KANGUR_TEST_GROUP_SORT_ORDER_GAP
  );
  return {
    group: createdGroup,
    groups: canonicalizeKangurTestGroups([...groups, createdGroup]),
    created: true,
  };
};

export const parseKangurTestSuites = (raw: unknown): KangurTestSuite[] => {
  const parsed = kangurTestSuitesSchema.safeParse(
    parseJsonSetting(typeof raw === 'string' ? raw : null, [])
  );
  return parsed.success ? parsed.data : [];
};

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

export type TestSuiteFormData = {
  title: string;
  description: string;
  year: string;
  gradeLevel: string;
  category: string;
  enabled: boolean;
  publicationStatus: KangurTestSuite['publicationStatus'];
  publishedAt?: string;
};

export const createInitialTestSuiteFormData = (): TestSuiteFormData => ({
  title: '',
  description: '',
  year: '',
  gradeLevel: '',
  category: 'custom',
  enabled: true,
  publicationStatus: 'draft',
});

export const toTestSuiteFormData = (
  suite: KangurTestSuite,
  groupById?: Map<string, KangurTestGroup> | undefined
): TestSuiteFormData => ({
  title: suite.title,
  description: suite.description,
  year: suite.year !== null ? String(suite.year) : '',
  gradeLevel: suite.gradeLevel,
  category: resolveKangurTestSuiteGroupTitle(suite, groupById),
  enabled: suite.enabled,
  publicationStatus: suite.publicationStatus,
  publishedAt: suite.publishedAt,
});

export const formDataToTestSuite = (
  formData: TestSuiteFormData,
  id: string,
  sortOrder: number,
  options?: {
    groupId?: string | undefined;
  }
): KangurTestSuite => {
  const year = formData.year.trim() ? parseInt(formData.year.trim(), 10) : null;
  return kangurTestSuiteSchema.parse({
    id,
    title: formData.title.trim(),
    description: formData.description.trim(),
    year: year !== null && Number.isFinite(year) ? year : null,
    gradeLevel: formData.gradeLevel.trim(),
    category: normalizeKangurTestGroupTitle(formData.category),
    ...(options?.groupId ? { groupId: options.groupId } : {}),
    enabled: formData.enabled,
    publicationStatus: formData.publicationStatus,
    publishedAt: formData.publicationStatus === 'live' ? formData.publishedAt : undefined,
    sortOrder,
  });
};
