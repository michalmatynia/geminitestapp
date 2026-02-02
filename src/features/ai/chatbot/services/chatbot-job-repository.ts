import "server-only";

import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { ObjectId } from "mongodb";
import type {
  ChatbotJob,
  ChatbotJobDocument,
  ChatbotJobStatus,
} from "@/shared/types/chatbot";

const COLLECTION_NAME = "chatbot_jobs";

function documentToJob(doc: ChatbotJobDocument): ChatbotJob {
  return {
    id: doc._id.toString(),
    sessionId: doc.sessionId,
    status: doc.status,
    model: doc.model,
    payload: doc.payload,
    resultText: doc.resultText,
    errorMessage: doc.errorMessage,
    createdAt: doc.createdAt,
    startedAt: doc.startedAt,
    finishedAt: doc.finishedAt,
  };
}

export interface ChatbotJobRepository {
  findAll(limit?: number): Promise<ChatbotJob[]>;
  findById(id: string): Promise<ChatbotJob | null>;
  findNextPending(): Promise<ChatbotJob | null>;
  create(input: Omit<ChatbotJob, "id" | "createdAt" | "status">): Promise<ChatbotJob>;
  update(id: string, update: Partial<Omit<ChatbotJob, "id" | "sessionId" | "createdAt">>): Promise<ChatbotJob | null>;
  deleteMany(statusIn: ChatbotJobStatus[]): Promise<number>;
  delete(id: string): Promise<boolean>;
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
      .findOne({ status: "pending" }, { sort: { createdAt: 1 } });
    return doc ? documentToJob(doc) : null;
  },

  async create(input: Omit<ChatbotJob, "id" | "createdAt" | "status">): Promise<ChatbotJob> {
    const db = await getMongoDb();
    const now = new Date();
    const doc: Omit<ChatbotJobDocument, "_id"> = {
      sessionId: input.sessionId,
      status: "pending",
      model: input.model,
      payload: input.payload,
      resultText: input.resultText,
      errorMessage: input.errorMessage,
      createdAt: now,
      startedAt: input.startedAt,
      finishedAt: input.finishedAt,
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
      createdAt: doc.createdAt,
      startedAt: doc.startedAt,
      finishedAt: doc.finishedAt,
    };
  },

  async update(
    id: string,
    update: Partial<Omit<ChatbotJob, "id" | "sessionId" | "createdAt">>
  ): Promise<ChatbotJob | null> {
    if (!ObjectId.isValid(id)) return null;
    const db = await getMongoDb();
    
    const result = await db
      .collection<ChatbotJobDocument>(COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: update },
        { returnDocument: "after" }
      );

    return result ? documentToJob(result) : null;
  },

  async deleteMany(statusIn: ChatbotJobStatus[]): Promise<number> {
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
