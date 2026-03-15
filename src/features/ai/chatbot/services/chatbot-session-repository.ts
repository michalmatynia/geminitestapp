import 'server-only';

import { randomUUID } from 'crypto';

import type {
  ChatbotSessionDto as ChatSession,
  CreateChatSessionDto as CreateSessionInput,
  UpdateChatSessionDto as UpdateSessionInput,
  ChatMessageDto as ChatMessage,
  ChatbotSettingsPayload,
} from '@/shared/contracts/chatbot';
import { parseChatbotSettingsPayload } from '@/shared/contracts/chatbot';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const COLLECTION_NAME = 'chatbot_sessions';

type ChatMessageDocument = {
  id: string;
  sessionId: string;
  role: ChatMessage['role'];
  content: string;
  createdAt: Date;
  model?: string | null;
  images?: string[];
  toolCalls?: Array<Record<string, unknown>>;
  toolResults?: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown> | null;
};

type ChatSessionDocument = {
  _id: string;
  id: string;
  title: string | null;
  userId?: string | null;
  personaId?: string | null;
  settings?: Record<string, unknown> | null;
  lastMessageAt?: Date | null;
  messageCount?: number;
  isActive?: boolean;
  tags?: string[];
  metadata?: Record<string, unknown> | null;
  messages: ChatMessageDocument[];
  createdAt: Date;
  updatedAt: Date;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (!isRecord(value)) return undefined;
  const serialized = JSON.stringify(value, (_key: string, entry: unknown) =>
    typeof entry === 'bigint' ? entry.toString() : entry
  );
  if (!serialized) return undefined;
  const parsed = JSON.parse(serialized) as unknown;
  return isRecord(parsed) ? parsed : undefined;
};

const normalizeStringArray = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((entry: unknown) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry: string): boolean => entry.length > 0);
  return normalized;
};

const normalizeObjectArray = (value: unknown): Array<Record<string, unknown>> | undefined => {
  if (!Array.isArray(value)) return undefined;
  const normalized = value
    .map((entry: unknown) => normalizeRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));
  return normalized;
};

const normalizeDate = (value: unknown, fallback: Date = new Date()): Date => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
};

const normalizePersonaId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const resolvePersonaId = (input: {
  personaId?: unknown;
  settings?: ChatbotSettingsPayload | Record<string, unknown> | null;
}): string | null => {
  const settingsPersonaId =
    isRecord(input.settings) ? normalizePersonaId(input.settings['personaId']) : null;
  return settingsPersonaId ?? normalizePersonaId(input.personaId) ?? null;
};

const normalizeStoredSettings = (
  value: unknown
): ChatbotSettingsPayload | undefined => {
  const record = normalizeRecord(value);
  if (!record) return undefined;
  try {
    return parseChatbotSettingsPayload(record);
  } catch (error) {
    void ErrorSystem.captureException(error);
    return undefined;
  }
};

const toChatMessage = (message: ChatMessageDocument): ChatMessage => ({
  id: message.id,
  sessionId: message.sessionId,
  role: message.role,
  content: message.content,
  timestamp: message.createdAt.toISOString(),
  ...(message.model ? { model: message.model } : {}),
  ...(Array.isArray(message.images) && message.images.length > 0 ? { images: message.images } : {}),
  ...(Array.isArray(message.toolCalls) && message.toolCalls.length > 0
    ? { toolCalls: message.toolCalls }
    : {}),
  ...(Array.isArray(message.toolResults) && message.toolResults.length > 0
    ? { toolResults: message.toolResults }
    : {}),
  ...(isRecord(message.metadata) ? { metadata: message.metadata } : {}),
});

const toChatSession = (session: ChatSessionDocument): ChatSession => {
  const messages = [...(Array.isArray(session.messages) ? session.messages : [])]
    .sort((left, right) => left.createdAt.getTime() - right.createdAt.getTime())
    .map(toChatMessage);
  const settings = normalizeStoredSettings(session.settings);
  const lastMessageAt =
    session.lastMessageAt?.toISOString() ??
    messages[messages.length - 1]?.timestamp ??
    session.updatedAt.toISOString();

  return {
    id: session.id ?? session._id,
    title: session.title ?? null,
    userId: session.userId ?? null,
    personaId: session.personaId ?? null,
    ...(settings ? { settings } : {}),
    messages,
    messageCount: typeof session.messageCount === 'number' ? session.messageCount : messages.length,
    lastMessageAt,
    isActive: session.isActive ?? true,
    ...(Array.isArray(session.tags) && session.tags.length > 0 ? { tags: session.tags } : {}),
    ...(isRecord(session.metadata) ? { metadata: session.metadata } : {}),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
};

const toMessageDocument = (
  sessionId: string,
  message: Partial<ChatMessage> & { role: ChatMessage['role']; content: string }
): ChatMessageDocument => {
  const createdAt = normalizeDate(message.timestamp);
  return {
    id: typeof message.id === 'string' && message.id.trim().length > 0 ? message.id : randomUUID(),
    sessionId,
    role: message.role,
    content: message.content,
    createdAt,
    ...(typeof message.model === 'string' && message.model.trim().length > 0
      ? { model: message.model }
      : {}),
    ...(Array.isArray(message.images) ? { images: normalizeStringArray(message.images) ?? [] } : {}),
    ...(Array.isArray(message.toolCalls)
      ? { toolCalls: normalizeObjectArray(message.toolCalls) ?? [] }
      : {}),
    ...(Array.isArray(message.toolResults)
      ? { toolResults: normalizeObjectArray(message.toolResults) ?? [] }
      : {}),
    ...(normalizeRecord(message.metadata) ? { metadata: normalizeRecord(message.metadata)! } : {}),
  };
};

const toMessageDocuments = (sessionId: string, messages: ChatMessage[] | undefined): ChatMessageDocument[] =>
  Array.isArray(messages)
    ? messages.map((message: ChatMessage) => toMessageDocument(sessionId, message))
    : [];

let indexesReady = false;
let indexesPromise: Promise<void> | null = null;

const ensureSessionIndexes = async (): Promise<void> => {
  if (indexesReady) return;
  if (!indexesPromise) {
    indexesPromise = (async (): Promise<void> => {
      const db = await getMongoDb();
      const collection = db.collection<ChatSessionDocument>(COLLECTION_NAME);
      await Promise.all([
        collection.createIndex({ updatedAt: -1 }),
        collection.createIndex({ personaId: 1, title: 1 }),
      ]);
      indexesReady = true;
    })().catch((error: unknown) => {
      indexesPromise = null;
      throw error;
    });
  }
  await indexesPromise;
};

const getSessionsCollection = async () => {
  await ensureSessionIndexes();
  const db = await getMongoDb();
  return db.collection<ChatSessionDocument>(COLLECTION_NAME);
};

export interface ChatbotSessionRepository {
  findAll(): Promise<ChatSession[]>;
  findById(id: string): Promise<ChatSession | null>;
  findSessionIdByPersonaAndTitle(title: string, personaId: string): Promise<string | null>;
  create(input: CreateSessionInput): Promise<ChatSession>;
  update(id: string, input: UpdateSessionInput): Promise<ChatSession | null>;
  delete(id: string): Promise<boolean>;
  deleteMany(ids: string[]): Promise<number>;
  addMessage(
    id: string,
    message: Partial<ChatMessage> & { role: ChatMessage['role']; content: string }
  ): Promise<ChatSession | null>;
}

export const chatbotSessionRepository: ChatbotSessionRepository = {
  async findAll(): Promise<ChatSession[]> {
    const collection = await getSessionsCollection();
    const sessions = await collection.find({}).sort({ updatedAt: -1 }).toArray();
    return sessions.map(toChatSession);
  },

  async findById(id: string): Promise<ChatSession | null> {
    const collection = await getSessionsCollection();
    const session = await collection.findOne({
      $or: [{ _id: id }, { id }],
    });
    return session ? toChatSession(session) : null;
  },

  async findSessionIdByPersonaAndTitle(title: string, personaId: string): Promise<string | null> {
    const collection = await getSessionsCollection();
    const session = await collection.findOne(
      {
        personaId,
        title,
      },
      {
        projection: { _id: 1, id: 1 },
      }
    );
    if (!session) {
      return null;
    }
    return String(session.id ?? session._id);
  },

  async create(input: CreateSessionInput): Promise<ChatSession> {
    const collection = await getSessionsCollection();
    const sessionId = randomUUID();
    const createdAt = new Date();
    const messages = toMessageDocuments(sessionId, input.messages);
    const lastMessageAt = messages[messages.length - 1]?.createdAt ?? null;
    const settings = normalizeRecord(input.settings) ?? null;
    const document: ChatSessionDocument = {
      _id: sessionId,
      id: sessionId,
      title: input.title ?? null,
      userId: input.userId ?? null,
      personaId: resolvePersonaId({ personaId: input.personaId, settings: input.settings }),
      settings,
      lastMessageAt,
      messageCount: messages.length,
      isActive: input.isActive ?? true,
      tags: normalizeStringArray(input.tags) ?? [],
      metadata: normalizeRecord(input.metadata) ?? null,
      messages,
      createdAt,
      updatedAt: lastMessageAt ?? createdAt,
    };

    await collection.insertOne(document);
    return toChatSession(document);
  },

  async update(id: string, input: UpdateSessionInput): Promise<ChatSession | null> {
    const collection = await getSessionsCollection();
    const existing = await collection.findOne({
      $or: [{ _id: id }, { id }],
    });
    if (!existing) {
      return null;
    }

    const now = new Date();
    const nextMessages =
      input.messages !== undefined ? toMessageDocuments(existing.id ?? existing._id, input.messages) : undefined;
    const nextLastMessageAt =
      nextMessages !== undefined
        ? (nextMessages[nextMessages.length - 1]?.createdAt ?? null)
        : (existing.lastMessageAt ?? null);
    const nextSettings =
      input.settings !== undefined ? (normalizeRecord(input.settings) ?? null) : existing.settings ?? null;
    const updateDoc: Record<string, unknown> = {
      updatedAt: now,
      ...(input.title !== undefined ? { title: input.title ?? null } : {}),
      ...(input.userId !== undefined ? { userId: input.userId ?? null } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.tags !== undefined ? { tags: normalizeStringArray(input.tags) ?? [] } : {}),
      ...(input.metadata !== undefined ? { metadata: normalizeRecord(input.metadata) ?? null } : {}),
      ...(input.settings !== undefined ? { settings: nextSettings } : {}),
      ...(nextMessages !== undefined
        ? {
            messages: nextMessages,
            messageCount: nextMessages.length,
            lastMessageAt: nextLastMessageAt,
          }
        : {}),
      personaId: resolvePersonaId({
        personaId: input.personaId ?? existing.personaId,
        settings: input.settings !== undefined ? input.settings : existing.settings ?? null,
      }),
    };

    await collection.updateOne(
      {
        $or: [{ _id: id }, { id }],
      },
      {
        $set: updateDoc,
      }
    );

    return this.findById(id);
  },

  async delete(id: string): Promise<boolean> {
    const collection = await getSessionsCollection();
    const result = await collection.deleteOne({
      $or: [{ _id: id }, { id }],
    });
    return (result.deletedCount ?? 0) > 0;
  },

  async deleteMany(ids: string[]): Promise<number> {
    if (ids.length === 0) {
      return 0;
    }

    const collection = await getSessionsCollection();
    const result = await collection.deleteMany({
      $or: [{ _id: { $in: ids } }, { id: { $in: ids } }],
    });

    return result.deletedCount ?? 0;
  },

  async addMessage(
    id: string,
    message: Partial<ChatMessage> & { role: ChatMessage['role']; content: string }
  ): Promise<ChatSession | null> {
    const collection = await getSessionsCollection();
    const messageDocument = toMessageDocument(id, message);
    const result = await collection.updateOne(
      {
        $or: [{ _id: id }, { id }],
      },
      {
        $push: { messages: messageDocument },
        $set: {
          updatedAt: messageDocument.createdAt,
          lastMessageAt: messageDocument.createdAt,
        },
        $inc: {
          messageCount: 1,
        },
      }
    );

    if ((result.matchedCount ?? 0) === 0) {
      return null;
    }

    return this.findById(id);
  },
};
