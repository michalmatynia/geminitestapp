import { randomUUID } from 'crypto';

import type { NoteFileDocument } from '@/features/notesapp/services/notes/types/mongo-note-types';
import type { NoteFileRecord, NoteFileCreateInput } from '@/shared/contracts/notes';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

import { noteFileCollectionName } from './common';

import type { Filter } from 'mongodb';

const toNoteFileRecord = (doc: NoteFileDocument): NoteFileRecord => ({
  id: doc.id ?? doc._id,
  noteId: doc.noteId,
  slotIndex: doc.slotIndex,
  filename: doc.filename,
  filepath: doc.filepath,
  mimetype: doc.mimetype,
  size: doc.size,
  width: doc.width ?? null,
  height: doc.height ?? null,
  createdAt: typeof doc.createdAt === 'string' ? doc.createdAt : doc.createdAt.toISOString(),
  updatedAt:
    typeof doc.updatedAt === 'string'
      ? doc.updatedAt
      : (doc.updatedAt?.toISOString() ??
        (typeof doc.createdAt === 'string' ? doc.createdAt : doc.createdAt.toISOString())),
});

export const mongoFileImpl = {
  async createNoteFile(_data: NoteFileCreateInput): Promise<NoteFileRecord> {
    const db = await getMongoDb();
    const collection = db.collection<NoteFileDocument>(noteFileCollectionName);
    const id = randomUUID();
    const now = new Date();
    await collection.deleteMany({
      noteId: _data.noteId,
      slotIndex: _data.slotIndex,
    } as Filter<NoteFileDocument>);
    const doc: NoteFileDocument = {
      _id: id,
      id,
      noteId: _data.noteId,
      slotIndex: _data.slotIndex,
      filename: _data.filename,
      filepath: _data.filepath,
      mimetype: _data.mimetype,
      size: _data.size,
      width: _data.width ?? null,
      height: _data.height ?? null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
    await collection.insertOne(doc);
    return toNoteFileRecord(doc);
  },

  async getNoteFiles(_noteId: string): Promise<NoteFileRecord[]> {
    const db = await getMongoDb();
    const collection = db.collection<NoteFileDocument>(noteFileCollectionName);
    const docs = await collection
      .find({ noteId: _noteId } as Filter<NoteFileDocument>)
      .sort({ slotIndex: 1 })
      .toArray();
    return docs.map((doc) => toNoteFileRecord(doc));
  },

  async deleteNoteFile(_noteId: string, _slotIndex: number): Promise<boolean> {
    const db = await getMongoDb();
    const collection = db.collection<NoteFileDocument>(noteFileCollectionName);
    const result = await collection.deleteOne({
      noteId: _noteId,
      slotIndex: _slotIndex,
    } as Filter<NoteFileDocument>);
    return result.deletedCount > 0;
  },
};
