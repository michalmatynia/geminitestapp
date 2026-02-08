import { chatbotJobRepository } from '@/features/ai/chatbot/services/chatbot-job-repository';
import { chatbotSessionRepository } from '@/features/ai/chatbot/services/chatbot-session-repository';

const OLLAMA_BASE_URL = process.env["OLLAMA_BASE_URL"] || 'http://localhost:11434';

type ChatMessage = {
  role: string;
  content: string;
};

type ChatPayload = {
  model?: string;
  messages?: ChatMessage[];
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

export const processJob = async (jobId: string): Promise<void> => {
  const job = await chatbotJobRepository.findById(jobId);
  if (job?.status !== 'running') return;

  const payload = job.payload as ChatPayload;
  if (!payload?.model || !Array.isArray(payload?.messages)) {
    throw new Error('Invalid job payload.');
  }

  const res = await fetchWithTimeout(
    `${OLLAMA_BASE_URL}/api/chat`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
  const reply = data.message?.content || data.response || 'No response from model.';

  await chatbotSessionRepository.addMessage(job.sessionId, {
    role: 'assistant',
    content: reply,
    timestamp: new Date().toISOString(),
  });

  await chatbotJobRepository.update(job.id, {
    status: 'completed',
    finishedAt: new Date(),
    resultText: reply.slice(0, 2000),
  });
};
