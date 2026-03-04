import { Category, Note } from '@prisma/client';
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi, afterAll, beforeAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import {
  PATCH as PATCH_CATEGORY,
  DELETE as DELETE_CATEGORY,
} from '@/app/api/notes/categories/[id]/route';
import { GET as GET_CATEGORIES, POST as POST_CATEGORY } from '@/app/api/notes/categories/route';
import { GET as GET_TREE } from '@/app/api/notes/categories/tree/route';
import { noteService, invalidateNoteRepositoryCache } from '@/features/notesapp/services/notes';
import { invalidateAppDbProviderCache } from '@/shared/lib/db/app-db-provider';
import prisma from '@/shared/lib/db/prisma';

const createCategory = async (name: string, parentId?: string | null) => {
  const notebook = await noteService.getOrCreateDefaultNotebook();
  return prisma.category.create({
    data: { name, parentId: parentId ?? null, notebookId: notebook.id },
  });
};

const createNote = async (title: string, categoryId: string) => {
  const notebook = await noteService.getOrCreateDefaultNotebook();
  return prisma.note.create({
    data: {
      title,
      content: `${title} content`,
      notebookId: notebook.id,
      categories: {
        create: [{ category: { connect: { id: categoryId } } }],
      },
    },
  });
};

let canMutatePrismaCategoryApiTables = true;

describe('Notes Categories API', () => {
  const shouldSkipNotesCategoriesApiTests = (): boolean =>
    !process.env['DATABASE_URL'] || !canMutatePrismaCategoryApiTables;

  beforeAll(() => {
    process.env['APP_DB_PROVIDER'] = 'prisma';
    invalidateAppDbProviderCache();
    invalidateNoteRepositoryCache();
  });

  beforeEach(async () => {
    if (shouldSkipNotesCategoriesApiTests()) return;

    try {
      await prisma.noteRelation.deleteMany({});
      await prisma.noteTag.deleteMany({});
      await prisma.noteCategory.deleteMany({});
      await prisma.note.deleteMany({});
      await prisma.category.deleteMany({});
      await prisma.notebook.deleteMany({});
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canMutatePrismaCategoryApiTables = false;
        return;
      }
      throw error;
    }

    await noteService.invalidateDefaultNotebookCache();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists categories', async () => {
    if (shouldSkipNotesCategoriesApiTests()) return;

    const notebook = await noteService.getOrCreateDefaultNotebook();
    await prisma.category.createMany({
      data: [
        { name: 'Work', notebookId: notebook.id },
        { name: 'Home', notebookId: notebook.id },
      ],
    });

    const res = await GET_CATEGORIES(new NextRequest('http://localhost/api/notes/categories'));
    const categories = (await res.json()) as Category[];

    expect(res.status).toBe(200);
    expect(categories).toHaveLength(2);
  });

  it('creates a category and rejects empty names', async () => {
    if (shouldSkipNotesCategoriesApiTests()) return;

    const res = await POST_CATEGORY(
      new NextRequest('http://localhost/api/notes/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Projects' }),
      })
    );
    const created = (await res.json()) as { name: string };

    expect(res.status).toBe(201);
    expect(created.name).toBe('Projects');

    const missing = await POST_CATEGORY(
      new NextRequest('http://localhost/api/notes/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      })
    );

    expect(missing.status).toBe(400);
  });

  it('updates a category', async () => {
    if (shouldSkipNotesCategoriesApiTests()) return;

    const category = await createCategory('Old Name');

    const res = await PATCH_CATEGORY(
      new NextRequest(`http://localhost/api/notes/categories/${category.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      }),
      { params: Promise.resolve({ id: category.id }) }
    );
    const updated = (await res.json()) as { name: string };

    expect(res.status).toBe(200);
    expect(updated.name).toBe('New Name');
  });

  it('returns a hierarchical category tree', async () => {
    if (shouldSkipNotesCategoriesApiTests()) return;

    const root = await createCategory('Root');
    const child = await createCategory('Child', root.id);
    await createNote('Child Note', child.id);

    const res = await GET_TREE(new NextRequest('http://localhost/api/notes/categories/tree'));
    const tree = (await res.json()) as (Category & {
      children: (Category & { notes: Note[] })[];
    })[];

    expect(res.status).toBe(200);
    expect(tree).toHaveLength(1);
    expect(tree[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.notes).toHaveLength(1);
  });

  it('deletes categories recursively with notes', async () => {
    if (shouldSkipNotesCategoriesApiTests()) return;

    const root = await createCategory('Root');
    const child = await createCategory('Child', root.id);
    await createNote('Root Note', root.id);
    await createNote('Child Note', child.id);

    const res = await DELETE_CATEGORY(
      new NextRequest(`http://localhost/api/notes/categories/${root.id}?recursive=true`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: root.id }) }
    );

    expect(res.status).toBe(200);
    const remainingCategories = await prisma.category.findMany({});
    const remainingNotes = await prisma.note.findMany({});
    expect(remainingCategories).toHaveLength(0);
    expect(remainingNotes).toHaveLength(0);
  });
});
