 
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
 
 
 

import { randomUUID } from 'crypto';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { 
  NotebookDocument, 
  NoteDocument, 
  TagDocument, 
  CategoryDocument 
} from '../types/mongo-note-types';
import { 
  NotebookRecord,
  NotebookCreateInput,
  NotebookUpdateInput,
} from '@/shared/contracts/notes';
import { toNotebookResponse } from '../mongo-note-repository-utils';
import { Filter, UpdateFilter, WithId } from 'mongodb';
import { notFoundError } from '@/shared/errors/app-error';

const notebookCollectionName = 'notebooks';
const noteCollectionName = 'notes';
const tagCollectionName = 'tags';
const categoryCollectionName = 'categories';

export const mongoNotebookImpl = {
  async getOrCreateDefaultNotebook(): Promise<NotebookRecord> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const existing = await collection.find({}).sort({ createdAt: 1 }).limit(1).toArray();
    const notebook = existing[0]
      ? toNotebookResponse(existing[0])
      : toNotebookResponse(
        await (async (): Promise<WithId<NotebookDocument>> => {
          const id = randomUUID();
          const now = new Date();
          const doc: NotebookDocument = {
            _id: id,
            id,
            name: 'Default',
            color: '#3b82f6',
            defaultThemeId: null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };
          await collection.insertOne(doc);
          return doc;
        })()
      );

    const noteCollection = db.collection<NoteDocument>(noteCollectionName);
    const tagCollection = db.collection<TagDocument>(tagCollectionName);
    const categoryCollection = db.collection<CategoryDocument>(categoryCollectionName);
    await noteCollection.updateMany(
      {
        $or: [{ notebookId: { $exists: false } }, { notebookId: null }],
      } as Filter<NoteDocument>,
      { $set: { notebookId: notebook.id } } as UpdateFilter<NoteDocument>
    );
    await tagCollection.updateMany(
      {
        $or: [{ notebookId: { $exists: false } }, { notebookId: null }],
      } as Filter<TagDocument>,
      { $set: { notebookId: notebook.id } } as UpdateFilter<TagDocument>
    );
    await categoryCollection.updateMany(
      {
        $or: [{ notebookId: { $exists: false } }, { notebookId: null }],
      } as Filter<CategoryDocument>,
      { $set: { notebookId: notebook.id } } as UpdateFilter<CategoryDocument>
    );

    return notebook;
  },

  async getAllNotebooks(): Promise<NotebookRecord[]> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const docs = await collection.find({}).sort({ name: 1 }).toArray();
    return docs.map(toNotebookResponse);
  },

  async getNotebookById(id: string): Promise<NotebookRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const doc = await collection.findOne({
      $or: [{ id }, { _id: id }],
    } as Filter<NotebookDocument>);
    return doc ? toNotebookResponse(doc) : null;
  },

  async createNotebook(data: NotebookCreateInput): Promise<NotebookRecord> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const id = randomUUID();
    const now = new Date();
    const doc: NotebookDocument = {
      _id: id,
      id,
      name: data.name,
      color: data.color ?? '#3b82f6',
      defaultThemeId: data.defaultThemeId ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await collection.insertOne(doc);
    return toNotebookResponse(doc);
  },

  async updateNotebook(id: string, data: NotebookUpdateInput): Promise<NotebookRecord> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const now = new Date();
    const update: UpdateFilter<NotebookDocument> = {
      $set: {
        updatedAt: now.toISOString(),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.defaultThemeId !== undefined && { defaultThemeId: data.defaultThemeId }),
      },
    };
    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] } as Filter<NotebookDocument>,
      update,
      { returnDocument: 'after' }
    );
    if (!result) throw notFoundError('Notebook not found');
    return toNotebookResponse(result);
  },

  async deleteNotebook(id: string): Promise<void> {
    const db = await getMongoDb();
    const collection = db.collection<NotebookDocument>(notebookCollectionName);
    const result = await collection.deleteOne({
      $or: [{ id }, { _id: id }],
    } as Filter<NotebookDocument>);
    if (result.deletedCount === 0) throw notFoundError('Notebook not found');

    // Cleanup notes, tags, categories
    await db.collection(noteCollectionName).deleteMany({ notebookId: id });
    await db.collection(tagCollectionName).deleteMany({ notebookId: id });
    await db.collection(categoryCollectionName).deleteMany({ notebookId: id });
  },
};
