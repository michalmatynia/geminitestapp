import type { NoteRepository } from "@/types/services/note-repository";
import type { NoteFilters, NoteWithRelations, NoteCreateInput, NoteUpdateInput, TagRecord, CategoryRecord, CategoryWithChildren, CategoryCreateInput, CategoryUpdateInput, TagCreateInput, TagUpdateInput } from "@/types/notes";
import { MongoClient, ObjectId } from "mongodb";

if (!process.env.MONGODB_URI) {
  throw new Error('Invalid/Missing environment variable: "MONGODB_URI"');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client: MongoClient;
let clientPromise: Promise<MongoClient>;

declare global {
  var _mongoClientPromise: Promise<MongoClient>;
}

if (process.env.NODE_ENV === "development") {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

async function getDb() {
  const client = await clientPromise;
  return client.db();
}

export const mongoNoteRepository: NoteRepository = {
  async getAll(filters: NoteFilters): Promise<NoteWithRelations[]> {
    const db = await getDb();
    const query: any = {};

    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: "i" } },
        { content: { $regex: filters.search, $options: "i" } },
      ];
    }

    if (filters.isPinned !== undefined) query.isPinned = filters.isPinned;
    if (filters.isArchived !== undefined) query.isArchived = filters.isArchived;

    // Tag/Category filtering simplified
    
    const notes = await db.collection("notes").find(query).sort({ updatedAt: -1 }).toArray();
    
    return notes.map((note: any) => ({
      ...note,
      id: note._id.toString(),
      createdAt: new Date(note.createdAt),
      updatedAt: new Date(note.updatedAt),
      tags: [],
      categories: [],
    }));
  },

  async getById(id: string): Promise<NoteWithRelations | null> {
    const db = await getDb();
    try {
        const note = await db.collection("notes").findOne({ _id: new ObjectId(id) });
        if (!note) return null;
        return {
            ...note,
            id: note._id.toString(),
            createdAt: new Date(note.createdAt),
            updatedAt: new Date(note.updatedAt),
            tags: [],
            categories: []
        } as any;
    } catch {
        return null;
    }
  },

  async create(data: NoteCreateInput): Promise<NoteWithRelations> {
    const db = await getDb();
    const now = new Date();
    const doc = {
        ...data,
        createdAt: now,
        updatedAt: now,
    };
    const result = await db.collection("notes").insertOne(doc);
    return {
        ...doc,
        id: result.insertedId.toString(),
        tags: [],
        categories: []
    } as any;
  },

  async update(id: string, data: NoteUpdateInput): Promise<NoteWithRelations | null> {
    const db = await getDb();
    try {
        const result = await db.collection("notes").findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: { ...data, updatedAt: new Date() } },
            { returnDocument: 'after' }
        );
        if (!result) return null;
        return {
            ...result,
            id: result._id.toString(),
            createdAt: new Date(result.createdAt),
            updatedAt: new Date(result.updatedAt),
            tags: [],
            categories: []
        } as any;
    } catch {
        return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    try {
        const result = await db.collection("notes").deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount === 1;
    } catch {
        return false;
    }
  },

  async getAllTags(): Promise<TagRecord[]> {
    const db = await getDb();
    const tags = await db.collection("tags").find().sort({ name: 1 }).toArray();
    return tags.map((t: any) => ({ ...t, id: t._id.toString() }));
  },

  async getTagById(id: string): Promise<TagRecord | null> {
    const db = await getDb();
    try {
      const tag = await db.collection("tags").findOne({ _id: new ObjectId(id) });
      if (!tag) return null;
      return { ...tag, id: tag._id.toString() } as any;
    } catch {
      return null;
    }
  },

  async createTag(data: TagCreateInput): Promise<TagRecord> {
    const db = await getDb();
    const result = await db.collection("tags").insertOne(data);
    return { ...data, id: result.insertedId.toString() } as any;
  },

  async updateTag(id: string, data: TagUpdateInput): Promise<TagRecord | null> {
    const db = await getDb();
    try {
      const result = await db.collection("tags").findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: data },
        { returnDocument: 'after' }
      );
      return result ? { ...result, id: result._id.toString() } as any : null;
    } catch {
      return null;
    }
  },

  async deleteTag(id: string): Promise<boolean> {
    const db = await getDb();
    try {
      const result = await db.collection("tags").deleteOne({ _id: new ObjectId(id) });
      return result.deletedCount === 1;
    } catch {
      return false;
    }
  },

  async getAllCategories(): Promise<CategoryRecord[]> {
    const db = await getDb();
    const categories = await db.collection("categories").find().sort({ name: 1 }).toArray();
    return categories.map((c: any) => ({ ...c, id: c._id.toString() }));
  },

  async getCategoryById(id: string): Promise<CategoryRecord | null> {
    const db = await getDb();
    try {
      const category = await db.collection("categories").findOne({ _id: new ObjectId(id) });
      if (!category) return null;
      return { ...category, id: category._id.toString() } as any;
    } catch {
      return null;
    }
  },

  async getCategoryTree(): Promise<CategoryWithChildren[]> {
    const db = await getDb();
    const categories = await db.collection("categories").find().sort({ name: 1 }).toArray();
    const notes = await db.collection("notes").find({}, { projection: { title: 1, categoryIds: 1 } }).toArray();
    
    const mappedCategories = categories.map((c: any) => ({ ...c, id: c._id.toString() }));
    const mappedNotes = notes.map((n: any) => ({ ...n, id: n._id.toString() }));

    const buildTree = (parentId: string | null): CategoryWithChildren[] => {
      return mappedCategories
        .filter((cat: any) => cat.parentId === parentId)
        .map((cat: any) => ({
          ...cat,
          notes: mappedNotes.filter((n: any) => n.categoryIds?.includes(cat.id)),
          children: buildTree(cat.id),
        }));
    };

    return buildTree(null);
  },

  async createCategory(data: CategoryCreateInput): Promise<CategoryRecord> {
    const db = await getDb();
    const result = await db.collection("categories").insertOne(data);
    return { ...data, id: result.insertedId.toString() } as any;
  },

  async updateCategory(id: string, data: CategoryUpdateInput): Promise<CategoryRecord | null> {
    const db = await getDb();
    try {
        const result = await db.collection("categories").findOneAndUpdate(
            { _id: new ObjectId(id) },
            { $set: data },
            { returnDocument: 'after' }
        );
        return result ? { ...result, id: result._id.toString() } as any : null;
    } catch {
        return null;
    }
  },

  async deleteCategory(id: string): Promise<boolean> {
    const db = await getDb();
    try {
        const result = await db.collection("categories").deleteOne({ _id: new ObjectId(id) });
        return result.deletedCount === 1;
    } catch {
        return false;
    }
  },
};
