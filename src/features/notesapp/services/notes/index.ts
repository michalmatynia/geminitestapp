import "server-only";

import type { NoteRepository } from "@/features/notesapp/services/notes/types/note-repository";
import type { NoteWithRelations, RelatedNote } from "@/shared/types/notes";
import { cleanupNoteFile } from "./file-cleanup";
import { getAppDbProvider } from "@/shared/lib/db/app-db-provider";
import { configurationError } from "@/shared/errors/app-error";

// Lazy load to avoid initializing Prisma when using MongoDB
let _repository: NoteRepository | null = null;

const resolveNoteProvider = async (): Promise<"mongodb" | "prisma"> =>
  getAppDbProvider();

async function getRepository(): Promise<NoteRepository> {
  if (!_repository) {
    const provider = await resolveNoteProvider();
    if (provider === "mongodb") {
      const { mongoNoteRepository } = await import("./note-repository/mongo-note-repository");
      _repository = mongoNoteRepository;
    } else {
      const { prismaNoteRepository } = await import("./note-repository/prisma-note-repository");
      _repository = prismaNoteRepository;
    }
  }
  
  if (!_repository) {
    throw configurationError("Failed to initialize note repository");
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
    ...(note.relationsFrom ?? []).map((rel: { targetNote: RelatedNote }) => rel.targetNote),
    ...(note.relationsTo ?? []).map((rel: { sourceNote: RelatedNote }) => rel.sourceNote),
  ];
  const seen = new Set<string>();
  return relations.filter((rel: RelatedNote | null) => {
    if (!rel?.id || seen.has(rel.id)) return false;
    seen.add(rel.id);
    return true;
  });
};

// Helper: Populate relations on a note or list of notes
const populateRelations = <T extends NoteWithRelations | NoteWithRelations[] | null>(data: T): T => {
  if (!data) return data;
  if (Array.isArray(data)) {
    const notes = data as NoteWithRelations[];
    const result = notes.map((note: NoteWithRelations) => ({
      ...note,
      relations: buildRelations(note),
    }));
    return result as any;
  }
  const note = data as NoteWithRelations;
  const result = {
    ...note,
    relations: buildRelations(note),
  };
  return result as any;
};

export const noteService: NoteRepository = {
  // Enhanced Methods with Business Logic

  getAll: async (...args: Parameters<NoteRepository["getAll"]>): Promise<NoteWithRelations[]> => {
    const notes = await repoCall("getAll", ...args);
    return populateRelations(notes);
  },

  getById: async (...args: Parameters<NoteRepository["getById"]>): Promise<NoteWithRelations | null> => {
    const note = await repoCall("getById", ...args);
    return populateRelations(note);
  },

  create: async (...args: Parameters<NoteRepository["create"]>): Promise<NoteWithRelations> => {
    const note = await repoCall("create", ...args);
    return populateRelations(note);
  },

  update: async (id: string, data: Parameters<NoteRepository["update"]>[1]): Promise<NoteWithRelations> => {
    const previousNote = await repoCall("getById", id);
    const note = await repoCall("update", id, data);

    // Sync Relations
    if (Array.isArray(data.relatedNoteIds) && previousNote) {
      const previousRelatedIds =
        previousNote.relationsFrom?.map((rel: { targetNote: RelatedNote }) => rel.targetNote.id) || [];
      const nextRelatedIds = data.relatedNoteIds;
      const addedRelations = nextRelatedIds.filter(
        (relId: string) => !previousRelatedIds.includes(relId) && relId !== id
      );
      const removedRelations = previousRelatedIds.filter(
        (relId: string) => !nextRelatedIds.includes(relId) && relId !== id
      );

      const syncRelatedNote = async (relatedId: string, shouldAdd: boolean): Promise<void> => {
        try {
          const relatedNote = await repoCall("getById", relatedId);
          if (!relatedNote) return;
          
          const currentIds =
            relatedNote.relationsFrom?.map((rel: { targetNote: RelatedNote }) => rel.targetNote.id) || [];
          
          let nextIds: string[];
          if (shouldAdd) {
             nextIds = Array.from(new Set([...currentIds, id]));
          } else {
             nextIds = currentIds.filter((relId: string) => relId !== id);
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
        ...addedRelations.map((relId: string) => syncRelatedNote(relId, true)),
        ...removedRelations.map((relId: string) => syncRelatedNote(relId, false)),
      ]);
    }

    return populateRelations(note);
  },

  delete: async (id: string): Promise<boolean> => {
    try {
        const files = await repoCall("getNoteFiles", id);
        await Promise.all(
            files.map((file: { filepath: string }) => cleanupNoteFile(id, file.filepath))
        );
    } catch (error) {
        console.error("[noteService][delete] Failed to cleanup files", error);
    }
    return repoCall("delete", id);
  },

  // Pass-through methods
  getAllTags: (...args: Parameters<NoteRepository["getAllTags"]>) => repoCall("getAllTags", ...args),
  getTagById: (...args: Parameters<NoteRepository["getTagById"]>) => repoCall("getTagById", ...args),
  createTag: (...args: Parameters<NoteRepository["createTag"]>) => repoCall("createTag", ...args),
  updateTag: (...args: Parameters<NoteRepository["updateTag"]>) => repoCall("updateTag", ...args),
  deleteTag: (...args: Parameters<NoteRepository["deleteTag"]>) => repoCall("deleteTag", ...args),
  getAllCategories: (...args: Parameters<NoteRepository["getAllCategories"]>) => repoCall("getAllCategories", ...args),
  getCategoryById: (...args: Parameters<NoteRepository["getCategoryById"]>) => repoCall("getCategoryById", ...args),
  getCategoryTree: (...args: Parameters<NoteRepository["getCategoryTree"]>) => repoCall("getCategoryTree", ...args),
  createCategory: (...args: Parameters<NoteRepository["createCategory"]>) => repoCall("createCategory", ...args),
  updateCategory: (...args: Parameters<NoteRepository["updateCategory"]>) => repoCall("updateCategory", ...args),
  deleteCategory: (...args: Parameters<NoteRepository["deleteCategory"]>) => repoCall("deleteCategory", ...args),
  getAllNotebooks: (...args: Parameters<NoteRepository["getAllNotebooks"]>) => repoCall("getAllNotebooks", ...args),
  getNotebookById: (...args: Parameters<NoteRepository["getNotebookById"]>) => repoCall("getNotebookById", ...args),
  createNotebook: (...args: Parameters<NoteRepository["createNotebook"]>) => repoCall("createNotebook", ...args),
  updateNotebook: (...args: Parameters<NoteRepository["updateNotebook"]>) => repoCall("updateNotebook", ...args),
  deleteNotebook: (...args: Parameters<NoteRepository["deleteNotebook"]>) => repoCall("deleteNotebook", ...args),
  getOrCreateDefaultNotebook: (...args: Parameters<NoteRepository["getOrCreateDefaultNotebook"]>) => repoCall("getOrCreateDefaultNotebook", ...args),
  getAllThemes: (...args: Parameters<NoteRepository["getAllThemes"]>) => repoCall("getAllThemes", ...args),
  getThemeById: (...args: Parameters<NoteRepository["getThemeById"]>) => repoCall("getThemeById", ...args),
  createTheme: (...args: Parameters<NoteRepository["createTheme"]>) => repoCall("createTheme", ...args),
  updateTheme: (...args: Parameters<NoteRepository["updateTheme"]>) => repoCall("updateTheme", ...args),
  deleteTheme: (...args: Parameters<NoteRepository["deleteTheme"]>) => repoCall("deleteTheme", ...args),
  createNoteFile: (...args: Parameters<NoteRepository["createNoteFile"]>) => repoCall("createNoteFile", ...args),
  getNoteFiles: (...args: Parameters<NoteRepository["getNoteFiles"]>) => repoCall("getNoteFiles", ...args),
  deleteNoteFile: (...args: Parameters<NoteRepository["deleteNoteFile"]>) => repoCall("deleteNoteFile", ...args),
};
