'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { Folders, ListOrdered, Plus, Sparkles } from 'lucide-react';

import {
  createMasterFolderTreeTransactionAdapter,
  FolderTreeViewportV2,
  useMasterFolderTreeShell,
  type FolderTreeViewportRenderNodeInput,
} from '@/features/foldertree';
import { FolderTreeSearchBar, useMasterFolderTreeSearch } from '@/features/foldertree';
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
  KANGUR_TEST_SUITES_SETTING_KEY,
  KANGUR_TEST_SUITE_SORT_ORDER_GAP,
  canonicalizeKangurTestSuites,
  createKangurTestSuiteId,
  createInitialTestSuiteFormData,
  formDataToTestSuite,
  parseKangurTestSuites,
  toTestSuiteFormData,
  upsertKangurTestSuite,
  type TestSuiteFormData,
} from '../test-suites';

import {
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  deleteKangurTestSuiteQuestions,
  getQuestionsForSuite,
  parseKangurTestQuestionStore,
} from '../test-questions';

import { importLegacyKangurQuestions } from '../test-suites/import-legacy';

import {
  buildKangurTestSuiteCatalogMasterNodes,
  buildKangurTestSuiteMasterNodes,
  resolveKangurTestSuiteOrderFromNodes,
} from './kangur-test-suites-master-tree';

import { TestSuiteMetadataForm } from './components/TestSuiteMetadataForm';
import { TestSuiteTreeRow } from './components/TestSuiteTreeRow';
import { KangurQuestionsManagerPanel } from './KangurQuestionsManagerPanel';
import { KangurQuestionsManagerRuntimeProvider } from './context/KangurQuestionsManagerRuntimeContext';
import type { KangurTestSuite } from '@/shared/contracts/kangur-tests';
import { KangurAdminContentShell } from './components/KangurAdminContentShell';

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

  const [showModal, setShowModal] = useState(false);
  const [editingSuite, setEditingSuite] = useState<KangurTestSuite | null>(null);
  const [suiteToDelete, setSuiteToDelete] = useState<KangurTestSuite | null>(null);
  const [managingSuite, setManagingSuite] = useState<KangurTestSuite | null>(null);
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
      const { suites: importedSuites, questionStore: importedQuestions } =
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
      toast(`Imported ${importedSuites.length} suites from legacy data.`, { variant: 'success' });
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
        onEdit={openEditModal}
        onManageQuestions={setManagingSuite}
        onDelete={setSuiteToDelete}
        isUpdating={updateSetting.isPending}
      />
    ),
    [suiteById, questionCountBySuiteId, updateSetting.isPending]
  );

  // Questions manager slide-in
  if (managingSuite) {
    const questionsContent = (
      <div className='flex h-full flex-col gap-4 overflow-hidden'>
        <div className='flex-1 overflow-hidden rounded-2xl border border-border/60 bg-card/20 p-4'>
          <KangurQuestionsManagerRuntimeProvider
            suite={managingSuite}
            onClose={(): void => setManagingSuite(null)}
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
