'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';

import {
  KANGUR_AI_TUTOR_APP_SETTINGS_KEY,
  KANGUR_AI_TUTOR_SETTINGS_KEY,
  getKangurAiTutorSettingsForLearner,
  parseKangurAiTutorSettings,
  resolveKangurAiTutorAppSettings,
  type KangurAiTutorHintDepth,
  type KangurAiTutorLearnerStoredSettings,
  type KangurAiTutorProactiveNudges,
  type KangurAiTutorTestAccessMode,
  type KangurAiTutorUiMode,
} from '@/features/kangur/ai-tutor/settings';
import { useKangurAiTutorContent } from '@/features/kangur/ui/context/KangurAiTutorContentContext';
import {
  type KangurParentDashboardPanelDisplayMode,
  shouldRenderKangurParentDashboardPanel,
  useKangurParentDashboardRuntime,
} from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import { useKangurPageContentEntry } from '@/features/kangur/ui/hooks/useKangurPageContent';
import { invalidateSettingsCache } from '@/shared/api/settings-client';
import type { KangurAiTutorUsageResponse } from '@/features/kangur/shared/contracts/kangur-ai-tutor';
import {
  loadPersistedTutorVisibilityHidden,
  persistTutorVisibilityHidden,
  subscribeToTutorVisibilityChanges,
} from '@/features/kangur/ui/components/ai-tutor-widget/KangurAiTutorWidget.storage';
import { useOptionalKangurAiTutor } from '@/features/kangur/ui/context/KangurAiTutorContext';
import { api } from '@/shared/lib/api-client';
import { createSingleQueryV2 } from '@/shared/lib/query-factories-v2';
import { invalidateAllSettings } from '@/shared/lib/query-invalidation';
import { kangurKeys } from '@/shared/lib/query-key-exports';
import { useSettingsStore } from '@/features/kangur/shared/providers/SettingsStoreProvider';
import { serializeSetting } from '@/features/kangur/shared/utils/settings-json';
import { withKangurClientError } from '@/features/kangur/observability/client';

import {
  AI_TUTOR_USAGE_LOAD_DEFER_MS,
  PARENT_DASHBOARD_AI_TUTOR_TEMPORARILY_DISABLED,
} from './KangurParentDashboardAiTutorWidget.constants';
import { AiTutorConfigPanel } from './KangurParentDashboardAiTutorWidget.sections';
import type {
  AiTutorConfigPanelState,
  KangurAiTutorFormBindings,
  KangurAiTutorFormState,
  KangurAiTutorUsageSummary,
} from './KangurParentDashboardAiTutorWidget.types';
import {
  createAiTutorFormState,
  createAiTutorStoredSettings,
  resolveAiTutorActionClasses,
  resolveAiTutorControlsDisabled,
  resolveAiTutorMoodPresentation,
  resolveAiTutorPanelCopy,
  resolveAiTutorUsagePresentation,
  resolveCrossPagePersistenceFormState,
  resolveShouldLoadAiTutorUsage,
} from './KangurParentDashboardAiTutorWidget.utils';

function useAiTutorVisibilityHidden(): boolean {
  const [isTutorHidden, setIsTutorHidden] = useState(() => loadPersistedTutorVisibilityHidden());

  useEffect(() => subscribeToTutorVisibilityChanges(setIsTutorHidden), []);

  return isTutorHidden;
}

function useAiTutorDeferredUsageQueryReady(shouldLoadUsage: boolean): boolean {
  const [isUsageQueryReady, setIsUsageQueryReady] = useState(false);

  useEffect(() => {
    if (!shouldLoadUsage) {
      setIsUsageQueryReady(false);
      return;
    }

    setIsUsageQueryReady(false);
    const timeoutId = setTimeout(() => {
      setIsUsageQueryReady(true);
    }, AI_TUTOR_USAGE_LOAD_DEFER_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [shouldLoadUsage]);

  return isUsageQueryReady;
}

function useAiTutorUsageState({
  activeLearnerId,
  shouldLoadUsage,
}: {
  activeLearnerId: string | null;
  shouldLoadUsage: boolean;
}): {
  usageSummary: KangurAiTutorUsageSummary | null;
  isUsagePending: boolean;
  hasUsageError: boolean;
} {
  const isUsageQueryReady = useAiTutorDeferredUsageQueryReady(shouldLoadUsage);
  const { data, isLoading, isError } = createSingleQueryV2<KangurAiTutorUsageResponse>({
    id: activeLearnerId,
    queryKey: kangurKeys.aiTutor.usage(activeLearnerId),
    queryFn: async () => {
      if (!activeLearnerId) {
        throw new Error('Missing active learner.');
      }

      return api.get<KangurAiTutorUsageResponse>('/api/kangur/ai-tutor/usage', {
        headers: {
          'x-kangur-learner-id': activeLearnerId,
        },
      });
    },
    enabled: shouldLoadUsage && isUsageQueryReady,
    staleTime: 10_000,
    refetchInterval: shouldLoadUsage && isUsageQueryReady ? 30_000 : false,
    refetchOnWindowFocus: false,
    meta: {
      source: 'kangur.ui.KangurParentDashboardAiTutorWidget.usage',
      operation: 'detail',
      resource: 'kangur.ai-tutor.usage',
      domain: 'kangur',
      queryKey: kangurKeys.aiTutor.usage(activeLearnerId),
      tags: ['kangur', 'ai-tutor', 'usage'],
      description: 'Loads AI tutor usage for the active learner.',
    },
  });

  return {
    usageSummary: data?.usage ?? null,
    isUsagePending: shouldLoadUsage && (!isUsageQueryReady || isLoading),
    hasUsageError: isError,
  };
}

function useAiTutorConfigFormState({
  activeLearnerId,
  currentSettings,
  isTemporarilyDisabled,
}: {
  activeLearnerId: string | null;
  currentSettings: KangurAiTutorLearnerStoredSettings | null;
  isTemporarilyDisabled: boolean;
}): KangurAiTutorFormBindings {
  const [formState, setFormState] = useState(() =>
    createAiTutorFormState(currentSettings, isTemporarilyDisabled)
  );

  useEffect(() => {
    setFormState(createAiTutorFormState(currentSettings, isTemporarilyDisabled));
  }, [activeLearnerId, currentSettings, isTemporarilyDisabled]);

  const updateFormState = useCallback((next: Partial<KangurAiTutorFormState>): void => {
    setFormState((current) => ({ ...current, ...next }));
  }, []);

  const setAllowCrossPagePersistence = useCallback((checked: boolean): void => {
    setFormState((current) => resolveCrossPagePersistenceFormState(current, checked));
  }, []);

  return {
    formState,
    setEnabled: useCallback((enabled: boolean) => updateFormState({ enabled }), [updateFormState]),
    setUiMode: useCallback((uiMode: KangurAiTutorUiMode) => updateFormState({ uiMode }), [updateFormState]),
    setAllowCrossPagePersistence,
    setRememberTutorContext: useCallback(
      (rememberTutorContext: boolean) => updateFormState({ rememberTutorContext }),
      [updateFormState]
    ),
    setAllowLessons: useCallback(
      (allowLessons: boolean) => updateFormState({ allowLessons }),
      [updateFormState]
    ),
    setAllowGames: useCallback((allowGames: boolean) => updateFormState({ allowGames }), [updateFormState]),
    setTestAccessMode: useCallback(
      (testAccessMode: KangurAiTutorTestAccessMode) => updateFormState({ testAccessMode }),
      [updateFormState]
    ),
    setShowSources: useCallback((showSources: boolean) => updateFormState({ showSources }), [updateFormState]),
    setAllowSelectedTextSupport: useCallback(
      (allowSelectedTextSupport: boolean) => updateFormState({ allowSelectedTextSupport }),
      [updateFormState]
    ),
    setHintDepth: useCallback(
      (hintDepth: KangurAiTutorHintDepth) => updateFormState({ hintDepth }),
      [updateFormState]
    ),
    setProactiveNudges: useCallback(
      (proactiveNudges: KangurAiTutorProactiveNudges) => updateFormState({ proactiveNudges }),
      [updateFormState]
    ),
  };
}

function useAiTutorStoredSettings(
  activeLearnerId: string | null
): {
  settingsStoreMap: ReturnType<typeof parseKangurAiTutorSettings>;
  currentSettings: KangurAiTutorLearnerStoredSettings | null;
} {
  const settingsStore = useSettingsStore();
  const rawSettings = settingsStore.get(KANGUR_AI_TUTOR_SETTINGS_KEY);
  const rawAppSettings = settingsStore.get(KANGUR_AI_TUTOR_APP_SETTINGS_KEY);
  const settingsStoreMap = useMemo(
    () => parseKangurAiTutorSettings(rawSettings),
    [rawSettings]
  );
  const appSettings = useMemo(
    () => resolveKangurAiTutorAppSettings(rawAppSettings, settingsStoreMap),
    [rawAppSettings, settingsStoreMap]
  );
  const currentSettings = useMemo(
    () =>
      activeLearnerId
        ? getKangurAiTutorSettingsForLearner(settingsStoreMap, activeLearnerId, appSettings)
        : null,
    [activeLearnerId, appSettings, settingsStoreMap]
  );

  return { settingsStoreMap, currentSettings };
}

function useAiTutorConfigPanelState(): AiTutorConfigPanelState {
  const locale = useLocale();
  const translations = useTranslations('KangurParentDashboard');
  const isCoarsePointer = useKangurCoarsePointer();
  const tutorContent = useKangurAiTutorContent();
  const tutor = useOptionalKangurAiTutor();
  const { activeLearner, canAccessDashboard } = useKangurParentDashboardRuntime();
  const { entry: aiTutorSectionContent } = useKangurPageContentEntry('parent-dashboard-ai-tutor');
  const queryClient = useQueryClient();
  const activeLearnerId = activeLearner?.id ?? null;
  const isTemporarilyDisabled = PARENT_DASHBOARD_AI_TUTOR_TEMPORARILY_DISABLED;
  const isTutorHidden = useAiTutorVisibilityHidden();
  const { settingsStoreMap, currentSettings } = useAiTutorStoredSettings(activeLearnerId);
  const formBindings = useAiTutorConfigFormState({
    activeLearnerId,
    currentSettings,
    isTemporarilyDisabled,
  });
  const { formState } = formBindings;
  const isUsageEnabled = !isTemporarilyDisabled && formState.enabled;
  const shouldLoadUsage = resolveShouldLoadAiTutorUsage({
    activeLearnerId,
    canAccessDashboard,
    isUsageEnabled,
  });
  const { usageSummary, isUsagePending, hasUsageError } = useAiTutorUsageState({
    activeLearnerId,
    shouldLoadUsage,
  });
  const moodPresentation = useMemo(
    () =>
      resolveAiTutorMoodPresentation({
        activeLearner,
        locale,
        parentDashboardContent: tutorContent.parentDashboard,
        tutorContent,
      }),
    [activeLearner, locale, tutorContent]
  );
  const usagePresentation = useMemo(
    () =>
      resolveAiTutorUsagePresentation({
        parentDashboardContent: tutorContent.parentDashboard,
        usageSummary,
        isUsagePending,
        hasUsageError,
        showUsage: isUsageEnabled,
      }),
    [hasUsageError, isUsageEnabled, isUsagePending, tutorContent.parentDashboard, usageSummary]
  );
  const actionClasses = useMemo(
    () => resolveAiTutorActionClasses(isCoarsePointer),
    [isCoarsePointer]
  );
  const panelCopy = useMemo(
    () =>
      resolveAiTutorPanelCopy({
        activeLearner,
        aiTutorSectionContent,
        fallbackSectionTitle: translations('widgets.aiTutor.title'),
        tutorContent,
      }),
    [activeLearner, aiTutorSectionContent, translations, tutorContent]
  );
  const controlsDisabled = resolveAiTutorControlsDisabled(
    isTemporarilyDisabled,
    formState.enabled
  );
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const uiModeFieldId = useId();
  const testAccessModeFieldId = useId();
  const hintDepthFieldId = useId();
  const proactiveNudgesFieldId = useId();

  const handleRestoreTutor = useCallback((): void => {
    persistTutorVisibilityHidden(false);
    if (tutor?.enabled) {
      tutor.openChat();
    }
  }, [tutor]);

  const handleToggleEnabled = useCallback((): void => {
    const nextEnabled = !formState.enabled;
    formBindings.setEnabled(nextEnabled);
    if (nextEnabled) {
      persistTutorVisibilityHidden(false);
    }
  }, [formBindings.setEnabled, formState.enabled]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!activeLearner || !canAccessDashboard || isTemporarilyDisabled) {
      return;
    }

    setIsSaving(true);
    setFeedback(null);
    const next = createAiTutorStoredSettings(formState);
    const nextStore = {
      ...settingsStoreMap,
      [activeLearner.id]: next,
    };

    await withKangurClientError(
      {
        source: 'kangur-parent-dashboard',
        action: 'save-ai-tutor-settings',
        description: 'Save AI tutor settings for a learner.',
        context: {
          learnerId: activeLearner.id,
        },
      },
      async () => {
        await api.post('/api/settings', {
          key: KANGUR_AI_TUTOR_SETTINGS_KEY,
          value: serializeSetting(nextStore),
        });
        invalidateSettingsCache();
        await invalidateAllSettings(queryClient);
        if (next.enabled) {
          await queryClient.invalidateQueries({
            queryKey: kangurKeys.aiTutor.usage(activeLearner.id),
          });
        }
        setFeedback(tutorContent.parentDashboard.saveSuccess);
      },
      {
        fallback: undefined,
        onError: () => {
          setFeedback(tutorContent.parentDashboard.saveError);
        },
      }
    );
    setIsSaving(false);
  }, [
    activeLearner,
    canAccessDashboard,
    formState,
    isTemporarilyDisabled,
    queryClient,
    settingsStoreMap,
    tutorContent.parentDashboard.saveError,
    tutorContent.parentDashboard.saveSuccess,
  ]);

  return {
    actionClasses,
    activeLearner,
    controlsDisabled,
    feedback,
    formBindings,
    handleRestoreTutor,
    handleSave,
    handleToggleEnabled,
    hintDepthFieldId,
    isSaving,
    isTemporarilyDisabled,
    isTutorHidden,
    learnerHeaderTitle: panelCopy.learnerHeaderTitle,
    moodPresentation,
    proactiveNudgesFieldId,
    sectionSummary: panelCopy.sectionSummary,
    sectionTitle: panelCopy.sectionTitle,
    testAccessModeFieldId,
    tutorContent,
    uiModeFieldId,
    usagePresentation,
    enableTutorLabel: panelCopy.enableTutorLabel,
  };
}

export function KangurParentDashboardAiTutorWidget({
  displayMode = 'always',
}: {
  displayMode?: KangurParentDashboardPanelDisplayMode;
}): React.JSX.Element | null {
  const { activeTab, canAccessDashboard } = useKangurParentDashboardRuntime();
  const state = useAiTutorConfigPanelState();

  if (!canAccessDashboard) return null;
  if (!shouldRenderKangurParentDashboardPanel(displayMode, activeTab, 'ai-tutor')) return null;

  return <AiTutorConfigPanel state={state} />;
}
