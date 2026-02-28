import { randomUUID } from 'crypto';
import type { Filter, WithId } from 'mongodb';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type {
  ThemeDocument,
} from '@/features/notesapp/services/notes/types/mongo-note-types';
import type {
  NoteThemeDto as ThemeRecord,
  CreateNoteThemeDto as ThemeCreateInput,
  UpdateNoteThemeDto as ThemeUpdateInput,
} from '@/shared/contracts/notes';
import {
  toThemeResponse,
} from '../mongo-note-repository-utils';
import { themeCollectionName } from './common';

export const mongoThemeImpl = {
  async getAllThemes(notebookId?: string | null): Promise<ThemeRecord[]> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const filter = notebookId ? { notebookId } : {};
    const docs = await collection.find(filter as Filter<ThemeDocument>).sort({ name: 1 }).toArray();
    return docs.map(toThemeResponse);
  },

  async getThemeById(id: string): Promise<ThemeRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const doc = await collection.findOne({
      $or: [{ id }, { _id: id }],
    } as Filter<ThemeDocument>);
    return doc ? toThemeResponse(doc) : null;
  },

  async createTheme(data: ThemeCreateInput): Promise<ThemeRecord> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const id = randomUUID();
    const now = new Date();
    const doc: ThemeDocument = {
      _id: id,
      id,
      name: data.name,
      description: data.description ?? null,
      config: data.config ?? {},
      isPublic: data.isPublic ?? false,
      notebookId: data.notebookId ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await collection.insertOne(doc);
    return toThemeResponse(doc as WithId<ThemeDocument>);
  },

  async updateTheme(id: string, data: ThemeUpdateInput): Promise<ThemeRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const now = new Date();
    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] } as Filter<ThemeDocument>,
      {
        $set: {
          ...data,
          updatedAt: now.toISOString(),
        },
      },
      { returnDocument: 'after' }
    );
    return result ? toThemeResponse(result) : null;
  },

  async deleteTheme(id: string): Promise<boolean> {
    const db = await getMongoDb();
    const collection = db.collection<ThemeDocument>(themeCollectionName);
    const result = await collection.deleteOne({
      $or: [{ id }, { _id: id }],
    } as Filter<ThemeDocument>);
    return result.deletedCount > 0;
  },
};
