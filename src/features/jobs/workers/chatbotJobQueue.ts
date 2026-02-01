import { chatbotJobRepository } from "@/features/chatbot/services/chatbot-job-repository";
import { chatbotSessionRepository } from "@/features/chatbot/services/chatbot-session-repository";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const DEBUG_CHATBOT = process.env.NODE_ENV !== "production";

let intervalId: NodeJS.Timeout | null = null;
let isProcessing = false;

type ChatMessage = {
  role: string;
  content: string;
};

type ChatPayload = {
  model?: string;
  messages?: ChatMessage[];
};

const logDebug = (message: string, meta?: Record<string, unknown>): void => {
  if (!DEBUG_CHATBOT) return;
  console.info(`[chatbot][jobs] ${message}`, meta || {});
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number): Promise<Response> => {
  const controller = new AbortController();
  const timer = setTimeout((): void => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const processJob = async (jobId: string): Promise<void> => {
  const job = await chatbotJobRepository.findById(jobId);
  if (!job || job.status !== "running") return;
  
  const payload = job.payload as ChatPayload;
  if (!payload?.model || !Array.isArray(payload?.messages)) {
    throw new Error("Invalid job payload.");
  }

  const res = await fetchWithTimeout(
    `${OLLAMA_BASE_URL}/api/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: payload.model,
        messages: payload.messages,
        stream: false,
      }),
    },
    60000
  );

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(detail || res.statusText);
  }

  const data = (await res.json()) as {
    message?: { content?: string };
    response?: string;
  };
  const reply = data.message?.content || data.response || "No response from model.";

  await chatbotSessionRepository.addMessage(job.sessionId, {
    role: "assistant",
    content: reply,
    timestamp: new Date(),
  });

  await chatbotJobRepository.update(job.id, {
    status: "completed",
    finishedAt: new Date(),
    resultText: reply.slice(0, 2000),
  });
};

const pollQueue = async (): Promise<void> => {
  if (isProcessing) return;
  isProcessing = true;
  try {
    const nextJob = await chatbotJobRepository.findNextPending();

    if (!nextJob) return;

    await chatbotJobRepository.update(nextJob.id, {
      status: "running",
      startedAt: new Date(),
    });

    logDebug("Processing job", { jobId: nextJob.id });

    try {
      await processJob(nextJob.id);
      logDebug("Job completed", { jobId: nextJob.id });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Job failed.";
      await chatbotJobRepository.update(nextJob.id, {
        status: "failed",
        finishedAt: new Date(),
        errorMessage: message,
      });
      logDebug("Job failed", { jobId: nextJob.id, message });
    }
  } finally {
    isProcessing = false;
  }
};

export const startChatbotJobQueue = (): void => {

  if (intervalId) return;

  intervalId = setInterval((): void => {

    void pollQueue();

  }, 2000);

  logDebug("Job queue started");

};



export const stopChatbotJobQueue = (): void => {

  if (intervalId) {

    clearInterval(intervalId);

    intervalId = null;

  }

  isProcessing = false;

};
