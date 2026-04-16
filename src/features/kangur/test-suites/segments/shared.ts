import {
  KANGUR_TEST_GROUPS_SETTING_KEY,
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  KANGUR_TEST_SUITES_SETTING_KEY,
  kangurTestGroupsSchema,
  kangurTestSuitesSchema,
  type KangurTestGroup,
  type KangurTestSuite,
} from '@/features/kangur/shared/contracts/kangur-tests';
import { parseJsonSetting } from '@/features/kangur/utils/settings-json';

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

export const parseKangurTestSuites = (raw: unknown): KangurTestSuite[] => {
  const parsed = kangurTestSuitesSchema.safeParse(
    parseJsonSetting(typeof raw === 'string' ? raw : null, [])
  );
  return parsed.success ? parsed.data : [];
};
