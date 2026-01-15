import { getMongoDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import type {
  ChatSession,
  CreateSessionInput,
  UpdateSessionInput,
} from "@/app/(admin)/admin/chatbot/types";

const COLLECTION_NAME = "chatbot_sessions";

export interface ChatSessionDocument {
  _id: ObjectId;
  title: string;
  messages: ChatSession["messages"];
  createdAt: Date;
  updatedAt: Date;
  settings?: ChatSession["settings"];
}

function documentToSession(doc: ChatSessionDocument): ChatSession {
  return {
    id: doc._id.toString(),
    title: doc.title,
    messages: doc.messages,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
    settings: doc.settings,
  };
}

export const chatbotSessionRepository = {
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
    const doc: Omit<ChatSessionDocument, "_id"> = {
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
      messages: doc.messages,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
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
        { returnDocument: "after" }
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
    message: ChatSession["messages"][0]
  ): Promise<ChatSession | null> {
    const db = await getMongoDb();
    const result = await db
      .collection<ChatSessionDocument>(COLLECTION_NAME)
      .findOneAndUpdate(
        { _id: new ObjectId(id) },
        {
          $push: { messages: message },
          $set: { updatedAt: new Date() },
        },
        { returnDocument: "after" }
      );

    return result ? documentToSession(result) : null;
  },
};
