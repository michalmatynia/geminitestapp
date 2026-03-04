import { Tag } from '@prisma/client';
import { NextRequest } from 'next/server';
import { describe, it, expect, beforeEach, vi, afterAll, beforeAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { PATCH as PATCH_TAG, DELETE as DELETE_TAG } from '@/app/api/notes/tags/[id]/route';
import { GET as GET_TAGS, POST as POST_TAG } from '@/app/api/notes/tags/route';
import { noteService, invalidateNoteRepositoryCache } from '@/features/notesapp/services/notes';
import { invalidateAppDbProviderCache } from '@/shared/lib/db/app-db-provider';
import prisma from '@/shared/lib/db/prisma';

let canMutateNotesTagsApiTables = true;

describe('Notes Tags API', () => {
  const shouldSkipNotesTagsApiTests = (): boolean =>
    !process.env['DATABASE_URL'] || !canMutateNotesTagsApiTables;

  beforeAll(() => {
    process.env['APP_DB_PROVIDER'] = 'prisma';
    invalidateAppDbProviderCache();
    invalidateNoteRepositoryCache();
  });

  beforeEach(async () => {
    if (shouldSkipNotesTagsApiTests()) return;

    try {
      await prisma.noteTag.deleteMany({});
      await prisma.note.deleteMany({});
      await prisma.tag.deleteMany({});
      await prisma.notebook.deleteMany({});
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canMutateNotesTagsApiTables = false;
        return;
      }
      throw error;
    }

    await noteService.invalidateDefaultNotebookCache();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists tags ordered by name', async () => {
    if (shouldSkipNotesTagsApiTests()) return;

    const notebook = await noteService.getOrCreateDefaultNotebook();
    await prisma.tag.createMany({
      data: [
        { name: 'Beta', notebookId: notebook.id },
        { name: 'Alpha', notebookId: notebook.id },
      ],
    });

    const res = await GET_TAGS(new NextRequest('http://localhost/api/notes/tags'));
    const tags = (await res.json()) as Tag[];

    expect(res.status).toBe(200);
    expect(tags[0]!.name).toBe('Alpha');
    expect(tags[1]!.name).toBe('Beta');
  });

  it('creates a tag', async () => {
    if (shouldSkipNotesTagsApiTests()) return;

    const res = await POST_TAG(
      new NextRequest('http://localhost/api/notes/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Personal' }),
      })
    );
    const tag = (await res.json()) as { name: string };

    expect(res.status).toBe(201);
    expect(tag.name).toBe('Personal');
  });

  it('rejects tag creation without a name', async () => {
    if (shouldSkipNotesTagsApiTests()) return;

    const res = await POST_TAG(
      new NextRequest('http://localhost/api/notes/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' }),
      })
    );

    expect(res.status).toBe(400);
  });

  it('updates a tag', async () => {
    if (shouldSkipNotesTagsApiTests()) return;

    const notebook = await noteService.getOrCreateDefaultNotebook();
    const tag = await prisma.tag.create({ data: { name: 'Old', notebookId: notebook.id } });

    const res = await PATCH_TAG(
      new NextRequest(`http://localhost/api/notes/tags/${tag.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' }),
      }),
      { params: Promise.resolve({ id: tag.id }) }
    );
    const updated = (await res.json()) as { name: string };

    expect(res.status).toBe(200);
    expect(updated.name).toBe('New Name');
  });

  it('deletes a tag', async () => {
    if (shouldSkipNotesTagsApiTests()) return;

    const notebook = await noteService.getOrCreateDefaultNotebook();
    const tag = await prisma.tag.create({ data: { name: 'Delete', notebookId: notebook.id } });

    const res = await DELETE_TAG(
      new NextRequest(`http://localhost/api/notes/tags/${tag.id}`, {
        method: 'DELETE',
      }),
      { params: Promise.resolve({ id: tag.id }) }
    );

    expect(res.status).toBe(200);
    const remaining = await prisma.tag.findUnique({ where: { id: tag.id } });
    expect(remaining).toBeNull();
  });
});
