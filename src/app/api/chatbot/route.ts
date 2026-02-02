import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { chatbotSessionRepository } from "@/features/chatbot/server";
import type { ChatMessage } from "@/shared/types/chatbot";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import {
  badRequestError,
  externalServiceError,
  internalError,
} from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

export const runtime = "nodejs";

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;
const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";

const chatbotTempRoot = path.join(
  process.cwd(),
  "public",
  "uploads",
  "chatbot",
  "temp"
);

const TEMP_CLEANUP_TTL_MS = 1000 * 60 * 60 * 24;
const TEMP_CLEANUP_INTERVAL_MS = 1000 * 60 * 10;
let lastTempCleanupAt = 0;

const createErrorId = (): string => {

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {

    return crypto.randomUUID();

  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;

};



// Why: Chatbot generates temp files (uploads, debug logs). Without cleanup, disk

// fills up over time. We debounce cleanup (at most every 10 minutes) to avoid

// expensive readdir/stat calls on every request while ensuring old files don't

// persist beyond 24 hours. Errors are silent (best-effort) to avoid blocking chat.

const cleanupChatbotTemp = async (): Promise<void> => {

  const now = Date.now();

  if (now - lastTempCleanupAt < TEMP_CLEANUP_INTERVAL_MS) return;

  lastTempCleanupAt = now;



  try {

    await fs.mkdir(chatbotTempRoot, { recursive: true });

    const entries = await fs.readdir(chatbotTempRoot, { withFileTypes: true });



    await Promise.all(

      entries.map(async (entry: import("fs").Dirent) => {

        const fullPath = path.join(chatbotTempRoot, entry.name);

        try {

          const stats = await fs.stat(fullPath);

          if (now - stats.mtimeMs < TEMP_CLEANUP_TTL_MS) return;



          if (entry.isDirectory()) {

            await fs.rm(fullPath, { recursive: true, force: true });

          } else {

            await fs.unlink(fullPath);

          }

        } catch {

          // best-effort cleanup

        }

      })

    );

  } catch {

    // best-effort cleanup

  }

};



async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {

  const requestStart = Date.now();

  try {

    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {

      headers: { "Content-Type": "application/json" },

    });



    if (!res.ok) {

      const errorText = await res.text();

      if (DEBUG_CHATBOT) {
        console.warn("[chatbot][models] Upstream error", {
          status: res.status,
          statusText: res.statusText,
          errorText,
          durationMs: Date.now() - requestStart,
          requestId: ctx.requestId,
        });
      }
      return NextResponse.json({
        models: [],
        warning: {
          code: "OLLAMA_UNAVAILABLE",
          message: `Failed to load models: ${errorText || res.statusText}`,
        },
      });

    }



    const data = (await res.json()) as unknown as { models?: Array<{ name?: string }> };

    const models = (data.models || [])

      .map((model: { name?: string }) => model.name)

      .filter((name: string | undefined): name is string => Boolean(name));



    if (DEBUG_CHATBOT) {

      console.info("[chatbot][models] Loaded", {

        count: models.length,

        durationMs: Date.now() - requestStart,

        requestId: ctx.requestId,

      });

    }



    return NextResponse.json({ models });

  } catch (error) {

    const message =
      error instanceof Error ? error.message : "Failed to load models.";
    if (DEBUG_CHATBOT) {
      console.warn("[chatbot][models] Upstream fetch failed", {
        message,
        durationMs: Date.now() - requestStart,
        requestId: ctx.requestId,
      });
    }
    return NextResponse.json({
      models: [],
      warning: { code: "OLLAMA_UNAVAILABLE", message },
    });

  }

}



async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {

  const tempFiles: string[] = [];

  const tempDirs: string[] = [];

  const requestStart = Date.now(); // total request timer



  try {
    if (!OLLAMA_MODEL) {
      return createErrorResponse(
        internalError("OLLAMA_MODEL is not configured."),
        { request: req, source: "chatbot.POST" }
      );
    }

    await cleanupChatbotTemp();

    const contentType = req.headers.get("content-type") || "";
    let messages: ChatMessage[] = [];
    let requestedModel: string | null = null;
    let sessionId: string | null = null;

    // Why: Support both multipart (for file uploads) and JSON (for direct API calls).
    // Multipart is used by browsers; JSON by third-party integrations. Images must be
    // base64-encoded in the message body for Ollama's vision capability. Other files
    // are too large to embed, so we just mention their names in the message content.
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const rawMessages = formData.get("messages");
      if (rawMessages && typeof rawMessages === "string") {
        try {
          messages = JSON.parse(rawMessages) as unknown as ChatMessage[];
        } catch (_error) {
          return createErrorResponse(
            badRequestError("Invalid messages payload."),
            { request: req, source: "chatbot.POST" }
          );
        }
      }

      const rawModel = formData.get("model");
      requestedModel = typeof rawModel === "string" ? rawModel : null;

      const rawSessionId = formData.get("sessionId");
      sessionId = typeof rawSessionId === "string" ? rawSessionId : null;

      const files = formData.getAll("files");

      const imageFiles = files.filter(
        (file: FormDataEntryValue): file is File =>
          file instanceof File && file.type.startsWith("image/")
      );

      const otherFiles = files.filter(
        (file: FormDataEntryValue): file is File =>
          file instanceof File && !file.type.startsWith("image/")
      );

      if (DEBUG_CHATBOT) {
        console.info("[chatbot][chat] Multipart payload", {
          fileCount: files.length,
          imageCount: imageFiles.length,
          otherCount: otherFiles.length,
          requestId: ctx.requestId,
        });
      }

      // Save all uploaded files to temp dir (for debugging / future tooling)
      if (files.length > 0) {
        const requestId = createErrorId();
        const requestDir = path.join(chatbotTempRoot, requestId);
        await fs.mkdir(requestDir, { recursive: true });
        tempDirs.push(requestDir);

        await Promise.all(
          files
            .filter((file: FormDataEntryValue): file is File => file instanceof File)
            .map(async (file: File) => {
              const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
              const targetPath = path.join(
                requestDir,
                `${Date.now()}-${safeName}`
              );
              const buffer = Buffer.from(await file.arrayBuffer());
              await fs.writeFile(targetPath, buffer);
              tempFiles.push(targetPath);
            })
        );
      }

      // Why: Users upload images to attach to a query. We search backwards (most recent
      // first) to find the latest user message, not the latest assistant response. This
      // handles cases where a user sends multiple messages or has context from prior turns.
      // Reverse + math converts back-index to forward-index correctly.
      if (imageFiles.length > 0 && messages.length > 0) {
        const lastIndex = [...messages]
          .reverse()
          .findIndex((msg: ChatMessage) => msg.role === "user");
        const targetIndex =
          lastIndex === -1
            ? messages.length - 1
            : messages.length - 1 - lastIndex;

        const base64Images = await Promise.all(
          imageFiles.map(async (file: File) => {
            const buffer = await file.arrayBuffer();
            return Buffer.from(buffer).toString("base64");
          })
        );

        const targetMessage = messages[targetIndex];
        if (targetMessage) {
          messages[targetIndex] = {
            ...targetMessage,
            images: base64Images,
          };
        }
      }

      // Mention non-image attachments in the most recent user message
      if (otherFiles.length > 0 && messages.length > 0) {
        const lastUserIndex = [...messages]
          .reverse()
          .findIndex((msg: ChatMessage) => msg.role === "user");
        const targetIndex =
          lastUserIndex === -1
            ? messages.length - 1
            : messages.length - 1 - lastUserIndex;

        const fileList = otherFiles.map((file: File) => file.name).join(", ");
        const targetMessage = messages[targetIndex];
        const existing = targetMessage?.content?.trim() || "";

        if (targetMessage) {
          messages[targetIndex] = {
            ...targetMessage,
            content: `${existing}\n\nAttached files: ${fileList}`.trim(),
          };
        }
      }
    } else {
      let body: {
        messages?: ChatMessage[];
        model?: string;
        sessionId?: string;
      };
      try {
        body = (await req.json()) as unknown as typeof body;
      } catch (_error) {
        return createErrorResponse(badRequestError("Invalid JSON payload."), {
          request: req,
          source: "chatbot.POST",
        });
      }
      messages = body.messages ?? [];
      requestedModel = body.model ?? null;
      sessionId = body.sessionId ?? null;
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return createErrorResponse(badRequestError("No messages provided."), {
        request: req,
          source: "chatbot.POST",
      });
    }

    if (messages.length > 60) {
      return createErrorResponse(badRequestError("Too many messages provided."), {
        request: req,
        source: "chatbot.POST",
      });
    }

    const hasValidMessages = messages.every(
      (message: ChatMessage) =>
        typeof message?.role === "string" &&
        typeof message?.content === "string" &&
        message.content.trim().length > 0
    );

    if (!hasValidMessages) {
      return createErrorResponse(badRequestError("Invalid message payload."), {
        request: req,
        source: "chatbot.POST",
      });
    }

    if (messages.some((message: ChatMessage) => message.content.length > 10000)) {
      return createErrorResponse(badRequestError("Message content too large."), {
        request: req,
        source: "chatbot.POST",
      });
    }

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][chat] Request summary", {
        messageCount: messages.length,
        roles: messages.map((message: ChatMessage) => message.role),
        hasImages: messages.some((message: ChatMessage) => Boolean(message.images?.length)),
        model: requestedModel || OLLAMA_MODEL,
        contentType,
        userContentChars: messages
          .filter((message: ChatMessage) => message.role === "user")
          .reduce((sum: number, message: ChatMessage) => sum + message.content.length, 0),
        durationMs: Date.now() - requestStart,
        requestId: ctx.requestId,
      });
    }

    const requestPayload = {
      model: requestedModel || OLLAMA_MODEL,
      messages,
      stream: false,
    };

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][chat] Sending to Ollama", {
        url: `${OLLAMA_BASE_URL}/api/chat`,
        model: requestPayload.model,
        messageCount: requestPayload.messages.length,
        requestId: ctx.requestId,
      });
    }

    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      return createErrorResponse(
        externalServiceError(`Ollama error: ${errorText || res.statusText}`),
        { request: req, source: "chatbot.POST" }
      );
    }

    const data = (await res.json()) as unknown as {
      message?: { content?: string };
      response?: string;
    };

    // Save messages to session if sessionId provided
    if (sessionId) {
      try {
        const userMessage = messages[messages.length - 1];
        if (userMessage) {
          await chatbotSessionRepository.addMessage(sessionId, {
            role: userMessage.role,
            content: userMessage.content,
          });
        }

        const assistantReply = data.message?.content || data.response;
        if (assistantReply) {
          await chatbotSessionRepository.addMessage(sessionId, {
            role: "assistant",
            content: assistantReply,
          });
        }

        if (DEBUG_CHATBOT) {
          console.info("[chatbot][chat] Saved to session", { 
            sessionId,
            requestId: ctx.requestId
          });
        }
      } catch (error) {
        console.error("[chatbot][chat] Failed to save session messages", {
          error,
          requestId: ctx.requestId
        });
      }
    }

    return NextResponse.json({
      message: data.message?.content || data.response,
      sessionId,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to reach Ollama.";
    return createErrorResponse(error, {
      request: req,
      source: "chatbot.POST",
      fallbackMessage: message,
    });
  } finally {
    if (tempFiles.length > 0) {
      await Promise.all(
        tempFiles.map(async (filepath: string) => {
          try {
            await fs.unlink(filepath);
          } catch {
            // best-effort cleanup
          }
        })
      );
    }

    if (tempDirs.length > 0) {
      await Promise.all(
        tempDirs.map(async (dirpath: string) => {
          try {
            await fs.rm(dirpath, { recursive: true, force: true });
          } catch {
            // best-effort cleanup
          }
        })
      );
    }
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "chatbot.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "chatbot.POST" });
