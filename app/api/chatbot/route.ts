import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  images?: string[];
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "llama3";
const DEBUG_CHATBOT = process.env.DEBUG_CHATBOT === "true";
const chatbotTempRoot = path.join(
  process.cwd(),
  "public",
  "uploads",
  "chatbot",
  "temp"
);

const createErrorId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
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
  const requestStart = Date.now();
  try {
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

      if (files.length > 0) {
        const requestId = createErrorId();
        const requestDir = path.join(chatbotTempRoot, requestId);
        await fs.mkdir(requestDir, { recursive: true });
        await Promise.all(
          files
            .filter((file): file is File => file instanceof File)
            .map(async (file) => {
              const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
              const targetPath = path.join(requestDir, `${Date.now()}-${safeName}`);
              const buffer = Buffer.from(await file.arrayBuffer());
              await fs.writeFile(targetPath, buffer);
              tempFiles.push(targetPath);
            })
        );
      }

      if (imageFiles.length > 0 && messages.length > 0) {
        const lastIndex = [...messages].reverse().findIndex((msg) => msg.role === "user");
        const targetIndex =
          lastIndex === -1 ? messages.length - 1 : messages.length - 1 - lastIndex;
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

      if (otherFiles.length > 0 && messages.length > 0) {
        const lastUserIndex = [...messages]
          .reverse()
          .findIndex((msg) => msg.role === "user");
        const targetIndex =
          lastUserIndex === -1 ? messages.length - 1 : messages.length - 1 - lastUserIndex;
        const fileList = otherFiles.map((file) => file.name).join(", ");
        const existing = messages[targetIndex].content?.trim() || "";
        messages[targetIndex] = {
          ...messages[targetIndex],
          content: `${existing}\n\nAttached files: ${fileList}`.trim(),
        };
      }
    } else {
      const body = (await req.json()) as { messages?: ChatMessage[]; model?: string };
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

    const oversized = messages.some((message) => message.content.length > 10000);
    if (oversized) {
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
        durationMs: Date.now() - requestStart,
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

    const requestStart = Date.now();
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

    const message =
      data.message?.content || data.response || "No response from model.";

    if (DEBUG_CHATBOT) {
      console.info("[chatbot][chat] Ollama response", {
        durationMs: Date.now() - requestStart,
        responseChars: message.length,
      });
    }

    return NextResponse.json({ message });
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
  }
}
