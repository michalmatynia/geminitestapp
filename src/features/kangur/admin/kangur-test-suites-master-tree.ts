import type { KangurTestSuite } from '@/features/kangur/shared/contracts/kangur-tests';
import type { MasterTreeNode } from '@/features/kangur/shared/utils/master-folder-tree-contract';
import type { LabeledOptionDto } from '@/shared/contracts/base';

import { KANGUR_TEST_SUITE_SORT_ORDER_GAP } from '../test-suites';

const SUITE_NODE_PREFIX = 'kangur-test-suite:';
const SUITE_GROUP_NODE_PREFIX = 'kangur-test-suite-group:';
const SUITE_CATEGORY_GROUP_NODE_PREFIX = 'kangur-test-suite-category-group:';

type SuiteVisibilityGroup = 'enabled' | 'disabled';

export const toKangurTestSuiteNodeId = (suiteId: string): string =>
  `${SUITE_NODE_PREFIX}${suiteId}`;

export const fromKangurTestSuiteNodeId = (nodeId: string): string | null => {
  if (!nodeId.startsWith(SUITE_NODE_PREFIX)) return null;
  const suiteId = nodeId.slice(SUITE_NODE_PREFIX.length).trim();
  return suiteId || null;
};

export const buildKangurTestSuiteMasterNodes = (suites: KangurTestSuite[]): MasterTreeNode[] =>
  [...suites]
    .sort((a, b) => {
      const delta = a.sortOrder - b.sortOrder;
      return delta !== 0 ? delta : a.id.localeCompare(b.id);
    })
    .map((suite, index) => ({
      id: toKangurTestSuiteNodeId(suite.id),
      type: 'file' as const,
      kind: 'kangur-test-suite',
      parentId: null,
      name: suite.title,
      path: suite.id,
      sortOrder: (index + 1) * KANGUR_TEST_SUITE_SORT_ORDER_GAP,
      metadata: {
        kangurTestSuite: {
          suiteId: suite.id,
          category: suite.category,
          year: suite.year,
          gradeLevel: suite.gradeLevel,
          enabled: suite.enabled,
        },
        search: {
          suiteId: suite.id,
          title: suite.title,
          description: suite.description,
          category: suite.category,
          gradeLevel: suite.gradeLevel,
          year: suite.year !== null ? String(suite.year) : '',
          visibility: suite.enabled ? 'enabled' : 'disabled',
        },
      },
    }));

const SUITE_VISIBILITY_GROUPS: Array<LabeledOptionDto<SuiteVisibilityGroup>> = [
  { value: 'enabled', label: 'Active suites' },
  { value: 'disabled', label: 'Disabled suites' },
];

const normalizeSuiteGroupLabel = (value: string): string => {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : 'custom';
};

const toKangurTestSuiteCategoryGroupNodeId = (
  visibility: SuiteVisibilityGroup,
  category: string
): string =>
  `${SUITE_CATEGORY_GROUP_NODE_PREFIX}${visibility}:${encodeURIComponent(
    normalizeSuiteGroupLabel(category)
  )}`;

export const buildKangurTestSuiteCatalogMasterNodes = (
  suites: KangurTestSuite[],
  groupTitleBySuiteId?: Map<string, string>
): MasterTreeNode[] => {
  const nodes: MasterTreeNode[] = [];
  let nextSortOrder = KANGUR_TEST_SUITE_SORT_ORDER_GAP;

  SUITE_VISIBILITY_GROUPS.forEach((group, groupIndex) => {
    const groupSuites = suites
      .filter((s) => (group.value === 'enabled' ? s.enabled : !s.enabled))
      .sort((a, b) => {
        const catDelta = a.category.localeCompare(b.category);
        if (catDelta !== 0) return catDelta;
        const orderDelta = a.sortOrder - b.sortOrder;
        return orderDelta !== 0 ? orderDelta : a.id.localeCompare(b.id);
      });

    const visibilityNodeId = `${SUITE_GROUP_NODE_PREFIX}${group.value}`;
    nodes.push({
      id: visibilityNodeId,
      type: 'folder',
      kind: 'kangur-test-suite-group',
      parentId: null,
      name: group.label,
      path: group.value,
      sortOrder: (groupIndex + 1) * KANGUR_TEST_SUITE_SORT_ORDER_GAP,
      metadata: {
        kangurTestSuiteGroup: { visibility: group.value, suiteCount: groupSuites.length },
        search: { visibility: group.value, groupLabel: group.label },
      },
    });

    const suitesByCategory = new Map<string, KangurTestSuite[]>();
    groupSuites.forEach((suite) => {
      const category = normalizeSuiteGroupLabel(
        groupTitleBySuiteId?.get(suite.id) ?? suite.category
      );
      const categorySuites = suitesByCategory.get(category) ?? [];
      categorySuites.push(suite);
      suitesByCategory.set(category, categorySuites);
    });

    Array.from(suitesByCategory.keys())
      .sort((a, b) => a.localeCompare(b))
      .forEach((category) => {
        const categoryNodeId = toKangurTestSuiteCategoryGroupNodeId(group.value, category);
        const categorySuites = suitesByCategory.get(category) ?? [];

        nodes.push({
          id: categoryNodeId,
          type: 'folder',
          kind: 'kangur-test-suite-category-group',
          parentId: visibilityNodeId,
          name: category,
          path: `${group.value}/${category}`,
          sortOrder: nextSortOrder,
          metadata: {
            kangurTestSuiteCategoryGroup: {
              visibility: group.value,
              category,
              suiteCount: categorySuites.length,
            },
            search: {
              visibility: group.value,
              category,
              groupLabel: category,
            },
          },
        });
        nextSortOrder += KANGUR_TEST_SUITE_SORT_ORDER_GAP;

        categorySuites.forEach((suite) => {
          nodes.push({
            id: toKangurTestSuiteNodeId(suite.id),
            type: 'file' as const,
            kind: 'kangur-test-suite',
            parentId: categoryNodeId,
            name: suite.title,
            path: `${group.value}/${category}/${suite.id}`,
            sortOrder: nextSortOrder,
            metadata: {
              kangurTestSuite: {
                suiteId: suite.id,
                category: suite.category,
                year: suite.year,
                gradeLevel: suite.gradeLevel,
                enabled: suite.enabled,
              },
              search: {
                suiteId: suite.id,
                title: suite.title,
                description: suite.description,
                category: suite.category,
                gradeLevel: suite.gradeLevel,
                year: suite.year !== null ? String(suite.year) : '',
                visibility: group.value,
              },
            },
          });
          nextSortOrder += KANGUR_TEST_SUITE_SORT_ORDER_GAP;
        });
      });
  });

  return nodes;
};

export const resolveKangurTestSuiteOrderFromNodes = (
  nextNodes: MasterTreeNode[],
  suiteById: Map<string, KangurTestSuite>
): KangurTestSuite[] => {
  const ordered = nextNodes
    .filter((n) => n.type === 'file' && n.kind === 'kangur-test-suite')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .flatMap((n) => {
      const suiteId = fromKangurTestSuiteNodeId(n.id);
      if (!suiteId) return [];
      const suite = suiteById.get(suiteId);
      return suite ? [suite] : [];
    });

  if (ordered.length === 0) {
    return [...suiteById.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  }

  return ordered.map((suite, index) => ({
    ...suite,
    sortOrder: (index + 1) * KANGUR_TEST_SUITE_SORT_ORDER_GAP,
  }));
};
