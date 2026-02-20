import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { runTeachingChat } from '@/features/ai/agentcreator/teaching/server/chat';
import type { ChatMessageDto as ChatMessage } from '@/shared/contracts/chatbot';
import { parseJsonBody } from '@/shared/lib/api/parse-json';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

const chatMessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
});

const chatSchema = z.object({
  agentId: z.string().trim().min(1),
  messages: z.array(chatMessageSchema).min(1),
});

export async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const parsed = await parseJsonBody(req, chatSchema, {
    logPrefix: 'agentcreator.teaching.chat.POST',
  });
  if (!parsed.ok) return parsed.response;

  const { agentId, messages } = parsed.data;
  const result = await runTeachingChat({
    agentId,
    messages: messages as ChatMessage[],
  });
  return NextResponse.json(result);
}
