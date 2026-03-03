import { randomUUID } from 'crypto';
import type { Filter, WithId } from 'mongodb';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import type { NoteFileDocument } from '@/features/notesapp/services/notes/types/mongo-note-types';
import type {
  NoteFileRecord,
  NoteFileCreateInput,
} from '@/shared/contracts/notes';
import { toNoteFileResponse } from '../mongo-note-repository-utils';
import { noteFileCollectionName } from './common';

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
    return toNoteFileResponse(doc as WithId<NoteFileDocument>);
  },

  async getNoteFiles(_noteId: string): Promise<NoteFileRecord[]> {
    const db = await getMongoDb();
    const collection = db.collection<NoteFileDocument>(noteFileCollectionName);
    const docs = await collection
      .find({ noteId: _noteId } as Filter<NoteFileDocument>)
      .sort({ slotIndex: 1 })
      .toArray();
    return docs.map(toNoteFileResponse);
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
