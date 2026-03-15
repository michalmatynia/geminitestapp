import React, { createContext, useContext, useState, useMemo } from 'react';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';
import type { TestSuiteFormData } from '../../test-suites';
import { createInitialTestSuiteFormData } from '../../test-suites';
import type { KangurQuestionsManagerInitialView } from '../question-manager-view';
import type { TreeMode } from './test-suites-manager.contracts';
import { TREE_MODE_STORAGE_KEY } from './test-suites-manager.contracts';

const readPersistedTreeMode = (): TreeMode => {
  if (typeof window === 'undefined') return 'ordered';
  try {
    const v = window.localStorage.getItem(TREE_MODE_STORAGE_KEY);
    return v === 'catalog' ? 'catalog' : 'ordered';
  } catch {
    return 'ordered';
  }
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

const TestSuitesManagerContext = createContext<TestSuitesManagerContextValue | null>(null);

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
    try {
      window.localStorage.setItem(TREE_MODE_STORAGE_KEY, treeMode);
    } catch { /* ignore */ }
  }, [treeMode]);

  const value = useMemo(() => ({
    showModal, setShowModal,
    showGroupModal, setShowGroupModal,
    editingSuite, setEditingSuite,
    suiteToDelete, setSuiteToDelete,
    editingGroupOriginalTitle, setEditingGroupOriginalTitle,
    groupToDeleteTitle, setGroupToDeleteTitle,
    suiteToMove, setSuiteToMove,
    suiteMoveTargetGroupTitle, setSuiteMoveTargetGroupTitle,
    managingSuite, setManagingSuite,
    managerInitialView, setManagerInitialView,
    formData, setFormData,
    groupTitle, setGroupTitle,
    groupDescription, setGroupDescription,
    showQuestionMoveModal, setShowQuestionMoveModal,
    questionMoveTargetSuiteId, setQuestionMoveTargetSuiteId,
    treeMode, setTreeMode,
    searchQuery, setSearchQuery,
  }), [
    showModal, showGroupModal, editingSuite, suiteToDelete, editingGroupOriginalTitle,
    groupToDeleteTitle, suiteToMove, suiteMoveTargetGroupTitle, managingSuite,
    managerInitialView, formData, groupTitle, groupDescription, showQuestionMoveModal,
    questionMoveTargetSuiteId, treeMode, searchQuery
  ]);

  return (
    <TestSuitesManagerContext.Provider value={value}>
      {children}
    </TestSuitesManagerContext.Provider>
  );
}

export function useTestSuitesManager() {
  const context = useContext(TestSuitesManagerContext);
  if (!context) {
    throw new Error('useTestSuitesManager must be used within a TestSuitesManagerProvider');
  }
  return context;
}
