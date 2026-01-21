import type { NoteRepository } from "@/types/services/note-repository";
import type { NoteWithRelations, RelatedNote } from "@/types/notes";
import { cleanupNoteFile } from "./file-cleanup";

// Switch between MongoDB and Prisma based on environment or configuration
const USE_MONGO = process.env.NOTE_DB_PROVIDER === "mongodb";

// Lazy load to avoid initializing Prisma when using MongoDB
let _repository: NoteRepository | null = null;

async function getRepository(): Promise<NoteRepository> {
  if (!_repository) {
    if (USE_MONGO) {
      const { mongoNoteRepository } = await import("./note-repository/mongo-note-repository");
      _repository = mongoNoteRepository;
    } else {
      const { prismaNoteRepository } = await import("./note-repository/prisma-note-repository");
      _repository = prismaNoteRepository;
    }
  }
  
  if (!_repository) {
    throw new Error("Failed to initialize note repository");
  }

  return _repository;
}

// Helper to access repository methods
const repoCall = async <K extends keyof NoteRepository>(
  key: K,
  ...args: Parameters<NoteRepository[K]>
): Promise<Awaited<ReturnType<NoteRepository[K]>>> => {
  const repo = await getRepository();
  const fn = repo[key] as (
    ...args: Parameters<NoteRepository[K]>
  ) => ReturnType<NoteRepository[K]>;
  return fn(...args) as Promise<Awaited<ReturnType<NoteRepository[K]>>>;
};

// Helper: Build Relations
const buildRelations = (note: NoteWithRelations): RelatedNote[] => {
  const relations = [
    ...(note.relationsFrom ?? []).map((rel) => rel.targetNote),
    ...(note.relationsTo ?? []).map((rel) => rel.sourceNote),
  ];
  const seen = new Set<string>();
  return relations.filter((rel) => {
    if (!rel?.id || seen.has(rel.id)) return false;
    seen.add(rel.id);
    return true;
  });
};

// Helper: Populate relations on a note or list of notes
const populateRelations = <T extends NoteWithRelations | NoteWithRelations[] | null>(data: T): T => {
    if (!data) return data;
    if (Array.isArray(data)) {
        return data.map(note => ({
            ...note,
            relations: buildRelations(note)
        })) as unknown as T;
    }
    const note = data as NoteWithRelations;
    return {
        ...note,
        relations: buildRelations(note)
    } as unknown as T;
};

export const noteService: NoteRepository = {
  // Enhanced Methods with Business Logic

  getAll: async (...args) => {
    const notes = await repoCall("getAll", ...args);
    return populateRelations(notes) as NoteWithRelations[];
  },

  getById: async (...args) => {
    const note = await repoCall("getById", ...args);
    return populateRelations(note);
  },

  create: async (...args) => {
    const note = await repoCall("create", ...args);
    return populateRelations(note) as NoteWithRelations;
  },

  update: async (id, data) => {
    const previousNote = await repoCall("getById", id);
    const note = await repoCall("update", id, data);

    // Sync Relations
    if (Array.isArray(data.relatedNoteIds) && previousNote) {
      const previousRelatedIds =
        previousNote.relationsFrom?.map((rel) => rel.targetNote.id) || [];
      const nextRelatedIds = data.relatedNoteIds;
      const addedRelations = nextRelatedIds.filter(
        (relId) => !previousRelatedIds.includes(relId) && relId !== id
      );
      const removedRelations = previousRelatedIds.filter(
        (relId) => !nextRelatedIds.includes(relId) && relId !== id
      );

      const syncRelatedNote = async (relatedId: string, shouldAdd: boolean) => {
        try {
          const relatedNote = await repoCall("getById", relatedId);
          if (!relatedNote) return;
          
          const currentIds =
            relatedNote.relationsFrom?.map((rel) => rel.targetNote.id) || [];
          
          let nextIds: string[];
          if (shouldAdd) {
             nextIds = Array.from(new Set([...currentIds, id]));
          } else {
             nextIds = currentIds.filter((relId) => relId !== id);
          }
          
          await repoCall("update", relatedId, { relatedNoteIds: nextIds });
        } catch (syncError) {
          console.error("[noteService][update] Failed to sync relation", {
            noteId: id,
            relatedId,
            syncError,
          });
        }
      };

      await Promise.all([
        ...addedRelations.map((relId) => syncRelatedNote(relId, true)),
        ...removedRelations.map((relId) => syncRelatedNote(relId, false)),
      ]);
    }

    return populateRelations(note);
  },

  delete: async (id) => {
    try {
        const files = await repoCall("getNoteFiles", id);
        await Promise.all(
            files.map(file => cleanupNoteFile(id, file.filepath))
        );
    } catch (error) {
        console.error("[noteService][delete] Failed to cleanup files", error);
    }
    return repoCall("delete", id);
  },

  // Pass-through methods
  getAllTags: (...args) => repoCall("getAllTags", ...args),
  getTagById: (...args) => repoCall("getTagById", ...args),
  createTag: (...args) => repoCall("createTag", ...args),
  updateTag: (...args) => repoCall("updateTag", ...args),
  deleteTag: (...args) => repoCall("deleteTag", ...args),
  getAllCategories: (...args) => repoCall("getAllCategories", ...args),
  getCategoryById: (...args) => repoCall("getCategoryById", ...args),
  getCategoryTree: (...args) => repoCall("getCategoryTree", ...args),
  createCategory: (...args) => repoCall("createCategory", ...args),
  updateCategory: (...args) => repoCall("updateCategory", ...args),
  deleteCategory: (...args) => repoCall("deleteCategory", ...args),
  getAllNotebooks: (...args) => repoCall("getAllNotebooks", ...args),
  getNotebookById: (...args) => repoCall("getNotebookById", ...args),
  createNotebook: (...args) => repoCall("createNotebook", ...args),
  updateNotebook: (...args) => repoCall("updateNotebook", ...args),
  deleteNotebook: (...args) => repoCall("deleteNotebook", ...args),
  getOrCreateDefaultNotebook: (...args) => repoCall("getOrCreateDefaultNotebook", ...args),
  getAllThemes: (...args) => repoCall("getAllThemes", ...args),
  getThemeById: (...args) => repoCall("getThemeById", ...args),
  createTheme: (...args) => repoCall("createTheme", ...args),
  updateTheme: (...args) => repoCall("updateTheme", ...args),
  deleteTheme: (...args) => repoCall("deleteTheme", ...args),
  createNoteFile: (...args) => repoCall("createNoteFile", ...args),
  getNoteFiles: (...args) => repoCall("getNoteFiles", ...args),
  deleteNoteFile: (...args) => repoCall("deleteNoteFile", ...args),
};