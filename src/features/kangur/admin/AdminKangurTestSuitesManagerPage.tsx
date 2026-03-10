'use client';

import { AlertTriangle, ClipboardList, Folders, ListOrdered, Plus, Sparkles, WandSparkles } from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree';
import { FolderTreeSearchBar, useMasterFolderTreeSearch } from '@/features/foldertree';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import {
  Button,
  FolderTreePanel,
  FormModal,
  Input,
  Skeleton,
  useToast,
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';
import { cn } from '@/shared/utils';
import { logClientError } from '@/shared/utils/observability/client-error-logger';
import { serializeSetting } from '@/shared/utils/settings-json';


import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  deleteKangurTestSuiteQuestions,
  getQuestionsForSuite,
  parseKangurTestQuestionStore,
  publishReadyQuestions,
} from '../test-questions';
import {
  KANGUR_TEST_GROUPS_SETTING_KEY,
  KANGUR_TEST_SUITES_SETTING_KEY,
  KANGUR_TEST_SUITE_SORT_ORDER_GAP,
  buildResolvedKangurTestGroups,
  canonicalizeKangurTestGroups,
  canonicalizeKangurTestSuites,
  createKangurTestGroup,
  createKangurTestSuiteId,
  createInitialTestSuiteFormData,
  demoteInvalidLiveKangurTestSuites,
  demoteKangurTestSuitesToDraft,
  ensureKangurTestGroupForTitle,
  formDataToTestSuite,
  normalizeKangurTestGroupTitle,
  promoteKangurTestSuitesLive,
  parseKangurTestGroups,
  parseKangurTestSuites,
  resolveKangurTestSuiteGroupTitle,
  toTestSuiteFormData,
  upsertKangurTestGroup,
  upsertKangurTestSuite,
  type TestSuiteFormData,
} from '../test-suites';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';
import { KangurAdminMetricCard } from './components/KangurAdminMetricCard';
import { KangurAdminWorkspaceIntroCard } from './components/KangurAdminWorkspaceIntroCard';
import { TestSuiteMetadataForm } from './components/TestSuiteMetadataForm';
import { TestSuiteTreeRow } from './components/TestSuiteTreeRow';
import { KangurQuestionsManagerRuntimeProvider } from './context/KangurQuestionsManagerRuntimeContext';
import {
  buildKangurTestSuiteCatalogMasterNodes,
  buildKangurTestSuiteMasterNodes,
  resolveKangurTestSuiteOrderFromNodes,
} from './kangur-test-suites-master-tree';
import { KangurQuestionsManagerPanel } from './KangurQuestionsManagerPanel';
import { getQuestionAuthoringSummary } from './question-authoring-insights';
import {
  buildKangurTestSuiteHealthMap,
  getKangurTestLibraryHealthSummary,
} from './test-suite-health';
import { importLegacyKangurQuestions } from '../test-suites/import-legacy';

import type { KangurQuestionsManagerInitialView } from './question-manager-view';

const ORDERED_TREE_INSTANCE = 'kangur_test_suites_manager';
const CATALOG_TREE_INSTANCE = 'kangur_test_suites_manager_catalog';
const TREE_MODE_STORAGE_KEY = 'kangur_test_suites_manager_tree_mode_v1';

type TreeMode = 'ordered' | 'catalog';

const readPersistedTreeMode = (): TreeMode => {
  if (typeof window === 'undefined') return 'ordered';
  try {
    const v = window.localStorage.getItem(TREE_MODE_STORAGE_KEY);
    return v === 'catalog' ? 'catalog' : 'ordered';
  } catch {
    return 'ordered';
  }
};

export function AdminKangurTestSuitesManagerPage({
  standalone = true,
}: {
  standalone?: boolean;
}): React.JSX.Element {
  const settingsStore = useSettingsStore();
  const updateSetting = useUpdateSetting();
  const { toast } = useToast();

  const rawSuites = settingsStore.get(KANGUR_TEST_SUITES_SETTING_KEY);
  const rawQuestions = settingsStore.get(KANGUR_TEST_QUESTIONS_SETTING_KEY);
  const rawGroups = settingsStore.get(KANGUR_TEST_GROUPS_SETTING_KEY);

  const suites = useMemo(() => parseKangurTestSuites(rawSuites), [rawSuites]);
  const questionStore = useMemo(() => parseKangurTestQuestionStore(rawQuestions), [rawQuestions]);
  const groups = useMemo(() => parseKangurTestGroups(rawGroups), [rawGroups]);
  const resolvedGroups = useMemo(
    () => buildResolvedKangurTestGroups(suites, groups),
    [groups, suites]
  );
  const groupById = useMemo(
    () => new Map(resolvedGroups.map((group) => [group.id, group])),
    [resolvedGroups]
  );
  const groupTitleBySuiteId = useMemo(() => {
    const map = new Map<string, string>();
    suites.forEach((suite) => {
      map.set(suite.id, resolveKangurTestSuiteGroupTitle(suite, groupById));
    });
    return map;
  }, [groupById, suites]);
  const suiteById = useMemo(() => new Map(suites.map((s) => [s.id, s])), [suites]);
  const questionCountBySuiteId = useMemo((): Map<string, number> => {
    const map = new Map<string, number>();
    for (const suite of suites) {
      map.set(suite.id, getQuestionsForSuite(questionStore, suite.id).length);
    }
    return map;
  }, [suites, questionStore]);
  const allQuestions = useMemo(() => Object.values(questionStore), [questionStore]);
  const suiteHealthById = useMemo(
    () => buildKangurTestSuiteHealthMap(suites, allQuestions),
    [allQuestions, suites]
  );
  const libraryHealthSummary = useMemo(
    () => getKangurTestLibraryHealthSummary(suites, suiteHealthById),
    [suiteHealthById, suites]
  );
  const publishableQuestionIdsBySuiteId = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const question of allQuestions) {
      const summary = getQuestionAuthoringSummary(question);
      if (question.editorial.workflowStatus !== 'ready' || summary.status !== 'ready') {
        continue;
      }

      const suiteQuestionIds = map.get(question.suiteId) ?? [];
      suiteQuestionIds.push(question.id);
      map.set(question.suiteId, suiteQuestionIds);
    }
    return map;
  }, [allQuestions]);
  const totalPublishableQuestionCount = useMemo(
    () =>
      Array.from(publishableQuestionIdsBySuiteId.values()).reduce(
        (sum, questionIds) => sum + questionIds.length,
        0
      ),
    [publishableQuestionIdsBySuiteId]
  );
  const liveReadySuiteIds = useMemo(
    () =>
      suites
        .filter((suite) => suiteHealthById.get(suite.id)?.canGoLive)
        .map((suite) => suite.id),
    [suiteHealthById, suites]
  );
  const liveSuiteIds = useMemo(
    () =>
      suites
        .filter((suite) => suiteHealthById.get(suite.id)?.isLive)
        .map((suite) => suite.id),
    [suiteHealthById, suites]
  );

  const [showModal, setShowModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [editingSuite, setEditingSuite] = useState<KangurTestSuite | null>(null);
  const [suiteToDelete, setSuiteToDelete] = useState<KangurTestSuite | null>(null);
  const [editingGroupOriginalTitle, setEditingGroupOriginalTitle] = useState<string | null>(null);
  const [groupToDeleteTitle, setGroupToDeleteTitle] = useState<string | null>(null);
  const [suiteToMove, setSuiteToMove] = useState<KangurTestSuite | null>(null);
  const [suiteMoveTargetGroupTitle, setSuiteMoveTargetGroupTitle] = useState('');
  const [managingSuite, setManagingSuite] = useState<KangurTestSuite | null>(null);
  const [managerInitialView, setManagerInitialView] =
    useState<KangurQuestionsManagerInitialView | undefined>(undefined);
  const [formData, setFormData] = useState<TestSuiteFormData>(() =>
    createInitialTestSuiteFormData()
  );
  const [groupTitle, setGroupTitle] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [showQuestionMoveModal, setShowQuestionMoveModal] = useState(false);
  const [questionMoveTargetSuiteId, setQuestionMoveTargetSuiteId] = useState('');
  const [treeMode, setTreeMode] = useState<TreeMode>(() => readPersistedTreeMode());
  const [searchQuery, setSearchQuery] = useState('');

  const isCatalogMode = treeMode === 'catalog';
  const activeTreeInstance = isCatalogMode ? CATALOG_TREE_INSTANCE : ORDERED_TREE_INSTANCE;

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(TREE_MODE_STORAGE_KEY, treeMode);
    } catch {
      /* ignore */
    }
  }, [treeMode]);

  const masterNodes = useMemo(
    () =>
      isCatalogMode
        ? buildKangurTestSuiteCatalogMasterNodes(suites, groupTitleBySuiteId)
        : buildKangurTestSuiteMasterNodes(suites),
    [groupTitleBySuiteId, isCatalogMode, suites]
  );

  const adapter = useMemo(
    () =>
      createMasterFolderTreeTransactionAdapter({
        onApply: async (transaction): Promise<void> => {
          if (isCatalogMode) return;
          const internalAdapter = createMasterFolderTreeTransactionAdapter({ onApply: () => {} });
          const applied = await internalAdapter.apply(transaction, {
            tx: transaction,
            preparedAt: Date.now(),
          });
          if (!applied?.nodes) return;
          const nextOrder = resolveKangurTestSuiteOrderFromNodes(applied.nodes, suiteById);
          const nextSuites = canonicalizeKangurTestSuites(
            suites.map((s) => ({
              ...s,
              sortOrder:
                (nextOrder.findIndex((ns) => ns.id === s.id) + 1) *
                KANGUR_TEST_SUITE_SORT_ORDER_GAP,
            }))
          );
          await updateSetting.mutateAsync({
            key: KANGUR_TEST_SUITES_SETTING_KEY,
            value: serializeSetting(nextSuites),
          });
        },
      }),
    [isCatalogMode, suiteById, suites, updateSetting]
  );

  const {
    controller,
    capabilities,
    appearance: { rootDropUi },
    viewport: { scrollToNodeRef },
  } = useMasterFolderTreeShell({ instance: activeTreeInstance, nodes: masterNodes, adapter });

  const searchState = useMasterFolderTreeSearch(masterNodes, searchQuery, {
    config: capabilities.search,
  });
  const orderedSuites = useMemo(
    () =>
      [...suites].sort((a, b) => {
        const delta = a.sortOrder - b.sortOrder;
        return delta !== 0 ? delta : a.id.localeCompare(b.id);
      }),
    [suites]
  );
  const firstSuiteNeedingAttention = useMemo(
    () =>
      orderedSuites.find((suite) => {
        const health = suiteHealthById.get(suite.id);
        return health?.status === 'needs-fix' || health?.status === 'needs-review';
      }) ?? null,
    [orderedSuites, suiteHealthById]
  );
  const firstFixQuestion = useMemo(() => {
    for (const suite of orderedSuites) {
      const firstQuestion = getQuestionsForSuite(questionStore, suite.id).find(
        (question) => getQuestionAuthoringSummary(question).status === 'needs-fix'
      );
      if (firstQuestion) {
        return { suite, questionId: firstQuestion.id };
      }
    }
    return null;
  }, [orderedSuites, questionStore]);

  const openQuestionsManager = useCallback(
    (suite: KangurTestSuite, initialView?: KangurQuestionsManagerInitialView): void => {
      setManagingSuite(suite);
      setManagerInitialView(initialView);
    },
    []
  );

  const openCreateModal = (): void => {
    setEditingSuite(null);
    setFormData(createInitialTestSuiteFormData());
    setShowModal(true);
  };

  const openCreateGroupModal = (): void => {
    setEditingGroupOriginalTitle(null);
    setGroupTitle('');
    setGroupDescription('');
    setShowGroupModal(true);
  };

  const openEditGroupModal = useCallback(
    (title: string): void => {
      const normalizedTitle = normalizeKangurTestGroupTitle(title);
      const persistedGroup =
        groups.find(
          (group) =>
            normalizeKangurTestGroupTitle(group.title).toLowerCase() ===
            normalizedTitle.toLowerCase()
        ) ?? null;

      setEditingGroupOriginalTitle(normalizedTitle);
      setGroupTitle(persistedGroup?.title ?? normalizedTitle);
      setGroupDescription(persistedGroup?.description ?? '');
    },
    [groups]
  );

  const closeGroupMetadataPanel = useCallback((): void => {
    setEditingGroupOriginalTitle(null);
    setGroupTitle('');
    setGroupDescription('');
  }, []);

  const openMoveSuiteModal = useCallback(
    (suite: KangurTestSuite): void => {
      setSuiteToMove(suite);
      setSuiteMoveTargetGroupTitle(resolveKangurTestSuiteGroupTitle(suite, groupById));
    },
    [groupById]
  );

  const openEditModal = (suite: KangurTestSuite): void => {
    setEditingSuite(suite);
    setFormData(toTestSuiteFormData(suite, groupById));
    setShowModal(true);
  };

  const handleOpenReviewQueue = useCallback((): void => {
    if (!firstSuiteNeedingAttention) return;
    openQuestionsManager(firstSuiteNeedingAttention, {
      sortMode: 'review-queue',
    });
  }, [firstSuiteNeedingAttention, openQuestionsManager]);

  const handleOpenFirstFix = useCallback((): void => {
    if (!firstFixQuestion) return;
    openQuestionsManager(firstFixQuestion.suite, {
      listFilter: 'needs-fix',
      sortMode: 'review-queue',
      autoOpenQuestionId: firstFixQuestion.questionId,
    });
  }, [firstFixQuestion, openQuestionsManager]);

  const handlePublishReadyForSuite = useCallback(
    async (suite: KangurTestSuite): Promise<void> => {
      const publishableQuestionIds = publishableQuestionIdsBySuiteId.get(suite.id) ?? [];
      if (publishableQuestionIds.length === 0) {
        toast('No structurally ready questions are waiting to publish in this suite.', {
          variant: 'info',
        });
        return;
      }

      try {
        const { store: nextStore, publishedQuestionIds } = publishReadyQuestions(questionStore, {
          suiteId: suite.id,
          questionIds: publishableQuestionIds,
        });
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
          value: serializeSetting(nextStore),
        });
        toast(
          `Published ${publishedQuestionIds.length} ready question${publishedQuestionIds.length === 1 ? '' : 's'} in ${suite.title}.`,
          { variant: 'success' }
        );
      } catch (error) {
        logClientError(error, {
          context: {
            source: 'AdminKangurTestSuitesManagerPage',
            action: 'publishReadyForSuite',
            suiteId: suite.id,
          },
        });
        toast('Failed to publish ready questions.', { variant: 'error' });
      }
    },
    [publishableQuestionIdsBySuiteId, questionStore, toast, updateSetting]
  );

  const handlePublishReadyQueue = useCallback(async (): Promise<void> => {
    if (totalPublishableQuestionCount === 0) {
      toast('No structurally ready questions are waiting to publish.', { variant: 'info' });
      return;
    }

    const publishableQuestionIds = Array.from(publishableQuestionIdsBySuiteId.values()).flat();
    try {
      const { store: nextStore, publishedQuestionIds } = publishReadyQuestions(questionStore, {
        questionIds: publishableQuestionIds,
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });
      toast(
        `Published ${publishedQuestionIds.length} ready question${publishedQuestionIds.length === 1 ? '' : 's'} across the Kangur test bank.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'publishReadyQueue' },
      });
      toast('Failed to publish ready questions.', { variant: 'error' });
    }
  }, [
    publishableQuestionIdsBySuiteId,
    questionStore,
    toast,
    totalPublishableQuestionCount,
    updateSetting,
  ]);

  const handleGoLiveSuite = useCallback(
    async (suite: KangurTestSuite): Promise<void> => {
      const suiteHealth = suiteHealthById.get(suite.id);
      if (!suiteHealth?.canGoLive) {
        toast('This suite must be enabled and fully published before it can go live.', {
          variant: 'info',
        });
        return;
      }

      try {
        const { suites: nextSuites, publishedSuiteIds } = promoteKangurTestSuitesLive(suites, {
          suiteIds: [suite.id],
        });
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_SUITES_SETTING_KEY,
          value: serializeSetting(canonicalizeKangurTestSuites(nextSuites)),
        });
        toast(
          `Suite ${suite.title} is now live for learners (${publishedSuiteIds.length} suite updated).`,
          { variant: 'success' }
        );
      } catch (error) {
        logClientError(error, {
          context: { source: 'AdminKangurTestSuitesManagerPage', action: 'goLiveSuite', suiteId: suite.id },
        });
        toast('Failed to mark suite live.', { variant: 'error' });
      }
    },
    [suiteHealthById, suites, toast, updateSetting]
  );

  const handleGoLiveReadySuites = useCallback(async (): Promise<void> => {
    if (liveReadySuiteIds.length === 0) {
      toast('No enabled fully published suites are ready to go live.', { variant: 'info' });
      return;
    }

    try {
      const { suites: nextSuites, publishedSuiteIds } = promoteKangurTestSuitesLive(suites, {
        suiteIds: liveReadySuiteIds,
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_SUITES_SETTING_KEY,
        value: serializeSetting(canonicalizeKangurTestSuites(nextSuites)),
      });
      toast(
        `Marked ${publishedSuiteIds.length} suite${publishedSuiteIds.length === 1 ? '' : 's'} live for learners.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'goLiveReadySuites' },
      });
      toast('Failed to mark suites live.', { variant: 'error' });
    }
  }, [liveReadySuiteIds, suites, toast, updateSetting]);

  const handleTakeSuiteOffline = useCallback(
    async (suite: KangurTestSuite): Promise<void> => {
      const suiteHealth = suiteHealthById.get(suite.id);
      if (!suiteHealth?.isLive) {
        toast('This suite is already offline for learners.', { variant: 'info' });
        return;
      }

      try {
        const { suites: nextSuites, draftSuiteIds } = demoteKangurTestSuitesToDraft(suites, {
          suiteIds: [suite.id],
        });
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_SUITES_SETTING_KEY,
          value: serializeSetting(canonicalizeKangurTestSuites(nextSuites)),
        });
        toast(
          `Suite ${suite.title} is now offline for learners (${draftSuiteIds.length} suite updated).`,
          { variant: 'success' }
        );
      } catch (error) {
        logClientError(error, {
          context: { source: 'AdminKangurTestSuitesManagerPage', action: 'takeSuiteOffline', suiteId: suite.id },
        });
        toast('Failed to take suite offline.', { variant: 'error' });
      }
    },
    [suiteHealthById, suites, toast, updateSetting]
  );

  const handleTakeLiveSuitesOffline = useCallback(async (): Promise<void> => {
    if (liveSuiteIds.length === 0) {
      toast('No live suites are currently exposed to learners.', { variant: 'info' });
      return;
    }

    try {
      const { suites: nextSuites, draftSuiteIds } = demoteKangurTestSuitesToDraft(suites, {
        suiteIds: liveSuiteIds,
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_SUITES_SETTING_KEY,
        value: serializeSetting(canonicalizeKangurTestSuites(nextSuites)),
      });
      toast(
        `Took ${draftSuiteIds.length} live suite${draftSuiteIds.length === 1 ? '' : 's'} offline for learners.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'takeLiveSuitesOffline' },
      });
      toast('Failed to take live suites offline.', { variant: 'error' });
    }
  }, [liveSuiteIds, suites, toast, updateSetting]);

  const handleSaveSuite = async (): Promise<void> => {
    try {
      const id = editingSuite?.id ?? createKangurTestSuiteId();
      const sortOrder = editingSuite?.sortOrder ?? suites.length * KANGUR_TEST_SUITE_SORT_ORDER_GAP;
      const ensuredGroup = ensureKangurTestGroupForTitle(groups, formData.category);
      const next = formDataToTestSuite(formData, id, sortOrder, {
        groupId: ensuredGroup.group.id,
      });
      const nextSuites = canonicalizeKangurTestSuites(upsertKangurTestSuite(suites, next));
      if (ensuredGroup.created) {
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_GROUPS_SETTING_KEY,
          value: serializeSetting(ensuredGroup.groups),
        });
      }
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_SUITES_SETTING_KEY,
        value: serializeSetting(nextSuites),
      });
      toast(editingSuite ? 'Suite updated.' : 'Suite created.', { variant: 'success' });
      setShowModal(false);
      setEditingSuite(null);
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'saveSuite' },
      });
      toast('Failed to save suite.', { variant: 'error' });
    }
  };

  const handleSaveGroup = async (): Promise<void> => {
    try {
      const normalizedTitle = normalizeKangurTestGroupTitle(groupTitle);
      const normalizedOriginalTitle = editingGroupOriginalTitle
        ? normalizeKangurTestGroupTitle(editingGroupOriginalTitle)
        : null;
      const duplicateGroup = groups.find((group) => {
        const candidateTitle = normalizeKangurTestGroupTitle(group.title).toLowerCase();
        return (
          candidateTitle === normalizedTitle.toLowerCase() &&
          candidateTitle !== normalizedOriginalTitle?.toLowerCase()
        );
      });

      if (duplicateGroup) {
        toast('Test group already exists.', { variant: 'info' });
        return;
      }

      const matchingPersistedGroup =
        normalizedOriginalTitle === null
          ? null
          : groups.find(
            (group) =>
              normalizeKangurTestGroupTitle(group.title).toLowerCase() ===
                normalizedOriginalTitle.toLowerCase()
          ) ?? null;

      const nextGroup =
        matchingPersistedGroup !== null
          ? {
            ...matchingPersistedGroup,
            title: normalizedTitle,
            description: groupDescription.trim(),
          }
          : createKangurTestGroup(
            { title: normalizedTitle, description: groupDescription.trim() },
            (groups.length + 1) * 1000
          );

      const nextGroups = canonicalizeKangurTestGroups(
        matchingPersistedGroup !== null
          ? upsertKangurTestGroup(groups, nextGroup)
          : [...groups, nextGroup]
      );

      const nextSuites =
        normalizedOriginalTitle === null
          ? suites
          : canonicalizeKangurTestSuites(
            suites.map((suite) => {
              const resolvedTitle = normalizeKangurTestGroupTitle(
                resolveKangurTestSuiteGroupTitle(suite, groupById)
              );
              if (resolvedTitle.toLowerCase() !== normalizedOriginalTitle.toLowerCase()) {
                return suite;
              }

              return {
                ...suite,
                category: normalizedTitle,
                groupId: nextGroup.id,
              };
            })
          );

      await updateSetting.mutateAsync({
        key: KANGUR_TEST_GROUPS_SETTING_KEY,
        value: serializeSetting(nextGroups),
      });
      if (normalizedOriginalTitle !== null) {
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_SUITES_SETTING_KEY,
          value: serializeSetting(nextSuites),
        });
      }
      toast(normalizedOriginalTitle === null ? 'Test group created.' : 'Test group updated.', {
        variant: 'success',
      });
      setShowGroupModal(false);
      setEditingGroupOriginalTitle(null);
      setGroupTitle('');
      setGroupDescription('');
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'saveGroup' },
      });
      toast('Failed to save test group.', { variant: 'error' });
    }
  };

  const handleDeleteGroup = async (): Promise<void> => {
    if (!groupToDeleteTitle) return;

    const normalizedTitle = normalizeKangurTestGroupTitle(groupToDeleteTitle);
    const linkedSuites = suites.filter(
      (suite) =>
        normalizeKangurTestGroupTitle(resolveKangurTestSuiteGroupTitle(suite, groupById)).toLowerCase() ===
        normalizedTitle.toLowerCase()
    );

    if (linkedSuites.length > 0) {
      toast('Move suites out of this group before deleting it.', { variant: 'info' });
      return;
    }

    const nextGroups = groups.filter(
      (group) =>
        normalizeKangurTestGroupTitle(group.title).toLowerCase() !== normalizedTitle.toLowerCase()
    );

    if (nextGroups.length === groups.length) {
      toast('Only persisted test groups can be deleted.', { variant: 'info' });
      setGroupToDeleteTitle(null);
      return;
    }

    try {
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_GROUPS_SETTING_KEY,
        value: serializeSetting(nextGroups),
      });
      toast('Test group deleted.', { variant: 'success' });
      setGroupToDeleteTitle(null);
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'deleteGroup' },
      });
      toast('Failed to delete test group.', { variant: 'error' });
    }
  };

  const handleMoveSuiteToGroup = async (): Promise<void> => {
    if (!suiteToMove) return;

    const normalizedTitle = normalizeKangurTestGroupTitle(suiteMoveTargetGroupTitle);
    const currentGroupTitle = normalizeKangurTestGroupTitle(
      resolveKangurTestSuiteGroupTitle(suiteToMove, groupById)
    );
    if (normalizedTitle.toLowerCase() === currentGroupTitle.toLowerCase()) {
      toast('Suite is already in this group.', { variant: 'info' });
      return;
    }

    try {
      const ensuredGroup = ensureKangurTestGroupForTitle(groups, normalizedTitle);
      if (ensuredGroup.created) {
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_GROUPS_SETTING_KEY,
          value: serializeSetting(ensuredGroup.groups),
        });
      }

      const nextSuites = canonicalizeKangurTestSuites(
        suites.map((suite) =>
          suite.id === suiteToMove.id
            ? {
              ...suite,
              category: normalizedTitle,
              groupId: ensuredGroup.group.id,
            }
            : suite
        )
      );

      await updateSetting.mutateAsync({
        key: KANGUR_TEST_SUITES_SETTING_KEY,
        value: serializeSetting(nextSuites),
      });
      toast(`Moved ${suiteToMove.title} to ${normalizedTitle}.`, { variant: 'success' });
      setSuiteToMove(null);
      setSuiteMoveTargetGroupTitle('');
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'moveSuiteToGroup' },
      });
      toast('Failed to move suite to group.', { variant: 'error' });
    }
  };

  const handleDeleteSuite = async (): Promise<void> => {
    if (!suiteToDelete) return;
    try {
      const nextSuites = canonicalizeKangurTestSuites(
        suites.filter((s) => s.id !== suiteToDelete.id)
      );
      const nextQuestions = deleteKangurTestSuiteQuestions(questionStore, suiteToDelete.id);
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_SUITES_SETTING_KEY,
        value: serializeSetting(nextSuites),
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextQuestions),
      });
      toast('Suite deleted.', { variant: 'success' });
      setSuiteToDelete(null);
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'deleteSuite' },
      });
      toast('Failed to delete suite.', { variant: 'error' });
    }
  };

  const handleImportLegacy = async (): Promise<void> => {
    try {
      const { suites: importedSuites, questionStore: importedQuestions, summary } =
        importLegacyKangurQuestions();
      const nextSuites = canonicalizeKangurTestSuites([...suites, ...importedSuites]);
      const nextQuestions = { ...questionStore, ...importedQuestions };
      const nextGroups = buildResolvedKangurTestGroups(nextSuites, groups);
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_GROUPS_SETTING_KEY,
        value: serializeSetting(nextGroups),
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_SUITES_SETTING_KEY,
        value: serializeSetting(nextSuites),
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextQuestions),
      });
      toast(
        `Imported ${importedSuites.length} suites and ${summary.questionCount} questions. ${summary.needsReviewCount} need review, ${summary.needsFixCount} need fixes.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'importLegacy' },
      });
      toast('Failed to import legacy data.', { variant: 'error' });
    }
  };

  const handleBulkMoveQuestions = async (): Promise<void> => {
    if (!managingSuite) return;
    const targetSuite = suites.find((suite) => suite.id === questionMoveTargetSuiteId) ?? null;

    if (!targetSuite) {
      toast('Choose a destination suite first.', { variant: 'info' });
      return;
    }

    if (targetSuite.id === managingSuite.id) {
      toast('Questions are already in this suite.', { variant: 'info' });
      return;
    }

    const sourceQuestions = [...getQuestionsForSuite(questionStore, managingSuite.id)].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );

    if (sourceQuestions.length === 0) {
      toast('This suite does not have any questions to move.', { variant: 'info' });
      return;
    }

    const targetQuestions = [...getQuestionsForSuite(questionStore, targetSuite.id)].sort(
      (a, b) => a.sortOrder - b.sortOrder
    );

    let nextSortOrder = targetQuestions.at(-1)?.sortOrder ?? 0;
    const nextQuestionStore = { ...questionStore };

    sourceQuestions.forEach((question) => {
      nextSortOrder += KANGUR_TEST_SUITE_SORT_ORDER_GAP;
      nextQuestionStore[question.id] = {
        ...question,
        suiteId: targetSuite.id,
        sortOrder: nextSortOrder,
      };
    });

    try {
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextQuestionStore),
      });

      const demotion = demoteInvalidLiveKangurTestSuites(suites, nextQuestionStore, {
        suiteIds: [managingSuite.id, targetSuite.id],
      });
      if (demotion.draftSuiteIds.length > 0) {
        await updateSetting.mutateAsync({
          key: KANGUR_TEST_SUITES_SETTING_KEY,
          value: serializeSetting(canonicalizeKangurTestSuites(demotion.suites)),
        });
      }

      toast(
        `Moved ${sourceQuestions.length} question${sourceQuestions.length === 1 ? '' : 's'} to ${targetSuite.title}.`,
        { variant: 'success' }
      );
      setShowQuestionMoveModal(false);
      setQuestionMoveTargetSuiteId('');
      setManagingSuite(targetSuite);
      setManagerInitialView(undefined);
    } catch (error) {
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'bulkMoveQuestions' },
      });
      toast('Failed to move questions to another suite.', { variant: 'error' });
    }
  };

  const isSaveDisabled =
    !formData.title.trim() || !formData.category.trim() || updateSetting.isPending;
  const isGroupSaveDisabled = !groupTitle.trim() || updateSetting.isPending;
  const activeGroupSuiteCount = editingGroupOriginalTitle
    ? suites.filter(
      (suite) =>
        normalizeKangurTestGroupTitle(resolveKangurTestSuiteGroupTitle(suite, groupById)).toLowerCase() ===
          normalizeKangurTestGroupTitle(editingGroupOriginalTitle).toLowerCase()
    ).length
    : 0;
  const currentManagedSuiteQuestionCount = managingSuite
    ? getQuestionsForSuite(questionStore, managingSuite.id).length
    : 0;

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <TestSuiteTreeRow
        input={input}
        suiteById={suiteById}
        groupTitleBySuiteId={groupTitleBySuiteId}
        questionCountBySuiteId={questionCountBySuiteId}
        suiteHealthById={suiteHealthById}
        onEditGroup={openEditGroupModal}
        onDeleteGroup={setGroupToDeleteTitle}
        onMoveSuiteToGroup={openMoveSuiteModal}
        onEdit={openEditModal}
        onManageQuestions={(suite) => openQuestionsManager(suite)}
        onGoLive={(suite) => {
          void handleGoLiveSuite(suite);
        }}
        onTakeOffline={(suite) => {
          void handleTakeSuiteOffline(suite);
        }}
        onPublishReady={(suite) => {
          void handlePublishReadyForSuite(suite);
        }}
        onReviewQueue={(suite) =>
          openQuestionsManager(suite, {
            sortMode: 'review-queue',
          })
        }
        onDelete={setSuiteToDelete}
        isUpdating={updateSetting.isPending}
      />
    ),
    [
      handleGoLiveSuite,
      handleTakeSuiteOffline,
      handlePublishReadyForSuite,
      groupTitleBySuiteId,
      openQuestionsManager,
      openMoveSuiteModal,
      questionCountBySuiteId,
      suiteById,
      suiteHealthById,
      updateSetting.isPending,
    ]
  );

  // Questions manager slide-in
  if (managingSuite) {
    const targetSuites = suites.filter((suite) => suite.id !== managingSuite.id);
    const questionsContent = (
      <div className='flex h-full flex-col gap-4 overflow-hidden'>
        <div className='overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(10,18,32,0.96),rgba(22,29,58,0.88))] p-6 shadow-[0_24px_80px_-46px_rgba(168,85,247,0.38)]'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='max-w-3xl space-y-2'>
              <div className='text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-200/80'>
                Suite authoring workspace
              </div>
              <div className='text-lg font-semibold text-white'>Suite operations</div>
              <div className='text-sm leading-6 text-slate-300'>
                Move the entire question set into another suite, including suites in other test groups.
              </div>
            </div>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 rounded-full border px-3 text-xs font-semibold tracking-wide text-violet-200 hover:bg-violet-900/30'
              onClick={(): void => {
                setQuestionMoveTargetSuiteId('');
                setShowQuestionMoveModal(true);
              }}
              disabled={updateSetting.isPending || currentManagedSuiteQuestionCount === 0}
            >
              Move all {currentManagedSuiteQuestionCount} questions
            </Button>
          </div>
        </div>
        <div className='flex-1 overflow-hidden rounded-[28px] border border-border/60 bg-card/20 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]'>
          <KangurQuestionsManagerRuntimeProvider
            suite={managingSuite}
            onClose={(): void => {
              setManagingSuite(null);
              setManagerInitialView(undefined);
            }}
            initialView={managerInitialView}
          >
            <KangurQuestionsManagerPanel />
          </KangurQuestionsManagerRuntimeProvider>
        </div>
        <FormModal
          isOpen={showQuestionMoveModal}
          onClose={(): void => {
            setShowQuestionMoveModal(false);
            setQuestionMoveTargetSuiteId('');
          }}
          title='Move Questions To Another Suite'
          subtitle='Bulk-move the full question set from the current suite into another destination suite.'
          onSave={(): void => {
            void handleBulkMoveQuestions();
          }}
          isSaving={updateSetting.isPending}
          isSaveDisabled={!questionMoveTargetSuiteId || updateSetting.isPending}
          saveText='Move Questions'
        >
          <div className='space-y-4'>
            <div className='rounded-xl border border-border/50 bg-background/30 p-3 text-sm text-muted-foreground'>
              Source suite: <span className='font-semibold text-white'>{managingSuite.title}</span>
            </div>
            <select
              value={questionMoveTargetSuiteId}
              onChange={(event): void => setQuestionMoveTargetSuiteId(event.target.value)}
              className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm'
            >
              <option value=''>Choose destination suite</option>
              {targetSuites.map((suite) => (
                <option key={suite.id} value={suite.id}>
                  {resolveKangurTestSuiteGroupTitle(suite, groupById)} / {suite.title}
                </option>
              ))}
            </select>
          </div>
        </FormModal>
      </div>
    );

    if (!standalone) {
      return questionsContent;
    }

    return (
      <KangurAdminContentShell
        title='Kangur Questions'
        description='Author questions for this test suite.'
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'Kangur', href: '/admin/kangur' },
          { label: 'Tests', href: '/admin/kangur/tests-manager' },
          { label: managingSuite.title },
        ]}
        className='h-full'
        panelClassName='flex h-full min-h-0 flex-col'
        contentClassName='flex min-h-0 flex-1 flex-col'
      >
        {questionsContent}
      </KangurAdminContentShell>
    );
  }

  const content = (
    <div className='flex h-full flex-col gap-4 overflow-hidden'>
      <KangurAdminWorkspaceIntroCard
        title='Question bank'
        description='Manage Kangur test suites with the same editorial health model used inside the question workspace. Review-fix pressure and live publish readiness are visible before you open each suite.'
        badge='Shared triage'
      />

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5 2xl:grid-cols-9'>
        <KangurAdminMetricCard
          label='Suites'
          value={libraryHealthSummary.suiteCount}
          detail='Tracked test suites in the Kangur question bank'
          Icon={ClipboardList}
          tone='info'
        />
        <KangurAdminMetricCard
          label='Groups'
          value={resolvedGroups.length}
          detail='Persisted test groups organizing suites in the library'
          Icon={Folders}
          tone='info'
        />
        <KangurAdminMetricCard
          label='Clean suites'
          value={libraryHealthSummary.readySuiteCount}
          detail='Suites whose current questions are structurally clean'
          Icon={WandSparkles}
          tone='success'
        />
        <KangurAdminMetricCard
          label='Needs review'
          value={libraryHealthSummary.suitesNeedingReviewCount}
          detail='Suites with questions that still need editorial review'
          Icon={AlertTriangle}
          tone='warning'
        />
        <KangurAdminMetricCard
          label='Needs fixes'
          value={libraryHealthSummary.suitesNeedingFixCount}
          detail='Suites containing blocked or inconsistent questions'
          Icon={AlertTriangle}
          tone='warning'
        />
        <KangurAdminMetricCard
          label='Question queue'
          value={libraryHealthSummary.reviewQueueQuestionCount}
          detail={`${libraryHealthSummary.totalQuestionCount} total questions, ${libraryHealthSummary.richQuestionCount} with rich UI`}
          Icon={Sparkles}
          tone='info'
        />
        <KangurAdminMetricCard
          label='Draft questions'
          value={libraryHealthSummary.draftQuestionCount}
          detail='Questions still being authored and not yet cleared for publish'
          Icon={ListOrdered}
          tone='neutral'
        />
        <KangurAdminMetricCard
          label='Ready to publish'
          value={libraryHealthSummary.readyToPublishQuestionCount}
          detail={`${libraryHealthSummary.publishableQuestionCount} structurally ready now, ${libraryHealthSummary.readyToPublishQuestionCount - libraryHealthSummary.publishableQuestionCount} still need review cleanup`}
          Icon={WandSparkles}
          tone='info'
        />
        <KangurAdminMetricCard
          label='Live suites'
          value={libraryHealthSummary.liveSuiteCount}
          detail={`${libraryHealthSummary.unstableLiveSuiteCount} live suites currently need attention`}
          Icon={Folders}
          tone='success'
        />
        <KangurAdminMetricCard
          label='Ready for live'
          value={libraryHealthSummary.liveReadySuiteCount}
          detail={`${libraryHealthSummary.partiallyPublishedSuiteCount} suites still have only a partial published set`}
          Icon={Folders}
          tone='warning'
        />
      </div>

      {editingGroupOriginalTitle ? (
        <div className='rounded-[28px] border border-border/60 bg-card/20 p-6'>
          <div className='flex flex-wrap items-start justify-between gap-3'>
            <div className='space-y-2'>
              <div className='text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground'>
                Group metadata
              </div>
              <div className='text-lg font-semibold text-white'>Test group metadata</div>
              <div className='text-xs text-muted-foreground'>
                Edit the group name and description without leaving the suite library.
              </div>
            </div>
            <div className='rounded-full border border-border/50 bg-background/30 px-3 py-1 text-[11px] text-muted-foreground'>
              {activeGroupSuiteCount} suite{activeGroupSuiteCount === 1 ? '' : 's'} in this group
            </div>
          </div>

          <div className='mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]'>
            <Input
              value={groupTitle}
              onChange={(event): void => setGroupTitle(event.target.value)}
              placeholder='e.g. Olympiad 2024'
              className='h-10'
            />
            <textarea
              value={groupDescription}
              onChange={(event): void => setGroupDescription(event.target.value)}
              placeholder='Description for editors using this group'
              className='min-h-[110px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm'
            />
          </div>

          <div className='mt-4 flex flex-wrap items-center gap-2'>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 border px-3 text-xs font-semibold tracking-wide text-emerald-200 hover:bg-emerald-900/30'
              onClick={(): void => {
                void handleSaveGroup();
              }}
              disabled={isGroupSaveDisabled}
            >
              Save group
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 border px-3 text-xs font-semibold tracking-wide text-rose-200 hover:bg-rose-900/30'
              onClick={(): void => setGroupToDeleteTitle(editingGroupOriginalTitle)}
              disabled={updateSetting.isPending || activeGroupSuiteCount > 0}
            >
              Delete group
            </Button>
            <Button
              type='button'
              size='sm'
              variant='outline'
              className='h-8 border px-3 text-xs font-semibold tracking-wide text-slate-200 hover:bg-slate-800/40'
              onClick={closeGroupMetadataPanel}
              disabled={updateSetting.isPending}
            >
              Close
            </Button>
          </div>

          {activeGroupSuiteCount > 0 ? (
            <div className='mt-3 text-xs text-muted-foreground'>
              Move suites out of this group before deleting it.
            </div>
          ) : null}
        </div>
      ) : null}

      <FolderTreePanel
        className='min-h-0 flex-1'
        header={
          <div className='space-y-4'>
            <div className='overflow-hidden rounded-[28px] border border-border/60 bg-[linear-gradient(135deg,rgba(10,18,32,0.95),rgba(19,38,61,0.86))] p-6 shadow-[0_24px_90px_-52px_rgba(14,165,233,0.35)]'>
            <div className='flex flex-wrap items-center justify-between gap-3'>
              <div className='max-w-3xl space-y-2'>
                <div className='text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/80'>
                  Suite library
                </div>
                <div className='text-lg font-semibold text-white'>Test Suite Library</div>
                <div className='text-sm leading-6 text-slate-300'>
                  Each suite contains questions with scoring and optional SVG illustrations.
                </div>
              </div>
              <div className='flex flex-wrap items-center gap-2.5'>
                <Button
                  onClick={(): void => {
                    void handleTakeLiveSuitesOffline();
                  }}
                  size='sm'
                  variant='outline'
                  className='h-8 rounded-full border px-3 text-[11px] font-semibold tracking-wide text-slate-200 hover:bg-slate-800/50'
                  disabled={updateSetting.isPending || liveSuiteIds.length === 0}
                >
                  <AlertTriangle className='mr-1 size-3.5' />
                  Take live suites offline
                </Button>
                <Button
                  onClick={(): void => {
                    void handleGoLiveReadySuites();
                  }}
                  size='sm'
                  variant='outline'
                  className='h-8 rounded-full border px-3 text-[11px] font-semibold tracking-wide text-emerald-200 hover:bg-emerald-900/30'
                  disabled={updateSetting.isPending || liveReadySuiteIds.length === 0}
                >
                  <Folders className='mr-1 size-3.5' />
                  Go live ready suites
                </Button>
                <Button
                  onClick={(): void => {
                    void handlePublishReadyQueue();
                  }}
                  size='sm'
                  variant='outline'
                  className='h-8 rounded-full border px-3 text-[11px] font-semibold tracking-wide text-emerald-200 hover:bg-emerald-900/30'
                  disabled={updateSetting.isPending || totalPublishableQuestionCount === 0}
                >
                  <WandSparkles className='mr-1 size-3.5' />
                  Publish ready queue
                </Button>
                <Button
                  onClick={handleOpenReviewQueue}
                  size='sm'
                  variant='outline'
                  className='h-8 rounded-full border px-3 text-[11px] font-semibold tracking-wide text-cyan-200 hover:bg-cyan-900/30'
                  disabled={updateSetting.isPending || !firstSuiteNeedingAttention}
                >
                  <ClipboardList className='mr-1 size-3.5' />
                  Open review queue
                </Button>
                <Button
                  onClick={handleOpenFirstFix}
                  size='sm'
                  variant='outline'
                  className='h-8 rounded-full border px-3 text-[11px] font-semibold tracking-wide text-rose-200 hover:bg-rose-900/30'
                  disabled={updateSetting.isPending || !firstFixQuestion}
                >
                  <AlertTriangle className='mr-1 size-3.5' />
                  Open first fix
                </Button>
                <Button
                  onClick={(): void => {
                    void handleImportLegacy();
                  }}
                  size='sm'
                  variant='outline'
                  className='h-8 rounded-full border px-3 text-[11px] font-semibold tracking-wide text-emerald-200 hover:bg-emerald-900/30'
                  disabled={updateSetting.isPending}
                >
                  <Sparkles className='mr-1 size-3.5' />
                  Import legacy data
                </Button>
                <Button
                  onClick={openCreateGroupModal}
                  size='sm'
                  variant='outline'
                  className='h-8 rounded-full border px-3 text-[11px] font-semibold tracking-wide text-gray-200 hover:bg-muted/50'
                  disabled={updateSetting.isPending}
                >
                  <Folders className='mr-1 size-3.5' />
                  Add group
                </Button>
                <Button
                  onClick={openCreateModal}
                  size='sm'
                  variant='outline'
                  className='h-8 rounded-full border px-3 text-[11px] font-semibold tracking-wide text-gray-200 hover:bg-muted/50'
                  disabled={updateSetting.isPending}
                >
                  <Plus className='mr-1 size-3.5' />
                  Add suite
                </Button>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-2'>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className={cn(
                  'h-8 rounded-full border px-3 text-[11px] font-semibold tracking-wide',
                  !isCatalogMode
                    ? 'border-sky-300/70 bg-sky-500/20 text-sky-100'
                    : 'text-gray-300 hover:bg-muted/40'
                )}
                onClick={(): void => setTreeMode('ordered')}
                disabled={updateSetting.isPending}
              >
                <ListOrdered className='mr-1 size-3.5' />
                Ordered
              </Button>
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  className={cn(
                  'h-8 rounded-full border px-3 text-[11px] font-semibold tracking-wide',
                  isCatalogMode
                    ? 'border-sky-300/70 bg-sky-500/20 text-sky-100'
                    : 'text-gray-300 hover:bg-muted/40'
                )}
                onClick={(): void => setTreeMode('catalog')}
                disabled={updateSetting.isPending}
                >
                  <Folders className='mr-1 size-3.5' />
                  Catalog
                </Button>
              </div>
            </div>

            {capabilities.search.enabled ? (
              <div className='rounded-2xl border border-border/60 bg-card/25 p-4'>
                <FolderTreeSearchBar
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder='Search suites...'
                />
              </div>
            ) : null}
          </div>
        }
      >
        {settingsStore.isLoading ? (
          <div className='space-y-2 p-3'>
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
            <Skeleton className='h-10 w-full' />
          </div>
        ) : (
          <div className='min-h-0 flex-1 overflow-auto p-2'>
            <FolderTreeViewportV2
              controller={controller}
              scrollToNodeRef={scrollToNodeRef}
              searchState={searchState}
              rootDropUi={isCatalogMode ? { ...rootDropUi, enabled: false } : rootDropUi}
              renderNode={renderNode}
              enableDnd={!isCatalogMode && !updateSetting.isPending}
              emptyLabel='No test suites yet. Add the first suite or import legacy data.'
            />
          </div>
        )}
      </FolderTreePanel>

      {/* Suite create/edit modal */}
      <FormModal
        isOpen={showModal}
        onClose={(): void => {
          setShowModal(false);
          setEditingSuite(null);
        }}
        title={editingSuite ? 'Edit Suite' : 'Create Suite'}
        subtitle='Test suites belong to a persisted test group and collect questions for one exam session.'
        onSave={(): void => {
          void handleSaveSuite();
        }}
        isSaving={updateSetting.isPending}
        isSaveDisabled={isSaveDisabled}
        saveText={editingSuite ? 'Save Suite' : 'Create Suite'}
      >
        <TestSuiteMetadataForm formData={formData} setFormData={setFormData} />
      </FormModal>

      <FormModal
        isOpen={showGroupModal}
        onClose={(): void => {
          setShowGroupModal(false);
        }}
        title='Create Test Group'
        subtitle='Create a reusable group for organizing Kangur test suites.'
        onSave={(): void => {
          void handleSaveGroup();
        }}
        isSaving={updateSetting.isPending}
        isSaveDisabled={isGroupSaveDisabled}
        saveText='Create Group'
      >
        <div className='space-y-4'>
          <Input
            value={groupTitle}
            onChange={(event): void => setGroupTitle(event.target.value)}
            placeholder='e.g. Olympiad 2024'
            className='h-9'
          />
          <textarea
            value={groupDescription}
            onChange={(event): void => setGroupDescription(event.target.value)}
            placeholder='Optional description for this group'
            className='min-h-[96px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm'
          />
        </div>
      </FormModal>

      <FormModal
        isOpen={Boolean(suiteToMove)}
        onClose={(): void => {
          setSuiteToMove(null);
          setSuiteMoveTargetGroupTitle('');
        }}
        title='Move Suite To Another Group'
        subtitle='Reassign this suite without opening the full suite editor.'
        onSave={(): void => {
          void handleMoveSuiteToGroup();
        }}
        isSaving={updateSetting.isPending}
        isSaveDisabled={!suiteMoveTargetGroupTitle.trim() || updateSetting.isPending}
        saveText='Move Suite'
      >
        <div className='space-y-4'>
          <div className='rounded-xl border border-border/50 bg-background/30 p-3 text-sm text-muted-foreground'>
            Suite: <span className='font-semibold text-white'>{suiteToMove?.title ?? ''}</span>
          </div>
          <select
            value={suiteMoveTargetGroupTitle}
            onChange={(event): void => setSuiteMoveTargetGroupTitle(event.target.value)}
            className='h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm'
          >
            <option value=''>Choose destination group</option>
            {resolvedGroups.map((group) => (
              <option key={group.id} value={group.title}>
                {group.title}
              </option>
            ))}
          </select>
        </div>
      </FormModal>

      <ConfirmModal
        isOpen={Boolean(groupToDeleteTitle)}
        onClose={(): void => setGroupToDeleteTitle(null)}
        onConfirm={handleDeleteGroup}
        title='Delete Test Group'
        message={`Delete test group "${groupToDeleteTitle ?? ''}"? Only empty groups can be removed.`}
        confirmText='Delete'
        isDangerous={true}
      />

      {/* Delete suite confirm */}
      <ConfirmModal
        isOpen={Boolean(suiteToDelete)}
        onClose={(): void => setSuiteToDelete(null)}
        onConfirm={handleDeleteSuite}
        title='Delete Suite'
        message={`Delete suite "${suiteToDelete?.title ?? ''}" and all its questions? This cannot be undone.`}
        confirmText='Delete'
        isDangerous={true}
      />
    </div>
  );

  if (!standalone) {
    return content;
  }

  return (
    <KangurAdminContentShell
      title='Kangur Tests'
      description='Create and manage test suites with questions, illustrations, and scoring.'
      breadcrumbs={[
        { label: 'Admin', href: '/admin' },
        { label: 'Kangur', href: '/admin/kangur' },
        { label: 'Tests' },
      ]}
      className='h-full'
      panelClassName='flex h-full min-h-0 flex-col'
      contentClassName='flex min-h-0 flex-1 flex-col'
    >
      {content}
    </KangurAdminContentShell>
  );
}
