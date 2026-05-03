import {
  useRegisterContextRegistryPageSource,
} from '@/shared/lib/ai-context-registry/page-context';

import {
  type buildKangurAdminLessonsManagerContextBundle,
  KANGUR_ADMIN_LESSONS_MANAGER_CONTEXT_ROOT_IDS,
} from './context-registry/lessons-manager';

function AdminKangurLessonsManagerRegistrySource({
  registrySource,
}: {
  registrySource:
    | {
        label: string;
        resolved: ReturnType<typeof buildKangurAdminLessonsManagerContextBundle>;
      }
    | null;
}): null {
  useRegisterContextRegistryPageSource('kangur-admin-lessons-manager-workspace', registrySource);
  return null;
}

const buildLessonsManagerErrorReport = (
  action: string,
  description: string,
  context?: Record<string, unknown>,
): {
  source: 'kangur-admin';
  action: string;
  description: string;
  context?: Record<string, unknown>;
} => ({
  source: 'kangur-admin',
  action,
  description,
  ...(context ? { context } : {}),
});

const KANGUR_ADMIN_LESSONS_MANAGER_ROOT_IDS = [
  ...KANGUR_ADMIN_LESSONS_MANAGER_CONTEXT_ROOT_IDS,
];

export {
  AdminKangurLessonsManagerRegistrySource,
  buildLessonsManagerErrorReport,
  KANGUR_ADMIN_LESSONS_MANAGER_ROOT_IDS,
};
