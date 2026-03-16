'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import type { KangurTestSuite } from '@/features/kangur/shared/contracts/kangur-tests';
import type { TestSuiteFormData } from '../../test-suites';
import { createInitialTestSuiteFormData } from '../../test-suites';
import type { KangurQuestionsManagerInitialView } from '../question-manager-view';
import type { TreeMode } from './test-suites-manager.contracts';
import { TREE_MODE_STORAGE_KEY } from './test-suites-manager.contracts';
import { internalError } from '@/features/kangur/shared/errors/app-error';
import { withKangurClientErrorSync } from '@/features/kangur/observability/client';


const readPersistedTreeMode = (): TreeMode => {
  if (typeof window === 'undefined') return 'ordered';
  return withKangurClientErrorSync(
    {
      source: 'kangur.admin.test-suites',
      action: 'read-tree-mode',
      description: 'Reads the test suites tree mode from local storage.',
    },
    () => {
      const v = window.localStorage.getItem(TREE_MODE_STORAGE_KEY);
      return v === 'catalog' ? 'catalog' : 'ordered';
    },
    { fallback: 'ordered' }
  );
};

type TestSuitesManagerContextValue = {
  showModal: boolean;
  setShowModal: (show: boolean) => void;
  showGroupModal: boolean;
  setShowGroupModal: (show: boolean) => void;
  editingSuite: KangurTestSuite | null;
  setEditingSuite: (suite: KangurTestSuite | null) => void;
  suiteToDelete: KangurTestSuite | null;
  setSuiteToDelete: (suite: KangurTestSuite | null) => void;
  editingGroupOriginalTitle: string | null;
  setEditingGroupOriginalTitle: (title: string | null) => void;
  groupToDeleteTitle: string | null;
  setGroupToDeleteTitle: (title: string | null) => void;
  suiteToMove: KangurTestSuite | null;
  setSuiteToMove: (suite: KangurTestSuite | null) => void;
  suiteMoveTargetGroupTitle: string;
  setSuiteMoveTargetGroupTitle: (title: string) => void;
  managingSuite: KangurTestSuite | null;
  setManagingSuite: (suite: KangurTestSuite | null) => void;
  managerInitialView: KangurQuestionsManagerInitialView | undefined;
  setManagerInitialView: (view: KangurQuestionsManagerInitialView | undefined) => void;
  formData: TestSuiteFormData;
  setFormData: React.Dispatch<React.SetStateAction<TestSuiteFormData>>;
  groupTitle: string;
  setGroupTitle: (title: string) => void;
  groupDescription: string;
  setGroupDescription: (desc: string) => void;
  showQuestionMoveModal: boolean;
  setShowQuestionMoveModal: (show: boolean) => void;
  questionMoveTargetSuiteId: string;
  setQuestionMoveTargetSuiteId: (id: string) => void;
  treeMode: TreeMode;
  setTreeMode: (mode: TreeMode) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
};

type TestSuitesManagerActionsContextValue = Pick<
  TestSuitesManagerContextValue,
  | 'setShowModal'
  | 'setShowGroupModal'
  | 'setEditingSuite'
  | 'setSuiteToDelete'
  | 'setEditingGroupOriginalTitle'
  | 'setGroupToDeleteTitle'
  | 'setSuiteToMove'
  | 'setSuiteMoveTargetGroupTitle'
  | 'setManagingSuite'
  | 'setManagerInitialView'
  | 'setFormData'
  | 'setGroupTitle'
  | 'setGroupDescription'
  | 'setShowQuestionMoveModal'
  | 'setQuestionMoveTargetSuiteId'
  | 'setTreeMode'
  | 'setSearchQuery'
>;

type TestSuitesManagerStateContextValue = Omit<
  TestSuitesManagerContextValue,
  keyof TestSuitesManagerActionsContextValue
>;

const TestSuitesManagerContext = createContext<TestSuitesManagerContextValue | null>(null);
const TestSuitesManagerStateContext =
  createContext<TestSuitesManagerStateContextValue | null>(null);
const TestSuitesManagerActionsContext =
  createContext<TestSuitesManagerActionsContextValue | null>(null);

export function TestSuitesManagerProvider({ children }: { children: React.ReactNode }) {
  const [showModal, setShowModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingSuite, setEditingSuite] = useState<KangurTestSuite | null>(null);
  const [suiteToDelete, setSuiteToDelete] = useState<KangurTestSuite | null>(null);
  const [editingGroupOriginalTitle, setEditingGroupOriginalTitle] = useState<string | null>(null);
  const [groupToDeleteTitle, setGroupToDeleteTitle] = useState<string | null>(null);
  const [suiteToMove, setSuiteToMove] = useState<KangurTestSuite | null>(null);
  const [suiteMoveTargetGroupTitle, setSuiteMoveTargetGroupTitle] = useState('');
  const [managingSuite, setManagingSuite] = useState<KangurTestSuite | null>(null);
  const [managerInitialView, setManagerInitialView] = useState<KangurQuestionsManagerInitialView | undefined>(undefined);
  const [formData, setFormData] = useState<TestSuiteFormData>(() => createInitialTestSuiteFormData());
  const [groupTitle, setGroupTitle] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [showQuestionMoveModal, setShowQuestionMoveModal] = useState(false);
  const [questionMoveTargetSuiteId, setQuestionMoveTargetSuiteId] = useState('');
  const [treeMode, setTreeMode] = useState<TreeMode>(() => readPersistedTreeMode());
  const [searchQuery, setSearchQuery] = useState('');

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    withKangurClientErrorSync(
      {
        source: 'kangur.admin.test-suites',
        action: 'persist-tree-mode',
        description: 'Persists the test suites tree mode in local storage.',
        context: { treeMode },
      },
      () => {
        window.localStorage.setItem(TREE_MODE_STORAGE_KEY, treeMode);
      },
      { fallback: undefined }
    );
  }, [treeMode]);

  const stateValue = useMemo<TestSuitesManagerStateContextValue>(
    () => ({
      showModal,
      showGroupModal,
      editingSuite,
      suiteToDelete,
      editingGroupOriginalTitle,
      groupToDeleteTitle,
      suiteToMove,
      suiteMoveTargetGroupTitle,
      managingSuite,
      managerInitialView,
      formData,
      groupTitle,
      groupDescription,
      showQuestionMoveModal,
      questionMoveTargetSuiteId,
      treeMode,
      searchQuery,
    }),
    [
      showModal,
      showGroupModal,
      editingSuite,
      suiteToDelete,
      editingGroupOriginalTitle,
      groupToDeleteTitle,
      suiteToMove,
      suiteMoveTargetGroupTitle,
      managingSuite,
      managerInitialView,
      formData,
      groupTitle,
      groupDescription,
      showQuestionMoveModal,
      questionMoveTargetSuiteId,
      treeMode,
      searchQuery,
    ]
  );

  const actionsValue = useMemo<TestSuitesManagerActionsContextValue>(
    () => ({
      setShowModal,
      setShowGroupModal,
      setEditingSuite,
      setSuiteToDelete,
      setEditingGroupOriginalTitle,
      setGroupToDeleteTitle,
      setSuiteToMove,
      setSuiteMoveTargetGroupTitle,
      setManagingSuite,
      setManagerInitialView,
      setFormData,
      setGroupTitle,
      setGroupDescription,
      setShowQuestionMoveModal,
      setQuestionMoveTargetSuiteId,
      setTreeMode,
      setSearchQuery,
    }),
    [
      setShowModal,
      setShowGroupModal,
      setEditingSuite,
      setSuiteToDelete,
      setEditingGroupOriginalTitle,
      setGroupToDeleteTitle,
      setSuiteToMove,
      setSuiteMoveTargetGroupTitle,
      setManagingSuite,
      setManagerInitialView,
      setFormData,
      setGroupTitle,
      setGroupDescription,
      setShowQuestionMoveModal,
      setQuestionMoveTargetSuiteId,
      setTreeMode,
      setSearchQuery,
    ]
  );

  const value = useMemo<TestSuitesManagerContextValue>(
    () => ({ ...stateValue, ...actionsValue }),
    [actionsValue, stateValue]
  );

  return (
    <TestSuitesManagerActionsContext.Provider value={actionsValue}>
      <TestSuitesManagerStateContext.Provider value={stateValue}>
        <TestSuitesManagerContext.Provider value={value}>
          {children}
        </TestSuitesManagerContext.Provider>
      </TestSuitesManagerStateContext.Provider>
    </TestSuitesManagerActionsContext.Provider>
  );
}

export function useTestSuitesManager() {
  const context = useContext(TestSuitesManagerContext);
  if (!context) {
    throw internalError('useTestSuitesManager must be used within a TestSuitesManagerProvider');
  }
  return context;
}

export function useTestSuitesManagerState(): TestSuitesManagerStateContextValue {
  const context = useContext(TestSuitesManagerStateContext);
  if (!context) {
    throw internalError(
      'useTestSuitesManagerState must be used within a TestSuitesManagerProvider'
    );
  }
  return context;
}

export function useTestSuitesManagerActions(): TestSuitesManagerActionsContextValue {
  const context = useContext(TestSuitesManagerActionsContext);
  if (!context) {
    throw internalError(
      'useTestSuitesManagerActions must be used within a TestSuitesManagerProvider'
    );
  }
  return context;
}
