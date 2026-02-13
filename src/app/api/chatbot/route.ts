import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import { logSystemError, logSystemEvent } from '@/features/observability/server';
import { getSettingValue } from '@/features/products/services/aiDescriptionService';
import {
  badRequestError,
  externalServiceError,
  internalError,
} from '@/shared/errors/app-error';
import { apiHandler } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';
import type { ChatMessage } from '@/shared/types/domain/chatbot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const OLLAMA_BASE_URL = process.env['OLLAMA_BASE_URL'] || 'http://localhost:11434';
const OLLAMA_MODEL = process.env['OLLAMA_MODEL'];
const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';
const OLLAMA_MODELS_TIMEOUT_MS = 2500;

const MODEL_PRESETS = {
  openai: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo', 'o1-mini', 'o1-preview'],
  anthropic: ['claude-3-5-sonnet-20240620', 'claude-3-opus-20240229', 'claude-3-haiku-20240307'],
  gemini: ['gemini-1.5-pro-latest', 'gemini-1.5-flash-latest'],
} as const;

const buildProviderFallbackModels = async (): Promise<string[]> => {
  const models = new Set<string>();

  const openaiKey =
    (await getSettingValue('openai_api_key')) ?? process.env['OPENAI_API_KEY'] ?? '';
  const anthropicKey =
    (await getSettingValue('anthropic_api_key')) ?? process.env['ANTHROPIC_API_KEY'] ?? '';
  const geminiKey =
    (await getSettingValue('gemini_api_key')) ?? process.env['GEMINI_API_KEY'] ?? '';

  if (openaiKey) {
    MODEL_PRESETS.openai.forEach((model) => models.add(model));
    const openaiModel = (await getSettingValue('openai_model'))?.trim();
    if (openaiModel) models.add(openaiModel);
  }
  if (anthropicKey) {
    MODEL_PRESETS.anthropic.forEach((model) => models.add(model));
  }
  if (geminiKey) {
    MODEL_PRESETS.gemini.forEach((model) => models.add(model));
  }

  return Array.from(models);
};

const fetchOllamaModels = async (
  ctx: ApiHandlerContext,
  requestStart: number
): Promise<string[] | null> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OLLAMA_MODELS_TIMEOUT_MS);
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorText = await res.text();
      if (DEBUG_CHATBOT) {
        await logSystemEvent({
          level: 'warn',
          message: '[chatbot][models] Upstream error',
          context: {
            status: res.status,
            statusText: res.statusText,
            errorText,
            durationMs: Date.now() - requestStart,
            requestId: ctx.requestId,
          },
        });
      }
      return null;
    }

    const data = (await res.json()) as unknown as { models?: Array<{ name?: string }> };
    return (data.models || [])
      .map((model: { name?: string }) => model.name)
      .filter((name: string | undefined): name is string => Boolean(name));
  } catch (error) {
    if (DEBUG_CHATBOT) {
      await logSystemEvent({
        level: 'warn',
        message: '[chatbot][models] Upstream fetch failed',
        error,
        context: {
          durationMs: Date.now() - requestStart,
          requestId: ctx.requestId,
        },
      });
    }
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
};

const chatbotTempRoot = path.join(
  process.cwd(),
  'public',
  'uploads',
  'chatbot',
  'temp'
);

const TEMP_CLEANUP_TTL_MS = 1000 * 60 * 60 * 24;
const TEMP_CLEANUP_INTERVAL_MS = 1000 * 60 * 10;
let lastTempCleanupAt = 0;

const createErrorId = (): string => {

  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {

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

      entries.map(async (entry: import('fs').Dirent) => {

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
  const [ollamaModels, fallbackModels] = await Promise.all([
    fetchOllamaModels(ctx, requestStart),
    buildProviderFallbackModels(),
  ]);

  const mergedModels = Array.from(
    new Set([...(ollamaModels ?? []), ...fallbackModels])
  );

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][models] Loaded',
      context: {
        ollamaCount: ollamaModels?.length ?? 0,
        providerCount: fallbackModels.length,
        mergedCount: mergedModels.length,
        durationMs: Date.now() - requestStart,
        requestId: ctx.requestId,
      },
    });
  }

  if (mergedModels.length === 0) {
    return NextResponse.json({
      models: [],
      warning: {
        code: 'MODELS_UNAVAILABLE',
        message: 'No models discovered from Ollama or configured providers.',
      },
    });
  }

  if (!ollamaModels || ollamaModels.length === 0) {
    return NextResponse.json({
      models: mergedModels,
      warning: {
        code: 'OLLAMA_UNAVAILABLE',
        message: 'Ollama models unavailable. Returned configured provider models.',
      },
    });
  }

  return NextResponse.json({ models: mergedModels });
}

async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const tempFiles: string[] = [];
  const tempDirs: string[] = [];
  const requestStart = Date.now(); // total request timer

  try {
    if (!OLLAMA_MODEL) {
      throw internalError('OLLAMA_MODEL is not configured.');
    }

    await cleanupChatbotTemp();

    const contentType = req.headers.get('content-type') || '';
    let messages: ChatMessage[] = [];
    let requestedModel: string | null = null;
    let sessionId: string | null = null;

    // Why: Support both multipart (for file uploads) and JSON (for direct API calls).
    // Multipart is used by browsers; JSON by third-party integrations. Images must be
    // base64-encoded in the message body for Ollama's vision capability. Other files
    // are too large to embed, so we just mention their names in the message content.
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      const rawMessages = formData.get('messages');
      if (rawMessages && typeof rawMessages === 'string') {
        try {
          messages = JSON.parse(rawMessages) as unknown as ChatMessage[];
        } catch (_error) {
          throw badRequestError('Invalid messages payload.');
        }
      }

      const rawModel = formData.get('model');
      requestedModel = typeof rawModel === 'string' ? rawModel : null;

      const rawSessionId = formData.get('sessionId');
      sessionId = typeof rawSessionId === 'string' ? rawSessionId : null;

      const files = formData.getAll('files');

      const imageFiles = files.filter(
        (file: FormDataEntryValue): file is File =>
          file instanceof File && file.type.startsWith('image/')
      );

      const otherFiles = files.filter(
        (file: FormDataEntryValue): file is File =>
          file instanceof File && !file.type.startsWith('image/')
      );

      if (DEBUG_CHATBOT) {
        await logSystemEvent({
          level: 'info',
          message: '[chatbot][chat] Multipart payload',
          context: {
            fileCount: files.length,
            imageCount: imageFiles.length,
            otherCount: otherFiles.length,
            requestId: ctx.requestId,
          },
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
              const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
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
          .findIndex((msg: ChatMessage) => msg.role === 'user');
        const targetIndex =
          lastIndex === -1
            ? messages.length - 1
            : messages.length - 1 - lastIndex;

        const base64Images = await Promise.all(
          imageFiles.map(async (file: File) => {
            const buffer = await file.arrayBuffer();
            return Buffer.from(buffer).toString('base64');
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
          .findIndex((msg: ChatMessage) => msg.role === 'user');
        const targetIndex =
          lastUserIndex === -1
            ? messages.length - 1
            : messages.length - 1 - lastUserIndex;

        const fileList = otherFiles.map((file: File) => file.name).join(', ');
        const targetMessage = messages[targetIndex];
        const existing = targetMessage?.content?.trim() || '';

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
        throw badRequestError('Invalid JSON payload.');
      }
      messages = body.messages ?? [];
      requestedModel = body.model ?? null;
      sessionId = body.sessionId ?? null;
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      throw badRequestError('No messages provided.');
    }

    if (messages.length > 60) {
      throw badRequestError('Too many messages provided.');
    }

    const hasValidMessages = messages.every(
      (message: ChatMessage) =>
        typeof message?.role === 'string' &&
        typeof message?.content === 'string' &&
        message.content.trim().length > 0
    );

    if (!hasValidMessages) {
      throw badRequestError('Invalid message payload.');
    }

    if (messages.some((message: ChatMessage) => message.content.length > 10000)) {
      throw badRequestError('Message content too large.');
    }

    if (DEBUG_CHATBOT) {
      await logSystemEvent({
        level: 'info',
        message: '[chatbot][chat] Request summary',
        context: {
          messageCount: messages.length,
          roles: messages.map((message: ChatMessage) => message.role),
          hasImages: messages.some((message: ChatMessage) => Boolean(message.images?.length)),
          model: requestedModel || OLLAMA_MODEL,
          contentType,
          userContentChars: messages
            .filter((message: ChatMessage) => message.role === 'user')
            .reduce((sum: number, message: ChatMessage) => sum + message.content.length, 0),
          durationMs: Date.now() - requestStart,
          requestId: ctx.requestId,
        },
      });
    }

    const requestPayload = {
      model: requestedModel || OLLAMA_MODEL,
      messages,
      stream: false,
    };

    if (DEBUG_CHATBOT) {
      await logSystemEvent({
        level: 'info',
        message: '[chatbot][chat] Sending to Ollama',
        context: {
          url: `${OLLAMA_BASE_URL}/api/chat`,
          model: requestPayload.model,
          messageCount: requestPayload.messages.length,
          requestId: ctx.requestId,
        },
      });
    }

    const res = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw externalServiceError(`Ollama error: ${errorText || res.statusText}`);
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
            role: 'assistant',
            content: assistantReply,
          });
        }

        if (DEBUG_CHATBOT) {
          await logSystemEvent({
            level: 'info',
            message: '[chatbot][chat] Saved to session',
            context: {
              sessionId,
              requestId: ctx.requestId,
            },
          });
        }
      } catch (error) {
        await logSystemError({
          message: '[chatbot][chat] Failed to save session messages',
          error,
          source: 'api/chatbot',
          context: { action: 'save_session_messages', sessionId, requestId: ctx.requestId },
        });
      }
    }

    return NextResponse.json({
      message: data.message?.content || data.response,
      sessionId,
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
  { source: 'chatbot.GET' });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: 'chatbot.POST' });
