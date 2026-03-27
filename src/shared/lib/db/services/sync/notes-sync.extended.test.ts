import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  syncCategoriesPrismaToMongo,
  syncNoteFiles,
  syncNoteFilesPrismaToMongo,
  syncNotes,
  syncNotesPrismaToMongo,
  syncNotebooksPrismaToMongo,
  syncTags,
  syncTagsPrismaToMongo,
  syncThemesPrismaToMongo,
} from './notes-sync';

type MockCollectionDocs = Record<string, unknown[]>;

const createMongo = ({
  docsByCollection = {},
  collectionOverrides = {},
}: {
  docsByCollection?: MockCollectionDocs;
  collectionOverrides?: Record<string, any>;
}) =>
  ({
    collection: vi.fn((name: string) => {
      if (collectionOverrides[name]) {
        return collectionOverrides[name];
      }

      return {
        find: vi.fn(() => ({
          toArray: vi.fn(async () => docsByCollection[name] ?? []),
        })),
        deleteMany: vi.fn(async () => ({ deletedCount: 0 })),
        insertMany: vi.fn(async () => ({ insertedCount: (docsByCollection[name] ?? []).length })),
      };
    }),
  }) as any;

const createNotesPrisma = () =>
  ({
    notebook: {
      deleteMany: vi.fn(async () => ({ count: 2 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
      findMany: vi.fn(async () => []),
    },
    theme: {
      deleteMany: vi.fn(async () => ({ count: 1 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
      findMany: vi.fn(async () => []),
    },
    tag: {
      deleteMany: vi.fn(async () => ({ count: 4 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
      findMany: vi.fn(async () => []),
    },
    category: {
      deleteMany: vi.fn(async () => ({ count: 3 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
      findMany: vi.fn(async () => []),
    },
    note: {
      deleteMany: vi.fn(async () => ({ count: 5 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
      findMany: vi.fn(async () => []),
    },
    noteTag: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
    },
    noteCategory: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
    },
    noteRelation: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
    },
    noteFile: {
      deleteMany: vi.fn(async () => ({ count: 6 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
      findMany: vi.fn(async () => []),
    },
  }) as any;

const createContext = ({
  docsByCollection,
  prisma = createNotesPrisma(),
  mongo = createMongo({ docsByCollection }),
}: {
  docsByCollection?: MockCollectionDocs;
  prisma?: any;
  mongo?: any;
}) =>
  ({
    mongo,
    prisma,
    normalizeId: (doc: { id?: unknown; _id?: unknown }) =>
      typeof doc.id === 'string'
        ? doc.id
        : typeof doc._id === 'string'
          ? doc._id
          : null,
    toDate: (value: unknown) => (value ? new Date(String(value)) : null),
    toJsonValue: (value: unknown) => value,
    toObjectIdMaybe: (value: string | null | undefined) => value ?? null,
  }) as any;

describe('notes-sync extended coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('covers tag sync dedupe and missing notebook warnings', async () => {
    const prisma = createNotesPrisma();
    prisma.notebook.findMany.mockResolvedValue([{ id: 'notebook-1' }]);

    const context = createContext({
      prisma,
      docsByCollection: {
        tags: [
          { id: 'tag-1', name: 'Priority', notebookId: 'notebook-1', color: '#ff0' },
          { id: 'tag-2', name: 'Priority', notebookId: 'notebook-1' },
          { id: 'tag-3', name: 'Detached', notebookId: 'missing-notebook' },
        ],
      },
    });

    const result = await syncTags(context);

    expect(prisma.tag.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({ id: 'tag-1', notebookId: 'notebook-1' }),
        expect.objectContaining({ id: 'tag-3', notebookId: null }),
      ],
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'Skipped duplicate tag: Priority (notebook-1)',
        'Tag tag-3: missing notebook missing-notebook',
      ])
    );
  });

  it('covers note sync relation tables and note-file filtering', async () => {
    const prisma = createNotesPrisma();
    prisma.notebook.findMany.mockResolvedValue([{ id: 'notebook-1' }]);
    prisma.note.findMany.mockResolvedValue([{ id: 'note-1' }]);

    const context = createContext({
      prisma,
      docsByCollection: {
        notes: [
          {
            id: 'note-1',
            title: 'First',
            content: 'hello',
            editorType: 'markdown',
            notebookId: 'notebook-1',
            isPinned: true,
            tags: [{ tagId: 'tag-1', assignedAt: '2026-03-01T00:00:00.000Z' }],
            categories: [{ categoryId: 'category-1' }],
            relationsFrom: [
              { targetNoteId: 'note-2', assignedAt: '2026-03-02T00:00:00.000Z' },
              { targetNoteId: '' },
            ],
          },
        ],
        noteFiles: [
          { id: 'file-1', noteId: 'note-1', filename: 'a.png', filepath: '/a.png', mimetype: 'image/png', size: 42 },
          { id: 'file-2', noteId: 'missing-note', filename: 'b.png', filepath: '/b.png', mimetype: 'image/png', size: 21 },
        ],
      },
    });

    const notesResult = await syncNotes(context);
    expect(prisma.note.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.noteTag.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.noteCategory.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.noteRelation.deleteMany).toHaveBeenCalledTimes(1);
    expect(prisma.note.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'note-1',
          title: 'First',
          notebookId: 'notebook-1',
          isPinned: true,
        }),
      ],
    });
    expect(prisma.noteTag.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ noteId: 'note-1', tagId: 'tag-1' })],
    });
    expect(prisma.noteCategory.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ noteId: 'note-1', categoryId: 'category-1' })],
    });
    expect(prisma.noteRelation.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ sourceNoteId: 'note-1', targetNoteId: 'note-2' })],
    });
    expect(notesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 5,
      targetInserted: 1,
    });

    const noteFilesResult = await syncNoteFiles(context);
    expect(prisma.noteFile.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ id: 'file-1', noteId: 'note-1' })],
    });
    expect(noteFilesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 6,
      targetInserted: 1,
    });
  });

  it('covers note prisma-to-mongo denormalization with fallback tag, category, and relation payloads', async () => {
    const notesCollection = {
      deleteMany: vi.fn(async () => ({ deletedCount: 2 })),
      insertMany: vi.fn(async () => ({ insertedCount: 1 })),
    };
    const prisma = createNotesPrisma();
    prisma.note.findMany.mockResolvedValue([
      {
        id: 'note-1',
        title: 'First',
        content: 'hello',
        editorType: 'markdown',
        color: null,
        isPinned: false,
        isArchived: false,
        isFavorite: true,
        notebookId: 'notebook-1',
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
        updatedAt: new Date('2026-03-02T00:00:00.000Z'),
        tags: [{ noteId: 'note-1', tagId: 'missing-tag', assignedAt: new Date('2026-03-03T00:00:00.000Z') }],
        categories: [{ noteId: 'note-1', categoryId: 'missing-category', assignedAt: new Date('2026-03-04T00:00:00.000Z') }],
        relationsFrom: [{ sourceNoteId: 'note-1', targetNoteId: 'missing-note', assignedAt: new Date('2026-03-05T00:00:00.000Z') }],
        files: [
          {
            noteId: 'note-1',
            slotIndex: 0,
            filename: 'asset.png',
            filepath: '/asset.png',
            mimetype: 'image/png',
            size: 10,
            width: null,
            height: null,
            createdAt: new Date('2026-03-06T00:00:00.000Z'),
            updatedAt: new Date('2026-03-06T00:00:00.000Z'),
          },
        ],
      },
    ]);
    prisma.tag.findMany.mockResolvedValue([]);
    prisma.category.findMany.mockResolvedValue([]);

    const context = createContext({
      prisma,
      mongo: createMongo({
        collectionOverrides: {
          notes: notesCollection,
        },
      }),
    });

    const result = await syncNotesPrismaToMongo(context);

    expect(notesCollection.deleteMany).toHaveBeenCalledWith({});
    expect(notesCollection.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'note-1',
        tags: [
          expect.objectContaining({
            tag: expect.objectContaining({ id: 'missing-tag', name: '' }),
          }),
        ],
        categories: [
          expect.objectContaining({
            category: expect.objectContaining({ id: 'missing-category', name: '' }),
          }),
        ],
        relationsFrom: [
          expect.objectContaining({
            targetNote: { id: 'missing-note', title: '', color: null },
          }),
        ],
        files: [expect.objectContaining({ filename: 'asset.png' })],
      }),
    ]);
    expect(result).toEqual({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
    });
  });

  it('covers the remaining prisma-to-mongo writers for files, tags, categories, notebooks, and themes', async () => {
    const collections = {
      noteFiles: { deleteMany: vi.fn(async () => ({ deletedCount: 1 })), insertMany: vi.fn(async () => ({ insertedCount: 1 })) },
      tags: { deleteMany: vi.fn(async () => ({ deletedCount: 2 })), insertMany: vi.fn(async () => ({ insertedCount: 1 })) },
      categories: { deleteMany: vi.fn(async () => ({ deletedCount: 3 })), insertMany: vi.fn(async () => ({ insertedCount: 1 })) },
      notebooks: { deleteMany: vi.fn(async () => ({ deletedCount: 4 })), insertMany: vi.fn(async () => ({ insertedCount: 1 })) },
      themes: { deleteMany: vi.fn(async () => ({ deletedCount: 5 })), insertMany: vi.fn(async () => ({ insertedCount: 1 })) },
    };
    const prisma = createNotesPrisma();
    prisma.noteFile.findMany.mockResolvedValue([
      {
        id: 'file-1',
        noteId: 'note-1',
        slotIndex: 0,
        filename: 'asset.png',
        filepath: '/asset.png',
        mimetype: 'image/png',
        size: 10,
        width: null,
        height: null,
        createdAt: new Date('2026-03-06T00:00:00.000Z'),
        updatedAt: new Date('2026-03-06T00:00:00.000Z'),
      },
    ]);
    prisma.tag.findMany.mockResolvedValue([
      { id: 'tag-1', name: 'Important', color: '#ff0', notebookId: null, createdAt: new Date(), updatedAt: new Date() },
    ]);
    prisma.category.findMany.mockResolvedValue([
      { id: 'category-1', name: 'Reading', description: null, color: null, parentId: null, themeId: null, notebookId: null, sortIndex: 0, createdAt: new Date(), updatedAt: new Date() },
    ]);
    prisma.notebook.findMany.mockResolvedValue([
      { id: 'notebook-1', name: 'School', color: '#fff', defaultThemeId: null, createdAt: new Date(), updatedAt: new Date() },
    ]);
    prisma.theme.findMany.mockResolvedValue([
      {
        id: 'theme-1',
        name: 'Dark',
        textColor: '#fff',
        backgroundColor: '#000',
        markdownHeadingColor: '#fff',
        markdownLinkColor: '#00f',
        markdownCodeBackground: '#111',
        markdownCodeText: '#eee',
        relatedNoteBorderWidth: 1,
        relatedNoteBorderColor: '#222',
        relatedNoteBackgroundColor: '#333',
        relatedNoteTextColor: '#444',
        notebookId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const context = createContext({
      prisma,
      mongo: createMongo({ collectionOverrides: collections }),
    });

    await expect(syncNoteFilesPrismaToMongo(context)).resolves.toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });
    await expect(syncTagsPrismaToMongo(context)).resolves.toEqual({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
    });
    await expect(syncCategoriesPrismaToMongo(context)).resolves.toEqual({
      sourceCount: 1,
      targetDeleted: 3,
      targetInserted: 1,
    });
    await expect(syncNotebooksPrismaToMongo(context)).resolves.toEqual({
      sourceCount: 1,
      targetDeleted: 4,
      targetInserted: 1,
    });
    await expect(syncThemesPrismaToMongo(context)).resolves.toEqual({
      sourceCount: 1,
      targetDeleted: 5,
      targetInserted: 1,
    });

    expect(collections.noteFiles.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'file-1', noteId: 'note-1' }),
    ]);
    expect(collections.tags.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'tag-1', name: 'Important' }),
    ]);
    expect(collections.categories.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'category-1', name: 'Reading' }),
    ]);
    expect(collections.notebooks.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'notebook-1', name: 'School' }),
    ]);
    expect(collections.themes.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({ id: 'theme-1', name: 'Dark' }),
    ]);
  });
});
