'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { useAgentCreatorSettings } from '@/features/ai/agentcreator';
import {
  parseChatbotSettingsPayload,
  type ChatbotSettingsDto as ChatbotSettingsPayload,
} from '@/shared/contracts/chatbot';
import { CHATBOT_SETTINGS_KEY, DEFAULT_CHATBOT_SETTINGS } from '@/shared/lib/ai/chatbot/constants';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useToast } from '@/shared/ui/primitives.public';
import {
  logClientCatch,
  logClientError,
} from '@/shared/utils/observability/client-error-logger';

import { useSaveChatbotSettings } from './useChatbotMutations';
import { useChatbotSettings } from './useChatbotQueries';

export interface UseChatbotSettingsStateReturn {
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  personaId: string | null;
  setPersonaId: (id: string | null) => void;
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
  setLocalContextMode: React.Dispatch<React.SetStateAction<'override' | 'append'>>;
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
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [useGlobalContext, setUseGlobalContext] = useState<boolean>(false);
  const [useLocalContext, setUseLocalContext] = useState<boolean>(false);
  const [searchProvider, setSearchProvider] = useState<string>('serpapi');
  const [playwrightPersonaId, setPlaywrightPersonaId] = useState<string | null>(null);

  // Context settings
  const [globalContext, setGlobalContext] = useState<string>('');
  const [localContext, setLocalContext] = useState<string>('');
  const [localContextMode, setLocalContextMode] = useState<'override' | 'append'>('override');

  // Internal state
  const [settingsDirty, setSettingsDirty] = useState<boolean>(false);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
  const [settingsSnapshot, setSettingsSnapshot] = useState<ChatbotSettingsPayload | null>(null);
  const settingsLoadedRef = useRef<boolean>(false);

  // External settings & data
  const brainAssignment = useBrainAssignment({
    feature: 'chatbot',
  });
  const settingsQuery = useChatbotSettings(CHATBOT_SETTINGS_KEY);
  const saveMutation = useSaveChatbotSettings();

  useEffect((): void => {
    const nextModel = brainAssignment.effectiveModelId.trim();
    if (!nextModel || nextModel === model) return;
    setModel(nextModel);
  }, [brainAssignment.effectiveModelId, model]);

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
      personaId,
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
      personaId,
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
      agentMaxSteps,
      agentMaxStepAttempts,
      agentMaxReplanCalls,
      agentReplanEverySteps,
      agentMaxSelfChecks,
      agentLoopGuardThreshold,
      agentLoopBackoffBaseMs,
      agentLoopBackoffMaxMs,
    ]
  );

  const loadChatbotSettings = useCallback(async (): Promise<void> => {
    if (!settingsQuery.data?.settings?.settings) return;

    try {
      const stored = parseChatbotSettingsPayload(settingsQuery.data.settings.settings);
      const resolved: ChatbotSettingsPayload = {
        ...DEFAULT_CHATBOT_SETTINGS,
        ...stored,
      };

      if (resolved.model) setModel(resolved.model);
      setWebSearchEnabled(Boolean(resolved.webSearchEnabled));
      setUseGlobalContext(Boolean(resolved.useGlobalContext));
      setUseLocalContext(Boolean(resolved.useLocalContext));
      setLocalContextMode((resolved.localContextMode as 'append' | 'override') ?? 'override');
      setSearchProvider(resolved.searchProvider ?? 'serpapi');
      setPersonaId(resolved.personaId ?? null);
      setPlaywrightPersonaId(resolved.playwrightPersonaId ?? null);

      setAgentModeEnabled(Boolean(resolved.agentModeEnabled));
      setAgentBrowser(resolved.agentBrowser ?? DEFAULT_CHATBOT_SETTINGS.agentBrowser ?? 'chromium');
      setAgentRunHeadless(Boolean(resolved.runHeadless));
      setAgentIgnoreRobotsTxt(Boolean(resolved.ignoreRobotsTxt));
      setAgentRequireHumanApproval(Boolean(resolved.requireHumanApproval));
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
    } catch (error) {
      logClientCatch(error, {
        source: 'useChatbotSettingsState.loadChatbotSettings',
        key: CHATBOT_SETTINGS_KEY,
      });
      toast(error instanceof Error ? error.message : 'Invalid chatbot settings payload.', {
        variant: 'error',
      });
    }
  }, [
    settingsQuery.data,
    toast,
    setAgentModeEnabled,
    setAgentBrowser,
    setAgentRunHeadless,
    setAgentIgnoreRobotsTxt,
    setAgentRequireHumanApproval,
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
      logClientError(error);
      const message = error instanceof Error ? error.message : 'Failed to save settings.';
      toast(message, { variant: 'error' });
    }
  };

  return {
    model,
    setModel,
    personaId,
    setPersonaId,
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
