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

export const noteService: NoteRepository = new Proxy({} as NoteRepository, {
  get(target, prop) {
    return async (...args: any[]) => {
      const service = await getNoteService();
      const value = service[prop as keyof NoteRepository];
      if (typeof value === 'function') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return (value as (...args: any[]) => Promise<any>).apply(service, args);
      }
      return value;
    };
  }
});