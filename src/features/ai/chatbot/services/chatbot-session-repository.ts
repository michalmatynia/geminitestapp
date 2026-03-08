import 'server-only';

import type {
  ChatbotSessionDto as ChatSession,
  CreateChatSessionDto as CreateSessionInput,
  UpdateChatSessionDto as UpdateSessionInput,
  ChatMessageDto as ChatMessage,
} from '@/shared/contracts/chatbot';
import { parseChatbotSettingsPayload } from '@/shared/contracts/chatbot';
import prisma from '@/shared/lib/db/prisma';

import type { Prisma } from '@prisma/client';

type ChatMessageRow = Prisma.ChatbotMessageGetPayload<Record<string, never>>;
type ChatSessionRow = Prisma.ChatbotSessionGetPayload<{
  include: {
    messages: true;
  };
}>;

const asRecord = (value: Prisma.JsonValue | null | undefined): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const toChatMessage = (message: ChatMessageRow): ChatMessage => ({
  id: message.id,
  sessionId: message.sessionId,
  role: message.role as ChatMessage['role'],
  content: message.content,
  timestamp: message.createdAt.toISOString(),
  ...(message.model ? { model: message.model } : {}),
  ...(Array.isArray(message.images) && message.images.length > 0 ? { images: message.images } : {}),
  ...(asRecord(message.metadata) ? { metadata: asRecord(message.metadata) } : {}),
});

const toChatSession = (session: ChatSessionRow): ChatSession => {
  const messages = [...session.messages]
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map(toChatMessage);
  const settings = session.settings ? parseChatbotSettingsPayload(session.settings) : undefined;
  const lastMessageAt = messages[messages.length - 1]?.timestamp ?? session.updatedAt.toISOString();

  return {
    id: session.id,
    title: session.title,
    userId: null,
    personaId: session.personaId ?? null,
    settings,
    messages,
    messageCount: messages.length,
    lastMessageAt,
    isActive: true,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
};

export interface ChatbotSessionRepository {
  findAll(): Promise<ChatSession[]>;
  findById(id: string): Promise<ChatSession | null>;
  create(input: CreateSessionInput): Promise<ChatSession>;
  update(id: string, input: UpdateSessionInput): Promise<ChatSession | null>;
  delete(id: string): Promise<boolean>;
  addMessage(
    id: string,
    message: Partial<ChatMessage> & { role: ChatMessage['role']; content: string }
  ): Promise<ChatSession | null>;
}

export const chatbotSessionRepository: ChatbotSessionRepository = {
  async findAll(): Promise<ChatSession[]> {
    const sessions = await prisma.chatbotSession.findMany({
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return sessions.map(toChatSession);
  },

  async findById(id: string): Promise<ChatSession | null> {
    const session = await prisma.chatbotSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return session ? toChatSession(session) : null;
  },

  async create(input: CreateSessionInput): Promise<ChatSession> {
    const session = await prisma.chatbotSession.create({
      data: {
        title: input.title ?? null,
        personaId: input.settings?.personaId?.trim() || null,
        ...(input.settings !== undefined
          ? {
              settings: input.settings as unknown as Prisma.InputJsonValue,
            }
          : {}),
      },
      include: {
        messages: true,
      },
    });

    return toChatSession(session);
  },

  async update(id: string, input: UpdateSessionInput): Promise<ChatSession | null> {
    const existing = await prisma.chatbotSession.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!existing) {
      return null;
    }

    const session = await prisma.chatbotSession.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title ?? null } : {}),
        ...(input.settings !== undefined
          ? {
              settings: input.settings as unknown as Prisma.InputJsonValue,
              personaId: input.settings?.personaId?.trim() || null,
            }
          : {}),
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return toChatSession(session);
  },

  async delete(id: string): Promise<boolean> {
    const result = await prisma.chatbotSession.deleteMany({
      where: { id },
    });

    return result.count > 0;
  },

  async addMessage(
    id: string,
    message: Partial<ChatMessage> & { role: ChatMessage['role']; content: string }
  ): Promise<ChatSession | null> {
    const session = await prisma.chatbotSession.findUnique({
      where: { id },
      select: {
        id: true,
      },
    });
    if (!session) {
      return null;
    }

    await prisma.$transaction([
      prisma.chatbotMessage.create({
        data: {
          sessionId: id,
          role: message.role,
          content: message.content,
          ...(message.model ? { model: message.model } : {}),
          ...(Array.isArray(message.images) ? { images: message.images } : {}),
          ...(message.metadata
            ? { metadata: message.metadata as unknown as Prisma.InputJsonValue }
            : {}),
        },
      }),
      prisma.chatbotSession.update({
        where: { id },
        data: {
          updatedAt: new Date(),
        },
      }),
    ]);

    return this.findById(id);
  },
};
