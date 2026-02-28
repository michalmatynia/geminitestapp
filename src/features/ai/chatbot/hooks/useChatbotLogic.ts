'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { useAgentCreatorSettings } from '@/features/ai/agentcreator';
import { useBrainModelOptions } from '@/shared/lib/ai-brain/hooks/useBrainModelOptions';
import type {
  ChatMessageDto as ChatMessage,
  CreateChatbotSettingsDto as ChatbotSettingsPayload,
  ChatbotDebugStateDto as ChatbotDebugState,
  ChatbotSessionDto as ChatSession,
} from '@/shared/contracts/chatbot';
import { useToast } from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';

import * as chatbotApi from '../api';
import { CHATBOT_SETTINGS_KEY, DEFAULT_CHATBOT_SETTINGS } from '@/features/ai/chatbot/utils/constants';

export interface UseChatbotLogicReturn {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  sendMessage: () => Promise<void>;
  attachments: File[];
  setAttachments: React.Dispatch<React.SetStateAction<File[]>>;
  isSending: boolean;
  setIsSending: React.Dispatch<React.SetStateAction<boolean>>;
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
  agentModeEnabled: boolean;
  setAgentModeEnabled: (enabled: boolean) => void;
  searchProvider: string;
  setSearchProvider: React.Dispatch<React.SetStateAction<string>>;
  playwrightPersonaId: string | null;
  setPlaywrightPersonaId: (id: string | null) => void;
  agentBrowser: string;
  setAgentBrowser: (browser: string) => void;
  agentRunHeadless: boolean;
  setAgentRunHeadless: (headless: boolean) => void;
  agentIgnoreRobotsTxt: boolean;
  setAgentIgnoreRobotsTxt: (ignore: boolean) => void;
  agentRequireHumanApproval: boolean;
  setAgentRequireHumanApproval: (require: boolean) => void;
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
  latestAgentRunId: string | null;
  setLatestAgentRunId: React.Dispatch<React.SetStateAction<string | null>>;
  debugState: ChatbotDebugState;
  setDebugState: React.Dispatch<React.SetStateAction<ChatbotDebugState>>;
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
  sessionId: string | null;
  loadChatbotSettings: () => Promise<void>;
  saveChatbotSettings: () => Promise<void>;
  sessions: ChatSession[];
  currentSessionId: string | null;
  sessionsLoading: boolean;
  createNewSession: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  selectSession: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useChatbotLogic = (): UseChatbotLogicReturn => {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [model, setModelState] = useState<string>('');
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [useGlobalContext, setUseGlobalContext] = useState<boolean>(false);
  const [useLocalContext, setUseLocalContext] = useState<boolean>(false);
  const [searchProvider, setSearchProvider] = useState<string>('serpapi');
  const [playwrightPersonaId, setPlaywrightPersonaId] = useState<string | null>(null);
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
    modelsLoading: agentModelsLoading,
  } = useAgentCreatorSettings();
  const brainModelOptions = useBrainModelOptions({
    feature: 'chatbot',
  });
  const [latestAgentRunId, setLatestAgentRunId] = useState<string | null>(null);
  const [debugState, setDebugState] = useState<ChatbotDebugState>({
    activeRunId: null,
    isPaused: false,
    stepMode: false,
    lastUpdateAt: new Date().toISOString(),
  });
  const [globalContext, setGlobalContext] = useState<string>('');
  const [localContext, setLocalContext] = useState<string>('');
  const [localContextMode, setLocalContextMode] = useState<'override' | 'append'>('override');
  const [settingsDirty, setSettingsDirty] = useState<boolean>(false);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
  const [settingsSnapshot, setSettingsSnapshot] = useState<ChatbotSettingsPayload | null>(null);
  const settingsLoadedRef = useRef<boolean>(false);

  // Session management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(true);

  const sessionId = useMemo((): string | null => {
    return currentSessionId || searchParams.get('session') || null;
  }, [currentSessionId, searchParams]);

  const setModel = useCallback<React.Dispatch<React.SetStateAction<string>>>((): void => {
    // Brain is authoritative for Chatbot model routing.
  }, []);

  useEffect((): void => {
    const nextModel = brainModelOptions.effectiveModelId || brainModelOptions.models[0] || '';
    if (!nextModel || nextModel === model) return;
    setModelState(nextModel);
  }, [brainModelOptions.effectiveModelId, brainModelOptions.models, model]);

  const currentSettings = useMemo<ChatbotSettingsPayload>(
    () => ({
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
    ]
  );

  const fetchSessions = useCallback(async (): Promise<void> => {
    setSessionsLoading(true);
    try {
      const data = await chatbotApi.fetchChatbotSessions();
      setSessions(data.sessions || []);

      // If no current session and sessions exist, select the first one
      if (!currentSessionId && data.sessions && data.sessions.length > 0) {
        setCurrentSessionId(data.sessions[0]?.id ?? null);
      }
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useChatbotLogic.fetchSessions' } });
      toast('Failed to load chat sessions', { variant: 'error' });
    } finally {
      setSessionsLoading(false);
    }
  }, [currentSessionId, toast]);

  const loadSessionMessages = useCallback(async (id: string): Promise<void> => {
    try {
      const session = await chatbotApi.fetchChatbotSession(id);
      setMessages(session?.messages || []);
    } catch (error: unknown) {
      logClientError(error, {
        context: { source: 'useChatbotLogic.loadSessionMessages', sessionId: id },
      });
    }
  }, []);

  const createNewSession = useCallback(async (): Promise<void> => {
    try {
      const data = await chatbotApi.createChatbotSession({
        title: `Chat ${new Date().toLocaleString()}`,
        settings: { webSearchEnabled, useGlobalContext, useLocalContext },
      });
      await fetchSessions();
      setCurrentSessionId(data.sessionId);
      setMessages([]);
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useChatbotLogic.createNewSession' } });
      toast('Failed to create new chat session', { variant: 'error' });
    }
  }, [webSearchEnabled, useGlobalContext, useLocalContext, fetchSessions, toast]);

  const deleteSession = useCallback(
    async (id: string): Promise<void> => {
      try {
        await chatbotApi.deleteChatbotSession(id);
        await fetchSessions();
        if (currentSessionId === id) {
          setCurrentSessionId(sessions[0]?.id || null);
        }
      } catch (error: unknown) {
        logClientError(error, {
          context: { source: 'useChatbotLogic.deleteSession', sessionId: id },
        });
        toast('Failed to delete chat session', { variant: 'error' });
      }
    },
    [currentSessionId, sessions, fetchSessions, toast]
  );

  // Fetch sessions on mount
  useEffect((): void => {
    void fetchSessions();
  }, [fetchSessions]);

  // Load session messages when session changes
  useEffect((): void => {
    if (sessionId) {
      void loadSessionMessages(sessionId);
    } else {
      setMessages([]);
    }
  }, [sessionId, loadSessionMessages]);

  const loadChatbotSettings = useCallback(async (): Promise<void> => {
    try {
      const data = await chatbotApi.fetchChatbotSettings(CHATBOT_SETTINGS_KEY, 5000);
      if (!data.settings?.settings) {
        throw new Error('No chatbot settings saved.');
      }
      const stored = data.settings.settings as Partial<ChatbotSettingsPayload>;
      const resolved: ChatbotSettingsPayload = {
        ...DEFAULT_CHATBOT_SETTINGS,
        ...stored,
      };
      const {
        model: _storedModel,
        temperature: _storedTemperature,
        maxTokens: _storedMaxTokens,
        systemPrompt: _storedSystemPrompt,
        ...resolvedSettings
      } = resolved;
      const nextSettings: ChatbotSettingsPayload = resolvedSettings;

      setWebSearchEnabled(Boolean(resolved.webSearchEnabled));
      setUseGlobalContext(Boolean(resolved.useGlobalContext));
      setUseLocalContext(Boolean(resolved.useLocalContext));
      setLocalContextMode((resolved.localContextMode as 'append' | 'override') ?? 'override');
      setSearchProvider(resolved.searchProvider ?? 'serpapi');
      setPlaywrightPersonaId(resolved.playwrightPersonaId ?? null);

      setAgentModeEnabled(Boolean(resolved.agentModeEnabled));
      setAgentBrowser(resolved.agentBrowser ?? DEFAULT_CHATBOT_SETTINGS.agentBrowser ?? 'chromium');
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

      setSettingsSnapshot(nextSettings);
      setSettingsDirty(false);
    } catch {
      // Fallback to local storage or defaults
    }
  }, [
    setWebSearchEnabled,
    setUseGlobalContext,
    setUseLocalContext,
    setLocalContextMode,
    setSearchProvider,
    setPlaywrightPersonaId,
    setAgentModeEnabled,
    setAgentBrowser,
    setAgentRunHeadless,
    setAgentIgnoreRobotsTxt,
    setAgentRequireHumanApproval,
    setAgentMemoryValidationModel,
    setAgentPlannerModel,
    setAgentSelfCheckModel,
    setAgentExtractionValidationModel,
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
    if (settingsLoadedRef.current) return;
    settingsLoadedRef.current = true;
    void loadChatbotSettings();
  }, [loadChatbotSettings]);

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
    if (settingsSaving) return;
    setSettingsSaving(true);
    try {
      const payload = currentSettings;

      await chatbotApi.saveChatbotSettings(CHATBOT_SETTINGS_KEY, payload, 5000);

      setSettingsDirty(false);
      setSettingsSnapshot(payload);
      toast('Chatbot settings saved.', { variant: 'success' });
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useChatbotLogic.saveChatbotSettings' } });
      const message = error instanceof Error ? error.message : 'Failed to save settings.';
      toast(message, { variant: 'error' });
    } finally {
      setSettingsSaving(false);
    }
  };

  const sendMessage = useCallback(async (): Promise<void> => {
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      sessionId: sessionId ?? '',
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages((prev: ChatMessage[]): ChatMessage[] => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const data = await chatbotApi.sendChatbotMessage({
        messages: [...messages, userMessage],
        model,
        sessionId,
      });

      if (data.message) {
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          sessionId: sessionId ?? '',
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev: ChatMessage[]): ChatMessage[] => [...prev, assistantMessage]);
      }
    } catch (error: unknown) {
      logClientError(error, { context: { source: 'useChatbotLogic.sendMessage', sessionId } });
      toast('Failed to send message', { variant: 'error' });
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, messages, model, sessionId, toast]);

  return {
    messages: messages,
    setMessages: setMessages,
    input: input,
    setInput: setInput,
    sendMessage: sendMessage,
    attachments: attachments,
    setAttachments: setAttachments,
    isSending: isSending,
    setIsSending: setIsSending,
    modelOptions: brainModelOptions.models,
    model: model,
    setModel: setModel,
    modelLoading: Boolean(brainModelOptions.isLoading || agentModelsLoading),
    webSearchEnabled: webSearchEnabled,
    setWebSearchEnabled: setWebSearchEnabled,
    useGlobalContext: useGlobalContext,
    setUseGlobalContext: setUseGlobalContext,
    useLocalContext: useLocalContext,
    setUseLocalContext: setUseLocalContext,
    agentModeEnabled: agentModeEnabled,
    setAgentModeEnabled: setAgentModeEnabled,
    searchProvider: searchProvider,
    setSearchProvider: setSearchProvider,
    playwrightPersonaId: playwrightPersonaId,
    setPlaywrightPersonaId: setPlaywrightPersonaId,
    agentBrowser: agentBrowser ?? 'chromium',
    setAgentBrowser: setAgentBrowser,
    agentRunHeadless: agentRunHeadless ?? false,
    setAgentRunHeadless: setAgentRunHeadless,
    agentIgnoreRobotsTxt: agentIgnoreRobotsTxt ?? false,
    setAgentIgnoreRobotsTxt: setAgentIgnoreRobotsTxt,
    agentRequireHumanApproval: agentRequireHumanApproval ?? false,
    setAgentRequireHumanApproval: setAgentRequireHumanApproval,
    agentMemoryValidationModel: agentMemoryValidationModel ?? null,
    setAgentMemoryValidationModel: setAgentMemoryValidationModel,
    agentPlannerModel: agentPlannerModel ?? null,
    setAgentPlannerModel: setAgentPlannerModel,
    agentSelfCheckModel: agentSelfCheckModel ?? null,
    setAgentSelfCheckModel: setAgentSelfCheckModel,
    agentExtractionValidationModel: agentExtractionValidationModel ?? null,
    setAgentExtractionValidationModel: setAgentExtractionValidationModel,
    agentToolRouterModel: agentToolRouterModel ?? null,
    setAgentToolRouterModel: setAgentToolRouterModel,
    agentLoopGuardModel: agentLoopGuardModel ?? null,
    setAgentLoopGuardModel: setAgentLoopGuardModel,
    agentApprovalGateModel: agentApprovalGateModel ?? null,
    setAgentApprovalGateModel: setAgentApprovalGateModel,
    agentMemorySummarizationModel: agentMemorySummarizationModel ?? null,
    setAgentMemorySummarizationModel: setAgentMemorySummarizationModel,
    agentSelectorInferenceModel: agentSelectorInferenceModel ?? null,
    setAgentSelectorInferenceModel: setAgentSelectorInferenceModel,
    agentOutputNormalizationModel: agentOutputNormalizationModel ?? null,
    setAgentOutputNormalizationModel: setAgentOutputNormalizationModel,
    agentMaxSteps: agentMaxSteps ?? 10,
    setAgentMaxSteps: setAgentMaxSteps,
    agentMaxStepAttempts: agentMaxStepAttempts ?? 3,
    setAgentMaxStepAttempts: setAgentMaxStepAttempts,
    agentMaxReplanCalls: agentMaxReplanCalls ?? 3,
    setAgentMaxReplanCalls: setAgentMaxReplanCalls,
    agentReplanEverySteps: agentReplanEverySteps ?? 5,
    setAgentReplanEverySteps: setAgentReplanEverySteps,
    agentMaxSelfChecks: agentMaxSelfChecks ?? 3,
    setAgentMaxSelfChecks: setAgentMaxSelfChecks,
    agentLoopGuardThreshold: agentLoopGuardThreshold ?? 3,
    setAgentLoopGuardThreshold: setAgentLoopGuardThreshold,
    agentLoopBackoffBaseMs: agentLoopBackoffBaseMs ?? 1000,
    setAgentLoopBackoffBaseMs: setAgentLoopBackoffBaseMs,
    agentLoopBackoffMaxMs: agentLoopBackoffMaxMs ?? 5000,
    setAgentLoopBackoffMaxMs: setAgentLoopBackoffMaxMs,
    latestAgentRunId: latestAgentRunId,
    setLatestAgentRunId: setLatestAgentRunId,
    debugState: debugState,
    setDebugState: setDebugState,
    globalContext: globalContext,
    setGlobalContext: setGlobalContext,
    localContext: localContext,
    setLocalContext: setLocalContext,
    localContextMode: localContextMode,
    setLocalContextMode: setLocalContextMode,
    settingsDirty: settingsDirty,
    setSettingsDirty: setSettingsDirty,
    settingsSaving: settingsSaving,
    setSettingsSaving: setSettingsSaving,
    sessionId: sessionId,
    loadChatbotSettings: loadChatbotSettings,
    saveChatbotSettings: saveChatbotSettings,
    // Session management
    sessions: sessions,
    currentSessionId: currentSessionId,
    sessionsLoading: sessionsLoading,
    createNewSession: createNewSession,
    deleteSession: deleteSession,
    selectSession: setCurrentSessionId,
  };
};
