import type { Prisma, ChatbotJobStatus } from '@prisma/client';
import type {
  MongoChatbotSessionDoc,
  MongoChatbotJobDoc,
  MongoChatbotMessageDoc,
} from '../database-sync-types';
import type { SyncHandler } from './types';

export const syncChatbotSessions: SyncHandler = async ({ mongo, prisma, normalizeId, toDate }) => {
  const docs: MongoChatbotSessionDoc[] = (await mongo
    .collection('chatbot_sessions')
    .find({})
    .toArray()) as unknown as MongoChatbotSessionDoc[];
  const sessions = docs
    .map(
      (
        doc
      ): (Prisma.ChatbotSessionCreateManyInput & { messages: MongoChatbotMessageDoc[] }) | null => {
        const id = normalizeId(doc as unknown as Record<string, unknown>);
        if (!id) return null;
        return {
          id,
          title: doc.title ?? null,
          createdAt: toDate(doc.createdAt) ?? new Date(),
          updatedAt: toDate(doc.updatedAt) ?? new Date(),
          messages: Array.isArray(doc.messages)
            ? doc.messages.map((message) => ({
                role: message.role,
                content: message.content,
                createdAt: toDate(message.createdAt) ?? new Date(),
              }))
            : [],
        };
      }
    )
    .filter((item): item is NonNullable<typeof item> => item !== null);

  await prisma.chatbotMessage.deleteMany();
  const deletedSessions = await prisma.chatbotSession.deleteMany();

  const sessionData = sessions.map((session) => ({
    id: session.id,
    title: session.title,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  })) as Prisma.ChatbotSessionCreateManyInput[];
  const createdSessions = sessionData.length
    ? await prisma.chatbotSession.createMany({ data: sessionData })
    : { count: 0 };

  const messageData = sessions.flatMap((session) =>
    session.messages.map((message, index: number) => ({
      id: `${session.id}-${index}`,
      sessionId: session.id,
      role: message.role,
      content: message.content,
      createdAt: toDate(message.createdAt) ?? session.createdAt,
    }))
  ) as Prisma.ChatbotMessageCreateManyInput[];
  if (messageData.length) {
    await prisma.chatbotMessage.createMany({ data: messageData });
  }

  return {
    sourceCount: sessions.length,
    targetDeleted: deletedSessions.count,
    targetInserted: createdSessions.count,
  };
};

export const syncChatbotJobs: SyncHandler = async ({
  mongo,
  prisma,
  normalizeId,
  toDate,
  toJsonValue,
}) => {
  const docs: MongoChatbotJobDoc[] = await mongo.collection('chatbot_jobs').find({}).toArray();
  const data = docs
    .map((doc): Prisma.ChatbotJobCreateManyInput | null => {
      const id = normalizeId(doc as unknown as Record<string, unknown>);
      const sessionId = doc.sessionId;
      if (!id || !sessionId) return null;
      return {
        id,
        sessionId,
        status: (doc.status as ChatbotJobStatus) ?? 'pending',
        model: doc.model ?? null,
        payload: (toJsonValue
          ? toJsonValue(doc.payload ?? null)
          : (doc.payload ?? null)) as Prisma.InputJsonValue,
        resultText: doc.resultText ?? null,
        errorMessage: doc.errorMessage ?? null,
        createdAt: toDate(doc.createdAt) ?? new Date(),
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

export const syncChatbotSessionsPrismaToMongo: SyncHandler = async ({
  mongo,
  prisma,
  toObjectIdMaybe,
}) => {
  const sessions = await prisma.chatbotSession.findMany({
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  const docs = sessions.map((session) => ({
    _id: toObjectIdMaybe(session.id),
    title: session.title ?? null,
    messages: session.messages.map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    settings: null,
  }));
  const collection = mongo.collection('chatbot_sessions');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: sessions.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};

export const syncChatbotJobsPrismaToMongo: SyncHandler = async ({
  mongo,
  prisma,
  toObjectIdMaybe,
}) => {
  const rows = await prisma.chatbotJob.findMany();
  const docs = rows.map((row) => ({
    _id: toObjectIdMaybe(row.id),
    sessionId: row.sessionId,
    status: row.status,
    model: row.model ?? null,
    payload: row.payload ?? null,
    resultText: row.resultText ?? null,
    errorMessage: row.errorMessage ?? null,
    createdAt: row.createdAt,
    startedAt: row.startedAt ?? null,
    finishedAt: row.finishedAt ?? null,
  }));
  const collection = mongo.collection('chatbot_jobs');
  const deleted = await collection.deleteMany({});
  if (docs.length) await collection.insertMany(docs as Record<string, unknown>[]);
  return {
    sourceCount: rows.length,
    targetDeleted: deleted.deletedCount ?? 0,
    targetInserted: docs.length,
  };
};
