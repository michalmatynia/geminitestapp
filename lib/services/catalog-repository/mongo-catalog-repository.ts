import { randomUUID } from "crypto";
import type { WithId } from "mongodb";
import { getMongoDb } from "@/lib/db/mongo-client";
import type {
  CatalogCreateInput,
  CatalogRecord,
  CatalogRepository,
  CatalogUpdateInput,
} from "@/types/services/catalog-repository";

type CatalogDocument = {
  _id: string;
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  languageIds: string[];
};

const CATALOG_COLLECTION = "catalogs";

const toRecord = (doc: WithId<CatalogDocument>): CatalogRecord => ({
  id: doc.id ?? doc._id,
  name: doc.name,
  description: doc.description ?? null,
  isDefault: doc.isDefault,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
  languageIds: Array.isArray(doc.languageIds) ? doc.languageIds : [],
});

export const mongoCatalogRepository: CatalogRepository = {
  async listCatalogs() {
    const db = await getMongoDb();
    const docs = await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .find({})
      .sort({ createdAt: -1 })
      .toArray();
    return docs.map((doc) => toRecord({ ...doc, _id: doc._id }));
  },

  async getCatalogById(id: string) {
    const db = await getMongoDb();
    const doc = await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .findOne({ $or: [{ _id: id }, { id }] });
    return doc ? toRecord({ ...doc, _id: doc._id }) : null;
  },

  async createCatalog(input: CatalogCreateInput) {
    const db = await getMongoDb();
    if (input.isDefault) {
      await db
        .collection<CatalogDocument>(CATALOG_COLLECTION)
        .updateMany({}, { $set: { isDefault: false } });
    }
    const now = new Date();
    const id = randomUUID();
    const doc: CatalogDocument = {
      _id: id,
      id,
      name: input.name,
      description: input.description ?? null,
      isDefault: Boolean(input.isDefault),
      createdAt: now,
      updatedAt: now,
      languageIds: input.languageIds ?? [],
    };
    await db.collection<CatalogDocument>(CATALOG_COLLECTION).insertOne(doc);
    return toRecord(doc as WithId<CatalogDocument>);
  },

  async updateCatalog(id: string, input: CatalogUpdateInput) {
    const db = await getMongoDb();
    if (input.isDefault) {
      await db
        .collection<CatalogDocument>(CATALOG_COLLECTION)
        .updateMany({}, { $set: { isDefault: false } });
    }
    const updateDoc: Partial<CatalogDocument> = {
      ...(input.name !== undefined ? { name: input.name } : null),
      ...(input.description !== undefined
        ? { description: input.description ?? null }
        : null),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : null),
      ...(input.languageIds !== undefined
        ? { languageIds: input.languageIds }
        : null),
      updatedAt: new Date(),
    };
    const result = await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .findOneAndUpdate(
        { $or: [{ _id: id }, { id }] },
        { $set: updateDoc },
        { returnDocument: "after" }
      );
    return result ? toRecord({ ...result, _id: result._id }) : null;
  },

  async deleteCatalog(id: string) {
    const db = await getMongoDb();
    await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .deleteOne({ $or: [{ _id: id }, { id }] });
  },

  async getCatalogsByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const db = await getMongoDb();
    const docs = await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .find({ $or: [{ _id: { $in: ids } }, { id: { $in: ids } }] })
      .toArray();
    return docs.map((doc) => toRecord({ ...doc, _id: doc._id }));
  },

  async setDefaultCatalog(id: string) {
    const db = await getMongoDb();
    await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .updateMany({}, { $set: { isDefault: false } });
    await db
      .collection<CatalogDocument>(CATALOG_COLLECTION)
      .updateOne(
        { $or: [{ _id: id }, { id }] },
        { $set: { isDefault: true, updatedAt: new Date() } }
      );
  },
};
