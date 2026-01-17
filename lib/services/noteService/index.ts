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

const callService = <K extends keyof NoteRepository>(
  key: K,
  ...args: Parameters<NoteRepository[K]>
): ReturnType<NoteRepository[K]> => {
  return getNoteService().then((service) => {
    const fn = service[key] as (
      ...args: Parameters<NoteRepository[K]>
    ) => ReturnType<NoteRepository[K]>;
    return fn(...args);
  }) as ReturnType<NoteRepository[K]>;
};

export const noteService: NoteRepository = {
  getAll: (...args) => callService("getAll", ...args),
  getById: (...args) => callService("getById", ...args),
  create: (...args) => callService("create", ...args),
  update: (...args) => callService("update", ...args),
  delete: (...args) => callService("delete", ...args),
  getAllTags: (...args) => callService("getAllTags", ...args),
  getTagById: (...args) => callService("getTagById", ...args),
  createTag: (...args) => callService("createTag", ...args),
  updateTag: (...args) => callService("updateTag", ...args),
  deleteTag: (...args) => callService("deleteTag", ...args),
  getAllCategories: (...args) => callService("getAllCategories", ...args),
  getCategoryById: (...args) => callService("getCategoryById", ...args),
  getCategoryTree: (...args) => callService("getCategoryTree", ...args),
  createCategory: (...args) => callService("createCategory", ...args),
  updateCategory: (...args) => callService("updateCategory", ...args),
  deleteCategory: (...args) => callService("deleteCategory", ...args),
  getAllNotebooks: (...args) => callService("getAllNotebooks", ...args),
  getNotebookById: (...args) => callService("getNotebookById", ...args),
  createNotebook: (...args) => callService("createNotebook", ...args),
  updateNotebook: (...args) => callService("updateNotebook", ...args),
  deleteNotebook: (...args) => callService("deleteNotebook", ...args),
  getOrCreateDefaultNotebook: (...args) => callService("getOrCreateDefaultNotebook", ...args),
  getAllThemes: (...args) => callService("getAllThemes", ...args),
  getThemeById: (...args) => callService("getThemeById", ...args),
  createTheme: (...args) => callService("createTheme", ...args),
  updateTheme: (...args) => callService("updateTheme", ...args),
  deleteTheme: (...args) => callService("deleteTheme", ...args),
  createNoteFile: (...args) => callService("createNoteFile", ...args),
  getNoteFiles: (...args) => callService("getNoteFiles", ...args),
  deleteNoteFile: (...args) => callService("deleteNoteFile", ...args),
};
