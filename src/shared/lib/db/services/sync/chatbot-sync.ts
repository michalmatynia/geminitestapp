/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import type { DatabaseSyncHandler } from './types';
import type {
  MongoChatbotSessionDoc,
  MongoChatbotJobDoc,
} from '../database-sync-types';
import type { Prisma, ChatbotJobStatus } from '@prisma/client';

export const syncChatbotSessions: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo
    .collection<MongoChatbotSessionDoc>('chatbot_sessions')
    .find({})
    .toArray();
  const data = docs
    .map((doc): Prisma.ChatbotSessionCreateManyInput | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        title: doc.title ?? null,
        createdAt: doc.createdAt ?? new Date(),
        updatedAt: doc.updatedAt ?? new Date(),
      };
    })
    .filter((item): item is Prisma.ChatbotSessionCreateManyInput => item !== null);

  const messages = docs.flatMap((doc) => {
    const sessionId = normalizeId(doc as Record<string, unknown>);
    if (!sessionId || !doc.messages) return [];
    return doc.messages.map((message) => ({
      sessionId,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt ?? doc.createdAt ?? new Date(),
    }));
  });

  await prisma.chatbotMessage.deleteMany();
  const deleted = await prisma.chatbotSession.deleteMany();
  const created = data.length ? await prisma.chatbotSession.createMany({ data }) : { count: 0 };
  if (messages.length) {
    await prisma.chatbotMessage.createMany({ data: messages });
  }
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

export const syncChatbotJobs: DatabaseSyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
  toJsonValue,
}) => {
  const docs = await mongo.collection<MongoChatbotJobDoc>('chatbot_jobs').find({}).toArray();
  const data = docs
    .map((doc): Prisma.ChatbotJobCreateManyInput | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      const sessionId = doc.sessionId;
      if (!id || !sessionId) return null;
      return {
        id,
        sessionId,
        status: (doc.status as ChatbotJobStatus) ?? 'pending',
        model: doc.model ?? null,
        payload: toJsonValue(doc.payload) as Prisma.InputJsonValue,
        resultText: doc.resultText ?? null,
        errorMessage: doc.errorMessage ?? null,
        createdAt: doc.createdAt ?? new Date(),
        startedAt: toDate(doc.startedAt),
        finishedAt: toDate(doc.finishedAt),
      };
    })
    .filter((item): item is Prisma.ChatbotJobCreateManyInput => item !== null);
  const deleted = await prisma.chatbotJob.deleteMany();
  const created = data.length ? await prisma.chatbotJob.createMany({ data }) : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncChatbotSessionsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.chatbotSession.findMany({
    include: { messages: true },
  });
  const docs = rows.map((row: any) => ({
    _id: row.id,
    id: row.id,
    title: row.title,
    messages: row.messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<MongoChatbotSessionDoc>('chatbot_sessions');
  const deleted = await collection.deleteMany({});
  if (docs.length) {
    await collection.insertMany(docs as MongoChatbotSessionDoc[]);
  }
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncChatbotJobsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = await prisma.chatbotJob.findMany();
  const docs = rows.map((row: any) => ({
    _id: row.id,
    id: row.id,
    sessionId: row.sessionId,
    status: row.status,
    model: row.model,
    payload: row.payload,
    resultText: row.resultText,
    errorMessage: row.errorMessage,
    createdAt: row.createdAt,
    startedAt: row.startedAt ?? null,
    finishedAt: row.finishedAt ?? null,
  }));
  const collection = mongo.collection<MongoChatbotJobDoc>('chatbot_jobs');
  const deleted = await collection.deleteMany({});
  if (docs.length) {
    await collection.insertMany(docs as MongoChatbotJobDoc[]);
  }
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
