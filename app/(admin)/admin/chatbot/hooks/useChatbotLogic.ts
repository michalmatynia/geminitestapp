"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useToast } from "@/components/ui/toast";
import {
  safeLocalStorageGet,
  readCachedMessages,
  writeCachedMessages,
  persistSessionMessage,
  fetchWithTimeout,
  readErrorResponse,
  safeLocalStorageSet,
} from "../utils";
import {
  ChatMessage,
  ChatbotSettingsPayload,
  ChatbotDebugState,
} from "@/types/chatbot";
import type { ChatSession } from "../types";
import { useSearchParams } from "next/navigation";
import { CHATBOT_SETTINGS_KEY, DEFAULT_CHATBOT_SETTINGS } from "../constants";

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
  const [agentModeEnabled, setAgentModeEnabled] = useState(false);
  const [searchProvider, setSearchProvider] = useState("serpapi");
  const [agentBrowser, setAgentBrowser] = useState("chromium");
  const [agentRunHeadless, setAgentRunHeadless] = useState(true);
  const [agentIgnoreRobotsTxt, setAgentIgnoreRobotsTxt] = useState(false);
  const [agentRequireHumanApproval, setAgentRequireHumanApproval] =
    useState(false);
  const [agentMemoryValidationModel, setAgentMemoryValidationModel] =
    useState("");
  const [agentPlannerModel, setAgentPlannerModel] = useState("");
  const [agentSelfCheckModel, setAgentSelfCheckModel] = useState("");
  const [agentExtractionValidationModel, setAgentExtractionValidationModel] =
    useState("");
  const [agentLoopGuardModel, setAgentLoopGuardModel] = useState("");
  const [agentApprovalGateModel, setAgentApprovalGateModel] = useState("");
  const [agentMemorySummarizationModel, setAgentMemorySummarizationModel] =
    useState("");
  const [agentSelectorInferenceModel, setAgentSelectorInferenceModel] =
    useState("");
  const [agentOutputNormalizationModel, setAgentOutputNormalizationModel] =
    useState("");
  const [agentMaxSteps, setAgentMaxSteps] = useState(12);
  const [agentMaxStepAttempts, setAgentMaxStepAttempts] = useState(2);
  const [agentMaxReplanCalls, setAgentMaxReplanCalls] = useState(2);
  const [agentReplanEverySteps, setAgentReplanEverySteps] = useState(2);
  const [agentMaxSelfChecks, setAgentMaxSelfChecks] = useState(4);
  const [agentLoopGuardThreshold, setAgentLoopGuardThreshold] = useState(2);
  const [agentLoopBackoffBaseMs, setAgentLoopBackoffBaseMs] = useState(2000);
  const [agentLoopBackoffMaxMs, setAgentLoopBackoffMaxMs] = useState(12000);
  const [latestAgentRunId, setLatestAgentRunId] = useState<string | null>(null);
  const [debugState, setDebugState] = useState<ChatbotDebugState>({});
  const [globalContext, setGlobalContext] = useState("");
  const [localContext, setLocalContext] = useState("");
  const [localContextMode, setLocalContextMode] = useState<
    "override" | "append"
  >("override");
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Session management
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(true);

  const sessionId = useMemo(() => {
    return currentSessionId || searchParams.get("session") || null;
  }, [currentSessionId, searchParams]);

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const response = await fetch("/api/chatbot/sessions");
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);

        // If no current session and sessions exist, select the first one
        if (!currentSessionId && data.sessions.length > 0) {
          setCurrentSessionId(data.sessions[0].id);
        }
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
      const response = await fetch(`/api/chatbot/sessions/${id}`);
      if (response.ok) {
        const data = await response.json();
        setMessages(data.session.messages || []);
      }
    } catch (error) {
      console.error("Failed to load session messages:", error);
    }
  }, []);

  const createNewSession = useCallback(async () => {
    try {
      const response = await fetch("/api/chatbot/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Chat ${new Date().toLocaleString()}`,
          settings: { model, webSearchEnabled, useGlobalContext, useLocalContext },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        await fetchSessions();
        setCurrentSessionId(data.sessionId);
        setMessages([]);
      }
    } catch (error) {
      console.error("Failed to create session:", error);
      toast("Failed to create new chat session", { variant: "error" });
    }
  }, [model, webSearchEnabled, useGlobalContext, useLocalContext, fetchSessions, toast]);

  const deleteSession = useCallback(async (id: string) => {
    try {
      const response = await fetch("/api/chatbot/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: id }),
      });

      if (response.ok) {
        await fetchSessions();
        if (currentSessionId === id) {
          setCurrentSessionId(sessions[0]?.id || null);
        }
      }
    } catch (error) {
      console.error("Failed to delete session:", error);
      toast("Failed to delete chat session", { variant: "error" });
    }
  }, [currentSessionId, sessions, fetchSessions, toast]);

  // Fetch sessions on mount
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  // Load session messages when session changes
  useEffect(() => {
    if (sessionId) {
      loadSessionMessages(sessionId);
    } else {
      setMessages([]);
    }
  }, [sessionId, loadSessionMessages]);

  useEffect(() => {
    const fetchModels = async () => {
      setModelLoading(true);
      try {
        const ollamaBaseUrl = process.env.NEXT_PUBLIC_OLLAMA_BASE_URL || "http://localhost:11434";
        const response = await fetch(`${ollamaBaseUrl}/api/tags`);

        if (response.ok) {
          const data = await response.json();
          const models = data.models?.map((m: any) => m.name) || [];
          setModelOptions(models);

          // Set first model as default if no model is set
          if (models.length > 0 && !model) {
            setModel(models[0]);
          }
        } else {
          throw new Error("Failed to fetch Ollama models");
        }
      } catch (error) {
        console.error("Error fetching Ollama models:", error);
        toast("Failed to load models from Ollama server", { variant: "error" });
      } finally {
        setModelLoading(false);
      }
    };

    fetchModels();
  }, []);

  const loadChatbotSettings = useCallback(async () => {
    try {
      const res = await fetchWithTimeout(
        `/api/chatbot/settings?key=${CHATBOT_SETTINGS_KEY}`,
        {},
        5000
      );
      if (!res.ok) {
        throw new Error("Failed to load chatbot settings.");
      }
      const data = (await res.json()) as {
        settings?: { settings?: unknown } | null;
      };
      if (!data.settings?.settings) {
        throw new Error("No chatbot settings saved.");
      }
      // Logic to parse and set settings would go here, simplified for extraction
    } catch (error) {
      // Fallback to local storage or defaults
    }
  }, []);

  const saveChatbotSettings = async () => {
    if (settingsSaving) return;
    setSettingsSaving(true);
    try {
      const payload: ChatbotSettingsPayload = {
        model,
        webSearchEnabled,
        useGlobalContext,
        useLocalContext,
        localContextMode,
        searchProvider,
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
      };

      const res = await fetchWithTimeout(
        "/api/chatbot/settings",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            key: CHATBOT_SETTINGS_KEY,
            settings: payload,
          }),
        },
        5000
      );

      if (!res.ok) {
        const error = await readErrorResponse(res);
        throw new Error(error.message);
      }

      setSettingsDirty(false);
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
      const response = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          model,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      const data = await response.json();

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
