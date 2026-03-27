import { beforeEach, describe, expect, it, vi } from 'vitest';

import { syncCategories, syncNotebooks, syncThemes } from './notes-sync';

type MockCollectionDocs = Record<string, unknown[]>;

const createMongo = (docsByCollection: MockCollectionDocs) =>
  ({
    collection: vi.fn((name: string) => ({
      find: vi.fn(() => ({
        toArray: vi.fn(async () => docsByCollection[name] ?? []),
      })),
    })),
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
    category: {
      deleteMany: vi.fn(async () => ({ count: 3 })),
      createMany: vi.fn(async ({ data }: { data: unknown[] }) => ({ count: data.length })),
    },
  }) as any;

const createContext = ({
  docsByCollection,
  prisma = createNotesPrisma(),
}: {
  docsByCollection: MockCollectionDocs;
  prisma?: any;
}) =>
  ({
    mongo: createMongo(docsByCollection),
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

describe('notes-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deduplicates notebooks by name before inserting them', async () => {
    const context = createContext({
      docsByCollection: {
        notebooks: [
          { id: 'notebook-1', name: 'School', color: '#ffcc00' },
          { id: 'notebook-2', name: 'School', color: '#00ccff' },
        ],
      },
    });

    const result = await syncNotebooks(context);

    expect(context.prisma.notebook.deleteMany).toHaveBeenCalledTimes(1);
    expect(context.prisma.notebook.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'notebook-1',
          name: 'School',
          color: '#ffcc00',
        }),
      ],
    });
    expect(result).toMatchObject({
      sourceCount: 1,
      targetDeleted: 2,
      targetInserted: 1,
      warnings: ['Skipped duplicate notebook name: School'],
    });
  });

  it('normalizes missing theme notebook references into warnings and null notebook ids', async () => {
    const prisma = createNotesPrisma();
    prisma.notebook.findMany.mockResolvedValue([{ id: 'notebook-1' }]);

    const context = createContext({
      prisma,
      docsByCollection: {
        themes: [
          { id: 'theme-1', name: 'Shared', notebookId: 'notebook-1' },
          { id: 'theme-2', name: 'Detached', notebookId: 'notebook-missing' },
        ],
      },
    });

    const result = await syncThemes(context);

    expect(prisma.theme.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'theme-1',
          notebookId: 'notebook-1',
        }),
        expect.objectContaining({
          id: 'theme-2',
          notebookId: null,
        }),
      ],
    });
    expect(result).toMatchObject({
      sourceCount: 2,
      targetDeleted: 1,
      targetInserted: 2,
      warnings: ['Theme theme-2: missing notebook notebook-missing'],
    });
  });

  it('deduplicates categories and clears missing relation ids', async () => {
    const prisma = createNotesPrisma();
    prisma.notebook.findMany.mockResolvedValue([{ id: 'notebook-1' }]);
    prisma.theme.findMany.mockResolvedValue([{ id: 'theme-1' }]);

    const context = createContext({
      prisma,
      docsByCollection: {
        categories: [
          { id: 'category-1', name: 'Reading', notebookId: 'notebook-1', themeId: 'theme-1' },
          { id: 'category-2', name: 'Reading', notebookId: 'notebook-1' },
          {
            id: 'category-3',
            name: 'Math',
            parentId: 'missing-parent',
            notebookId: 'missing-notebook',
            themeId: 'missing-theme',
          },
        ],
      },
    });

    const result = await syncCategories(context);

    expect(prisma.category.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'category-1',
          notebookId: 'notebook-1',
          themeId: 'theme-1',
        }),
        expect.objectContaining({
          id: 'category-3',
          parentId: null,
          notebookId: null,
          themeId: null,
        }),
      ],
    });
    expect(result.warnings).toEqual(
      expect.arrayContaining([
        'Skipped duplicate category: Reading (notebook-1)',
        'Category category-3: missing parent missing-parent',
        'Category category-3: missing notebook missing-notebook',
        'Category category-3: missing theme missing-theme',
      ])
    );
  });
});
