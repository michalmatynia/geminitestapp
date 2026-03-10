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
  KANGUR_TEST_SUITES_SETTING_KEY,
  KANGUR_TEST_SUITE_SORT_ORDER_GAP,
  canonicalizeKangurTestSuites,
  createKangurTestSuiteId,
  createInitialTestSuiteFormData,
  demoteKangurTestSuitesToDraft,
  formDataToTestSuite,
  promoteKangurTestSuitesLive,
  parseKangurTestSuites,
  toTestSuiteFormData,
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

  const suites = useMemo(() => parseKangurTestSuites(rawSuites), [rawSuites]);
  const questionStore = useMemo(() => parseKangurTestQuestionStore(rawQuestions), [rawQuestions]);
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
  const [editingSuite, setEditingSuite] = useState<KangurTestSuite | null>(null);
  const [suiteToDelete, setSuiteToDelete] = useState<KangurTestSuite | null>(null);
  const [managingSuite, setManagingSuite] = useState<KangurTestSuite | null>(null);
  const [managerInitialView, setManagerInitialView] =
    useState<KangurQuestionsManagerInitialView | undefined>(undefined);
  const [formData, setFormData] = useState<TestSuiteFormData>(() =>
    createInitialTestSuiteFormData()
  );
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
        ? buildKangurTestSuiteCatalogMasterNodes(suites)
        : buildKangurTestSuiteMasterNodes(suites),
    [isCatalogMode, suites]
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

  const openEditModal = (suite: KangurTestSuite): void => {
    setEditingSuite(suite);
    setFormData(toTestSuiteFormData(suite));
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
      const next = formDataToTestSuite(formData, id, sortOrder);
      const nextSuites = canonicalizeKangurTestSuites(upsertKangurTestSuite(suites, next));
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

  const isSaveDisabled = !formData.title.trim() || updateSetting.isPending;

  const renderNode = useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <TestSuiteTreeRow
        input={input}
        suiteById={suiteById}
        questionCountBySuiteId={questionCountBySuiteId}
        suiteHealthById={suiteHealthById}
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
      openQuestionsManager,
      questionCountBySuiteId,
      suiteById,
      suiteHealthById,
      updateSetting.isPending,
    ]
  );

  // Questions manager slide-in
  if (managingSuite) {
    const questionsContent = (
      <div className='flex h-full flex-col gap-4 overflow-hidden'>
        <div className='flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card/20 p-4'>
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

      <FolderTreePanel
        className='min-h-0 flex-1'
        header={
          <div className='flex flex-col gap-3'>
            <div className='flex flex-wrap items-center justify-between gap-2'>
              <div>
                <div className='text-sm font-semibold text-white'>Test Suite Library</div>
                <div className='text-xs text-muted-foreground'>
                  Each suite contains questions with scoring and optional SVG illustrations.
                </div>
              </div>
              <div className='flex items-center gap-1'>
                <Button
                  onClick={(): void => {
                    void handleTakeLiveSuitesOffline();
                  }}
                  size='sm'
                  variant='outline'
                  className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-slate-200 hover:bg-slate-800/50'
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
                  className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-emerald-200 hover:bg-emerald-900/30'
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
                  className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-emerald-200 hover:bg-emerald-900/30'
                  disabled={updateSetting.isPending || totalPublishableQuestionCount === 0}
                >
                  <WandSparkles className='mr-1 size-3.5' />
                  Publish ready queue
                </Button>
                <Button
                  onClick={handleOpenReviewQueue}
                  size='sm'
                  variant='outline'
                  className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-cyan-200 hover:bg-cyan-900/30'
                  disabled={updateSetting.isPending || !firstSuiteNeedingAttention}
                >
                  <ClipboardList className='mr-1 size-3.5' />
                  Open review queue
                </Button>
                <Button
                  onClick={handleOpenFirstFix}
                  size='sm'
                  variant='outline'
                  className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-rose-200 hover:bg-rose-900/30'
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
                  className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-emerald-200 hover:bg-emerald-900/30'
                  disabled={updateSetting.isPending}
                >
                  <Sparkles className='mr-1 size-3.5' />
                  Import legacy data
                </Button>
                <Button
                  onClick={openCreateModal}
                  size='sm'
                  variant='outline'
                  className='h-7 border px-2 text-[11px] font-semibold tracking-wide text-gray-200 hover:bg-muted/50'
                  disabled={updateSetting.isPending}
                >
                  <Plus className='mr-1 size-3.5' />
                  Add suite
                </Button>
              </div>
            </div>

            <div className='flex flex-wrap items-center gap-1'>
              <Button
                type='button'
                size='sm'
                variant='outline'
                className={cn(
                  'h-7 border px-2 text-[11px] font-semibold tracking-wide',
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
                  'h-7 border px-2 text-[11px] font-semibold tracking-wide',
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

            {capabilities.search.enabled ? (
              <FolderTreeSearchBar
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder='Search suites...'
              />
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
        subtitle='Test suites group questions together for an exam session.'
        onSave={(): void => {
          void handleSaveSuite();
        }}
        isSaving={updateSetting.isPending}
        isSaveDisabled={isSaveDisabled}
        saveText={editingSuite ? 'Save Suite' : 'Create Suite'}
      >
        <TestSuiteMetadataForm formData={formData} setFormData={setFormData} />
      </FormModal>

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
