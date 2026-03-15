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
import type { KangurAuthMode } from '@/shared/contracts/kangur-auth';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import type { KangurProgressState } from '@/features/kangur/ui/types';
import { internalError } from '@/shared/errors/app-error';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


export type KangurParentDashboardTabId =
  | 'scores'
  | 'progress'
  | 'assign'
  | 'monitoring'
  | 'ai-tutor';
export type KangurParentDashboardPanelDisplayMode = 'always' | 'active-tab';

type KangurParentDashboardCreateForm = {
  displayName: string;
  age: string;
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
  isCreateLearnerModalOpen: boolean;
  createForm: KangurParentDashboardCreateForm;
  editForm: KangurParentDashboardEditForm;
  isSubmitting: boolean;
  feedback: string | null;
};

type KangurParentDashboardRuntimeActionsContextValue = {
  navigateToLogin: (options?: { authMode?: KangurAuthMode }) => void;
  logout: (shouldRedirect?: boolean) => void;
  selectLearner: (learnerId: string) => Promise<void>;
  setActiveTab: (tabId: KangurParentDashboardTabId) => void;
  setCreateLearnerModalOpen: (open: boolean) => void;
  updateCreateField: <K extends keyof KangurParentDashboardCreateForm>(
    key: K,
    value: KangurParentDashboardCreateForm[K]
  ) => void;
  updateEditField: <K extends keyof KangurParentDashboardEditForm>(
    key: K,
    value: KangurParentDashboardEditForm[K]
  ) => void;
  handleCreateLearner: () => Promise<void>;
  handleSaveLearner: () => Promise<boolean>;
  handleDeleteLearner: (learnerId: string) => Promise<boolean>;
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
  const [activeTab, setActiveTab] = useState<KangurParentDashboardTabId>('scores');
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
      isCreateLearnerModalOpen,
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
      isCreateLearnerModalOpen,
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
      setCreateLearnerModalOpen,
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

        const displayName = createForm.displayName.trim();
        const loginName = createForm.loginName.trim();
        const normalizedLoginName = loginName.replace(/[^a-zA-Z0-9]/g, '');
        const password = createForm.password.trim();
        const normalizedAge = createForm.age.trim();
        const parsedAge =
          normalizedAge.length > 0 && !Number.isNaN(Number(normalizedAge))
            ? Number(normalizedAge)
            : null;

        if (!displayName || !normalizedLoginName || !password) {
          setFeedback('Wypełnij dane ucznia');
          return;
        }

        if (password.length < 8) {
          setFeedback('Hasło musi mieć co najmniej 8 znaków');
          return;
        }

        if (parsedAge !== null && (parsedAge < 3 || parsedAge > 99)) {
          setFeedback('Wiek ucznia musi być w zakresie 3–99');
          return;
        }

        if (displayName.length > 120) {
          setFeedback('Imię ucznia może mieć maks. 120 znaków');
          return;
        }

        if (normalizedLoginName.length > 80) {
          setFeedback('Nick może mieć maks. 80 znaków');
          return;
        }

        if (password.length > 160) {
          setFeedback('Hasło może mieć maks. 160 znaków');
          return;
        }

        setIsSubmitting(true);
        setFeedback(null);

        try {
          const created = await kangurPlatform.learners.create({
            displayName,
            loginName: normalizedLoginName,
            password,
            ...(parsedAge !== null ? { age: parsedAge } : {}),
          });
          await selectLearner(created.id);
          setCreateForm({
            displayName: '',
            age: '',
            loginName: '',
            password: '',
          });
          setCreateLearnerModalOpen(false);
          setFeedback(null);
        } catch (error: unknown) {
          logClientError(error);
          const details =
            error && typeof error === 'object'
              ? (error as { details?: { issues?: { fieldErrors?: Record<string, string[]> } } })
                  .details
              : null;
          const fieldErrors = details?.issues?.fieldErrors ?? null;

          if (fieldErrors?.['password']?.length) {
            setFeedback('Hasło musi mieć co najmniej 8 znaków');
          } else if (fieldErrors?.['age']?.length) {
            setFeedback('Wiek ucznia musi być w zakresie 3–99');
          } else if (fieldErrors?.['loginName']?.length) {
            setFeedback('Nick może zawierać tylko litery i cyfry');
          } else if (fieldErrors?.['displayName']?.length) {
            setFeedback('Wypełnij dane ucznia');
          } else if (            error instanceof Error &&
            /validation failed|invalid kangur learner payload/i.test(error.message)
          ) {
            setFeedback('Wypełnij dane ucznia');
          } else {
            setFeedback(
              error instanceof Error ? error.message : 'Nie udało się dodać ucznia.'
            );
          }
        } finally {
          setIsSubmitting(false);
        }
      },
      handleSaveLearner: async () => {
        if (!canAccessDashboard || !activeLearner) {
          return false;
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
          return true;
        } catch (error: unknown) {
          logClientError(error);
          setFeedback(
            error instanceof Error ? error.message : 'Nie udało się zapisać zmian.'
          );
          return false;
        } finally {
          setIsSubmitting(false);
        }
      },
      handleDeleteLearner: async (learnerId: string) => {
        if (!canAccessDashboard) {
          return false;
        }

        setIsSubmitting(true);
        setFeedback(null);

        try {
          const removed = await kangurPlatform.learners.delete(learnerId);
          await checkAppState();
          setFeedback(`Usunięto profil ucznia: ${removed.displayName}.`);
          return true;
        } catch (error: unknown) {
          logClientError(error);
          setFeedback(
            error instanceof Error ? error.message : 'Nie udało się usunąć profilu ucznia.'
          );
          return false;
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
      setCreateLearnerModalOpen,
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
