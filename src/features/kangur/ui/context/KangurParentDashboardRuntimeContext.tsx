'use client';

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
import type { KangurLearnerProfile, KangurUser } from '@/features/kangur/services/ports';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import type { KangurLoginModalAuthMode } from '@/features/kangur/ui/context/KangurLoginModalContext';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { internalError } from '@/shared/errors/app-error';

export type KangurParentDashboardTabId = 'progress' | 'scores' | 'assign' | 'ai-tutor';
export type KangurParentDashboardPanelDisplayMode = 'always' | 'active-tab';

type KangurParentDashboardCreateForm = {
  displayName: string;
  loginName: string;
  password: string;
};

type KangurParentDashboardEditForm = {
  displayName: string;
  loginName: string;
  password: string;
  status: 'active' | 'disabled';
};

type KangurParentDashboardRuntimeStateContextValue = {
  basePath: string;
  user: KangurUser | null;
  learners: KangurLearnerProfile[];
  activeLearner: KangurLearnerProfile | null;
  isAuthenticated: boolean;
  canManageLearners: boolean;
  canAccessDashboard: boolean;
  viewerName: string;
  scoreViewerName: string | null;
  scoreViewerEmail: string | null;
  viewerRoleLabel: string;
  progress: KangurProgressState;
  activeTab: KangurParentDashboardTabId;
  createForm: KangurParentDashboardCreateForm;
  editForm: KangurParentDashboardEditForm;
  isSubmitting: boolean;
  feedback: string | null;
};

type KangurParentDashboardRuntimeActionsContextValue = {
  navigateToLogin: (options?: { authMode?: KangurLoginModalAuthMode }) => void;
  logout: (shouldRedirect?: boolean) => void;
  selectLearner: (learnerId: string) => Promise<void>;
  setActiveTab: (tabId: KangurParentDashboardTabId) => void;
  updateCreateField: <K extends keyof KangurParentDashboardCreateForm>(
    key: K,
    value: KangurParentDashboardCreateForm[K]
  ) => void;
  updateEditField: <K extends keyof KangurParentDashboardEditForm>(
    key: K,
    value: KangurParentDashboardEditForm[K]
  ) => void;
  handleCreateLearner: () => Promise<void>;
  handleSaveLearner: () => Promise<void>;
};

type KangurParentDashboardRuntimeContextValue = KangurParentDashboardRuntimeStateContextValue &
  KangurParentDashboardRuntimeActionsContextValue;

const kangurPlatform = getKangurPlatform();

const KangurParentDashboardRuntimeStateContext =
  createContext<KangurParentDashboardRuntimeStateContextValue | null>(null);
const KangurParentDashboardRuntimeActionsContext =
  createContext<KangurParentDashboardRuntimeActionsContextValue | null>(null);

export const shouldRenderKangurParentDashboardPanel = (
  displayMode: KangurParentDashboardPanelDisplayMode,
  activeTab: KangurParentDashboardTabId,
  targetTab: KangurParentDashboardTabId
): boolean => displayMode === 'always' || activeTab === targetTab;

export function KangurParentDashboardRuntimeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  const { basePath } = useKangurRouting();
  const {
    isAuthenticated,
    user,
    navigateToLogin,
    logout,
    selectLearner,
    checkAppState,
  } = useKangurAuth();
  const progress = useKangurProgressState();
  const [activeTab, setActiveTab] = useState<KangurParentDashboardTabId>('progress');
  const [createForm, setCreateForm] = useState<KangurParentDashboardCreateForm>({
    displayName: '',
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

  const canManageLearners = Boolean(user?.canManageLearners);
  const canAccessDashboard = isAuthenticated && canManageLearners;
  const learners = user?.learners ?? [];
  const activeLearner = user?.activeLearner ?? null;
  const viewerName = user?.email?.trim() || 'Konto';
  const scoreViewerName = activeLearner?.displayName?.trim() || user?.full_name?.trim() || null;
  const scoreViewerEmail = user?.email?.trim() || null;
  const viewerRoleLabel = user?.role === 'admin' ? 'Nauczyciel' : 'Rodzic';

  useEffect(() => {
    setEditForm({
      displayName: activeLearner?.displayName ?? '',
      loginName: activeLearner?.loginName ?? '',
      password: '',
      status: activeLearner?.status === 'disabled' ? 'disabled' : 'active',
    });
  }, [
    activeLearner?.displayName,
    activeLearner?.id,
    activeLearner?.loginName,
    activeLearner?.status,
  ]);

  const stateValue = useMemo<KangurParentDashboardRuntimeStateContextValue>(
    () => ({
      basePath,
      user,
      learners,
      activeLearner,
      isAuthenticated,
      canManageLearners,
      canAccessDashboard,
      viewerName,
      scoreViewerName,
      scoreViewerEmail,
      viewerRoleLabel,
      progress,
      activeTab,
      createForm,
      editForm,
      isSubmitting,
      feedback,
    }),
    [
      activeLearner,
      activeTab,
      basePath,
      canAccessDashboard,
      canManageLearners,
      createForm,
      editForm,
      feedback,
      isAuthenticated,
      isSubmitting,
      learners,
      progress,
      scoreViewerEmail,
      scoreViewerName,
      user,
      viewerName,
      viewerRoleLabel,
    ]
  );

  const actionsValue = useMemo<KangurParentDashboardRuntimeActionsContextValue>(
    () => ({
      navigateToLogin,
      logout,
      selectLearner,
      setActiveTab,
      updateCreateField: (key, value) => {
        setCreateForm((current) => ({ ...current, [key]: value }));
      },
      updateEditField: (key, value) => {
        setEditForm((current) => ({ ...current, [key]: value }));
      },
      handleCreateLearner: async () => {
        if (!canAccessDashboard) {
          return;
        }

        setIsSubmitting(true);
        setFeedback(null);

        try {
          const created = await kangurPlatform.learners.create(createForm);
          await selectLearner(created.id);
          setCreateForm({
            displayName: '',
            loginName: '',
            password: '',
          });
          setFeedback(`Dodano profil ucznia: ${created.displayName}.`);
        } catch (error: unknown) {
          setFeedback(
            error instanceof Error ? error.message : 'Nie udalo sie dodac ucznia.'
          );
        } finally {
          setIsSubmitting(false);
        }
      },
      handleSaveLearner: async () => {
        if (!canAccessDashboard || !activeLearner) {
          return;
        }

        setIsSubmitting(true);
        setFeedback(null);

        try {
          await kangurPlatform.learners.update(activeLearner.id, {
            displayName: editForm.displayName,
            loginName: editForm.loginName,
            ...(editForm.password.trim().length > 0 ? { password: editForm.password } : {}),
            status: editForm.status === 'disabled' ? 'disabled' : 'active',
          });
          await checkAppState();
          setEditForm((current) => ({ ...current, password: '' }));
          setFeedback('Zapisano dane ucznia.');
        } catch (error: unknown) {
          setFeedback(
            error instanceof Error ? error.message : 'Nie udalo sie zapisac zmian.'
          );
        } finally {
          setIsSubmitting(false);
        }
      },
    }),
    [
      activeLearner,
      canAccessDashboard,
      checkAppState,
      createForm,
      editForm,
      logout,
      navigateToLogin,
      selectLearner,
    ]
  );

  return (
    <KangurParentDashboardRuntimeActionsContext.Provider value={actionsValue}>
      <KangurParentDashboardRuntimeStateContext.Provider value={stateValue}>
        {children}
      </KangurParentDashboardRuntimeStateContext.Provider>
    </KangurParentDashboardRuntimeActionsContext.Provider>
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

export const useKangurParentDashboardRuntime =
  (): KangurParentDashboardRuntimeContextValue => {
    const state = useKangurParentDashboardRuntimeState();
    const actions = useKangurParentDashboardRuntimeActions();
    return useMemo(() => ({ ...state, ...actions }), [state, actions]);
  };

export const useOptionalKangurParentDashboardRuntime =
  (): KangurParentDashboardRuntimeContextValue | null => {
    const state = useContext(KangurParentDashboardRuntimeStateContext);
    const actions = useContext(KangurParentDashboardRuntimeActionsContext);
    return useMemo(() => {
      if (!state && !actions) return null;
      return { ...(state ?? {}), ...(actions ?? {}) } as KangurParentDashboardRuntimeContextValue;
    }, [state, actions]);
  };
