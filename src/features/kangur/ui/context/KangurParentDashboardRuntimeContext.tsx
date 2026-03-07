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
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import type { KangurProgressState } from '@/features/kangur/ui/types';

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

type KangurParentDashboardRuntimeContextValue = {
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
  navigateToLogin: () => void;
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

const kangurPlatform = getKangurPlatform();

const KangurParentDashboardRuntimeContext =
  createContext<KangurParentDashboardRuntimeContextValue | null>(null);

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

  const value = useMemo<KangurParentDashboardRuntimeContextValue>(
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
      activeTab,
      basePath,
      canAccessDashboard,
      canManageLearners,
      checkAppState,
      createForm,
      editForm,
      feedback,
      isAuthenticated,
      isSubmitting,
      learners,
      logout,
      navigateToLogin,
      progress,
      scoreViewerEmail,
      scoreViewerName,
      selectLearner,
      user,
      viewerName,
      viewerRoleLabel,
    ]
  );

  return (
    <KangurParentDashboardRuntimeContext.Provider value={value}>
      {children}
    </KangurParentDashboardRuntimeContext.Provider>
  );
}

export function KangurParentDashboardRuntimeBoundary({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}): JSX.Element {
  const existingContext = useContext(KangurParentDashboardRuntimeContext);
  if (!enabled || existingContext) {
    return <>{children}</>;
  }

  return <KangurParentDashboardRuntimeProvider>{children}</KangurParentDashboardRuntimeProvider>;
}

export const useKangurParentDashboardRuntime =
  (): KangurParentDashboardRuntimeContextValue => {
    const context = useContext(KangurParentDashboardRuntimeContext);
    if (!context) {
      throw new Error(
        'useKangurParentDashboardRuntime must be used within a KangurParentDashboardRuntimeProvider'
      );
    }
    return context;
  };

export const useOptionalKangurParentDashboardRuntime =
  (): KangurParentDashboardRuntimeContextValue | null =>
    useContext(KangurParentDashboardRuntimeContext);
