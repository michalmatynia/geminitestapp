import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { noteService } from '@/features/notesapp/services/notes';
import { cleanupNoteFile } from '@/features/notesapp/services/notes/file-cleanup';
import prisma from '@/shared/lib/db/prisma';
import type { NotebookDto, NoteRelationWithTarget, CategoryWithChildren } from '@/shared/contracts/notes';

// Mock file cleanup
vi.mock('@/features/notesapp/services/notes/file-cleanup', () => ({
  cleanupNoteFile: vi.fn().mockResolvedValue(undefined),
}));

const uniqueSuffix = (): string => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createTestNotebook = async (prefix: string): Promise<NotebookDto> =>
  noteService.createNotebook({
    name: `notes-test-${prefix}-${uniqueSuffix()}`,
    color: null,
    defaultThemeId: null,
  });

let canAccessPrismaNotebookTable = true;
const shouldSkipPrismaNotesTests = (): boolean =>
  !process.env['DATABASE_URL'] || !canAccessPrismaNotebookTable;

describe('NoteService', () => {
  beforeAll(async () => {
    if (!process.env['DATABASE_URL']) {
      canAccessPrismaNotebookTable = false;
      return;
    }

    try {
      await prisma.notebook.findFirst({
        select: { id: true },
      });
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canAccessPrismaNotebookTable = false;
        return;
      }
      throw error;
    }
  });

  beforeEach(async () => {
    // Only run if DATABASE_URL is available
    if (shouldSkipPrismaNotesTests()) return;

    await noteService.invalidateDefaultNotebookCache();

    vi.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('CRUD Operations', () => {
    it('creates a note in the default notebook', async () => {
      if (shouldSkipPrismaNotesTests()) return;

      const note = await noteService.create({
        title: 'Test Note',
        content: 'Test Content',
        color: null,
        notebookId: null,
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });

      expect(note.title).toBe('Test Note');
      expect(note.notebookId).toBeDefined();

      const notebook = await prisma.notebook.findUnique({
        where: { id: note.notebookId! },
      });
      expect(notebook?.name).toBe('Default'); // Default name in repository
    });

    it('retrieves notes with filters and populated relations', async () => {
      if (shouldSkipPrismaNotesTests()) return;

      const notebook = await createTestNotebook('filters');

      const note = await noteService.create({
        title: `Find Me ${uniqueSuffix()}`,
        content: 'Secret',
        isPinned: true,
        color: null,
        notebookId: notebook.id,
        editorType: 'markdown',
        isArchived: false,
        isFavorite: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });

      const notes = await noteService.getAll({ notebookId: notebook.id, isPinned: true });
      expect(notes).toHaveLength(1);
      expect(notes[0]!.id).toBe(note.id);
      expect(notes[0]!.relations).toBeDefined();
    });

    it('filters by isFavorite', async () => {
      if (shouldSkipPrismaNotesTests()) return;

      const notebook = await createTestNotebook('favorite');

      await noteService.create({
        title: `Fav ${uniqueSuffix()}`,
        content: '...',
        isFavorite: true,
        color: null,
        notebookId: notebook.id,
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });
      await noteService.create({
        title: `Not Fav ${uniqueSuffix()}`,
        content: '...',
        isFavorite: false,
        color: null,
        notebookId: notebook.id,
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });

      const favs = await noteService.getAll({ notebookId: notebook.id, isFavorite: true });
      expect(favs).toHaveLength(1);
      expect(favs[0]!.title).toContain('Fav');
    });

    it('truncates content when requested', async () => {
      if (shouldSkipPrismaNotesTests()) return;

      const notebook = await createTestNotebook('truncate');
      const longContent = 'A'.repeat(500);
      await noteService.create({
        title: `Long Note ${uniqueSuffix()}`,
        content: longContent,
        color: null,
        notebookId: notebook.id,
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });

      const notes = await noteService.getAll({ notebookId: notebook.id, truncateContent: true });
      expect(notes[0]!.content.length).toBeLessThan(500);
      expect(notes[0]!.content.endsWith('...')).toBe(true);
    });

    it('searches notes by title or content', async () => {
      if (shouldSkipPrismaNotesTests()) return;

      const notebook = await createTestNotebook('search');
      const marker = uniqueSuffix();

      await noteService.create({
        title: `Specific Title ${marker}`,
        content: '...',
        color: null,
        notebookId: notebook.id,
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });
      await noteService.create({
        title: '...',
        content: `Specific Content ${marker}`,
        color: null,
        notebookId: notebook.id,
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });
      await noteService.create({
        title: `Other ${marker}`,
        content: '...',
        color: null,
        notebookId: notebook.id,
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });

      const byTitle = await noteService.getAll({
        notebookId: notebook.id,
        search: `Specific Title ${marker}`,
      });
      expect(byTitle).toHaveLength(1);

      const byContent = await noteService.getAll({
        notebookId: notebook.id,
        search: `Specific Content ${marker}`,
      });
      expect(byContent).toHaveLength(1);
    });
  });

  describe('Notebook Management', () => {
    it('creates and retrieves notebooks', async () => {
      if (shouldSkipPrismaNotesTests()) return;

      const nb = await createTestNotebook('work');
      expect(nb.name).toContain('notes-test-work');

      const all = await noteService.getAllNotebooks();
      expect(all.some((n: NotebookDto) => n.id === nb.id)).toBe(true);
    });

    it('gets or creates default notebook', async () => {
      if (shouldSkipPrismaNotesTests()) return;

      const nb = await noteService.getOrCreateDefaultNotebook();
      expect(nb.name).toBe('Default');

      const sameNb = await noteService.getOrCreateDefaultNotebook();
      expect(sameNb.id).toBe(nb.id);
    });
  });

  describe('Relation Syncing', () => {
    it('automatically creates bidirectional relations', async () => {
      if (shouldSkipPrismaNotesTests()) return;

      const notebook = await createTestNotebook('relation-bidirectional');
      const noteA = await noteService.create({
        title: `Note A ${uniqueSuffix()}`,
        content: 'Content A',
        color: null,
        notebookId: notebook.id,
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });
      const noteB = await noteService.create({
        title: `Note B ${uniqueSuffix()}`,
        content: 'Content B',
        color: null,
        notebookId: notebook.id,
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });

      // Relate A -> B
      await noteService.update(noteA.id, {
        relatedNoteIds: [noteB.id],
      });

      // Check B -> A relation was created automatically by service
      const updatedB = await noteService.getById(noteB.id);
      const bRelations = updatedB?.relationsFrom?.map((r: NoteRelationWithTarget) => r.targetNote?.id) || [];
      expect(bRelations).toContain(noteA.id);

      // Check population helper
      expect(updatedB?.relations?.map((r: { id: string }) => r.id)).toContain(noteA.id);
    });

    it('removes bidirectional relations when one side is updated', async () => {
      if (shouldSkipPrismaNotesTests()) return;

      const notebook = await createTestNotebook('relation-remove');
      const noteA = await noteService.create({
        title: `A ${uniqueSuffix()}`,
        content: '...',
        color: null,
        notebookId: notebook.id,
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });
      const noteB = await noteService.create({
        title: `B ${uniqueSuffix()}`,
        content: '...',
        color: null,
        notebookId: notebook.id,
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });

      // Add relation
      await noteService.update(noteA.id, { relatedNoteIds: [noteB.id] });

      // Remove relation from A
      await noteService.update(noteA.id, { relatedNoteIds: [] });

      // Check B's relations are also gone
      const updatedB = await noteService.getById(noteB.id);
      expect(updatedB?.relationsFrom).toHaveLength(0);
    });
  });

  describe('File Cleanup', () => {
    it('calls cleanupNoteFile when a note is deleted', async () => {
      if (shouldSkipPrismaNotesTests()) return;

      const notebook = await createTestNotebook('file-cleanup');
      const note = await noteService.create({
        title: `Delete Me ${uniqueSuffix()}`,
        content: '...',
        color: null,
        notebookId: notebook.id,
        editorType: 'markdown',
        isPinned: false,
        isArchived: false,
        isFavorite: false,
        tagIds: [],
        categoryIds: [],
        relatedNoteIds: [],
      });

      // Manually add a file record via prisma for testing
      await prisma.noteFile.create({
        data: {
          noteId: note.id,
          filename: 'test.png',
          filepath: 'uploads/test.png',
          mimetype: 'image/png',
          size: 100,
          slotIndex: 0,
        },
      });

      await noteService.delete(note.id);

      expect(cleanupNoteFile).toHaveBeenCalledWith(note.id, 'uploads/test.png');
    });
  });

  describe('Categories and Tags', () => {
    it('manages category trees', async () => {
      if (shouldSkipPrismaNotesTests()) return;

      const notebook = await createTestNotebook('category-tree');
      const parent = await noteService.createCategory({
        name: `Parent ${uniqueSuffix()}`,
        color: null,
        notebookId: notebook.id,
        themeId: null,
        sortIndex: null,
        parentId: null,
      });
      const child = await noteService.createCategory({
        name: `Child ${uniqueSuffix()}`,
        parentId: parent.id,
        color: null,
        notebookId: notebook.id,
        themeId: null,
        sortIndex: null,
      });

      const tree = await noteService.getCategoryTree(notebook.id);
      const parentInTree = tree.find((c: CategoryWithChildren) => c.id === parent.id);

      expect(parentInTree).toBeDefined();
      expect(parentInTree?.children.some((c: CategoryWithChildren) => c.id === child.id)).toBe(true);
    });
  });
});
