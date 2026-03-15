import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';
import type { KangurQuestionsManagerInitialView } from '../question-manager-view';

export const ORDERED_TREE_INSTANCE = 'kangur_test_suites_manager';
export const CATALOG_TREE_INSTANCE = 'kangur_test_suites_manager_catalog';
export const TREE_MODE_STORAGE_KEY = 'kangur_test_suites_manager_tree_mode_v1';

export type TreeMode = 'ordered' | 'catalog';

export type LoginModalState = {
  authMode: any; // Using any for now to avoid deep import issues, will refine if needed
  isOpen: boolean;
  openLoginModal: (
    callbackUrl?: string | null,
    options?: { authMode?: any }
  ) => void;
};

export type TestSuiteManagerView = {
  managingSuite: KangurTestSuite | null;
  managerInitialView?: KangurQuestionsManagerInitialView;
};
