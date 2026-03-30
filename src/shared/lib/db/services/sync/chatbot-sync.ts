import type { DatabaseSyncHandler } from './types';
import type {
  MongoChatbotSessionDoc,
  MongoChatbotJobDoc,
} from '../database-sync-types';
import type { Prisma, ChatbotJobStatus } from '@prisma/client';

type BatchResult = { count: number };

type MongoRecordWithStringId<TDoc> = Omit<TDoc, '_id'> & { _id: string };

type ChatbotSessionSeed = {
  id: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ChatbotMessageSeed = {
  sessionId: string;
  role: string;
  content: string;
  createdAt: Date;
};

type ChatbotJobSeed = {
  id: string;
  sessionId: string;
  status: ChatbotJobStatus;
  model: string | null;
  payload: unknown;
  resultText: string | null;
  errorMessage: string | null;
  createdAt: Date;
  startedAt: Date | null;
  finishedAt: Date | null;
};

type ChatbotMessageRow = {
  role: string;
  content: string;
  createdAt: Date;
};

type ChatbotSessionRow = ChatbotSessionSeed & {
  messages: ChatbotMessageRow[];
};

type ChatbotJobRow = ChatbotJobSeed;

export const syncChatbotSessions: DatabaseSyncHandler = async ({ mongo, prisma, normalizeId }) => {
  const docs = await mongo
    .collection<MongoChatbotSessionDoc>('chatbot_sessions')
    .find({})
    .toArray();
  const data = docs
    .map((doc): ChatbotSessionSeed | null => {
      const id = normalizeId(doc as Record<string, unknown>);
      if (!id) return null;
      return {
        id,
        title: doc.title ?? null,
        createdAt: (doc.createdAt as Date) ?? new Date(),
        updatedAt: (doc.updatedAt as Date) ?? new Date(),
      };
    })
    .filter((item): item is ChatbotSessionSeed => item !== null);

  const messages: ChatbotMessageSeed[] = docs.flatMap((doc) => {
    const sessionId = normalizeId(doc as Record<string, unknown>);
    if (!sessionId || !doc.messages) return [];
    return doc.messages.map((message) => ({
      sessionId,
      role: message.role,
      content: message.content,
      createdAt: (message.createdAt as Date) ?? (doc.createdAt as Date) ?? new Date(),
    }));
  });

  await prisma.chatbotMessage.deleteMany();
  const deleted = (await prisma.chatbotSession.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.chatbotSession.createMany({
      data: data as Prisma.ChatbotSessionCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };
  if (messages.length) {
    await prisma.chatbotMessage.createMany({
      data: messages as Prisma.ChatbotMessageCreateManyInput[],
    });
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
    .map((doc): ChatbotJobSeed | null => {
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
        createdAt: (doc.createdAt as Date) ?? new Date(),
        startedAt: toDate(doc.startedAt),
        finishedAt: toDate(doc.finishedAt),
      };
    })
    .filter((item): item is ChatbotJobSeed => item !== null);
  const deleted = (await prisma.chatbotJob.deleteMany()) as BatchResult;
  const created: BatchResult = data.length
    ? ((await prisma.chatbotJob.createMany({
      data: data as Prisma.ChatbotJobCreateManyInput[],
    })) as BatchResult)
    : { count: 0 };
  return { sourceCount: data.length, targetDeleted: deleted.count, targetInserted: created.count };
};

// --- Prisma to Mongo handlers ---

export const syncChatbotSessionsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.chatbotSession.findMany({
    include: { messages: true },
  })) as ChatbotSessionRow[];
  const docs: MongoRecordWithStringId<MongoChatbotSessionDoc>[] = rows.map((row) => ({
    _id: row.id,
    id: row.id,
    title: row.title,
    messages: row.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    })),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
  const collection = mongo.collection<MongoRecordWithStringId<MongoChatbotSessionDoc>>(
    'chatbot_sessions'
  );
  const deleted = await collection.deleteMany({});
  if (docs.length) {
    await collection.insertMany(docs);
  }
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncChatbotJobsPrismaToMongo: DatabaseSyncHandler = async ({ mongo, prisma }) => {
  const rows = (await prisma.chatbotJob.findMany()) as ChatbotJobRow[];
  const docs: MongoRecordWithStringId<MongoChatbotJobDoc>[] = rows.map((row) => ({
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
  const collection = mongo.collection<MongoRecordWithStringId<MongoChatbotJobDoc>>(
    'chatbot_jobs'
  );
  const deleted = await collection.deleteMany({});
  if (docs.length) {
    await collection.insertMany(docs);
  }
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
