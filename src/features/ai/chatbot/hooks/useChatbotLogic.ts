"use client";
import { useToast } from "@/shared/ui";
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";

import {
  ChatMessage,
  ChatbotSettingsPayload,
  ChatbotDebugState,
  ChatSession,
} from "@/shared/types/chatbot";
import { useSearchParams } from "next/navigation";
import { CHATBOT_SETTINGS_KEY, DEFAULT_CHATBOT_SETTINGS } from "../utils/constants";
import * as chatbotApi from "../api";
import { useAgentCreatorSettings } from "@/features/ai/agentcreator";
import { logClientError } from "@/shared/utils/observability/client-error-logger";

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
  setModelOptions: React.Dispatch<React.SetStateAction<string[]>>;
  model: string;
  setModel: React.Dispatch<React.SetStateAction<string>>;
  modelLoading: boolean;
  setModelLoading: React.Dispatch<React.SetStateAction<boolean>>;
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
  localContextMode: "override" | "append";
  setLocalContextMode: React.Dispatch<React.SetStateAction<"override" | "append">>;
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
  const [input, setInput] = useState<string>("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [model, setModel] = useState<string>("");
  const [modelLoading, setModelLoading] = useState<boolean>(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState<boolean>(false);
  const [useGlobalContext, setUseGlobalContext] = useState<boolean>(false);
  const [useLocalContext, setUseLocalContext] = useState<boolean>(false);
  const [searchProvider, setSearchProvider] = useState<string>("serpapi");
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
  } = useAgentCreatorSettings();
  const [latestAgentRunId, setLatestAgentRunId] = useState<string | null>(null);
  const [debugState, setDebugState] = useState<ChatbotDebugState>({});
  const [globalContext, setGlobalContext] = useState<string>("");
  const [localContext, setLocalContext] = useState<string>("");
  const [localContextMode, setLocalContextMode] = useState<
    "override" | "append"
  >("override");
  const [settingsDirty, setSettingsDirty] = useState<boolean>(false);
  const [settingsSaving, setSettingsSaving] = useState<boolean>(false);
  const [settingsSnapshot, setSettingsSnapshot] = useState<ChatbotSettingsPayload | null>(null);
  const settingsLoadedRef = useRef<boolean>(false);

  // Session management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState<boolean>(true);

  const sessionId = useMemo((): string | null => {
    return currentSessionId || searchParams.get("session") || null;
  }, [currentSessionId, searchParams]);

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
      memoryValidationModel: agentMemoryValidationModel ?? "",
      plannerModel: agentPlannerModel ?? "",
      selfCheckModel: agentSelfCheckModel ?? "",
      extractionValidationModel: agentExtractionValidationModel ?? "",
      toolRouterModel: agentToolRouterModel ?? "",
      loopGuardModel: agentLoopGuardModel ?? "",
      approvalGateModel: agentApprovalGateModel ?? "",
      memorySummarizationModel: agentMemorySummarizationModel ?? "",
      selectorInferenceModel: agentSelectorInferenceModel ?? "",
      outputNormalizationModel: agentOutputNormalizationModel ?? "",
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
      logClientError(error, { context: { source: "useChatbotLogic.fetchSessions" } });
      toast("Failed to load chat sessions", { variant: "error" });
    } finally {
      setSessionsLoading(false);
    }
  }, [currentSessionId, toast]);

  const loadSessionMessages = useCallback(async (id: string): Promise<void> => {
    try {
      const session = await chatbotApi.fetchChatbotSession(id);
      setMessages(session?.messages || []);
    } catch (error: unknown) {
      logClientError(error, { context: { source: "useChatbotLogic.loadSessionMessages", sessionId: id } });
    }
  }, []);

  const createNewSession = useCallback(async (): Promise<void> => {
    try {
      const data = await chatbotApi.createChatbotSession({
        title: `Chat ${new Date().toLocaleString()}`,
        settings: { model, webSearchEnabled, useGlobalContext, useLocalContext },
      });
      await fetchSessions();
      setCurrentSessionId(data.sessionId);
      setMessages([]);
    } catch (error: unknown) {
      logClientError(error, { context: { source: "useChatbotLogic.createNewSession" } });
      toast("Failed to create new chat session", { variant: "error" });
    }
  }, [model, webSearchEnabled, useGlobalContext, useLocalContext, fetchSessions, toast]);

  const deleteSession = useCallback(async (id: string): Promise<void> => {
    try {
      await chatbotApi.deleteChatbotSession(id);
      await fetchSessions();
      if (currentSessionId === id) {
        setCurrentSessionId(sessions[0]?.id || null);
      }
    } catch (error: unknown) {
      logClientError(error, { context: { source: "useChatbotLogic.deleteSession", sessionId: id } });
      toast("Failed to delete chat session", { variant: "error" });
    }
  }, [currentSessionId, sessions, fetchSessions, toast]);

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

  useEffect((): void => {
    const fetchModels = async (): Promise<void> => {
      setModelLoading(true);
      try {
        const ollamaBaseUrl = process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || "http://localhost:11434";
        const models = await chatbotApi.fetchOllamaModels(ollamaBaseUrl);
        setModelOptions(models);

        // Set first model as default if no model is set
        if (models.length > 0 && !model) {
          setModel(models[0]!);
        }
      } catch (error: unknown) {
        logClientError(error, { context: { source: "useChatbotLogic.fetchModels" } });
        toast("Failed to load models from Ollama server", { variant: "error" });
      } finally {
        setModelLoading(false);
      }
    };

    void fetchModels();
  }, [model, toast]);

  const loadChatbotSettings = useCallback(async (): Promise<void> => {
    try {
      const data = await chatbotApi.fetchChatbotSettings(
        CHATBOT_SETTINGS_KEY,
        5000
      );
      if (!data.settings?.settings) {
        throw new Error("No chatbot settings saved.");
      }
      const stored = data.settings.settings as Partial<ChatbotSettingsPayload>;
      const resolved: ChatbotSettingsPayload = {
        ...DEFAULT_CHATBOT_SETTINGS,
        ...stored,
      };
      const resolvedModel = resolved.model || model;
      const nextSettings = { ...resolved, model: resolvedModel };

      if (resolvedModel) setModel(resolvedModel);
      setWebSearchEnabled(Boolean(resolved.webSearchEnabled));
      setUseGlobalContext(Boolean(resolved.useGlobalContext));
      setUseLocalContext(Boolean(resolved.useLocalContext));
      setLocalContextMode(resolved.localContextMode ?? "override");
      setSearchProvider(resolved.searchProvider ?? "serpapi");
      setPlaywrightPersonaId(resolved.playwrightPersonaId ?? null);

      setAgentModeEnabled(Boolean(resolved.agentModeEnabled));
      setAgentBrowser(resolved.agentBrowser ?? DEFAULT_CHATBOT_SETTINGS.agentBrowser);
      setAgentRunHeadless(Boolean(resolved.runHeadless));
      setAgentIgnoreRobotsTxt(Boolean(resolved.ignoreRobotsTxt));
      setAgentRequireHumanApproval(Boolean(resolved.requireHumanApproval));
      setAgentMemoryValidationModel(resolved.memoryValidationModel ?? "");
      setAgentPlannerModel(resolved.plannerModel ?? "");
      setAgentSelfCheckModel(resolved.selfCheckModel ?? "");
      setAgentExtractionValidationModel(resolved.extractionValidationModel ?? "");
      setAgentLoopGuardModel(resolved.loopGuardModel ?? "");
      setAgentApprovalGateModel(resolved.approvalGateModel ?? "");
      setAgentMemorySummarizationModel(resolved.memorySummarizationModel ?? "");
      setAgentSelectorInferenceModel(resolved.selectorInferenceModel ?? "");
      setAgentOutputNormalizationModel(resolved.outputNormalizationModel ?? "");
      setAgentMaxSteps(resolved.maxSteps);
      setAgentMaxStepAttempts(resolved.maxStepAttempts);
      setAgentMaxReplanCalls(resolved.maxReplanCalls);
      setAgentReplanEverySteps(resolved.replanEverySteps);
      setAgentMaxSelfChecks(resolved.maxSelfChecks);
      setAgentLoopGuardThreshold(resolved.loopGuardThreshold);
      setAgentLoopBackoffBaseMs(resolved.loopBackoffBaseMs);
      setAgentLoopBackoffMaxMs(resolved.loopBackoffMaxMs);

      setSettingsSnapshot(nextSettings);
      setSettingsDirty(false);
    } catch (_error: unknown) {
      // Fallback to local storage or defaults
    }
  }, [
    model,
    setModel,
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

      await chatbotApi.saveChatbotSettings(
        CHATBOT_SETTINGS_KEY,
        payload,
        5000
      );

      setSettingsDirty(false);
      setSettingsSnapshot(payload);
      toast("Chatbot settings saved.", { variant: "success" });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to save settings.";
      toast(message, { variant: "error" });
    } finally {
      setSettingsSaving(false);
    }
  };

  const sendMessage = useCallback(async (): Promise<void> => {
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev: ChatMessage[]): ChatMessage[] => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const data = await chatbotApi.sendChatbotMessage({
        messages: [...messages, userMessage],
        model,
        sessionId,
      });

      if (data.message) {
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: data.message,
        };
        setMessages((prev: ChatMessage[]): ChatMessage[] => [...prev, assistantMessage]);
      }
    } catch (error: unknown) {
      logClientError(error, { context: { source: "useChatbotLogic.sendMessage", sessionId } });
      toast("Failed to send message", { variant: "error" });
    } finally {
      setIsSending(false);
    }
  }, [input, isSending, messages, model, sessionId, toast]);

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
    modelOptions,
    setModelOptions,
    model,
    setModel,
    modelLoading,
    setModelLoading,
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
