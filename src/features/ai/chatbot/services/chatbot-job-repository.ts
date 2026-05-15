/**
 * Chatbot Job Repository
 * 
 * Provides database operations for managing AI Chatbot processing jobs.
 * This service handles the lifecycle of chatbot jobs, including scheduling, 
 * execution tracking, and status persistence.
 * 
 * Features:
 * - Job Lifecycle Management: Supports CRUD operations for job tracking.
 * - Queue Integration: Provides methods for identifying pending jobs in order.
 * - Data Normalization: Enforces consistency by mapping database-native types 
 *   to domain DTOs.
 * - Atomic Updates: Facilitates job status and payload updates during execution.
 * 
 * Usage:
 * Use this service to interact with the database layer for all job-related 
 * operations, such as queueing, updating status, or cleanup.
 */

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
import { AppError, AppErrorCodes } from '@/shared/errors/app-error';

/** Name of the collection storing chatbot job records. */
const COLLECTION_NAME = 'chatbot_jobs';

/** MongoDB document representation of a chatbot job. */
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

/** Normalizes nullable strings from DB fields. */
const normalizeNullableString = (value: string | null | undefined): string | undefined =>
  value ?? undefined;

/** Normalizes date inputs to valid Date instances. */
const normalizeNullableDate = (
  value: string | Date | null | undefined
): Date | undefined => {
  if (value === null || value === undefined) return undefined;
  return value instanceof Date ? value : new Date(value);
};

/** Builds an update document from partial input DTO. */
function buildUpdateDoc(update: ChatbotJobUpdateInput): Partial<ChatbotJobDocument> {
  const updateDoc: Partial<ChatbotJobDocument> = {};
  if (update.status !== undefined) updateDoc.status = update.status;
  if (update.model !== undefined) updateDoc.model = normalizeNullableString(update.model);
  if (update.payload !== undefined) updateDoc.payload = update.payload;
  if (update.resultText !== undefined)
    updateDoc.resultText = normalizeNullableString(update.resultText);
  if (update.errorMessage !== undefined)
    updateDoc.errorMessage = normalizeNullableString(update.errorMessage);
  if (update.startedAt !== undefined) updateDoc.startedAt = normalizeNullableDate(update.startedAt);
  if (update.finishedAt !== undefined) updateDoc.finishedAt = normalizeNullableDate(update.finishedAt);
  return updateDoc;
}

/** Maps a MongoDB document to the ChatbotJob DTO. */
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

/** Implementation of the ChatbotJobRepository. */
export const chatbotJobRepository: ChatbotJobRepository = {
  async findAll(limit: number = 50): Promise<ChatbotJob[]> {
    try {
      const db = await getMongoDb();
      const docs = await db
        .collection<ChatbotJobDocument>(COLLECTION_NAME)
        .find({})
        .sort({ createdAt: -1 })
        .limit(limit)
        .toArray();
      return docs.map(documentToJob);
    } catch (error) {
      throw new AppError(`Failed to retrieve all chatbot jobs: ${error instanceof Error ? error.message : 'Unknown'}`, {
        code: AppErrorCodes.databaseError,
        httpStatus: 500,
        cause: error,
      });
    }
  },

  async findById(id: string): Promise<ChatbotJob | null> {
    if (!ObjectId.isValid(id)) return null;
    try {
      const db = await getMongoDb();
      const doc = await db
        .collection<ChatbotJobDocument>(COLLECTION_NAME)
        .findOne({ _id: new ObjectId(id) });
      return doc ? documentToJob(doc) : null;
    } catch (error) {
      throw new AppError(`Failed to retrieve chatbot job by ID: ${id}`, {
        code: AppErrorCodes.databaseError,
        httpStatus: 500,
        cause: error,
      });
    }
  },

  async findNextPending(): Promise<ChatbotJob | null> {
    try {
      const db = await getMongoDb();
      const doc = await db
        .collection<ChatbotJobDocument>(COLLECTION_NAME)
        .findOne({ status: 'pending' }, { sort: { createdAt: 1 } });
      return doc ? documentToJob(doc) : null;
    } catch (error) {
      throw new AppError('Failed to retrieve the next pending chatbot job.', {
        code: AppErrorCodes.databaseError,
        httpStatus: 500,
        cause: error,
      });
    }
  },

  async create(input: ChatbotJobCreateInput): Promise<ChatbotJob> {
    try {
      const db = await getMongoDb();
      const now = new Date();
      const doc: Omit<ChatbotJobDocument, '_id'> = {
        sessionId: input.sessionId,
        status: 'pending',
        model: normalizeNullableString(input.model),
        payload: input.payload,
        resultText: normalizeNullableString(input.resultText),
        errorMessage: normalizeNullableString(input.errorMessage),
        createdAt: now,
        updatedAt: null,
        startedAt: normalizeNullableDate(input.startedAt),
        finishedAt: normalizeNullableDate(input.finishedAt),
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
    } catch (error) {
      throw new AppError(`Failed to create chatbot job for session: ${input.sessionId}`, {
        code: AppErrorCodes.databaseError,
        httpStatus: 500,
        cause: error,
      });
    }
  },

  async update(id: string, update: ChatbotJobUpdateInput): Promise<ChatbotJob | null> {
    if (!ObjectId.isValid(id)) return null;
    try {
      const db = await getMongoDb();
      const updateDoc = buildUpdateDoc(update);

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
    } catch (error) {
      throw new AppError(`Failed to update chatbot job with ID: ${id}`, {
        code: AppErrorCodes.databaseError,
        httpStatus: 500,
        cause: error,
      });
    }
  },

  async deleteMany(statusIn: Array<ChatbotJob['status']>): Promise<number> {
    try {
      const db = await getMongoDb();
      const result = await db
        .collection<ChatbotJobDocument>(COLLECTION_NAME)
        .deleteMany({ status: { $in: statusIn } });
      return result.deletedCount;
    } catch (error) {
      throw new AppError('Failed to perform batch deletion of chatbot jobs.', {
        code: AppErrorCodes.databaseError,
        httpStatus: 500,
        cause: error,
      });
    }
  },

  async delete(id: string): Promise<boolean> {
    if (!ObjectId.isValid(id)) return false;
    try {
      const db = await getMongoDb();
      const result = await db
        .collection<ChatbotJobDocument>(COLLECTION_NAME)
        .deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount > 0;
    } catch (error) {
      throw new AppError(`Failed to delete chatbot job with ID: ${id}`, {
        code: AppErrorCodes.databaseError,
        httpStatus: 500,
        cause: error,
      });
    }
  },
};
