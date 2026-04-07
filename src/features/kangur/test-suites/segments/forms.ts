import {
  kangurTestSuiteSchema,
  type KangurTestGroup,
  type KangurTestSuite,
} from '@/features/kangur/shared/contracts/kangur-tests';
import { normalizeKangurTestGroupTitle } from './shared';
import { resolveKangurTestSuiteGroupTitle } from './groups';

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
