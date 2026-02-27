'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { useAgentCreatorSettings } from '@/features/ai/agentcreator';
import { useBrainModelOptions } from '@/features/ai/brain/hooks/useBrainModelOptions';
import type { ChatbotSettingsDto as ChatbotSettingsPayload } from '@/shared/contracts/chatbot';
import { useToast } from '@/shared/ui';

import {
  CHATBOT_SETTINGS_KEY,
  DEFAULT_CHATBOT_SETTINGS,
} from '../utils/constants';
import { useChatbotSettings } from './useChatbotQueries';
import { useSaveChatbotSettings } from './useChatbotMutations';

export interface UseChatbotSettingsStateReturn {
  modelOptions: string[];
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  modelLoading: boolean;
  webSearchEnabled: boolean;
  setWebSearchEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  useGlobalContext: boolean;
  setUseGlobalContext: React.Dispatch<React.SetStateAction<boolean>>;
  useLocalContext: boolean;
  setUseLocalContext: React.Dispatch<React.SetStateAction<boolean>>;
  searchProvider: string;
  setSearchProvider: React.Dispatch<React.SetStateAction<string>>;
  playwrightPersonaId: string | null;
  setPlaywrightPersonaId: (id: string | null) => void;
  globalContext: string;
  setGlobalContext: React.Dispatch<React.SetStateAction<string>>;
  localContext: string;
  setLocalContext: React.Dispatch<React.SetStateAction<string>>;
  localContextMode: 'override' | 'append';
  setLocalContextMode: React.Dispatch<
    React.SetStateAction<'override' | 'append'>
  >;
  settingsDirty: boolean;
  setSettingsDirty: React.Dispatch<React.SetStateAction<boolean>>;
  settingsSaving: boolean;
  setSettingsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  loadChatbotSettings: () => Promise<void>;
  saveChatbotSettings: () => Promise<void>;

  // Agent Mode
  agentModeEnabled: boolean;
  setAgentModeEnabled: (enabled: boolean) => void;
  agentRunHeadless: boolean;
  setAgentRunHeadless: (headless: boolean) => void;
  agentBrowser: string;
  setAgentBrowser: (browser: string) => void;
  agentIgnoreRobotsTxt: boolean;
  setAgentIgnoreRobotsTxt: (ignore: boolean) => void;
  agentRequireHumanApproval: boolean;
  setAgentRequireHumanApproval: (require: boolean) => void;

  // Agent Models
  agentMemoryValidationModel: string | null;
  setAgentMemoryValidationModel: (model: string | null) => void;
  agentPlannerModel: string | null;
  setAgentPlannerModel: (model: string | null) => void;
  agentSelfCheckModel: string | null;
  setAgentSelfCheckModel: (model: string | null) => void;
  agentExtractionValidationModel: string | null;
  setAgentExtractionValidationModel: (model: string | null) => void;
  agentToolRouterModel: string | null;
  setAgentToolRouterModel: (model: string | null) => void;
  agentLoopGuardModel: string | null;
  setAgentLoopGuardModel: (model: string | null) => void;
  agentApprovalGateModel: string | null;
  setAgentApprovalGateModel: (model: string | null) => void;
  agentMemorySummarizationModel: string | null;
  setAgentMemorySummarizationModel: (model: string | null) => void;
  agentSelectorInferenceModel: string | null;
  setAgentSelectorInferenceModel: (model: string | null) => void;
  agentOutputNormalizationModel: string | null;
  setAgentOutputNormalizationModel: (model: string | null) => void;

  // Agent Settings
  agentMaxSteps: number;
  setAgentMaxSteps: (steps: number) => void;
  agentMaxStepAttempts: number;
  setAgentMaxStepAttempts: (attempts: number) => void;
  agentMaxReplanCalls: number;
  setAgentMaxReplanCalls: (calls: number) => void;
  agentReplanEverySteps: number;
  setAgentReplanEverySteps: (steps: number) => void;
  agentMaxSelfChecks: number;
  setAgentMaxSelfChecks: (checks: number) => void;
  agentLoopGuardThreshold: number;
  setAgentLoopGuardThreshold: (threshold: number) => void;
  agentLoopBackoffBaseMs: number;
  setAgentLoopBackoffBaseMs: (ms: number) => void;
  agentLoopBackoffMaxMs: number;
  setAgentLoopBackoffMaxMs: (ms: number) => void;
}

export function useChatbotSettingsState(): UseChatbotSettingsStateReturn {
  const { toast } = useToast();

  // Base settings
  const [model, setModel] = useState<string>('');
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [useGlobalContext, setUseGlobalContext] = useState<boolean>(false);
  const [useLocalContext, setUseLocalContext] = useState<boolean>(false);
  const [searchProvider, setSearchProvider] = useState<string>('serpapi');
  const [playwrightPersonaId, setPlaywrightPersonaId] = useState<string | null>(
    null,
  );

  // Context settings
  const [globalContext, setGlobalContext] = useState<string>('');
  const [localContext, setLocalContext] = useState<string>('');
  const [localContextMode, setLocalContextMode] = useState<
    'override' | 'append'
  >('override');

  // Internal state
  const [settingsDirty, setSettingsDirty] = useState<boolean>(false);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
  const [settingsSnapshot, setSettingsSnapshot] =
    useState<ChatbotSettingsPayload | null>(null);
  const settingsLoadedRef = useRef<boolean>(false);

  // External settings & data
  const brainModelOptions = useBrainModelOptions({
    feature: 'chatbot',
  });
  const settingsQuery = useChatbotSettings(CHATBOT_SETTINGS_KEY);
  const saveMutation = useSaveChatbotSettings();

  const {
    agentModeEnabled,
    setAgentModeEnabled,
    agentBrowser,
    setAgentBrowser,
    agentRunHeadless,
    setAgentRunHeadless,
    agentIgnoreRobotsTxt,
    setAgentIgnoreRobotsTxt,
    agentRequireHumanApproval,
    setAgentRequireHumanApproval,
    agentMemoryValidationModel,
    setAgentMemoryValidationModel,
    agentPlannerModel,
    setAgentPlannerModel,
    agentSelfCheckModel,
    setAgentSelfCheckModel,
    agentExtractionValidationModel,
    setAgentExtractionValidationModel,
    agentToolRouterModel,
    setAgentToolRouterModel,
    agentLoopGuardModel,
    setAgentLoopGuardModel,
    agentApprovalGateModel,
    setAgentApprovalGateModel,
    agentMemorySummarizationModel,
    setAgentMemorySummarizationModel,
    agentSelectorInferenceModel,
    setAgentSelectorInferenceModel,
    agentOutputNormalizationModel,
    setAgentOutputNormalizationModel,
    agentMaxSteps,
    setAgentMaxSteps,
    agentMaxStepAttempts,
    setAgentMaxStepAttempts,
    agentMaxReplanCalls,
    setAgentMaxReplanCalls,
    agentReplanEverySteps,
    setAgentReplanEverySteps,
    agentMaxSelfChecks,
    setAgentMaxSelfChecks,
    agentLoopGuardThreshold,
    setAgentLoopGuardThreshold,
    agentLoopBackoffBaseMs,
    setAgentLoopBackoffBaseMs,
    agentLoopBackoffMaxMs,
    setAgentLoopBackoffMaxMs,
  } = useAgentCreatorSettings();

  const currentSettings = useMemo<ChatbotSettingsPayload>(
    () => ({
      model,
      temperature: DEFAULT_CHATBOT_SETTINGS.temperature,
      maxTokens: DEFAULT_CHATBOT_SETTINGS.maxTokens,
      systemPrompt: DEFAULT_CHATBOT_SETTINGS.systemPrompt,
      enableMemory: DEFAULT_CHATBOT_SETTINGS.enableMemory,
      enableContext: DEFAULT_CHATBOT_SETTINGS.enableContext,
      webSearchEnabled,
      useGlobalContext,
      useLocalContext,
      localContextMode,
      searchProvider,
      playwrightPersonaId,
      agentModeEnabled,
      agentBrowser,
      runHeadless: agentRunHeadless,
      ignoreRobotsTxt: agentIgnoreRobotsTxt,
      requireHumanApproval: agentRequireHumanApproval,
      memoryValidationModel: agentMemoryValidationModel ?? '',
      plannerModel: agentPlannerModel ?? '',
      selfCheckModel: agentSelfCheckModel ?? '',
      extractionValidationModel: agentExtractionValidationModel ?? '',
      toolRouterModel: agentToolRouterModel ?? '',
      loopGuardModel: agentLoopGuardModel ?? '',
      approvalGateModel: agentApprovalGateModel ?? '',
      memorySummarizationModel: agentMemorySummarizationModel ?? '',
      selectorInferenceModel: agentSelectorInferenceModel ?? '',
      outputNormalizationModel: agentOutputNormalizationModel ?? '',
      maxSteps: agentMaxSteps,
      maxStepAttempts: agentMaxStepAttempts,
      maxReplanCalls: agentMaxReplanCalls,
      replanEverySteps: agentReplanEverySteps,
      maxSelfChecks: agentMaxSelfChecks,
      loopGuardThreshold: agentLoopGuardThreshold,
      loopBackoffBaseMs: agentLoopBackoffBaseMs,
      loopBackoffMaxMs: agentLoopBackoffMaxMs,
    }),
    [
      model,
      webSearchEnabled,
      useGlobalContext,
      useLocalContext,
      localContextMode,
      searchProvider,
      playwrightPersonaId,
      agentModeEnabled,
      agentBrowser,
      agentRunHeadless,
      agentIgnoreRobotsTxt,
      agentRequireHumanApproval,
      agentMemoryValidationModel,
      agentPlannerModel,
      agentSelfCheckModel,
      agentExtractionValidationModel,
      agentToolRouterModel,
      agentLoopGuardModel,
      agentApprovalGateModel,
      agentMemorySummarizationModel,
      agentSelectorInferenceModel,
      agentOutputNormalizationModel,
      agentMaxSteps,
      agentMaxStepAttempts,
      agentMaxReplanCalls,
      agentReplanEverySteps,
      agentMaxSelfChecks,
      agentLoopGuardThreshold,
      agentLoopBackoffBaseMs,
      agentLoopBackoffMaxMs,
    ],
  );

  const loadChatbotSettings = useCallback(async (): Promise<void> => {
    if (!settingsQuery.data?.settings?.settings) return;

    const stored = settingsQuery.data.settings
      .settings as Partial<ChatbotSettingsPayload>;
    const resolved: ChatbotSettingsPayload = {
      ...DEFAULT_CHATBOT_SETTINGS,
      ...stored,
    };

    if (resolved.model) setModel(resolved.model);
    setWebSearchEnabled(Boolean(resolved.webSearchEnabled));
    setUseGlobalContext(Boolean(resolved.useGlobalContext));
    setUseLocalContext(Boolean(resolved.useLocalContext));
    setLocalContextMode(
      (resolved.localContextMode as 'append' | 'override') ?? 'override',
    );
    setSearchProvider(resolved.searchProvider ?? 'serpapi');
    setPlaywrightPersonaId(resolved.playwrightPersonaId ?? null);

    setAgentModeEnabled(Boolean(resolved.agentModeEnabled));
    setAgentBrowser(
      resolved.agentBrowser ??
        DEFAULT_CHATBOT_SETTINGS.agentBrowser ??
        'chromium',
    );
    setAgentRunHeadless(Boolean(resolved.runHeadless));
    setAgentIgnoreRobotsTxt(Boolean(resolved.ignoreRobotsTxt));
    setAgentRequireHumanApproval(Boolean(resolved.requireHumanApproval));
    setAgentMemoryValidationModel(resolved.memoryValidationModel ?? '');
    setAgentPlannerModel(resolved.plannerModel ?? '');
    setAgentSelfCheckModel(resolved.selfCheckModel ?? '');
    setAgentExtractionValidationModel(resolved.extractionValidationModel ?? '');
    setAgentToolRouterModel(resolved.toolRouterModel ?? '');
    setAgentLoopGuardModel(resolved.loopGuardModel ?? '');
    setAgentApprovalGateModel(resolved.approvalGateModel ?? '');
    setAgentMemorySummarizationModel(resolved.memorySummarizationModel ?? '');
    setAgentSelectorInferenceModel(resolved.selectorInferenceModel ?? '');
    setAgentOutputNormalizationModel(resolved.outputNormalizationModel ?? '');
    setAgentMaxSteps(resolved.maxSteps ?? 10);
    setAgentMaxStepAttempts(resolved.maxStepAttempts ?? 3);
    setAgentMaxReplanCalls(resolved.maxReplanCalls ?? 3);
    setAgentReplanEverySteps(resolved.replanEverySteps ?? 5);
    setAgentMaxSelfChecks(resolved.maxSelfChecks ?? 3);
    setAgentLoopGuardThreshold(resolved.loopGuardThreshold ?? 3);
    setAgentLoopBackoffBaseMs(resolved.loopBackoffBaseMs ?? 1000);
    setAgentLoopBackoffMaxMs(resolved.loopBackoffMaxMs ?? 5000);

    setSettingsSnapshot(resolved);
    setSettingsDirty(false);
  }, [
    settingsQuery.data,
    setAgentModeEnabled,
    setAgentBrowser,
    setAgentRunHeadless,
    setAgentIgnoreRobotsTxt,
    setAgentRequireHumanApproval,
    setAgentMemoryValidationModel,
    setAgentPlannerModel,
    setAgentSelfCheckModel,
    setAgentExtractionValidationModel,
    setAgentToolRouterModel,
    setAgentLoopGuardModel,
    setAgentApprovalGateModel,
    setAgentMemorySummarizationModel,
    setAgentSelectorInferenceModel,
    setAgentOutputNormalizationModel,
    setAgentMaxSteps,
    setAgentMaxStepAttempts,
    setAgentMaxReplanCalls,
    setAgentReplanEverySteps,
    setAgentMaxSelfChecks,
    setAgentLoopGuardThreshold,
    setAgentLoopBackoffBaseMs,
    setAgentLoopBackoffMaxMs,
  ]);

  useEffect((): void => {
    if (settingsLoadedRef.current || !settingsQuery.isSuccess) return;
    settingsLoadedRef.current = true;
    void loadChatbotSettings();
  }, [settingsQuery.isSuccess, loadChatbotSettings]);

  useEffect((): void => {
    if (!settingsSnapshot) {
      setSettingsSnapshot(currentSettings);
      return;
    }
    const snapshotJson = JSON.stringify(settingsSnapshot);
    const currentJson = JSON.stringify(currentSettings);
    setSettingsDirty(snapshotJson !== currentJson);
  }, [currentSettings, settingsSnapshot]);

  const saveChatbotSettings = async (): Promise<void> => {
    try {
      await saveMutation.mutateAsync({
        key: CHATBOT_SETTINGS_KEY,
        settings: currentSettings,
      });
      setSettingsDirty(false);
      setSettingsSnapshot(currentSettings);
      toast('Chatbot settings saved.', { variant: 'success' });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Failed to save settings.';
      toast(message, { variant: 'error' });
    }
  };

  return {
    modelOptions: brainModelOptions.models,
    model,
    setModel,
    modelLoading: brainModelOptions.isLoading,
    webSearchEnabled,
    setWebSearchEnabled,
    useGlobalContext,
    setUseGlobalContext,
    useLocalContext,
    setUseLocalContext,
    searchProvider,
    setSearchProvider,
    playwrightPersonaId,
    setPlaywrightPersonaId,
    globalContext,
    setGlobalContext,
    localContext,
    setLocalContext,
    localContextMode,
    setLocalContextMode,
    settingsDirty,
    setSettingsDirty,
    settingsSaving,
    setSettingsSaving,
    loadChatbotSettings,
    saveChatbotSettings,

    // Agent Mode
    agentModeEnabled: Boolean(agentModeEnabled),
    setAgentModeEnabled,
    agentRunHeadless: Boolean(agentRunHeadless),
    setAgentRunHeadless,
    agentBrowser: agentBrowser ?? 'chromium',
    setAgentBrowser,
    agentIgnoreRobotsTxt: Boolean(agentIgnoreRobotsTxt),
    setAgentIgnoreRobotsTxt,
    agentRequireHumanApproval: Boolean(agentRequireHumanApproval),
    setAgentRequireHumanApproval,

    // Agent Models
    agentMemoryValidationModel: agentMemoryValidationModel ?? null,
    setAgentMemoryValidationModel,
    agentPlannerModel: agentPlannerModel ?? null,
    setAgentPlannerModel,
    agentSelfCheckModel: agentSelfCheckModel ?? null,
    setAgentSelfCheckModel,
    agentExtractionValidationModel: agentExtractionValidationModel ?? null,
    setAgentExtractionValidationModel,
    agentToolRouterModel: agentToolRouterModel ?? null,
    setAgentToolRouterModel,
    agentLoopGuardModel: agentLoopGuardModel ?? null,
    setAgentLoopGuardModel,
    agentApprovalGateModel: agentApprovalGateModel ?? null,
    setAgentApprovalGateModel,
    agentMemorySummarizationModel: agentMemorySummarizationModel ?? null,
    setAgentMemorySummarizationModel,
    agentSelectorInferenceModel: agentSelectorInferenceModel ?? null,
    setAgentSelectorInferenceModel,
    agentOutputNormalizationModel: agentOutputNormalizationModel ?? null,
    setAgentOutputNormalizationModel,

    // Agent Settings
    agentMaxSteps: agentMaxSteps ?? 10,
    setAgentMaxSteps,
    agentMaxStepAttempts: agentMaxStepAttempts ?? 3,
    setAgentMaxStepAttempts,
    agentMaxReplanCalls: agentMaxReplanCalls ?? 3,
    setAgentMaxReplanCalls,
    agentReplanEverySteps: agentReplanEverySteps ?? 5,
    setAgentReplanEverySteps,
    agentMaxSelfChecks: agentMaxSelfChecks ?? 3,
    setAgentMaxSelfChecks,
    agentLoopGuardThreshold: agentLoopGuardThreshold ?? 3,
    setAgentLoopGuardThreshold,
    agentLoopBackoffBaseMs: agentLoopBackoffBaseMs ?? 1000,
    setAgentLoopBackoffBaseMs,
    agentLoopBackoffMaxMs: agentLoopBackoffMaxMs ?? 5000,
    setAgentLoopBackoffMaxMs,
  };
}
