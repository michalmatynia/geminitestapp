import { describe, it, expect, vi, beforeEach } from 'vitest';

import { noteService } from '@/features/notesapp/services/notes';
import { cleanupNoteFile } from '@/features/notesapp/services/notes/file-cleanup';
import prisma from '@/shared/lib/db/prisma';

// Mock file cleanup
vi.mock('@/features/notesapp/services/notes/file-cleanup', () => ({
  cleanupNoteFile: vi.fn().mockResolvedValue(undefined),
}));

describe('NoteService', () => {
  beforeEach(async () => {
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

  describe('CRUD Operations', () => {
    it('creates a note in the default notebook', async () => {
      const note = await noteService.create({
        title: 'Test Note',
        content: 'Test Content',
      });

      expect(note.title).toBe('Test Note');
      expect(note.notebookId).toBeDefined();
      
      const notebook = await prisma.notebook.findUnique({
        where: { id: note.notebookId! }
      });
      expect(notebook?.name).toBe('Default'); // Default name in repository
    });

    it('retrieves notes with filters and populated relations', async () => {
      const note = await noteService.create({
        title: 'Find Me',
        content: 'Secret',
        isPinned: true,
      });

      const notes = await noteService.getAll({ isPinned: true });
      expect(notes).toHaveLength(1);
      expect(notes[0]!.id).toBe(note.id);
      expect(notes[0]!.relations).toBeDefined();
    });

    it('filters by isFavorite', async () => {
      await noteService.create({ title: 'Fav', content: '...', isFavorite: true });
      await noteService.create({ title: 'Not Fav', content: '...', isFavorite: false });

      const favs = await noteService.getAll({ isFavorite: true });
      expect(favs).toHaveLength(1);
      expect(favs[0]!.title).toBe('Fav');
    });

    it('truncates content when requested', async () => {
      const longContent = 'A'.repeat(500);
      await noteService.create({
        title: 'Long Note',
        content: longContent,
      });

      const notes = await noteService.getAll({ truncateContent: true });
      expect(notes[0]!.content.length).toBeLessThan(500);
      expect(notes[0]!.content.endsWith('...')).toBe(true);
    });

    it('searches notes by title or content', async () => {
      await noteService.create({ title: 'Specific Title', content: '...' });
      await noteService.create({ title: '...', content: 'Specific Content' });
      await noteService.create({ title: 'Other', content: '...' });

      const byTitle = await noteService.getAll({ search: 'Specific Title' });
      expect(byTitle).toHaveLength(1);

      const byContent = await noteService.getAll({ search: 'Specific Content' });
      expect(byContent).toHaveLength(1);
    });
  });

  describe('Notebook Management', () => {
    it('creates and retrieves notebooks', async () => {
      const nb = await noteService.createNotebook({ name: 'Work' });
      expect(nb.name).toBe('Work');

      const all = await noteService.getAllNotebooks();
      expect(all.some(n => n.id === nb.id)).toBe(true);
    });

    it('gets or creates default notebook', async () => {
      const nb = await noteService.getOrCreateDefaultNotebook();
      expect(nb.name).toBe('Default');

      const sameNb = await noteService.getOrCreateDefaultNotebook();
      expect(sameNb.id).toBe(nb.id);
    });
  });

  describe('Relation Syncing', () => {
    it('automatically creates bidirectional relations', async () => {
      const noteA = await noteService.create({
        title: 'Note A',
        content: 'Content A',
      });
      const noteB = await noteService.create({
        title: 'Note B',
        content: 'Content B',
      });

      // Relate A -> B
      await noteService.update(noteA.id, {
        relatedNoteIds: [noteB.id],
      });

      // Check B -> A relation was created automatically by service
      const updatedB = await noteService.getById(noteB.id);
      const bRelations = updatedB?.relationsFrom?.map((r: any) => r.targetNote.id) || [];
      expect(bRelations).toContain(noteA.id);
      
      // Check population helper
      expect(updatedB?.relations?.map((r: any) => r.id)).toContain(noteA.id);
    });

    it('removes bidirectional relations when one side is updated', async () => {
      const noteA = await noteService.create({ title: 'A', content: '...' });
      const noteB = await noteService.create({ title: 'B', content: '...' });

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
      const note = await noteService.create({ title: 'Delete Me', content: '...' });
      
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
      const parent = await noteService.createCategory({ name: 'Parent' });
      const child = await noteService.createCategory({ 
        name: 'Child', 
        parentId: parent.id 
      });

      const tree = await noteService.getCategoryTree();
      const parentInTree = tree.find(c => c.id === parent.id);
      
      expect(parentInTree).toBeDefined();
      expect(parentInTree?.children.some(c => c.id === child.id)).toBe(true);
    });
  });
});
