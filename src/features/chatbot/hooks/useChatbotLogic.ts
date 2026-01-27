"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useToast } from "@/shared/ui/toast";
import {
  ChatMessage,
  ChatbotSettingsPayload,
  ChatbotDebugState,
  ChatSession,
} from "@/types/chatbot";
import { useSearchParams } from "next/navigation";
import { CHATBOT_SETTINGS_KEY, DEFAULT_CHATBOT_SETTINGS } from "../utils/constants";
import * as chatbotApi from "../api";
import { useAgentCreatorSettings } from "@/features/agentcreator/hooks/useAgentCreatorSettings";

export const useChatbotLogic = () => {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const [model, setModel] = useState("");
  const [modelLoading, setModelLoading] = useState(true);
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [useGlobalContext, setUseGlobalContext] = useState(false);
  const [useLocalContext, setUseLocalContext] = useState(false);
  const [searchProvider, setSearchProvider] = useState("serpapi");
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
  const [globalContext, setGlobalContext] = useState("");
  const [localContext, setLocalContext] = useState("");
  const [localContextMode, setLocalContextMode] = useState<
    "override" | "append"
  >("override");
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSnapshot, setSettingsSnapshot] = useState<ChatbotSettingsPayload | null>(null);
  const settingsLoadedRef = useRef(false);

  // Session management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const sessionId = useMemo(() => {
    return currentSessionId || searchParams.get("session") || null;
  }, [currentSessionId, searchParams]);

  const currentSettings = useMemo<ChatbotSettingsPayload>(
    () => ({
      model,
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
      memoryValidationModel: agentMemoryValidationModel,
      plannerModel: agentPlannerModel,
      selfCheckModel: agentSelfCheckModel,
      extractionValidationModel: agentExtractionValidationModel,
      loopGuardModel: agentLoopGuardModel,
      approvalGateModel: agentApprovalGateModel,
      memorySummarizationModel: agentMemorySummarizationModel,
      selectorInferenceModel: agentSelectorInferenceModel,
      outputNormalizationModel: agentOutputNormalizationModel,
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

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const data = await chatbotApi.fetchChatbotSessions();
      setSessions(data.sessions || []);

      // If no current session and sessions exist, select the first one
      if (!currentSessionId && data.sessions && data.sessions.length > 0) {
        setCurrentSessionId(data.sessions[0]?.id ?? null);
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error);
      toast("Failed to load chat sessions", { variant: "error" });
    } finally {
      setSessionsLoading(false);
    }
  }, [currentSessionId, toast]);

  const loadSessionMessages = useCallback(async (id: string) => {
    try {
      const session = await chatbotApi.fetchChatbotSession(id);
      setMessages(session?.messages || []);
    } catch (error) {
      console.error("Failed to load session messages:", error);
    }
  }, []);

  const createNewSession = useCallback(async () => {
    try {
      const data = await chatbotApi.createChatbotSession({
        title: `Chat ${new Date().toLocaleString()}`,
        settings: { model, webSearchEnabled, useGlobalContext, useLocalContext },
      });
      await fetchSessions();
      setCurrentSessionId(data.sessionId);
      setMessages([]);
    } catch (error) {
      console.error("Failed to create session:", error);
      toast("Failed to create new chat session", { variant: "error" });
    }
  }, [model, webSearchEnabled, useGlobalContext, useLocalContext, fetchSessions, toast]);

  const deleteSession = useCallback(async (id: string) => {
    try {
      await chatbotApi.deleteChatbotSession(id);
      await fetchSessions();
      if (currentSessionId === id) {
        setCurrentSessionId(sessions[0]?.id || null);
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast("Failed to delete chat session", { variant: "error" });
    }
  }, [currentSessionId, sessions, fetchSessions, toast]);

  // Fetch sessions on mount
  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  // Load session messages when session changes
  useEffect(() => {
    if (sessionId) {
      void loadSessionMessages(sessionId);
    } else {
      setMessages([]);
    }
  }, [sessionId, loadSessionMessages]);

  useEffect(() => {
    const fetchModels = async () => {
      setModelLoading(true);
      try {
        const ollamaBaseUrl = process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || "http://localhost:11434";
        const models = await chatbotApi.fetchOllamaModels(ollamaBaseUrl);
        setModelOptions(models);

        // Set first model as default if no model is set
        if (models.length > 0 && !model) {
          setModel(models[0]!);
        }
      } catch (error) {
        console.error("Error fetching Ollama models:", error);
        toast("Failed to load models from Ollama server", { variant: "error" });
      } finally {
        setModelLoading(false);
      }
    };

    void fetchModels();
  }, [model, toast]);

  const loadChatbotSettings = useCallback(async () => {
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
    } catch (_error) {
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

  useEffect(() => {
    if (settingsLoadedRef.current) return;
    settingsLoadedRef.current = true;
    void loadChatbotSettings();
  }, [loadChatbotSettings]);

  useEffect(() => {
    if (!settingsSnapshot) {
      setSettingsSnapshot(currentSettings);
      return;
    }
    const snapshotJson = JSON.stringify(settingsSnapshot);
    const currentJson = JSON.stringify(currentSettings);
    setSettingsDirty(snapshotJson !== currentJson);
  }, [currentSettings, settingsSnapshot]);

  const saveChatbotSettings = async () => {
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
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save settings.";
      toast(message, { variant: "error" });
    } finally {
      setSettingsSaving(false);
    }
  };

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
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
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
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
