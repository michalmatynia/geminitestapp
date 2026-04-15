'use client';

import { useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';

import { useAgentCreatorSettings } from '@/features/ai/agentcreator';
import { useOptionalContextRegistryPageEnvelope } from '@/features/ai/ai-context-registry/context/page-context';
import {
  parseChatbotSettingsPayload,
  type ChatMessageDto as ChatMessage,
  type CreateChatbotSettingsDto as ChatbotSettingsPayload,
  type ChatbotDebugStateDto as ChatbotDebugState,
  type ChatbotSessionDto as ChatSession,
} from '@/shared/contracts/chatbot';
import { CHATBOT_SETTINGS_KEY, DEFAULT_CHATBOT_SETTINGS } from '@/shared/lib/ai/chatbot/constants';
import { useBrainAssignment } from '@/shared/lib/ai-brain/hooks/useBrainAssignment';
import { useToast } from '@/shared/ui/primitives.public';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import * as chatbotApi from '../api';


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
  const contextRegistry = useOptionalContextRegistryPageEnvelope();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState<string>('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [model, setModelState] = useState<string>('');
  const [personaId, setPersonaId] = useState<string | null>(null);
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
  const brainAssignment = useBrainAssignment({
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
    const nextModel = brainAssignment.effectiveModelId.trim();
    if (!nextModel || nextModel === model) return;
    setModelState(nextModel);
  }, [brainAssignment.effectiveModelId, model]);

  const currentSettings = useMemo<ChatbotSettingsPayload>(
    () => ({
      enableMemory: DEFAULT_CHATBOT_SETTINGS.enableMemory,
      enableContext: DEFAULT_CHATBOT_SETTINGS.enableContext,
      personaId,
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
      logClientCatch(error, { source: 'useChatbotLogic.fetchSessions' });
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
      logClientCatch(error, {
        source: 'useChatbotLogic.loadSessionMessages',
        sessionId: id,
      });
    }
  }, []);

  const createNewSession = useCallback(async (): Promise<void> => {
    try {
      const data = await chatbotApi.createChatbotSession({
        title: `Chat ${new Date().toLocaleString()}`,
        settings: currentSettings,
      });
      await fetchSessions();
      setCurrentSessionId(data.sessionId);
      setMessages([]);
    } catch (error: unknown) {
      logClientCatch(error, { source: 'useChatbotLogic.createNewSession' });
      toast('Failed to create new chat session', { variant: 'error' });
    }
  }, [currentSettings, fetchSessions, toast]);

  const deleteSession = useCallback(
    async (id: string): Promise<void> => {
      try {
        await chatbotApi.deleteChatbotSession(id);
        await fetchSessions();
        if (currentSessionId === id) {
          setCurrentSessionId(sessions[0]?.id || null);
        }
      } catch (error: unknown) {
        logClientCatch(error, {
          source: 'useChatbotLogic.deleteSession',
          sessionId: id,
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
      if (!data.settings?.settings) return;
      const stored = parseChatbotSettingsPayload(data.settings.settings);
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

      setSettingsSnapshot(nextSettings);
      setSettingsDirty(false);
    } catch (error) {
      logClientCatch(error, {
        source: 'useChatbotLogic.loadChatbotSettings',
        key: CHATBOT_SETTINGS_KEY,
      });
      toast(error instanceof Error ? error.message : 'Invalid chatbot settings payload.', {
        variant: 'error',
      });
    }
  }, [
    toast,
    setWebSearchEnabled,
    setUseGlobalContext,
    setUseLocalContext,
    setLocalContextMode,
    setSearchProvider,
    setPersonaId,
    setPlaywrightPersonaId,
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
      logClientCatch(error, { source: 'useChatbotLogic.saveChatbotSettings' });
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
        sessionId,
        ...(contextRegistry ? { contextRegistry } : {}),
      });

      if (data.message) {
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          sessionId: sessionId ?? '',
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          ...(data.suggestedMoodId
            ? {
              metadata: {
                suggestedPersonaMoodId: data.suggestedMoodId,
              },
            }
            : {}),
        };
        setMessages((prev: ChatMessage[]): ChatMessage[] => [...prev, assistantMessage]);
      }
    } catch (error: unknown) {
      logClientCatch(error, {
        source: 'useChatbotLogic.sendMessage',
        sessionId,
      });
      toast('Failed to send message', { variant: 'error' });
    } finally {
      setIsSending(false);
    }
  }, [contextRegistry, input, isSending, messages, sessionId, toast]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    sendMessage,
    attachments,
    setAttachments,
    isSending,
    setIsSending,
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
    agentModeEnabled,
    setAgentModeEnabled,
    searchProvider,
    setSearchProvider,
    playwrightPersonaId,
    setPlaywrightPersonaId,
    agentBrowser: agentBrowser ?? 'chromium',
    setAgentBrowser,
    agentRunHeadless: agentRunHeadless ?? false,
    setAgentRunHeadless,
    agentIgnoreRobotsTxt: agentIgnoreRobotsTxt ?? false,
    setAgentIgnoreRobotsTxt,
    agentRequireHumanApproval: agentRequireHumanApproval ?? false,
    setAgentRequireHumanApproval,
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
    latestAgentRunId,
    setLatestAgentRunId,
    debugState,
    setDebugState,
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
    sessionId,
    loadChatbotSettings,
    saveChatbotSettings,
    // Session management
    sessions,
    currentSessionId,
    sessionsLoading,
    createNewSession,
    deleteSession,
    selectSession: setCurrentSessionId,
  };
};
