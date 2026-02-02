/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChatbotLogic } from "@/features/ai/chatbot/hooks/useChatbotLogic";
import * as chatbotApi from "@/features/ai/chatbot/api";
import { ToastProvider } from "@/shared/ui/toast";


// Mock the APIs
vi.mock("@/features/ai/chatbot/api", () => ({
  fetchChatbotSessions: vi.fn(),
  fetchChatbotSession: vi.fn(),
  createChatbotSession: vi.fn(),
  deleteChatbotSession: vi.fn(),
  fetchOllamaModels: vi.fn(),
  fetchChatbotSettings: vi.fn(),
  saveChatbotSettings: vi.fn(),
  sendChatbotMessage: vi.fn(),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock useAgentCreatorSettings
vi.mock("@/features/ai/agentcreator", () => ({
  useAgentCreatorSettings: vi.fn(() => ({
    agentModeEnabled: false,
    setAgentModeEnabled: vi.fn(),
    agentBrowser: "chromium",
    setAgentBrowser: vi.fn(),
    agentMaxSteps: 12,
    setAgentMaxSteps: vi.fn(),
    agentRunHeadless: true,
    setAgentRunHeadless: vi.fn(),
    agentIgnoreRobotsTxt: false,
    setAgentIgnoreRobotsTxt: vi.fn(),
    agentRequireHumanApproval: false,
    setAgentRequireHumanApproval: vi.fn(),
  })),
  DEFAULT_AGENT_SETTINGS: {
    agentBrowser: "chromium",
    runHeadless: true,
    ignoreRobotsTxt: false,
    requireHumanApproval: false,
    memoryValidationModel: "",
    plannerModel: "",
    selfCheckModel: "",
    extractionValidationModel: "",
    loopGuardModel: "",
    approvalGateModel: "",
    memorySummarizationModel: "",
    selectorInferenceModel: "",
    outputNormalizationModel: "",
    maxSteps: 12,
    maxStepAttempts: 2,
    maxReplanCalls: 2,
    replanEverySteps: 2,
    maxSelfChecks: 4,
    loopGuardThreshold: 2,
    loopBackoffBaseMs: 2000,
    loopBackoffMaxMs: 12000,
  },
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe("useChatbotLogic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(chatbotApi.fetchChatbotSessions).mockResolvedValue({ sessions: [] });
    vi.mocked(chatbotApi.fetchOllamaModels).mockResolvedValue(["model-1", "model-2"]);
    vi.mocked(chatbotApi.fetchChatbotSettings).mockResolvedValue({ settings: {} });
  });

  it("initializes with default values", async () => {
    const { result } = renderHook(() => useChatbotLogic(), { wrapper });

    expect(result.current.messages).toEqual([]);
    expect(result.current.input).toBe("");
    expect(result.current.isSending).toBe(false);

    await waitFor(() => {
      expect(result.current.modelOptions).toEqual(["model-1", "model-2"]);
      expect(result.current.model).toBe("model-1");
    });
  });

  it("sends a message and updates messages list", async () => {
    vi.mocked(chatbotApi.sendChatbotMessage).mockResolvedValue({ message: "Hello from AI" });
    
    const { result } = renderHook(() => useChatbotLogic(), { wrapper });

    act(() => {
      result.current.setInput("Hi");
    });

    await act(async () => {
      await result.current.sendMessage();
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toEqual({ role: "user", content: "Hi" });
    expect(result.current.messages[1]).toEqual({ role: "assistant", content: "Hello from AI" });
    expect(result.current.input).toBe("");
    expect(result.current.isSending).toBe(false);
  });

  it("handles creating a new session", async () => {
    vi.mocked(chatbotApi.createChatbotSession).mockResolvedValue({ sessionId: "new-session-id" });
    
    const { result } = renderHook(() => useChatbotLogic(), { wrapper });

    await act(async () => {
      await result.current.createNewSession();
    });

    expect(chatbotApi.createChatbotSession).toHaveBeenCalled();
    expect(result.current.currentSessionId).toBe("new-session-id");
    expect(result.current.messages).toEqual([]);
  });

  it("handles loading settings", async () => {
    const mockSettings = {
      settings: {
        settings: {
          model: "custom-model",
          webSearchEnabled: true,
        }
      }
    };
    vi.mocked(chatbotApi.fetchChatbotSettings).mockResolvedValue(mockSettings as any);

    const { result } = renderHook(() => useChatbotLogic(), { wrapper });

    await waitFor(() => {
      expect(result.current.model).toBe("custom-model");
      expect(result.current.webSearchEnabled).toBe(true);
    });
  });

  it("marks settings as dirty when changed", async () => {
    const { result } = renderHook(() => useChatbotLogic(), { wrapper });

    // Wait for initial load
    await waitFor(() => expect(result.current.model).toBe("model-1"));

    act(() => {
      result.current.setWebSearchEnabled(true);
    });

    expect(result.current.settingsDirty).toBe(true);
  });
});
