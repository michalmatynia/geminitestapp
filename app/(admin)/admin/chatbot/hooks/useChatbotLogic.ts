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
import { useSearchParams } from "next/navigation";
import { CHATBOT_SETTINGS_KEY, DEFAULT_CHATBOT_SETTINGS } from "../constants";

export const useChatbotLogic = () => {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [modelOptions, setModelOptions] = useState<string[]>([
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "claude-3-5-sonnet-20241022",
    "claude-3-opus-20240229",
    "claude-3-sonnet-20240229",
    "claude-3-haiku-20240307",
    "gemini-2.0-flash-exp",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
  ]);
  const [model, setModel] = useState("gpt-4o");
  const [modelLoading, setModelLoading] = useState(false);
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

  const sessionId = useMemo(() => {
    return searchParams.get("session") || "default";
  }, [searchParams]);

  useEffect(() => {
    const cached = readCachedMessages(sessionId);
    if (cached.length > 0) {
      setMessages(cached);
    } else {
      setMessages([]);
    }
  }, [sessionId]);

  useEffect(() => {
    writeCachedMessages(sessionId, messages);
  }, [messages, sessionId]);

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

  return {
    messages,
    setMessages,
    input,
    setInput,
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
  };
};
