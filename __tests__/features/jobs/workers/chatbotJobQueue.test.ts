import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pollQueue, stopChatbotJobQueue } from "@/features/jobs/workers/chatbotJobQueue";
import { chatbotJobRepository } from "@/features/chatbot/services/chatbot-job-repository";
import { chatbotSessionRepository } from "@/features/chatbot/services/chatbot-session-repository";

vi.mock("@/features/chatbot/services/chatbot-job-repository", () => ({
  chatbotJobRepository: {
    findById: vi.fn(),
    findNextPending: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/features/chatbot/services/chatbot-session-repository", () => ({
  chatbotSessionRepository: {
    addMessage: vi.fn(),
  },
}));

const globalFetch = global.fetch;

describe("Chatbot Job Queue Worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stopChatbotJobQueue();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    stopChatbotJobQueue();
    global.fetch = globalFetch;
  });

  it("processes a pending job successfully", async () => {
    const mockJob = {
      id: "j1",
      sessionId: "s1",
      status: "pending",
      payload: { model: "llama3", messages: [{ role: "user", content: "hi" }] },
    };
    
    vi.mocked(chatbotJobRepository.findNextPending).mockResolvedValue(mockJob as any);
    vi.mocked(chatbotJobRepository.update).mockResolvedValue({ ...mockJob, status: "running" } as any);
    vi.mocked(chatbotJobRepository.findById).mockResolvedValue({ ...mockJob, status: "running" } as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ message: { content: "hello from ai" } }),
    } as any);

    await pollQueue();

    expect(chatbotJobRepository.findNextPending).toHaveBeenCalled();
    expect(chatbotJobRepository.update).toHaveBeenCalledWith("j1", expect.objectContaining({ status: "running" }));
    expect(global.fetch).toHaveBeenCalled();
    expect(chatbotSessionRepository.addMessage).toHaveBeenCalledWith("s1", expect.objectContaining({
      role: "assistant",
      content: "hello from ai",
    }));
  });

  it("marks job as failed if fetch fails", async () => {
    const mockJob = {
      id: "j1",
      sessionId: "s1",
      status: "pending",
      payload: { model: "llama3", messages: [] },
    };
    
    vi.mocked(chatbotJobRepository.findNextPending).mockResolvedValue(mockJob as any);
    vi.mocked(chatbotJobRepository.update).mockResolvedValueOnce({ ...mockJob, status: "running" } as any);
    vi.mocked(chatbotJobRepository.findById).mockResolvedValue({ ...mockJob, status: "running" } as any);

    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      statusText: "Internal Server Error",
      text: () => Promise.resolve("AI server down"),
    } as any);

    await pollQueue();

    expect(chatbotJobRepository.update).toHaveBeenCalledWith("j1", expect.objectContaining({
      status: "failed",
      errorMessage: "AI server down",
    }));
  });
});
