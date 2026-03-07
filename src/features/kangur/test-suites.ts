import {
  KANGUR_TEST_SUITES_SETTING_KEY,
  kangurTestSuiteSchema,
  kangurTestSuitesSchema,
  type KangurTestSuite,
  type KangurTestSuites,
} from '@/shared/contracts/kangur-tests';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export { KANGUR_TEST_SUITES_SETTING_KEY };

export const KANGUR_TEST_SUITE_SORT_ORDER_GAP = 1000;

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
  overrides: Partial<Pick<KangurTestSuite, 'title' | 'description' | 'year' | 'gradeLevel' | 'category'>>,
  sortOrder = 0
): KangurTestSuite =>
  kangurTestSuiteSchema.parse({
    id: createKangurTestSuiteId(),
    title: overrides.title ?? 'New Test Suite',
    description: overrides.description ?? '',
    year: overrides.year ?? null,
    gradeLevel: overrides.gradeLevel ?? '',
    category: overrides.category ?? 'custom',
    enabled: true,
    sortOrder,
  });

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
};

export const createInitialTestSuiteFormData = (): TestSuiteFormData => ({
  title: '',
  description: '',
  year: '',
  gradeLevel: '',
  category: 'custom',
  enabled: true,
});

export const toTestSuiteFormData = (suite: KangurTestSuite): TestSuiteFormData => ({
  title: suite.title,
  description: suite.description,
  year: suite.year !== null ? String(suite.year) : '',
  gradeLevel: suite.gradeLevel,
  category: suite.category,
  enabled: suite.enabled,
});

export const formDataToTestSuite = (
  formData: TestSuiteFormData,
  id: string,
  sortOrder: number
): KangurTestSuite => {
  const year = formData.year.trim() ? parseInt(formData.year.trim(), 10) : null;
  return kangurTestSuiteSchema.parse({
    id,
    title: formData.title.trim(),
    description: formData.description.trim(),
    year: year !== null && Number.isFinite(year) ? year : null,
    gradeLevel: formData.gradeLevel.trim(),
    category: formData.category.trim() || 'custom',
    enabled: formData.enabled,
    sortOrder,
  });
};
