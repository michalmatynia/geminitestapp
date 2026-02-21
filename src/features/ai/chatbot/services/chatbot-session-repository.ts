import 'server-only';

import { ObjectId } from 'mongodb';

import type {
  ChatbotSessionDto as ChatSession,
  CreateChatSessionDto as CreateSessionInput,
  UpdateChatSessionDto as UpdateSessionInput,
  ChatMessageDto as ChatMessage,
} from '@/shared/contracts/chatbot';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION_NAME = 'chatbot_sessions';

interface ChatSessionDocument {
  _id: ObjectId;
  title: string | null;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  settings?: ChatSession['settings'];
}

function documentToSession(doc: ChatSessionDocument): ChatSession {
  return {
    id: doc._id.toString(),
    title: doc.title,
    userId: null,
    messages: doc.messages,
    messageCount: doc.messages.length,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
    settings: doc.settings,
  };
}

export interface ChatbotSessionRepository {
  findAll(): Promise<ChatSession[]>;
  findById(id: string): Promise<ChatSession | null>;
  create(input: CreateSessionInput): Promise<ChatSession>;
  update(id: string, input: UpdateSessionInput): Promise<ChatSession | null>;
  delete(id: string): Promise<boolean>;
  addMessage(id: string, message: Partial<ChatMessage> & { role: ChatMessage['role']; content: string }): Promise<ChatSession | null>;
}

export const chatbotSessionRepository: ChatbotSessionRepository = {
  async findAll(): Promise<ChatSession[]> {
    const db = await getMongoDb();
    const docs = await db
      .collection<ChatSessionDocument>(COLLECTION_NAME)
      .find({})
      .sort({ updatedAt: -1 })
      .toArray();
    return docs.map(documentToSession);
  },

  async findById(id: string): Promise<ChatSession | null> {
    const db = await getMongoDb();
    const doc = await db
      .collection<ChatSessionDocument>(COLLECTION_NAME)
      .findOne({ _id: new ObjectId(id) });
    return doc ? documentToSession(doc) : null;
  },

  async create(input: CreateSessionInput): Promise<ChatSession> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: Omit<ChatSessionDocument, '_id'> = {
      title: input.title,
      messages: [],
      createdAt: now,
      updatedAt: now,
      settings: input.settings,
    };

    const result = await db
      .collection<ChatSessionDocument>(COLLECTION_NAME)
      .insertOne(doc as ChatSessionDocument);

    return {
      id: result.insertedId.toString(),
      title: doc.title,
      userId: null,
      messages: doc.messages,
      messageCount: doc.messages.length,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      settings: doc.settings,
    };
  },

  async update(
    id: string,
    input: UpdateSessionInput
  ): Promise<ChatSession | null> {
    const db = await getMongoDb();
    const updateDoc: Partial<ChatSessionDocument> = {
      updatedAt: new Date(),
    };

    if (input.title !== undefined) updateDoc.title = input.title;
    if (input.messages !== undefined) updateDoc.messages = input.messages;
    if (input.settings !== undefined) updateDoc.settings = input.settings;

    const result = await db
      .collection<ChatSessionDocument>(COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateDoc },
        { returnDocument: 'after' }
      );

    return result ? documentToSession(result) : null;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getMongoDb();
    const result = await db
      .collection<ChatSessionDocument>(COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  },

  async addMessage(
    id: string,
    message: Partial<ChatMessage> & { role: ChatMessage['role']; content: string }
  ): Promise<ChatSession | null> {
    const db = await getMongoDb();
    const fullMessage: ChatMessage = {
      id: message.id || `msg_${id}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      sessionId: message.sessionId || id,
      timestamp: message.timestamp || new Date().toISOString(),
      role: message.role,
      content: message.content,
      model: message.model,
      images: message.images,
      toolCalls: message.toolCalls,
      toolResults: message.toolResults,
      metadata: message.metadata,
    };

    const result = await db
      .collection<ChatSessionDocument>(COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $push: { messages: fullMessage },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: 'after' }
      );

    return result ? documentToSession(result) : null;
  },
};
