import type { NoteRepository } from "@/types/services/note-repository";

// Switch between MongoDB and Prisma based on environment or configuration
const USE_MONGO = process.env.NOTE_DB_PROVIDER === "mongodb";

// Lazy load to avoid initializing Prisma when using MongoDB
let _noteService: NoteRepository | null = null;

async function getNoteService(): Promise<NoteRepository> {
  if (!_noteService) {
    if (USE_MONGO) {
      const { mongoNoteRepository } = await import("./note-repository/mongo-note-repository");
      _noteService = mongoNoteRepository;
    } else {
      const { prismaNoteRepository } = await import("./note-repository/prisma-note-repository");
      _noteService = prismaNoteRepository;
    }
  }
  
  if (!_noteService) {
    throw new Error("Failed to initialize note service");
  }

  return _noteService;
}

const callService = async <K extends keyof NoteRepository>(
  key: K,
  ...args: Parameters<NoteRepository[K]>
): Promise<Awaited<ReturnType<NoteRepository[K]>>> => {
  const service = await getNoteService();
  const fn = service[key] as (
    ...args: Parameters<NoteRepository[K]>
  ) => ReturnType<NoteRepository[K]>;
  return fn(...args) as Promise<Awaited<ReturnType<NoteRepository[K]>>>;
};

export const noteService: NoteRepository = {
  getAll: (...args) => callService("getAll", ...args) as any,
  getById: (...args) => callService("getById", ...args) as any,
  create: (...args) => callService("create", ...args) as any,
  update: (...args) => callService("update", ...args) as any,
  delete: (...args) => callService("delete", ...args) as any,
  getAllTags: (...args) => callService("getAllTags", ...args) as any,
  getTagById: (...args) => callService("getTagById", ...args) as any,
  createTag: (...args) => callService("createTag", ...args) as any,
  updateTag: (...args) => callService("updateTag", ...args) as any,
  deleteTag: (...args) => callService("deleteTag", ...args) as any,
  getAllCategories: (...args) => callService("getAllCategories", ...args) as any,
  getCategoryById: (...args) => callService("getCategoryById", ...args) as any,
  getCategoryTree: (...args) => callService("getCategoryTree", ...args) as any,
  createCategory: (...args) => callService("createCategory", ...args) as any,
  updateCategory: (...args) => callService("updateCategory", ...args) as any,
  deleteCategory: (...args) => callService("deleteCategory", ...args) as any,
  getAllNotebooks: (...args) => callService("getAllNotebooks", ...args) as any,
  getNotebookById: (...args) => callService("getNotebookById", ...args) as any,
  createNotebook: (...args) => callService("createNotebook", ...args) as any,
  updateNotebook: (...args) => callService("updateNotebook", ...args) as any,
  deleteNotebook: (...args) => callService("deleteNotebook", ...args) as any,
  getOrCreateDefaultNotebook: (...args) => callService("getOrCreateDefaultNotebook", ...args) as any,
  getAllThemes: (...args) => callService("getAllThemes", ...args) as any,
  getThemeById: (...args) => callService("getThemeById", ...args) as any,
  createTheme: (...args) => callService("createTheme", ...args) as any,
  updateTheme: (...args) => callService("updateTheme", ...args) as any,
  deleteTheme: (...args) => callService("deleteTheme", ...args) as any,
  createNoteFile: (...args) => callService("createNoteFile", ...args) as any,
  getNoteFiles: (...args) => callService("getNoteFiles", ...args) as any,
  deleteNoteFile: (...args) => callService("deleteNoteFile", ...args) as any,
};
