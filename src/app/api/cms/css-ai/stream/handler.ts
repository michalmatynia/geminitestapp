import { NextRequest } from 'next/server';

import { resolveBrainExecutionConfigForCapability } from '@/shared/lib/ai-brain/server';
import { streamBrainChatCompletion } from '@/shared/lib/ai-brain/server-runtime-client';
import { runTeachingChat } from '@/features/ai/agentcreator/teaching/server/chat';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import type { CmsCssAiRequest as CssAiRequest } from '@/shared/contracts/cms';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';

const isValidMessages = (messages: ChatMessage[]): boolean =>
  messages.length > 0 &&
  messages.every(
    (message: ChatMessage) =>
      typeof message?.role === 'string' &&
      typeof message?.content === 'string' &&
      message.content.trim().length > 0
  );

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseObjectJsonBody(req, {
    logPrefix: 'cms.css-ai.stream',
  });
  if (!parsed.ok) {
    return parsed.response;
  }
  const body = parsed.data as CssAiRequest;

  const messages = Array.isArray(body.messages) ? body.messages : [];
  if (!isValidMessages(messages)) {
    throw badRequestError('Invalid messages payload.');
  }
  const brainConfig = await resolveBrainExecutionConfigForCapability('cms.css_stream', {
    defaultTemperature: 0.2,
    defaultMaxTokens: 1200,
    runtimeKind: 'stream',
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller: ReadableStreamDefaultController) {
      const send = (payload: Record<string, unknown>): void => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        send({ brainApplied: brainConfig.brainApplied, done: false, meta: true });

        if (brainConfig.provider === 'agent') {
          if (!brainConfig.agentId) {
            send({ error: 'Brain-assigned agentId is missing.', done: true });
            controller.close();
            return;
          }
          const result = await runTeachingChat({ agentId: brainConfig.agentId, messages });
          send({ delta: result.message, done: true });
          controller.close();
          return;
        }

        const upstream = await streamBrainChatCompletion({
          modelId: brainConfig.modelId,
          temperature: brainConfig.temperature,
          maxTokens: brainConfig.maxTokens,
          messages: messages.map((message: ChatMessage) => ({
            role: message.role === 'assistant' || message.role === 'system' ? message.role : 'user',
            content: message.content,
          })),
        });
        const reader = upstream.stream.getReader();
        const decoder = new TextDecoder();
        req.signal.addEventListener('abort', () => {
          void reader.cancel().catch(() => undefined);
          controller.close();
        });

        while (true) {
          const result = await reader.read();
          if (result.done) break;
          const delta = decoder.decode(result.value, { stream: true });
          if (delta) {
            send({ delta, done: false });
          }
        }
        send({ done: true });
        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Streaming failed.';
        send({ error: message, done: true });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
