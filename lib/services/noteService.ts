import type { NoteRepository } from "@/types/services/note-repository";

// Switch between MongoDB and Prisma based on environment or configuration
const USE_MONGO = process.env.NOTE_DB_PROVIDER === "mongodb";

// Lazy load to avoid initializing Prisma when using MongoDB
let _noteService: NoteRepository | null = null;

function getNoteService(): NoteRepository {
  if (!_noteService) {
    if (USE_MONGO) {
      const { mongoNoteRepository } = require("./note-repository/mongo-note-repository");
      _noteService = mongoNoteRepository;
    } else {
      const { prismaNoteRepository } = require("./note-repository/prisma-note-repository");
      _noteService = prismaNoteRepository;
    }
  }
  return _noteService;
}

export const noteService: NoteRepository = new Proxy({} as NoteRepository, {
  get(target, prop) {
    const service = getNoteService();
    const value = service[prop as keyof NoteRepository];
    return typeof value === 'function' ? value.bind(service) : value;
  }
});
