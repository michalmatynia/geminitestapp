import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useChatbotSessions, useChatbotSession, useChatbotSettings, useChatbotModels } from "@/features/ai/chatbot/hooks/useChatbotQueries";
import * as chatbotApi from "@/features/ai/chatbot/api";


vi.mock("@/features/ai/chatbot/api", () => ({
  chatbotQueryKeys: {
    sessions: () => ["chatbot", "sessions"],
    session: (id: string) => ["chatbot", "session", id],
    settings: (key?: string) => ["chatbot", "settings", key],
    models: () => ["chatbot", "models"],
  },
  fetchChatbotSessions: vi.fn(),
  fetchChatbotSession: vi.fn(),
  fetchChatbotSettings: vi.fn(),
  fetchOllamaModels: vi.fn(),
}));

const createQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={createQueryClient()}>{children}</QueryClientProvider>
);

describe("Chatbot Queries Hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("useChatbotSessions", () => {
    it("fetches and returns sessions", async () => {
      const mockSessions = [{ id: "s1", title: "Session 1" }];
      vi.mocked(chatbotApi.fetchChatbotSessions).mockResolvedValue({ sessions: mockSessions });

      const { result } = renderHook(() => useChatbotSessions(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSessions);
    });
  });

  describe("useChatbotSession", () => {
    it("fetches and returns a single session", async () => {
      const mockSession = { id: "s1", title: "Session 1", messages: [] };
      vi.mocked(chatbotApi.fetchChatbotSession).mockResolvedValue(mockSession as any);

      const { result } = renderHook(() => useChatbotSession("s1"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSession);
    });
  });

  describe("useChatbotSettings", () => {
    it("fetches and returns settings", async () => {
      const mockSettings = { settings: { settings: { model: "gpt-4" } } };
      vi.mocked(chatbotApi.fetchChatbotSettings).mockResolvedValue(mockSettings as any);

      const { result } = renderHook(() => useChatbotSettings("general"), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(mockSettings);
    });
  });

  describe("useChatbotModels", () => {
    it("fetches models from API", async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ models: ["m1", "m2"] }),
      } as any);

      const { result } = renderHook(() => useChatbotModels(), { wrapper });

      await waitFor(() => expect(result.current.isSuccess).toBe(true));
      expect(result.current.data).toEqual(["m1", "m2"]);
    });
  });
});
