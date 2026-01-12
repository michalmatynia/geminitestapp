import prisma from "@/lib/prisma";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

type ChatbotJobPayload = {
  messages: ChatMessage[];
  model: string;
};

let intervalId: NodeJS.Timeout | null = null;
let isProcessing = false;

const logDebug = (message: string, meta?: Record<string, unknown>) => {
  if (!DEBUG_CHATBOT) return;
  console.info(`[chatbot][jobs] ${message}`, meta || {});
};

const fetchWithTimeout = async (url: string, init: RequestInit, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
};

const ensureJobModel = () =>
  "chatbotJob" in prisma &&
  "chatbotMessage" in prisma &&
  "chatbotSession" in prisma;

const processJob = async (jobId: string) => {
  if (!ensureJobModel()) return;
  const job = await prisma.chatbotJob.findUnique({ where: { id: jobId } });
  if (!job || job.status !== "running") return;
  const payload = job.payload as ChatbotJobPayload;
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

  await prisma.chatbotMessage.create({
    data: {
      sessionId: job.sessionId,
      role: "assistant",
      content: reply,
    },
  });

  await prisma.chatbotSession.update({
    where: { id: job.sessionId },
    data: { updatedAt: new Date() },
  });

  await prisma.chatbotJob.update({
    where: { id: job.id },
    data: {
      status: "completed",
      finishedAt: new Date(),
      resultText: reply.slice(0, 2000),
    },
  });
};

const pollQueue = async () => {
  if (!ensureJobModel() || isProcessing) return;
  isProcessing = true;
  try {
    const nextJob = await prisma.chatbotJob.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });

    if (!nextJob) return;

    await prisma.chatbotJob.update({
      where: { id: nextJob.id },
      data: { status: "running", startedAt: new Date() },
    });

    logDebug("Processing job", { jobId: nextJob.id });

    try {
      await processJob(nextJob.id);
      logDebug("Job completed", { jobId: nextJob.id });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Job failed.";
      await prisma.chatbotJob.update({
        where: { id: nextJob.id },
        data: {
          status: "failed",
          finishedAt: new Date(),
          errorMessage: message,
        },
      });
      logDebug("Job failed", { jobId: nextJob.id, message });
    }
  } finally {
    isProcessing = false;
  }
};

export const startChatbotJobQueue = () => {
  if (intervalId) return;
  intervalId = setInterval(() => {
    void pollQueue();
  }, 2000);
  logDebug("Job queue started");
};
