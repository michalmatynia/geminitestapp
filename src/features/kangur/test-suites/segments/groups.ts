import {
  kangurTestGroupSchema,
  type KangurTestGroup,
  type KangurTestGroups,
  type KangurTestSuite,
} from '@/features/kangur/shared/contracts/kangur-tests';
import {
  KANGUR_TEST_GROUP_SORT_ORDER_GAP,
  normalizeKangurTestGroupTitle,
} from './shared';

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

export const resolveKangurTestSuiteGroupTitle = (
  suite: Pick<KangurTestSuite, 'category' | 'groupId'>,
  groupById?: Map<string, KangurTestGroup> | undefined
): string => {
  const group = suite.groupId ? groupById?.get(suite.groupId) : null;
  return normalizeKangurTestGroupTitle(group?.title ?? suite.category);
};
