import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import { resolveBrainModelExecutionConfig } from '@/shared/lib/ai-brain/server';
import { listBrainModels } from '@/shared/lib/ai-brain/server-model-catalog';
import { runChatbotModel } from '@/shared/lib/ai/chatbot/server-model-runtime';
import { chatbotSessionRepository } from '@/features/ai/chatbot/server';
import { logSystemError, logSystemEvent } from '@/shared/lib/observability/system-logger';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';

const DEBUG_CHATBOT = process.env['DEBUG_CHATBOT'] === 'true';

const chatbotTempRoot = path.join(process.cwd(), 'public', 'uploads', 'chatbot', 'temp');

const TEMP_CLEANUP_TTL_MS = 1000 * 60 * 60 * 24;
const TEMP_CLEANUP_INTERVAL_MS = 1000 * 60 * 10;
const DEFAULT_CHATBOT_SYSTEM_PROMPT = 'You are a helpful assistant.';

let lastTempCleanupAt = 0;

type IncomingChatMessage = Pick<ChatMessage, 'role' | 'content' | 'images'>;

const createErrorId = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

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

export async function GET_handler(_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const requestStart = Date.now();
  const catalog = await listBrainModels();

  if (DEBUG_CHATBOT) {
    await logSystemEvent({
      level: 'info',
      message: '[chatbot][models] Loaded via Brain catalog',
      context: {
        modelCount: catalog.models.length,
        liveOllamaCount: catalog.sources?.liveOllamaModels.length ?? 0,
        configuredOllamaCount: catalog.sources?.configuredOllamaModels.length ?? 0,
        durationMs: Date.now() - requestStart,
        requestId: ctx.requestId,
      },
    });
  }

  return NextResponse.json({
    ...catalog,
    deprecation: {
      code: 'CHATBOT_MODELS_ENDPOINT_DEPRECATED',
      message: 'Use /api/brain/models for model discovery.',
    },
  });
}

export async function POST_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const tempFiles: string[] = [];
  const tempDirs: string[] = [];
  const requestStart = Date.now();

  try {
    await cleanupChatbotTemp();

    const contentType = req.headers.get('content-type') || '';
    let messages: IncomingChatMessage[] = [];
    let sessionId: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();

      const rawMessages = formData.get('messages');
      if (rawMessages && typeof rawMessages === 'string') {
        try {
          messages = JSON.parse(rawMessages) as IncomingChatMessage[];
        } catch {
          throw badRequestError('Invalid messages payload.');
        }
      }

      const rawModel = formData.get('model');
      if (rawModel !== null) {
        throw badRequestError('Chatbot payload contains unsupported model override.');
      }

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
              const targetPath = path.join(requestDir, `${Date.now()}-${safeName}`);
              const buffer = Buffer.from(await file.arrayBuffer());
              await fs.writeFile(targetPath, buffer);
              tempFiles.push(targetPath);
            })
        );
      }

      if (imageFiles.length > 0 && messages.length > 0) {
        const lastIndex = [...messages]
          .reverse()
          .findIndex((msg: IncomingChatMessage) => msg.role === 'user');
        const targetIndex =
          lastIndex === -1 ? messages.length - 1 : messages.length - 1 - lastIndex;

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

      if (otherFiles.length > 0 && messages.length > 0) {
        const lastUserIndex = [...messages]
          .reverse()
          .findIndex((msg: IncomingChatMessage) => msg.role === 'user');
        const targetIndex =
          lastUserIndex === -1 ? messages.length - 1 : messages.length - 1 - lastUserIndex;

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
        messages?: IncomingChatMessage[];
        sessionId?: string;
        model?: unknown;
      };
      try {
        body = (await req.json()) as typeof body;
      } catch {
        throw badRequestError('Invalid JSON payload.');
      }
      if (Object.prototype.hasOwnProperty.call(body, 'model')) {
        throw badRequestError('Chatbot payload contains unsupported model override.');
      }
      messages = body.messages ?? [];
      sessionId = body.sessionId ?? null;
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      throw badRequestError('No messages provided.');
    }

    if (messages.length > 60) {
      throw badRequestError('Too many messages provided.');
    }

    const hasValidMessages = messages.every(
      (message: IncomingChatMessage) =>
        typeof message?.role === 'string' &&
        typeof message?.content === 'string' &&
        message.content.trim().length > 0
    );

    if (!hasValidMessages) {
      throw badRequestError('Invalid message payload.');
    }

    if (messages.some((message: IncomingChatMessage) => message.content.length > 10000)) {
      throw badRequestError('Message content too large.');
    }

    const brainConfig = await resolveBrainModelExecutionConfig('chatbot', {
      defaultTemperature: 0.7,
      defaultMaxTokens: 800,
      defaultSystemPrompt: DEFAULT_CHATBOT_SYSTEM_PROMPT,
    });

    if (DEBUG_CHATBOT) {
      await logSystemEvent({
        level: 'info',
        message: '[chatbot][chat] Request summary',
        context: {
          messageCount: messages.length,
          roles: messages.map((message: IncomingChatMessage) => message.role),
          hasImages: messages.some((message: IncomingChatMessage) =>
            Boolean(message.images?.length)
          ),
          model: brainConfig.modelId,
          contentType,
          userContentChars: messages
            .filter((message: IncomingChatMessage) => message.role === 'user')
            .reduce((sum: number, message: IncomingChatMessage) => sum + message.content.length, 0),
          durationMs: Date.now() - requestStart,
          requestId: ctx.requestId,
          brainApplied: brainConfig.brainApplied,
        },
      });
    }

    const result = await runChatbotModel({
      messages,
      modelId: brainConfig.modelId,
      temperature: brainConfig.temperature,
      maxTokens: brainConfig.maxTokens,
      systemPrompt: brainConfig.systemPrompt,
    });

    if (sessionId) {
      try {
        const userMessage = messages[messages.length - 1];
        if (userMessage) {
          await chatbotSessionRepository.addMessage(sessionId, {
            role: userMessage.role,
            content: userMessage.content,
            images: userMessage.images,
          });
        }

        if (result.message) {
          await chatbotSessionRepository.addMessage(sessionId, {
            role: 'assistant',
            content: result.message,
            model: brainConfig.modelId,
            metadata: {
              brainApplied: brainConfig.brainApplied,
            },
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
          context: {
            action: 'save_session_messages',
            sessionId,
            requestId: ctx.requestId,
          },
        });
      }
    }

    return NextResponse.json({
      message: result.message,
      sessionId,
      brainApplied: brainConfig.brainApplied,
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
