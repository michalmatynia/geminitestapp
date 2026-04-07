import { ActivityTypes } from '@/shared/constants/observability';
import type {
  NoteWithRelations,
  RelatedNote,
  NoteUpdateInput,
  NoteCreateInput,
  NoteFilters,
  TagRecord,
  TagCreateInput,
  TagUpdateInput,
  CategoryRecord,
  CategoryCreateInput,
  CategoryUpdateInput,
  CategoryWithChildren,
  NotebookRecord,
  NotebookCreateInput,
  NotebookUpdateInput,
  ThemeRecord,
  ThemeCreateInput,
  ThemeUpdateInput,
  NoteFileRecord,
  NoteFileCreateInput,
  NoteRelationWithSource,
  NoteRelationWithTarget,
} from '@/shared/contracts/notes';
import { logActivity } from '@/shared/utils/observability/activity-service';
import { ErrorSystem } from '@/shared/utils/observability/error-system';
import type { NoteRepository } from '../types/note-repository';
import { cleanupNoteFile } from '../file-cleanup';
import { repoCall } from './core';

const buildRelations = (note: NoteWithRelations): RelatedNote[] => {
  const fromRelations = (note.relationsFrom ?? [])
    .map((rel: NoteRelationWithTarget) => rel.targetNote)
    .filter((rel: RelatedNote | undefined): rel is RelatedNote => !!rel);

  const toRelations = (note.relationsTo ?? [])
    .map((rel: NoteRelationWithSource) => rel.sourceNote)
    .filter((rel: RelatedNote | undefined): rel is RelatedNote => !!rel);

  const relations: RelatedNote[] = [...fromRelations, ...toRelations];
  const seen = new Set<string>();
  return relations.filter((rel: RelatedNote) => {
    if (!rel?.id || seen.has(rel.id)) return false;
    seen.add(rel.id);
    return true;
  });
};

function populateRelations(data: NoteWithRelations[]): NoteWithRelations[];
function populateRelations(data: NoteWithRelations): NoteWithRelations;
function populateRelations(data: null): null;
function populateRelations(data: NoteWithRelations | null): NoteWithRelations | null;
function populateRelations(
  data: NoteWithRelations | NoteWithRelations[] | null
): NoteWithRelations | NoteWithRelations[] | null {
  if (!data) return data;
  if (Array.isArray(data)) {
    return data.map((note: NoteWithRelations) => ({
      ...note,
      relations: buildRelations(note),
    }));
  }
  return {
    ...data,
    relations: buildRelations(data),
  };
}

export const noteService: NoteRepository = {
  getAll: async (filters: NoteFilters): Promise<NoteWithRelations[]> => {
    const notes = await repoCall('getAll', filters);
    return populateRelations(notes);
  },

  getById: async (id: string): Promise<NoteWithRelations | null> => {
    const note = await repoCall('getById', id);
    return populateRelations(note);
  },

  create: async (data: NoteCreateInput): Promise<NoteWithRelations> => {
    const note = await repoCall('create', data);
    const populated = populateRelations(note);
    void logActivity({
      type: ActivityTypes.NOTE.CREATED,
      description: `Created note ${populated.title}`,
      entityId: populated.id,
      entityType: 'note',
      metadata: { title: populated.title, notebookId: populated.notebookId },
    }).catch(() => {});
    return populated;
  },

  update: async (id: string, data: NoteUpdateInput): Promise<NoteWithRelations | null> => {
    const previousNote = await repoCall('getById', id);
    const note = await repoCall('update', id, data);

    if (!note) return null;

    if (Array.isArray(data.relatedNoteIds) && previousNote) {
      const previousRelatedIds =
        previousNote.relationsFrom
          ?.map((rel: NoteRelationWithTarget) => rel.targetNote?.id)
          .filter((rid: string | undefined): rid is string => !!rid) || [];
      const nextRelatedIds = data.relatedNoteIds;
      const addedRelations = nextRelatedIds.filter(
        (relId: string) => !previousRelatedIds.includes(relId) && relId !== id
      );
      const removedRelations = previousRelatedIds.filter(
        (relId: string) => !nextRelatedIds.includes(relId) && relId !== id
      );

      if (addedRelations.length > 0 || removedRelations.length > 0) {
        await repoCall('syncRelatedNotesBatch', id, addedRelations, removedRelations);
      }
    }

    const populated = populateRelations(note);
    void logActivity({
      type: ActivityTypes.NOTE.UPDATED,
      description: `Updated note ${populated.title}`,
      entityId: populated.id,
      entityType: 'note',
      metadata: { changes: Object.keys(data) },
    }).catch(() => {});
    return populated;
  },

  delete: async (id: string): Promise<boolean> => {
    try {
      const files = await repoCall('getNoteFiles', id);
      await Promise.all(files.map((file: NoteFileRecord) => cleanupNoteFile(id, file.filepath)));
    } catch (error) {
      void ErrorSystem.captureException(error);
      void ErrorSystem.captureException(error, {
        service: 'note-service',
        action: 'deleteNoteFiles',
        noteId: id,
      });
    }
    const success = await repoCall('delete', id);
    if (success) {
      void logActivity({
        type: ActivityTypes.NOTE.DELETED,
        description: `Deleted note ${id}`,
        entityId: id,
        entityType: 'note',
      }).catch(() => {});
    }
    return success;
  },

  syncRelatedNotesBatch: (
    noteId: string,
    addedIds: string[],
    removedIds: string[]
  ): Promise<void> => repoCall('syncRelatedNotesBatch', noteId, addedIds, removedIds),

  getAllTags: (notebookId?: string | null): Promise<TagRecord[]> =>
    repoCall('getAllTags', notebookId),
  getTagById: (id: string): Promise<TagRecord | null> => repoCall('getTagById', id),
  createTag: (data: TagCreateInput): Promise<TagRecord> => repoCall('createTag', data),
  updateTag: (id: string, data: TagUpdateInput): Promise<TagRecord | null> =>
    repoCall('updateTag', id, data),
  deleteTag: (id: string): Promise<boolean> => repoCall('deleteTag', id),
  getAllCategories: (notebookId?: string | null): Promise<CategoryRecord[]> =>
    repoCall('getAllCategories', notebookId),
  getCategoryById: (id: string): Promise<CategoryRecord | null> => repoCall('getCategoryById', id),
  getCategoryTree: (notebookId?: string | null): Promise<CategoryWithChildren[]> =>
    repoCall('getCategoryTree', notebookId),
  createCategory: (data: CategoryCreateInput): Promise<CategoryRecord> =>
    repoCall('createCategory', data),
  updateCategory: (id: string, data: CategoryUpdateInput): Promise<CategoryRecord | null> =>
    repoCall('updateCategory', id, data),
  deleteCategory: (id: string, recursive?: boolean): Promise<boolean> =>
    repoCall('deleteCategory', id, recursive),
  getAllNotebooks: (): Promise<NotebookRecord[]> => repoCall('getAllNotebooks'),
  getNotebookById: (id: string): Promise<NotebookRecord | null> => repoCall('getNotebookById', id),
  createNotebook: (data: NotebookCreateInput): Promise<NotebookRecord> =>
    repoCall('createNotebook', data),
  updateNotebook: (id: string, data: NotebookUpdateInput): Promise<NotebookRecord | null> =>
    repoCall('updateNotebook', id, data),
  deleteNotebook: (id: string): Promise<boolean> => repoCall('deleteNotebook', id),
  getOrCreateDefaultNotebook: (): Promise<NotebookRecord> => repoCall('getOrCreateDefaultNotebook'),
  invalidateDefaultNotebookCache: async (): Promise<void> => {
    await repoCall('invalidateDefaultNotebookCache');
  },
  getAllThemes: (notebookId?: string | null): Promise<ThemeRecord[]> =>
    repoCall('getAllThemes', notebookId),
  getThemeById: (id: string): Promise<ThemeRecord | null> => repoCall('getThemeById', id),
  createTheme: (data: ThemeCreateInput): Promise<ThemeRecord> => repoCall('createTheme', data),
  updateTheme: (id: string, data: ThemeUpdateInput): Promise<ThemeRecord | null> =>
    repoCall('updateTheme', id, data),
  deleteTheme: (id: string): Promise<boolean> => repoCall('deleteTheme', id),
  createNoteFile: (data: NoteFileCreateInput): Promise<NoteFileRecord> =>
    repoCall('createNoteFile', data),
  getNoteFiles: (noteId: string): Promise<NoteFileRecord[]> => repoCall('getNoteFiles', noteId),
  deleteNoteFile: (noteId: string, slotIndex: number): Promise<boolean> =>
    repoCall('deleteNoteFile', noteId, slotIndex),
};
