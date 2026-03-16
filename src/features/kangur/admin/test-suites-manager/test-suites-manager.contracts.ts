import type { KangurTestSuite } from '@/features/kangur/shared/contracts/kangur-tests';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';
import type { KangurQuestionsManagerInitialView } from '../question-manager-view';
import type { TreeMode } from '../types';

export const ORDERED_TREE_INSTANCE = 'kangur_test_suites_manager';
export const CATALOG_TREE_INSTANCE = 'kangur_test_suites_manager_catalog';
export const TREE_MODE_STORAGE_KEY = 'kangur_test_suites_manager_tree_mode_v1';

export type { TreeMode };

export type LoginModalState = {
  authMode: KangurAuthMode;
  isOpen: boolean;
  openLoginModal: (
    callbackUrl?: string | null,
    options?: { authMode?: KangurAuthMode }
  ) => void;
};

export type TestSuiteManagerView = {
  managingSuite: KangurTestSuite | null;
  managerInitialView?: KangurQuestionsManagerInitialView;
};
