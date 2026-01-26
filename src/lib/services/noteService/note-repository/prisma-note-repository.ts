import type { NoteRepository } from "@/types/services/note-repository";
import * as notebookImpl from "./prisma/notebook-impl";
import * as noteImpl from "./prisma/note-impl";
import * as tagImpl from "./prisma/tag-impl";
import * as categoryImpl from "./prisma/category-impl";
import * as themeImpl from "./prisma/theme-impl";
import * as fileImpl from "./prisma/file-impl";

export const prismaNoteRepository: NoteRepository = {
  // Notebooks
  getOrCreateDefaultNotebook: notebookImpl.getOrCreateDefaultNotebook,
  getAllNotebooks: notebookImpl.getAllNotebooks,
  getNotebookById: notebookImpl.getNotebookById,
  createNotebook: notebookImpl.createNotebook,
  updateNotebook: notebookImpl.updateNotebook,
  deleteNotebook: notebookImpl.deleteNotebook,

  // Notes
  getAll: noteImpl.getAll,
  getById: noteImpl.getById,
  create: noteImpl.create,
  update: noteImpl.update,
  delete: noteImpl.deleteNote,

  // Tags
  getAllTags: tagImpl.getAllTags,
  getTagById: tagImpl.getTagById,
  createTag: tagImpl.createTag,
  updateTag: tagImpl.updateTag,
  deleteTag: tagImpl.deleteTag,

  // Categories
  getAllCategories: categoryImpl.getAllCategories,
  getCategoryById: categoryImpl.getCategoryById,
  getCategoryTree: categoryImpl.getCategoryTree,
  createCategory: categoryImpl.createCategory,
  updateCategory: categoryImpl.updateCategory,
  deleteCategory: categoryImpl.deleteCategory,

  // Themes
  getAllThemes: themeImpl.getAllThemes,
  getThemeById: themeImpl.getThemeById,
  createTheme: themeImpl.createTheme,
  updateTheme: themeImpl.updateTheme,
  deleteTheme: themeImpl.deleteTheme,

  // Files
  createNoteFile: fileImpl.createNoteFile,
  getNoteFiles: fileImpl.getNoteFiles,
  deleteNoteFile: fileImpl.deleteNoteFile,
};
