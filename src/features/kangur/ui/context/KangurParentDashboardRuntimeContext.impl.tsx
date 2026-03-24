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
import type { KangurLearnerProfile, KangurUser } from '@kangur/platform';
import { useKangurAuth } from '@/features/kangur/ui/context/KangurAuthContext';
import type { KangurAuthMode } from '@/features/kangur/shared/contracts/kangur-auth';
import { useKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import type { KangurProgressState } from '@/features/kangur/ui/types';
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


export type KangurParentDashboardTabId =
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
const ACTION_TIMEOUT_MS = 12_000;
const REFRESH_TIMEOUT_MS = 8_000;

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(message));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

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

  const canManageLearners = Boolean(user?.canManageLearners);
  const canAccessDashboard = isAuthenticated && canManageLearners;
  const learners = user?.learners ?? [];
  const activeLearner = user?.activeLearner ?? null;
  const viewerName = user?.email?.trim() || translations('account');
  const scoreViewerName = activeLearner?.displayName?.trim() || user?.full_name?.trim() || null;
  const scoreViewerEmail = user?.email?.trim() || null;
  const viewerRoleLabel =
    user?.role === 'admin'
      ? translations('viewerRole.teacher')
      : translations('viewerRole.parent');

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
        const normalizedLoginName = loginName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        const password = createForm.password.trim();
        const normalizedAge = createForm.age.trim();
        const parsedAge =
          normalizedAge.length > 0 && !Number.isNaN(Number(normalizedAge))
            ? Number(normalizedAge)
            : null;

        if (!displayName || !normalizedLoginName || !password) {
          setFeedback(translations('validation.missingLearnerData'));
          return;
        }

        const hasDuplicateLogin = learners.some(
          (learner) =>
            learner.loginName.trim().toLowerCase() === normalizedLoginName
        );
        if (hasDuplicateLogin) {
          setFeedback(translations('validation.duplicateNick'));
          return;
        }

        if (password.length < KANGUR_LEARNER_PASSWORD_MIN_LENGTH) {
          setFeedback(
            translations('validation.passwordMin', {
              count: KANGUR_LEARNER_PASSWORD_MIN_LENGTH,
            })
          );
          return;
        }

        if (!KANGUR_LEARNER_PASSWORD_PATTERN.test(password)) {
          setFeedback(translations('validation.passwordPattern'));
          return;
        }

        if (parsedAge !== null && (parsedAge < 3 || parsedAge > 99)) {
          setFeedback(translations('validation.ageRange'));
          return;
        }

        if (displayName.length > 120) {
          setFeedback(translations('validation.displayNameMax'));
          return;
        }

        if (normalizedLoginName.length > 80) {
          setFeedback(translations('validation.loginNameMax'));
          return;
        }

        if (password.length > KANGUR_LEARNER_PASSWORD_MAX_LENGTH) {
          setFeedback(
            translations('validation.passwordMax', {
              count: KANGUR_LEARNER_PASSWORD_MAX_LENGTH,
            })
          );
          return;
        }

        setIsSubmitting(true);
        setFeedback(null);

        await withKangurClientError(
          {
            source: 'kangur-parent-dashboard',
            action: 'create-learner',
            description: 'Create a new learner profile from the parent dashboard.',
            context: {
              loginName: normalizedLoginName,
            },
          },
          async () => {
            const created = await withTimeout(
              kangurPlatform.learners.create({
                displayName,
                loginName: normalizedLoginName,
                password,
                ...(parsedAge !== null ? { age: parsedAge } : {}),
              }),
              ACTION_TIMEOUT_MS,
              translations('timeout.create')
            );
            let didSelect = false;
            try {
              await withTimeout(
                selectLearner(created.id),
                REFRESH_TIMEOUT_MS,
                translations('timeout.activate')
              );
              didSelect = true;
            } catch (error) {
              void ErrorSystem.captureException(error);
              // Best-effort: make sure the parent session refreshes even if select fails.
              reportKangurClientError(error, {
                source: 'kangur-parent-dashboard',
                action: 'select-learner-after-create',
                description: 'Failed to select newly created learner in parent dashboard.',
                context: {
                  learnerId: created.id,
                },
              });
            }
            try {
              await withTimeout(
                checkAppState(),
                REFRESH_TIMEOUT_MS,
                translations('timeout.refresh')
              );
            } catch (error) {
              void ErrorSystem.captureException(error);
              reportKangurClientError(error, {
                source: 'kangur-parent-dashboard',
                action: 'refresh-after-create',
                description: 'Failed to refresh parent dashboard after learner creation.',
              });
            }
            setCreateForm({
              displayName: '',
              age: '',
              loginName: '',
              password: '',
            });
            if (didSelect) {
              setCreateLearnerModalOpen(false);
              setFeedback(null);
            } else {
              setFeedback(translations('feedback.createdButInactive'));
            }
          },
          {
            fallback: undefined,
            onError: (error) => {
              const status =
                error && typeof error === 'object' && 'status' in error
                  ? (error as { status?: number }).status
                  : null;
              const details =
                error && typeof error === 'object'
                  ? (error as {
                      details?: { issues?: { fieldErrors?: Record<string, string[]> } };
                    }).details
                  : null;
              const fieldErrors = details?.issues?.fieldErrors ?? null;

              if (status === 409) {
                setFeedback(translations('validation.duplicateNick'));
              } else if (fieldErrors?.['password']?.length) {
                setFeedback(
                  translations('validation.passwordCombined', {
                    count: KANGUR_LEARNER_PASSWORD_MIN_LENGTH,
                  })
                );
              } else if (fieldErrors?.['age']?.length) {
                setFeedback(translations('validation.ageRange'));
              } else if (fieldErrors?.['loginName']?.length) {
                setFeedback(translations('validation.loginNamePattern'));
              } else if (fieldErrors?.['displayName']?.length) {
                setFeedback(translations('validation.missingLearnerData'));
              } else if (
                error instanceof Error &&
                /validation failed|invalid kangur learner payload/i.test(error.message)
              ) {
                setFeedback(translations('validation.missingLearnerData'));
              } else {
                setFeedback(
                  error instanceof Error ? error.message : translations('feedback.addLearnerError')
                );
              }
            },
          }
        );
        setIsSubmitting(false);
      },
      handleSaveLearner: async () => {
        if (!canAccessDashboard || !activeLearner) {
          return false;
        }

        const trimmedPassword = editForm.password.trim();
        if (trimmedPassword.length > 0) {
          if (trimmedPassword.length < KANGUR_LEARNER_PASSWORD_MIN_LENGTH) {
            setFeedback(
              translations('validation.passwordMin', {
                count: KANGUR_LEARNER_PASSWORD_MIN_LENGTH,
              })
            );
            return false;
          }
          if (!KANGUR_LEARNER_PASSWORD_PATTERN.test(trimmedPassword)) {
            setFeedback(translations('validation.passwordPattern'));
            return false;
          }
          if (trimmedPassword.length > KANGUR_LEARNER_PASSWORD_MAX_LENGTH) {
            setFeedback(
              translations('validation.passwordMax', {
                count: KANGUR_LEARNER_PASSWORD_MAX_LENGTH,
              })
            );
            return false;
          }
        }

        setIsSubmitting(true);
        setFeedback(null);

        const didSave = await withKangurClientError(
          {
            source: 'kangur-parent-dashboard',
            action: 'save-learner',
            description: 'Save learner profile changes from the parent dashboard.',
            context: {
              learnerId: activeLearner.id,
            },
          },
          async () => {
            await withTimeout(
              kangurPlatform.learners.update(activeLearner.id, {
                displayName: editForm.displayName,
                loginName: editForm.loginName,
                ...(trimmedPassword.length > 0 ? { password: trimmedPassword } : {}),
                status: editForm.status === 'disabled' ? 'disabled' : 'active',
              }),
              ACTION_TIMEOUT_MS,
              translations('timeout.save')
            );
            try {
              await withTimeout(
                checkAppState(),
                REFRESH_TIMEOUT_MS,
                translations('timeout.refresh')
              );
            } catch (error) {
              void ErrorSystem.captureException(error);
              reportKangurClientError(error, {
                source: 'kangur-parent-dashboard',
                action: 'refresh-after-save',
                description: 'Failed to refresh parent dashboard after learner save.',
              });
            }
            setEditForm((current) => ({ ...current, password: '' }));
            setFeedback(translations('feedback.saveSuccess'));
            return true;
          },
          {
            fallback: false,
            onError: (error) => {
              setFeedback(
                error instanceof Error ? error.message : translations('feedback.saveError')
              );
            },
          }
        );
        setIsSubmitting(false);
        return didSave;
      },
      handleDeleteLearner: async (learnerId: string) => {
        if (!canAccessDashboard) {
          return false;
        }

        setIsSubmitting(true);
        setFeedback(null);

        const didDelete = await withKangurClientError(
          {
            source: 'kangur-parent-dashboard',
            action: 'delete-learner',
            description: 'Delete a learner profile from the parent dashboard.',
            context: {
              learnerId,
            },
          },
          async () => {
            const removed = await withTimeout(
              kangurPlatform.learners.delete(learnerId),
              ACTION_TIMEOUT_MS,
              translations('timeout.delete')
            );
            try {
              await withTimeout(
                checkAppState(),
                REFRESH_TIMEOUT_MS,
                translations('timeout.refresh')
              );
            } catch (error) {
              void ErrorSystem.captureException(error);
              reportKangurClientError(error, {
                source: 'kangur-parent-dashboard',
                action: 'refresh-after-delete',
                description: 'Failed to refresh parent dashboard after learner delete.',
              });
            }
            setFeedback(translations('feedback.deleteSuccess', { name: removed.displayName }));
            return true;
          },
          {
            fallback: false,
            onError: (error) => {
              setFeedback(
                error instanceof Error ? error.message : translations('feedback.deleteError')
              );
            },
          }
        );
        setIsSubmitting(false);
        return didDelete;
      },
    }),
    [
      activeLearner,
      canAccessDashboard,
      checkAppState,
      createForm,
      editForm,
      learners,
      logout,
      navigateToLogin,
      setCreateLearnerModalOpen,
      selectLearner,
      translations,
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
