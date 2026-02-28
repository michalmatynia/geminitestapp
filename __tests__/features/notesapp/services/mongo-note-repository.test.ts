import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Db } from 'mongodb';

vi.mock('crypto', async (importOriginal) => {
  const actual = await importOriginal<typeof import('crypto')>();
  const mock = {
    ...actual,
    randomUUID: vi.fn().mockReturnValue('mock-uuid'),
  };
  return {
    ...mock,
    default: mock,
  };
});

import { mongoNoteRepository } from '@/features/notesapp/services/notes/note-repository/mongo-note-repository';
import { getMongoDb } from '@/shared/lib/db/mongo-client';

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: vi.fn(),
}));

describe('Mongo Note Repository', () => {
  const mockCollection = {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: vi.fn(),
    findOne: vi.fn(),
    insertOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    deleteOne: vi.fn(),
  };

  const mockDb = {
    collection: vi.fn().mockReturnValue(mockCollection),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getMongoDb).mockResolvedValue(mockDb as unknown as Db);
  });

  describe('Notebook Operations', () => {
    it('gets or creates default notebook', async () => {
      mockCollection.toArray.mockResolvedValue([]); // No notebook exists
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'mock-uuid' });

      const notebook = await mongoNoteRepository.getOrCreateDefaultNotebook();

      expect(mockDb.collection).toHaveBeenCalledWith('notebooks');
      expect(notebook.name).toBe('Default');
      expect(mockCollection.insertOne).toHaveBeenCalled();
      // Verify migration updateMany calls
      expect(mockCollection.updateMany).toHaveBeenCalledTimes(3);
    });

    it('returns existing notebook if found', async () => {
      mockCollection.toArray.mockResolvedValue([{ _id: 'n1', id: 'n1', name: 'Existing' }]);

      const notebook = await mongoNoteRepository.getOrCreateDefaultNotebook();
      expect(notebook.name).toBe('Existing');
      expect(mockCollection.insertOne).not.toHaveBeenCalled();
    });
  });

  describe('Note Operations', () => {
    it('creates a note with resolved notebookId', async () => {
      mockCollection.toArray.mockResolvedValue([{ _id: 'default-n', id: 'default-n' }]); // For getOrCreateDefault
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'mock-uuid' });

      const note = await mongoNoteRepository.create({
        title: 'New Note',
        content: 'Content',
        color: null,
        notebookId: 'default-n',
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });

      expect(mockDb.collection).toHaveBeenCalledWith('notes');
      expect(note.title).toBe('New Note');
      expect(note.notebookId).toBe('default-n');
    });

    it('gets all notes with filters', async () => {
      mockCollection.toArray
        .mockResolvedValueOnce([{ _id: 'default-n', id: 'default-n' }]) // For getOrCreateDefault
        .mockResolvedValueOnce([
          {
            _id: 'note-1',
            id: 'note-1',
            title: 'N1',
            content: 'C1',
            tags: [],
            categories: [],
            relationsFrom: [],
          },
        ]) // For notes
        .mockResolvedValueOnce([]) // For files
        .mockResolvedValueOnce([]); // For incoming relations

      const notes = await mongoNoteRepository.getAll({ search: 'N1' });

      expect(notes).toHaveLength(1);
      expect(notes[0]!.title).toBe('N1');
      expect(mockCollection.find).toHaveBeenCalledWith(
        expect.objectContaining({
          $or: expect.any(Array),
        })
      );
    });

    it('gets note by ID with relations', async () => {
      const mockNote = {
        _id: 'note-1',
        id: 'note-1',
        title: 'N1',
        content: 'C1',
        relationsFrom: [{ targetNoteId: 'note-2', assignedAt: new Date() }],
      };
      mockCollection.findOne.mockResolvedValue(mockNote);
      mockCollection.toArray
        .mockResolvedValueOnce([]) // For files
        .mockResolvedValueOnce([]); // For incoming relations (relationsTo)

      const note = await mongoNoteRepository.getById('note-1');

      expect(note?.id).toBe('note-1');
      expect(note?.relationsFrom).toHaveLength(1);
    });
  });

  describe('Tag and Category Operations', () => {
    it('creates a tag', async () => {
      mockCollection.toArray.mockResolvedValue([{ _id: 'default-n', id: 'default-n' }]);
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'mock-uuid' });

      const tag = await mongoNoteRepository.createTag({
        name: 'Urgent',
        color: null,
        notebookId: 'default-n',
      });

      expect(mockDb.collection).toHaveBeenCalledWith('tags');
      expect(tag.name).toBe('Urgent');
    });

    it('gets category tree', async () => {
      mockCollection.toArray
        .mockResolvedValueOnce([{ _id: 'default-n', id: 'default-n' }]) // For getOrCreateDefault
        .mockResolvedValueOnce([
          { _id: 'c1', id: 'c1', name: 'Parent', parentId: null },
          { _id: 'c2', id: 'c2', name: 'Child', parentId: 'c1' },
        ]) // For categories
        .mockResolvedValueOnce([]); // For notes

      const tree = await mongoNoteRepository.getCategoryTree();

      expect(tree).toHaveLength(1);
      expect(tree[0]!.name).toBe('Parent');
      expect(tree[0]!.children).toHaveLength(1);
      expect(tree[0]!.children[0]!.name).toBe('Child');
    });
  });
});
