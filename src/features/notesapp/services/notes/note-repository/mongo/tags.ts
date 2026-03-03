 
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
 
 
 

import { randomUUID } from 'crypto';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import { 
  TagDocument, 
  NoteDocument 
} from '../types/mongo-note-types';
import { 
  NoteTagDto as TagRecord,
  CreateNoteTagDto as TagCreateInput,
  UpdateNoteTagDto as TagUpdateInput,
} from '@/shared/contracts/notes';
import { toTagResponse } from '../mongo-note-repository-utils';
import { Filter, UpdateFilter } from 'mongodb';
import { notFoundError } from '@/shared/errors/app-error';

const tagCollectionName = 'tags';
const noteCollectionName = 'notes';

export const mongoTagImpl = {
  async getAllTags(notebookId: string): Promise<TagRecord[]> {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const docs = await collection.find({ notebookId }).sort({ name: 1 }).toArray();
    return docs.map(toTagResponse);
  },

  async getTagById(id: string): Promise<TagRecord | null> {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const doc = await collection.findOne({
      $or: [{ id }, { _id: id }],
    } as Filter<TagDocument>);
    return doc ? toTagResponse(doc) : null;
  },

  async createTag(data: TagCreateInput): Promise<TagRecord> {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const id = randomUUID();
    const now = new Date();
    const doc: TagDocument = {
      _id: id,
      id,
      name: data.name,
      color: data.color ?? null,
      notebookId: data.notebookId,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await collection.insertOne(doc);
    return toTagResponse(doc);
  },

  async updateTag(id: string, data: TagUpdateInput): Promise<TagRecord> {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const now = new Date();
    const update: UpdateFilter<TagDocument> = {
      $set: {
        updatedAt: now.toISOString(),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
    };
    const result = await collection.findOneAndUpdate(
      { $or: [{ id }, { _id: id }] } as Filter<TagDocument>,
      update,
      { returnDocument: 'after' }
    );
    if (!result) throw notFoundError('Tag not found');

    // Update embedded tags in notes
    const tag = toTagResponse(result);
    await db.collection<NoteDocument>(noteCollectionName).updateMany(
      { 'tags.tagId': tag.id } as Filter<NoteDocument>,
      { $set: { 'tags.$.tag': tag } } as UpdateFilter<NoteDocument>
    );

    return tag;
  },

  async deleteTag(id: string): Promise<void> {
    const db = await getMongoDb();
    const collection = db.collection<TagDocument>(tagCollectionName);
    const result = await collection.deleteOne({
      $or: [{ id }, { _id: id }],
    } as Filter<TagDocument>);
    if (result.deletedCount === 0) throw notFoundError('Tag not found');

    // Remove from notes
    await db.collection<NoteDocument>(noteCollectionName).updateMany(
      {} as Filter<NoteDocument>,
      { $pull: { tags: { tagId: id } } } as UpdateFilter<NoteDocument>
    );
  },
};
