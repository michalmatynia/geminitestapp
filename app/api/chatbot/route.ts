import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  images?: string[];
};

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

const createErrorId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const cleanupChatbotTemp = async () => {
  const now = Date.now();
  if (now - lastTempCleanupAt < TEMP_CLEANUP_INTERVAL_MS) return;
  lastTempCleanupAt = now;

  try {
    await fs.mkdir(chatbotTempRoot, { recursive: true });
    const entries = await fs.readdir(chatbotTempRoot, { withFileTypes: true });

    await Promise.all(
      entries.map(async (entry) => {
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

export async function GET() {
  const requestStart = Date.now();

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      headers: { "Content-Type": "application/json" },
    });

    if (!res.ok) {
      const errorText = await res.text();
      const errorId = createErrorId();

      console.error("[chatbot][models] Ollama error", {
        errorId,
        status: res.status,
        detail: errorText || res.statusText,
      });

      return NextResponse.json(
        {
          error: `Failed to load models: ${errorText || res.statusText}`,
          errorId,
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    const models = (data.models || [])
      .map((model) => model.name)
      .filter((name): name is string => Boolean(name));

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][models] Loaded", {
        count: models.length,
        durationMs: Date.now() - requestStart,
      });
    }

    return NextResponse.json({ models });
  } catch (error) {
    const errorId = createErrorId();
    const message =
      error instanceof Error ? error.message : "Failed to load models.";

    console.error("[chatbot][models] Unexpected error", {
      errorId,
      message,
    });

    return NextResponse.json({ error: message, errorId }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const tempFiles: string[] = [];
  const tempDirs: string[] = [];
  const requestStart = Date.now(); // total request timer

  try {
    if (!OLLAMA_MODEL) {
      return NextResponse.json(
        { error: "OLLAMA_MODEL is not configured." },
        { status: 500 }
      );
    }

    await cleanupChatbotTemp();

    const contentType = req.headers.get("content-type") || "";
    let messages: ChatMessage[] = [];
    let requestedModel: string | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();

      const rawMessages = formData.get("messages");
      if (rawMessages && typeof rawMessages === "string") {
        try {
          messages = JSON.parse(rawMessages) as ChatMessage[];
        } catch (error) {
          const errorId = createErrorId();
          console.error("[chatbot][chat] Failed to parse messages JSON", {
            errorId,
            error,
          });
          return NextResponse.json(
            { error: "Invalid messages payload.", errorId },
            { status: 400 }
          );
        }
      }

      const rawModel = formData.get("model");
      requestedModel = typeof rawModel === "string" ? rawModel : null;

      const files = formData.getAll("files");

      const imageFiles = files.filter(
        (file): file is File =>
          file instanceof File && file.type.startsWith("image/")
      );

      const otherFiles = files.filter(
        (file): file is File =>
          file instanceof File && !file.type.startsWith("image/")
      );

      if (DEBUG_CHATBOT) {
        console.info("[chatbot][chat] Multipart payload", {
          fileCount: files.length,
          imageCount: imageFiles.length,
          otherCount: otherFiles.length,
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
            .filter((file): file is File => file instanceof File)
            .map(async (file) => {
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

      // Attach images to the most recent user message
      if (imageFiles.length > 0 && messages.length > 0) {
        const lastIndex = [...messages]
          .reverse()
          .findIndex((msg) => msg.role === "user");
        const targetIndex =
          lastIndex === -1
            ? messages.length - 1
            : messages.length - 1 - lastIndex;

        const base64Images = await Promise.all(
          imageFiles.map(async (file) => {
            const buffer = await file.arrayBuffer();
            return Buffer.from(buffer).toString("base64");
          })
        );

        messages[targetIndex] = {
          ...messages[targetIndex],
          images: base64Images,
        };
      }

      // Mention non-image attachments in the most recent user message
      if (otherFiles.length > 0 && messages.length > 0) {
        const lastUserIndex = [...messages]
          .reverse()
          .findIndex((msg) => msg.role === "user");
        const targetIndex =
          lastUserIndex === -1
            ? messages.length - 1
            : messages.length - 1 - lastUserIndex;

        const fileList = otherFiles.map((file) => file.name).join(", ");
        const existing = messages[targetIndex].content?.trim() || "";

        messages[targetIndex] = {
          ...messages[targetIndex],
          content: `${existing}\n\nAttached files: ${fileList}`.trim(),
        };
      }
    } else {
      const body = (await req.json()) as {
        messages?: ChatMessage[];
        model?: string;
      };
      messages = body.messages ?? [];
      requestedModel = body.model ?? null;
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "No messages provided." },
        { status: 400 }
      );
    }

    if (messages.length > 60) {
      return NextResponse.json(
        { error: "Too many messages provided." },
        { status: 400 }
      );
    }

    const hasValidMessages = messages.every(
      (message) =>
        typeof message?.role === "string" &&
        typeof message?.content === "string" &&
        message.content.trim().length > 0
    );

    if (!hasValidMessages) {
      return NextResponse.json(
        { error: "Invalid message payload." },
        { status: 400 }
      );
    }

    if (messages.some((message) => message.content.length > 10000)) {
      return NextResponse.json(
        { error: "Message content too large." },
        { status: 400 }
      );
    }

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][chat] Request summary", {
        messageCount: messages.length,
        roles: messages.map((message) => message.role),
        hasImages: messages.some((message) => Boolean(message.images?.length)),
        model: requestedModel || OLLAMA_MODEL,
        contentType,
        userContentChars: messages
          .filter((message) => message.role === "user")
          .reduce((sum, message) => sum + message.content.length, 0),
        durationMs: Date.now() - requestStart, // <-- now safe
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
      });
    }

    // IMPORTANT: do NOT redeclare `requestStart` inside this block (TDZ issue).
    const ollamaRequestStart = Date.now();

    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestPayload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      const errorId = createErrorId();

      console.error("[chatbot][chat] Ollama error", {
        errorId,
        status: res.status,
        detail: errorText || res.statusText,
      });

      return NextResponse.json(
        { error: `Ollama error: ${errorText || res.statusText}`, errorId },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      message?: { content?: string };
      response?: string;
    };

    const responseMessage =
      data.message?.content || data.response || "No response from model.";

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][chat] Ollama response", {
        durationMs: Date.now() - ollamaRequestStart,
        responseChars: responseMessage.length,
      });
    }

    return NextResponse.json({ message: responseMessage });
  } catch (error) {
    const errorId = createErrorId();
    const message =
      error instanceof Error ? error.message : "Failed to reach Ollama.";

    console.error("[chatbot][chat] Unexpected error", {
      errorId,
      message,
    });

    return NextResponse.json({ error: message, errorId }, { status: 500 });
  } finally {
    if (tempFiles.length > 0) {
      await Promise.all(
        tempFiles.map(async (filepath) => {
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
        tempDirs.map(async (dirpath) => {
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
