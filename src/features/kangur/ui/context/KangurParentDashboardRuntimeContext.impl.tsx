/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
'use client';

import { useTranslations } from 'next-intl';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type JSX,
  type ReactNode,
} from 'react';

import { getKangurPlatform } from '@/features/kangur/services/kangur-platform';
import type {
  KangurAssignmentCreateInput,
  KangurAssignmentSnapshot,
  KangurAssignmentUpdateInput,
} from '@kangur/platform';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import { internalError } from '@/features/kangur/shared/errors/app-error';
import {
  reportKangurClientError,
  withKangurClientError,
} from '@/features/kangur/observability/client';
import { ErrorSystem } from '@/features/kangur/shared/utils/observability/error-system-client';
import {
  KANGUR_LEARNER_PASSWORD_MAX_LENGTH,
  KANGUR_LEARNER_PASSWORD_MIN_LENGTH,
  KANGUR_LEARNER_PASSWORD_PATTERN,
} from '@/shared/contracts/kangur';
import { useKangurAgeGroupFocus } from '@/features/kangur/ui/context/KangurAgeGroupFocusContext';
import { useKangurAssignments } from '@/features/kangur/ui/hooks/useKangurAssignments';
import { useKangurLessons } from '@/features/kangur/ui/hooks/useKangurLessons';
import { useKangurParentDashboardScores } from '@/features/kangur/ui/hooks/useKangurParentDashboardScores';
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';

import type {
  KangurParentDashboardCreateForm,
  KangurParentDashboardEditForm,
  KangurParentDashboardRuntimeActionsContextValue,
  KangurParentDashboardRuntimeHeroStateContextValue,
  KangurParentDashboardRuntimeOverviewStateContextValue,
  KangurParentDashboardRuntimeShellActionsContextValue,
  KangurParentDashboardRuntimeShellStateContextValue,
  KangurParentDashboardRuntimeStateContextValue,
  KangurParentDashboardTabId,
} from './KangurParentDashboardRuntimeContext.types';
import {
  ACTION_TIMEOUT_MS,
  PRIMARY_DATA_LOAD_DEFER_MS,
  REFRESH_TIMEOUT_MS,
  withTimeout,
} from './KangurParentDashboardRuntimeContext.utils';

export * from './KangurParentDashboardRuntimeContext.types';
export * from './KangurParentDashboardRuntimeContext.utils';

const kangurPlatform = getKangurPlatform();

const KangurParentDashboardRuntimeStateContext =
  createContext<KangurParentDashboardRuntimeStateContextValue | null>(null);
const KangurParentDashboardRuntimeShellStateContext =
  createContext<KangurParentDashboardRuntimeShellStateContextValue | null>(null);
const KangurParentDashboardRuntimeHeroStateContext =
  createContext<KangurParentDashboardRuntimeHeroStateContextValue | null>(null);
const KangurParentDashboardRuntimeOverviewStateContext =
  createContext<KangurParentDashboardRuntimeOverviewStateContextValue | null>(null);
const KangurParentDashboardRuntimeShellActionsContext =
  createContext<KangurParentDashboardRuntimeShellActionsContextValue | null>(null);
const KangurParentDashboardRuntimeActionsContext =
  createContext<KangurParentDashboardRuntimeActionsContextValue | null>(null);

type KangurParentDashboardRuntimeContextValue = KangurParentDashboardRuntimeStateContextValue &
  KangurParentDashboardRuntimeActionsContextValue;

export function KangurParentDashboardRuntimeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const translations = useTranslations('KangurParentDashboardRuntime');
  const { basePath } = useKangurRouting();
  const {
    isAuthenticated,
    user,
    navigateToLogin,
    logout,
    selectLearner,
    checkAppState,
  } = useKangurAuth();
  const { ageGroup } = useKangurAgeGroupFocus();
  const progress = useKangurProgressState();
  const [activeTab, setActiveTab] = useState<KangurParentDashboardTabId>('progress');
  const [isCreateLearnerModalOpen, setCreateLearnerModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<KangurParentDashboardCreateForm>({
    displayName: '',
    age: '',
    loginName: '',
    password: '',
  });
  const [editForm, setEditForm] = useState<KangurParentDashboardEditForm>({
    displayName: '',
    loginName: '',
    password: '',
    status: 'active',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPrimaryQueriesReady, setIsPrimaryQueriesReady] = useState(false);

  const canManageLearners = Boolean(user?.canManageLearners);
  const canAccessDashboard = isAuthenticated && canManageLearners;
  const learners = user?.learners ?? [];
  const activeLearner = user?.activeLearner ?? null;
  const activeLearnerId = activeLearner?.id ?? null;

  useEffect(() => {
    if (!canAccessDashboard || !activeLearnerId) {
      setIsPrimaryQueriesReady(false);
      return;
    }
    const timeoutId = setTimeout(() => setIsPrimaryQueriesReady(true), PRIMARY_DATA_LOAD_DEFER_MS);
    return () => clearTimeout(timeoutId);
  }, [activeLearnerId, canAccessDashboard]);

  const lessonsQuery = useKangurLessons({
    ageGroup,
    enabled: canAccessDashboard && Boolean(activeLearnerId) && isPrimaryQueriesReady,
    enabledOnly: true,
  });
  const assignmentsQuery = useKangurAssignments({
    enabled: canAccessDashboard && Boolean(activeLearnerId) && isPrimaryQueriesReady,
    query: { includeArchived: false },
  });
  const lessons = useMemo(() => (canAccessDashboard && activeLearnerId ? lessonsQuery.data ?? [] : []), [activeLearnerId, canAccessDashboard, lessonsQuery.data]);
  const assignments = useMemo(() => (canAccessDashboard && activeLearnerId ? assignmentsQuery.assignments : []), [activeLearnerId, assignmentsQuery.assignments, canAccessDashboard]);
  const assignmentsError = canAccessDashboard && activeLearnerId ? assignmentsQuery.error : null;
  const isLoadingAssignments = canAccessDashboard && activeLearnerId ? assignmentsQuery.isLoading : false;
  const viewerName = user?.email?.trim() || translations('account');

  const {
    scores,
    error: scoresError,
    isLoading: isLoadingScores,
    scoreViewerEmail,
    scoreViewerName,
    viewerRoleLabel,
    refreshScores,
  } = useKangurParentDashboardScores({
    enabled: canAccessDashboard && Boolean(activeLearnerId) && isPrimaryQueriesReady,
    activeLearnerId,
    isAuthenticated,
    user,
  });

  const actions = useMemo((): KangurParentDashboardRuntimeActionsContextValue => {
    const refreshAssignments = async (): Promise<void> => {
      if (!activeLearnerId) return;
      await withTimeout(assignmentsQuery.refresh(), REFRESH_TIMEOUT_MS, translations('errors.refreshTimeout'));
    };

    const updateCreateField = <K extends keyof KangurParentDashboardCreateForm>(key: K, value: KangurParentDashboardCreateForm[K]): void => setCreateForm((prev) => ({ ...prev, [key]: value }));
    const updateEditField = <K extends keyof KangurParentDashboardEditForm>(key: K, value: KangurParentDashboardEditForm[K]): void => setEditForm((prev) => ({ ...prev, [key]: value }));

    const handleCreateLearner = async (): Promise<void> => {
      setIsSubmitting(true);
      setFeedback(null);
      try {
        const age = parseInt(createForm.age, 10);
        await withTimeout(kangurPlatform.createLearnerProfile({ displayName: createForm.displayName, age: isNaN(age) ? undefined : age, loginName: createForm.loginName, password: createForm.password }), ACTION_TIMEOUT_MS, translations('errors.createTimeout'));
        await checkAppState();
        setCreateLearnerModalOpen(false);
        setCreateForm({ displayName: '', age: '', loginName: '', password: '' });
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : translations('errors.createFailed'));
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleSaveLearner = async (): Promise<boolean> => {
      if (!activeLearnerId) return false;
      setIsSubmitting(true);
      setFeedback(null);
      try {
        await withTimeout(kangurPlatform.updateLearnerProfile(activeLearnerId, { displayName: editForm.displayName, loginName: editForm.loginName, password: editForm.password || undefined, status: editForm.status }), ACTION_TIMEOUT_MS, translations('errors.saveTimeout'));
        await checkAppState();
        return true;
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : translations('errors.saveFailed'));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    };

    const handleDeleteLearner = async (learnerId: string): Promise<boolean> => {
      setIsSubmitting(true);
      setFeedback(null);
      try {
        await withTimeout(kangurPlatform.removeLearnerProfile(learnerId), ACTION_TIMEOUT_MS, translations('errors.deleteTimeout'));
        await checkAppState();
        return true;
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : translations('errors.deleteFailed'));
        return false;
      } finally {
        setIsSubmitting(false);
      }
    };

    return {
      createAssignment: (input) => withTimeout(assignmentsQuery.createAssignment(input), ACTION_TIMEOUT_MS, translations('errors.createAssignmentTimeout')),
      refreshAssignments,
      reassignAssignment: (id) => withTimeout(assignmentsQuery.reassignAssignment(id), ACTION_TIMEOUT_MS, translations('errors.reassignAssignmentTimeout')),
      navigateToLogin,
      logout,
      selectLearner,
      setActiveTab,
      setCreateLearnerModalOpen,
      updateCreateField,
      updateEditField,
      handleCreateLearner,
      handleSaveLearner,
      handleDeleteLearner,
      updateAssignment: (id, input) => withTimeout(assignmentsQuery.updateAssignment(id, input), ACTION_TIMEOUT_MS, translations('errors.updateAssignmentTimeout')),
    };
  }, [activeLearnerId, assignmentsQuery, checkAppState, createForm, editForm, logout, navigateToLogin, selectLearner, translations]);

  const stateContextValue = useMemo((): KangurParentDashboardRuntimeStateContextValue => ({
    assignments, assignmentsError, basePath, user, learners, lessons, activeLearner, isAuthenticated, canManageLearners, canAccessDashboard,
    scores, scoresError, viewerName, scoreViewerName, scoreViewerEmail, viewerRoleLabel, progress, activeTab, isCreateLearnerModalOpen,
    createForm, editForm, isSubmitting, feedback, isLoadingAssignments, isLoadingScores,
  }), [assignments, assignmentsError, basePath, user, learners, lessons, activeLearner, isAuthenticated, canManageLearners, canAccessDashboard, scores, scoresError, viewerName, scoreViewerName, scoreViewerEmail, viewerRoleLabel, progress, activeTab, isCreateLearnerModalOpen, createForm, editForm, isSubmitting, feedback, isLoadingAssignments, isLoadingScores]);

  const shellStateContextValue = useMemo((): KangurParentDashboardRuntimeShellStateContextValue => ({
    activeLearner, activeTab, basePath, canAccessDashboard, canManageLearners, isAuthenticated, user, viewerName, viewerRoleLabel,
  }), [activeLearner, activeTab, basePath, canAccessDashboard, canManageLearners, isAuthenticated, user, viewerName, viewerRoleLabel]);

  const heroStateContextValue = useMemo((): KangurParentDashboardRuntimeHeroStateContextValue => ({
    activeLearner, basePath, canManageLearners, isAuthenticated, lessons, progress, viewerName, viewerRoleLabel,
  }), [activeLearner, basePath, canManageLearners, isAuthenticated, lessons, progress, viewerName, viewerRoleLabel]);

  const overviewStateContextValue = useMemo((): KangurParentDashboardRuntimeOverviewStateContextValue => ({
    activeLearner, basePath, canAccessDashboard, canManageLearners, createForm, editForm, feedback, isAuthenticated, isCreateLearnerModalOpen,
    isSubmitting, learners, lessons, progress, viewerName, viewerRoleLabel,
  }), [activeLearner, basePath, canAccessDashboard, canManageLearners, createForm, editForm, feedback, isAuthenticated, isCreateLearnerModalOpen, isSubmitting, learners, lessons, progress, viewerName, viewerRoleLabel]);

  const shellActionsContextValue = useMemo((): KangurParentDashboardRuntimeShellActionsContextValue => ({
    logout, setActiveTab, setCreateLearnerModalOpen,
  }), [logout]);

  return (
    <KangurParentDashboardRuntimeStateContext.Provider value={stateContextValue}>
      <KangurParentDashboardRuntimeShellStateContext.Provider value={shellStateContextValue}>
        <KangurParentDashboardRuntimeHeroStateContext.Provider value={heroStateContextValue}>
          <KangurParentDashboardRuntimeOverviewStateContext.Provider value={overviewStateContextValue}>
            <KangurParentDashboardRuntimeShellActionsContext.Provider value={shellActionsContextValue}>
              <KangurParentDashboardRuntimeActionsContext.Provider value={actions}>
                {children}
              </KangurParentDashboardRuntimeActionsContext.Provider>
            </KangurParentDashboardRuntimeShellActionsContext.Provider>
          </KangurParentDashboardRuntimeOverviewStateContext.Provider>
        </KangurParentDashboardRuntimeHeroStateContext.Provider>
      </KangurParentDashboardRuntimeShellStateContext.Provider>
    </KangurParentDashboardRuntimeStateContext.Provider>
  );
}

export function KangurParentDashboardRuntimeBoundary({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}): JSX.Element {
  const existingStateContext = useContext(KangurParentDashboardRuntimeStateContext);
  const existingActionsContext = useContext(KangurParentDashboardRuntimeActionsContext);

  if (!enabled || existingStateContext || existingActionsContext) {
    return <>{children}</>;
  }

  return <KangurParentDashboardRuntimeProvider>{children}</KangurParentDashboardRuntimeProvider>;
}

export const useKangurParentDashboardRuntimeState =
  (): KangurParentDashboardRuntimeStateContextValue => {
    const context = useContext(KangurParentDashboardRuntimeStateContext);
    if (!context) {
      throw internalError(
        'useKangurParentDashboardRuntimeState must be used within a KangurParentDashboardRuntimeProvider'
      );
    }
    return context;
  };

export const useKangurParentDashboardRuntimeShellState =
  (): KangurParentDashboardRuntimeShellStateContextValue => {
    const context = useContext(KangurParentDashboardRuntimeShellStateContext);
    if (!context) {
      throw internalError(
        'useKangurParentDashboardRuntimeShellState must be used within a KangurParentDashboardRuntimeProvider'
      );
    }
    return context;
  };

export const useKangurParentDashboardRuntimeHeroState =
  (): KangurParentDashboardRuntimeHeroStateContextValue => {
    const context = useContext(KangurParentDashboardRuntimeHeroStateContext);
    if (!context) {
      throw internalError(
        'useKangurParentDashboardRuntimeHeroState must be used within a KangurParentDashboardRuntimeProvider'
      );
    }
    return context;
  };

export const useKangurParentDashboardRuntimeOverviewState =
  (): KangurParentDashboardRuntimeOverviewStateContextValue => {
    const context = useContext(KangurParentDashboardRuntimeOverviewStateContext);
    if (!context) {
      throw internalError(
        'useKangurParentDashboardRuntimeOverviewState must be used within a KangurParentDashboardRuntimeProvider'
      );
    }
    return context;
  };

export const useKangurParentDashboardRuntimeShellActions =
  (): KangurParentDashboardRuntimeShellActionsContextValue => {
    const context = useContext(KangurParentDashboardRuntimeShellActionsContext);
    if (!context) {
      throw internalError(
        'useKangurParentDashboardRuntimeShellActions must be used within a KangurParentDashboardRuntimeProvider'
      );
    }
    return context;
  };

export const useKangurParentDashboardRuntimeActions =
  (): KangurParentDashboardRuntimeActionsContextValue => {
    const context = useContext(KangurParentDashboardRuntimeActionsContext);
    if (!context) {
      throw internalError(
        'useKangurParentDashboardRuntimeActions must be used within a KangurParentDashboardRuntimeProvider'
      );
    }
    return context;
  };

export const useKangurParentDashboardRuntime = (): KangurParentDashboardRuntimeContextValue => {
  const state = useContext(KangurParentDashboardRuntimeStateContext);
  const actions = useContext(KangurParentDashboardRuntimeActionsContext);
  if (!state || !actions) {
    throw internalError(
      'useKangurParentDashboardRuntime must be used within a KangurParentDashboardRuntimeProvider'
    );
  }
  return useMemo(() => ({ ...state, ...actions }), [actions, state]);
};

export const useOptionalKangurParentDashboardRuntime =
  (): KangurParentDashboardRuntimeContextValue | null => {
    const state = useContext(KangurParentDashboardRuntimeStateContext);
    const actions = useContext(KangurParentDashboardRuntimeActionsContext);
    return useMemo(() => {
      if (!state || !actions) {
        return null;
      }
      return { ...state, ...actions };
    }, [actions, state]);
  };
