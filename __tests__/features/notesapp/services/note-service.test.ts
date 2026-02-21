import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { noteService } from '@/features/notesapp/services/notes';
import { cleanupNoteFile } from '@/features/notesapp/services/notes/file-cleanup';
import prisma from '@/shared/lib/db/prisma';

// Mock file cleanup
vi.mock('@/features/notesapp/services/notes/file-cleanup', () => ({
  cleanupNoteFile: vi.fn().mockResolvedValue(undefined),
}));

describe('NoteService', () => {
  beforeEach(async () => {
    // Only run if DATABASE_URL is available
    if (!process.env['DATABASE_URL']) return;

    // Clean up DB using prisma directly to ensure a fresh state
    await prisma.noteRelation.deleteMany({});
    await prisma.noteFile.deleteMany({});
    await prisma.noteTag.deleteMany({});
    await prisma.noteCategory.deleteMany({});
    await prisma.note.deleteMany({});
    await prisma.tag.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.notebook.deleteMany({});
    
    vi.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('CRUD Operations', () => {
    it('creates a note in the default notebook', async () => {
      if (!process.env['DATABASE_URL']) return;

      const note = await noteService.create({
        title: 'Test Note',
        content: 'Test Content',
        color: null, notebookId: null, editorType: 'markdown', isPinned: false, isArchived: false, isFavorite: false, tagIds: [], categoryIds: [], relatedNoteIds: []
      });

      expect(note.title).toBe('Test Note');
      expect(note.notebookId).toBeDefined();
      
      const notebook = await prisma.notebook.findUnique({
        where: { id: note.notebookId! }
      });
      expect(notebook?.name).toBe('Default'); // Default name in repository
    });

    it('retrieves notes with filters and populated relations', async () => {
      if (!process.env['DATABASE_URL']) return;

      const note = await noteService.create({
        title: 'Find Me',
        content: 'Secret',
        isPinned: true,
        color: null, notebookId: null, editorType: 'markdown', isArchived: false, isFavorite: false, tagIds: [], categoryIds: [], relatedNoteIds: []
      });

      const notes = await noteService.getAll({ isPinned: true });
      expect(notes).toHaveLength(1);
      expect(notes[0]!.id).toBe(note.id);
      expect(notes[0]!.relations).toBeDefined();
    });

    it('filters by isFavorite', async () => {
      if (!process.env['DATABASE_URL']) return;

      await noteService.create({ title: 'Fav', content: '...', isFavorite: true, color: null, notebookId: null, editorType: 'markdown', isPinned: false, isArchived: false, tagIds: [], categoryIds: [], relatedNoteIds: [] });
      await noteService.create({ title: 'Not Fav', content: '...', isFavorite: false, color: null, notebookId: null, editorType: 'markdown', isPinned: false, isArchived: false, tagIds: [], categoryIds: [], relatedNoteIds: [] });

      const favs = await noteService.getAll({ isFavorite: true });
      expect(favs).toHaveLength(1);
      expect(favs[0]!.title).toBe('Fav');
    });

    it('truncates content when requested', async () => {
      if (!process.env['DATABASE_URL']) return;

      const longContent = 'A'.repeat(500);
      await noteService.create({
        title: 'Long Note',
        content: longContent,
        color: null, notebookId: null, editorType: 'markdown', isPinned: false, isArchived: false, isFavorite: false, tagIds: [], categoryIds: [], relatedNoteIds: []
      });

      const notes = await noteService.getAll({ truncateContent: true });
      expect(notes[0]!.content.length).toBeLessThan(500);
      expect(notes[0]!.content.endsWith('...')).toBe(true);
    });

    it('searches notes by title or content', async () => {
      if (!process.env['DATABASE_URL']) return;

      await noteService.create({ title: 'Specific Title', content: '...', color: null, notebookId: null, editorType: 'markdown', isPinned: false, isArchived: false, isFavorite: false, tagIds: [], categoryIds: [], relatedNoteIds: [] });
      await noteService.create({ title: '...', content: 'Specific Content', color: null, notebookId: null, editorType: 'markdown', isPinned: false, isArchived: false, isFavorite: false, tagIds: [], categoryIds: [], relatedNoteIds: [] });
      await noteService.create({ title: 'Other', content: '...', color: null, notebookId: null, editorType: 'markdown', isPinned: false, isArchived: false, isFavorite: false, tagIds: [], categoryIds: [], relatedNoteIds: [] });

      const byTitle = await noteService.getAll({ search: 'Specific Title' });
      expect(byTitle).toHaveLength(1);

      const byContent = await noteService.getAll({ search: 'Specific Content' });
      expect(byContent).toHaveLength(1);
    });
  });

  describe('Notebook Management', () => {
    it('creates and retrieves notebooks', async () => {
      if (!process.env['DATABASE_URL']) return;

      const nb = await noteService.createNotebook({ name: 'Work', color: null, defaultThemeId: null });
      expect(nb.name).toBe('Work');

      const all = await noteService.getAllNotebooks();
      expect(all.some((n: any) => n.id === nb.id)).toBe(true);
    });

    it('gets or creates default notebook', async () => {
      if (!process.env['DATABASE_URL']) return;

      const nb = await noteService.getOrCreateDefaultNotebook();
      expect(nb.name).toBe('Default');

      const sameNb = await noteService.getOrCreateDefaultNotebook();
      expect(sameNb.id).toBe(nb.id);
    });
  });

  describe('Relation Syncing', () => {
    it('automatically creates bidirectional relations', async () => {
      if (!process.env['DATABASE_URL']) return;

      const noteA = await noteService.create({
        title: 'Note A',
        content: 'Content A',
        color: null, notebookId: null, editorType: 'markdown', isPinned: false, isArchived: false, isFavorite: false, tagIds: [], categoryIds: [], relatedNoteIds: []
      });
      const noteB = await noteService.create({
        title: 'Note B',
        content: 'Content B',
        color: null, notebookId: null, editorType: 'markdown', isPinned: false, isArchived: false, isFavorite: false, tagIds: [], categoryIds: [], relatedNoteIds: []
      });

      // Relate A -> B
      await noteService.update(noteA.id, {
        relatedNoteIds: [noteB.id],
      });

      // Check B -> A relation was created automatically by service
      const updatedB = await noteService.getById(noteB.id);
      const bRelations = updatedB?.relationsFrom?.map((r: any) => r.targetNote?.id) || [];
      expect(bRelations).toContain(noteA.id);
      
      // Check population helper
      expect(updatedB?.relations?.map((r: { id: string }) => r.id)).toContain(noteA.id);
    });

    it('removes bidirectional relations when one side is updated', async () => {
      if (!process.env['DATABASE_URL']) return;

      const noteA = await noteService.create({ title: 'A', content: '...', color: null, notebookId: null, editorType: 'markdown', isPinned: false, isArchived: false, isFavorite: false, tagIds: [], categoryIds: [], relatedNoteIds: [] });
      const noteB = await noteService.create({ title: 'B', content: '...', color: null, notebookId: null, editorType: 'markdown', isPinned: false, isArchived: false, isFavorite: false, tagIds: [], categoryIds: [], relatedNoteIds: [] });

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
      if (!process.env['DATABASE_URL']) return;

      const note = await noteService.create({ title: 'Delete Me', content: '...', color: null, notebookId: null, editorType: 'markdown', isPinned: false, isArchived: false, isFavorite: false, tagIds: [], categoryIds: [], relatedNoteIds: [] });
      
      // Manually add a file record via prisma for testing
      await prisma.noteFile.create({
        data: {
          noteId: note.id,
          filename: 'test.png',
          filepath: 'uploads/test.png',
          mimetype: 'image/png',
          size: 100,
          slotIndex: 0,
        }
      });

      await noteService.delete(note.id);
      
      expect(cleanupNoteFile).toHaveBeenCalledWith(note.id, 'uploads/test.png');
    });
  });

  describe('Categories and Tags', () => {
    it('manages category trees', async () => {
      if (!process.env['DATABASE_URL']) return;

      const parent = await noteService.createCategory({ name: 'Parent', color: null, notebookId: null, themeId: null, sortIndex: null, parentId: null });
      const child = await noteService.createCategory({ 
        name: 'Child', 
        parentId: parent.id,
        color: null, notebookId: null, themeId: null, sortIndex: null
      });

      const tree = await noteService.getCategoryTree();
      const parentInTree = tree.find((c: any) => c.id === parent.id);
            
      expect(parentInTree).toBeDefined();
      expect(parentInTree?.children.some((c: any) => c.id === child.id)).toBe(true);
    });
  });
});
      