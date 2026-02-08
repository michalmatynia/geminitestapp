import { NextRequest } from "next/server";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import type { ChatMessageDto as ChatMessage } from "@/shared/dtos/chatbot";
import type { CmsCssAiRequestDto as CssAiRequest } from "@/shared/dtos/cms";
import { badRequestError } from "@/shared/errors/app-error";
import { runTeachingChat } from "@/features/ai/agentcreator/teaching/server/chat";

export const runtime = "nodejs";

const OLLAMA_BASE_URL = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env["OLLAMA_MODEL"] ?? "";

const isValidMessages = (messages: ChatMessage[]): boolean =>
  messages.length > 0 &&
  messages.every(
    (message: ChatMessage) =>
      typeof message?.role === "string" &&
      typeof message?.content === "string" &&
      message.content.trim().length > 0
  );

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const body = (await req.json().catch(() => null)) as CssAiRequest | null;
  if (!body) {
    throw badRequestError("Invalid JSON payload.");
  }

  const provider = body.provider ?? "model";
  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!isValidMessages(messages)) {
    throw badRequestError("Invalid messages payload.");
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController) {
      const send = (payload: Record<string, unknown>): void => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        if (provider === "agent") {
          const agentId = (body.agentId ?? "").trim();
          if (!agentId) {
            send({ error: "Missing agentId.", done: true });
            controller.close();
            return;
          }
          const result = await runTeachingChat({ agentId, messages });
          send({ delta: result.message, done: true });
          controller.close();
          return;
        }

        const modelId = (body.modelId ?? "").trim() || OLLAMA_MODEL;
        if (!modelId) {
          send({ error: "Missing modelId.", done: true });
          controller.close();
          return;
        }

        const upstreamController = new AbortController();
        req.signal.addEventListener("abort", () => {
          upstreamController.abort();
          controller.close();
        });

        const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: upstreamController.signal,
          body: JSON.stringify({
            model: modelId,
            stream: true,
            messages,
          }),
        });

        if (!res.ok || !res.body) {
          const text = await res.text().catch(() => "");
          send({ error: `LLM error: ${text || res.statusText}` });
          controller.close();
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let done = false;

        while (!done) {
          const result = await reader.read();
          done = result.done;
          if (result.value) {
            buffer += decoder.decode(result.value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() ?? "";
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;
              try {
                const payload = JSON.parse(trimmed) as {
                  message?: { content?: string };
                  done?: boolean;
                  error?: string;
                };
                if (payload.error) {
                  send({ error: payload.error, done: true });
                  controller.close();
                  return;
                }
                const delta = payload.message?.content ?? "";
                if (delta) {
                  send({ delta, done: false });
                }
                if (payload.done) {
                  send({ done: true });
                  controller.close();
                  return;
                }
              } catch {
                // ignore parse errors on partial lines
              }
            }
          }
        }

        if (buffer.trim()) {
          try {
            const payload = JSON.parse(buffer.trim()) as { message?: { content?: string }; done?: boolean };
            const delta = payload.message?.content ?? "";
            if (delta) send({ delta, done: false });
            if (payload.done) {
              send({ done: true });
            }
          } catch {
            // ignore
          }
        }
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Streaming failed.";
        send({ error: message, done: true });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

export const POST = apiHandler(POST_handler, { source: "cms.css-ai.stream.POST" });
