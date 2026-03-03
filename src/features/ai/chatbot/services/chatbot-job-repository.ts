import 'server-only';

import { ObjectId } from 'mongodb';

import type {
  ChatbotJobDto as ChatbotJob,
  ChatbotJobPayloadDto as ChatbotJobPayload,
  ChatbotJobRepository,
  ChatbotJobCreateInput,
  ChatbotJobUpdateInput,
} from '@/shared/contracts/chatbot';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

const COLLECTION_NAME = 'chatbot_jobs';

interface ChatbotJobDocument {
  _id: ObjectId;
  sessionId: string;
  status: ChatbotJob['status'];
  model?: string | undefined;
  payload: ChatbotJobPayload;
  resultText?: string | undefined;
  errorMessage?: string | undefined;
  createdAt: Date;
  updatedAt?: Date | null | undefined;
  startedAt?: Date | undefined;
  finishedAt?: Date | undefined;
}

function documentToJob(doc: ChatbotJobDocument): ChatbotJob {
  return {
    id: doc._id.toString(),
    sessionId: doc.sessionId,
    status: doc.status,
    model: doc.model,
    payload: doc.payload,
    resultText: doc.resultText,
    errorMessage: doc.errorMessage,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: null,
  };
}

export const chatbotJobRepository: ChatbotJobRepository = {
  async findAll(limit: number = 50): Promise<ChatbotJob[]> {
    const db = await getMongoDb();
    const docs = await db
      .collection<ChatbotJobDocument>(COLLECTION_NAME)
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return docs.map(documentToJob);
  },

  async findById(id: string): Promise<ChatbotJob | null> {
    if (!ObjectId.isValid(id)) return null;
    const db = await getMongoDb();
    const doc = await db
      .collection<ChatbotJobDocument>(COLLECTION_NAME)
      .findOne({ _id: new ObjectId(id) });
    return doc ? documentToJob(doc) : null;
  },

  async findNextPending(): Promise<ChatbotJob | null> {
    const db = await getMongoDb();
    const doc = await db
      .collection<ChatbotJobDocument>(COLLECTION_NAME)
      .findOne({ status: 'pending' }, { sort: { createdAt: 1 } });
    return doc ? documentToJob(doc) : null;
  },

  async create(input: ChatbotJobCreateInput): Promise<ChatbotJob> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: Omit<ChatbotJobDocument, '_id'> = {
      sessionId: input.sessionId,
      status: 'pending',
      model: input.model,
      payload: input.payload,
      resultText: input.resultText,
      errorMessage: input.errorMessage,
      createdAt: now,
      updatedAt: null,
    };

    const result = await db
      .collection<ChatbotJobDocument>(COLLECTION_NAME)
      .insertOne(doc as ChatbotJobDocument);

    return {
      id: result.insertedId.toString(),
      sessionId: doc.sessionId,
      status: doc.status,
      model: doc.model,
      payload: doc.payload,
      resultText: doc.resultText,
      errorMessage: doc.errorMessage,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: null,
    };
  },

  async update(id: string, update: ChatbotJobUpdateInput): Promise<ChatbotJob | null> {
    if (!ObjectId.isValid(id)) return null;
    const db = await getMongoDb();
    const updateDoc: ChatbotJobUpdateInput = {};

    if (update.status !== undefined) updateDoc.status = update.status;
    if (update.model !== undefined) updateDoc.model = update.model;
    if (update.payload !== undefined) updateDoc.payload = update.payload;
    if (update.resultText !== undefined) updateDoc.resultText = update.resultText;
    if (update.errorMessage !== undefined) updateDoc.errorMessage = update.errorMessage;
    if (update.startedAt !== undefined) updateDoc.startedAt = update.startedAt;
    if (update.finishedAt !== undefined) updateDoc.finishedAt = update.finishedAt;

    if (Object.keys(updateDoc).length === 0) {
      return this.findById(id);
    }

    const result = await db
      .collection<ChatbotJobDocument>(COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateDoc },
        { returnDocument: 'after' }
      );

    return result ? documentToJob(result) : null;
  },

  async deleteMany(statusIn: Array<ChatbotJob['status']>): Promise<number> {
    const db = await getMongoDb();
    const result = await db
      .collection<ChatbotJobDocument>(COLLECTION_NAME)
      .deleteMany({ status: { $in: statusIn } });
    return result.deletedCount;
  },

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    const db = await getMongoDb();
    const result = await db
      .collection<ChatbotJobDocument>(COLLECTION_NAME)
      .deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  },
};
