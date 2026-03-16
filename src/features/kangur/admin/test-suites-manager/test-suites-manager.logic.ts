import { useMemo, useCallback } from 'react';
import { useToast } from '@/features/kangur/shared/ui';
import { useUpdateSetting } from '@/shared/hooks/use-settings';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { logClientError } from '@/features/kangur/shared/utils/observability/client-error-logger';
import {
  KANGUR_TEST_SUITES_SETTING_KEY,
  KANGUR_TEST_QUESTIONS_SETTING_KEY,
  KANGUR_TEST_GROUPS_SETTING_KEY,
  KANGUR_TEST_SUITE_SORT_ORDER_GAP,
  parseKangurTestSuites,
  parseKangurTestGroups,
  buildResolvedKangurTestGroups,
  resolveKangurTestSuiteGroupTitle,
  canonicalizeKangurTestSuites,
  canonicalizeKangurTestGroups,
  createKangurTestGroup,
  createKangurTestSuiteId,
  ensureKangurTestGroupForTitle,
  formDataToTestSuite,
  normalizeKangurTestGroupTitle,
  upsertKangurTestSuite,
  upsertKangurTestGroup,
  toTestSuiteFormData,
  promoteKangurTestSuitesLive,
  demoteKangurTestSuitesToDraft,
  demoteInvalidLiveKangurTestSuites,
  createInitialTestSuiteFormData,
} from '../../test-suites';
import {
  parseKangurTestQuestionStore,
  getQuestionsForSuite,
  publishReadyQuestions,
  deleteKangurTestSuiteQuestions,
} from '../../test-questions';
import { buildKangurTestSuiteHealthMap, getKangurTestLibraryHealthSummary } from '../test-suite-health';
import { getQuestionAuthoringSummary } from '../question-authoring-insights';
import { useTestSuitesManager } from './test-suites-manager.context';
import type { KangurTestSuite } from '@/features/kangur/shared/contracts/kangur-tests';
import type { SettingsStoreValue } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import type { KangurQuestionsManagerInitialView } from '../question-manager-view';

export function useTestSuitesManagerLogic(settingsStore: SettingsStoreValue) {
  const { toast } = useToast();
  const updateSetting = useUpdateSetting();
  const state = useTestSuitesManager();

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
  const needsAttention =
    libraryHealthSummary.suitesNeedingFixCount > 0 ||
    libraryHealthSummary.suitesNeedingReviewCount > 0 ||
    libraryHealthSummary.unstableLiveSuiteCount > 0;
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
      state.setManagingSuite(suite);
      state.setManagerInitialView(initialView);
    },
    [state]
  );

  const openCreateModal = (): void => {
    state.setEditingSuite(null);
    state.setFormData(createInitialTestSuiteFormData());
    state.setShowModal(true);
  };

  const openEditModal = (suite: KangurTestSuite): void => {
    state.setEditingSuite(suite);
    state.setFormData(toTestSuiteFormData(suite, groupById));
    state.setShowModal(true);
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

  const handleSaveSuite = async (): Promise<void> => {
    try {
      const id = state.editingSuite?.id ?? createKangurTestSuiteId();
      const sortOrder = state.editingSuite?.sortOrder ?? suites.length * KANGUR_TEST_SUITE_SORT_ORDER_GAP;
      const ensuredGroup = ensureKangurTestGroupForTitle(groups, state.formData.category);
      const next = formDataToTestSuite(state.formData, id, sortOrder, {
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
      toast(state.editingSuite ? 'Suite updated.' : 'Suite created.', { variant: 'success' });
      state.setShowModal(false);
      state.setEditingSuite(null);
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'saveSuite' },
      });
      toast('Failed to save suite.', { variant: 'error' });
    }
  };

  const handleDeleteSuite = async (): Promise<void> => {
    if (!state.suiteToDelete) return;
    try {
      const nextSuites = canonicalizeKangurTestSuites(
        suites.filter((s) => s.id !== state.suiteToDelete!.id)
      );
      const nextQuestions = deleteKangurTestSuiteQuestions(questionStore, state.suiteToDelete.id);
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_SUITES_SETTING_KEY,
        value: serializeSetting(nextSuites),
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextQuestions),
      });
      toast('Suite deleted.', { variant: 'success' });
      state.setSuiteToDelete(null);
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'deleteSuite' },
      });
      toast('Failed to delete suite.', { variant: 'error' });
    }
  };

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
        logClientError(error);
        logClientError(error, {
          context: { source: 'AdminKangurTestSuitesManagerPage', action: 'goLiveSuite', suiteId: suite.id },
        });
        toast('Failed to mark suite live.', { variant: 'error' });
      }
    },
    [suiteHealthById, suites, toast, updateSetting]
  );

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
        logClientError(error);
        logClientError(error, {
          context: { source: 'AdminKangurTestSuitesManagerPage', action: 'takeSuiteOffline', suiteId: suite.id },
        });
        toast('Failed to take suite offline.', { variant: 'error' });
      }
    },
    [suiteHealthById, suites, toast, updateSetting]
  );

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
        logClientError(error);
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
    const publishableQuestionIds = Array.from(publishableQuestionIdsBySuiteId.values()).flat();
    if (publishableQuestionIds.length === 0) {
      toast('No structurally ready questions are waiting to publish.', { variant: 'info' });
      return;
    }

    try {
      const { store: nextStore, publishedQuestionIds } = publishReadyQuestions(questionStore, {
        questionIds: publishableQuestionIds,
      });
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_QUESTIONS_SETTING_KEY,
        value: serializeSetting(nextStore),
      });
      toast(
        `Published ${publishedQuestionIds.length} ready question${publishedQuestionIds.length === 1 ? '' : 's'} across the queue.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'publishReadyQueue' },
      });
      toast('Failed to publish the ready queue.', { variant: 'error' });
    }
  }, [publishableQuestionIdsBySuiteId, questionStore, toast, updateSetting]);

  const handleGoLiveReadySuites = useCallback(async (): Promise<void> => {
    if (liveReadySuiteIds.length === 0) {
      toast('No suites are ready to go live yet.', { variant: 'info' });
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
      logClientError(error);
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'goLiveReadySuites' },
      });
      toast('Failed to publish ready suites.', { variant: 'error' });
    }
  }, [liveReadySuiteIds, suites, toast, updateSetting]);

  const handleTakeLiveSuitesOffline = useCallback(async (): Promise<void> => {
    if (liveSuiteIds.length === 0) {
      toast('No live suites are currently visible to learners.', { variant: 'info' });
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
        `Moved ${draftSuiteIds.length} live suite${draftSuiteIds.length === 1 ? '' : 's'} back to draft.`,
        { variant: 'success' }
      );
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'takeLiveSuitesOffline' },
      });
      toast('Failed to take live suites offline.', { variant: 'error' });
    }
  }, [liveSuiteIds, suites, toast, updateSetting]);

  const handleSaveGroup = async (): Promise<void> => {
    try {
      const nextGroup = createKangurTestGroup({
        title: state.groupTitle,
        description: state.groupDescription,
      });
      const nextGroups = upsertKangurTestGroup(groups, nextGroup);
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_GROUPS_SETTING_KEY,
        value: serializeSetting(canonicalizeKangurTestGroups(nextGroups)),
      });
      toast('Test group saved.', { variant: 'success' });
      state.setShowGroupModal(false);
      state.setGroupTitle('');
      state.setGroupDescription('');
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'saveGroup' },
      });
      toast('Failed to save group.', { variant: 'error' });
    }
  };

  const handleDeleteGroup = async (): Promise<void> => {
    if (!state.groupToDeleteTitle) return;
    try {
      const normalizedToDelete = normalizeKangurTestGroupTitle(state.groupToDeleteTitle).toLowerCase();
      const nextGroups = groups.filter(
        (g) => normalizeKangurTestGroupTitle(g.title).toLowerCase() !== normalizedToDelete
      );
      await updateSetting.mutateAsync({
        key: KANGUR_TEST_GROUPS_SETTING_KEY,
        value: serializeSetting(canonicalizeKangurTestGroups(nextGroups)),
      });
      toast('Test group deleted.', { variant: 'success' });
      state.setGroupToDeleteTitle(null);
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'deleteGroup' },
      });
      toast('Failed to delete group.', { variant: 'error' });
    }
  };

  const handleMoveSuiteToGroup = async (): Promise<void> => {
    if (!state.suiteToMove || !state.suiteMoveTargetGroupTitle) return;
    try {
      const ensuredGroup = ensureKangurTestGroupForTitle(groups, state.suiteMoveTargetGroupTitle);
      const next = {
        ...state.suiteToMove,
        groupId: ensuredGroup.group.id,
      };
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
      
      toast(`Suite ${state.suiteToMove.title} moved to ${state.suiteMoveTargetGroupTitle}.`, {
        variant: 'success',
      });
      state.setSuiteToMove(null);
      state.setSuiteMoveTargetGroupTitle('');
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'moveSuiteToGroup' },
      });
      toast('Failed to move suite.', { variant: 'error' });
    }
  };

  const handleBulkMoveQuestions = async (): Promise<void> => {
    if (!state.managingSuite) return;
    const targetSuite = suites.find((suite) => suite.id === state.questionMoveTargetSuiteId) ?? null;

    if (!targetSuite) {
      toast('Choose a destination suite first.', { variant: 'info' });
      return;
    }

    if (targetSuite.id === state.managingSuite.id) {
      toast('Questions are already in this suite.', { variant: 'info' });
      return;
    }

    const sourceQuestions = [...getQuestionsForSuite(questionStore, state.managingSuite.id)].sort(
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
        suiteIds: [state.managingSuite.id, targetSuite.id],
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
      state.setShowQuestionMoveModal(false);
      state.setQuestionMoveTargetSuiteId('');
      state.setManagingSuite(targetSuite);
      state.setManagerInitialView(undefined);
    } catch (error) {
      logClientError(error);
      logClientError(error, {
        context: { source: 'AdminKangurTestSuitesManagerPage', action: 'bulkMoveQuestions' },
      });
      toast('Failed to move questions to another suite.', { variant: 'error' });
    }
  };

  return {
    suites,
    groups,
    resolvedGroups,
    groupById,
    questionStore,
    groupTitleBySuiteId,
    suiteById,
    questionCountBySuiteId,
    suiteHealthById,
    libraryHealthSummary,
    needsAttention,
    liveReadySuiteIds,
    liveSuiteIds,
    totalPublishableQuestionCount,
    orderedSuites,
    firstSuiteNeedingAttention,
    firstFixQuestion,
    openQuestionsManager,
    openCreateModal,
    openEditModal,
    handleOpenReviewQueue,
    handleOpenFirstFix,
    handleSaveSuite,
    handleDeleteSuite,
    handleGoLiveSuite,
    handleTakeSuiteOffline,
    handlePublishReadyForSuite,
    handlePublishReadyQueue,
    handleGoLiveReadySuites,
    handleTakeLiveSuitesOffline,
    handleSaveGroup,
    handleDeleteGroup,
    handleMoveSuiteToGroup,
    handleBulkMoveQuestions,
    isUpdating: updateSetting.isPending,
  };
}
