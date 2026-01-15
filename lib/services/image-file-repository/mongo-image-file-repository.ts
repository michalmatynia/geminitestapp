import { randomUUID } from "crypto";
import type { WithId } from "mongodb";
import { getMongoDb } from "@/lib/db/mongo-client";
import type {
  ImageFileCreateInput,
  ImageFileListFilters,
  ImageFileRecord,
  ImageFileRepository,
} from "@/types/services/image-file-repository";

type ImageFileDocument = {
  _id: string;
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
  updatedAt: Date;
};

const IMAGE_FILE_COLLECTION = "image_files";

const toRecord = (doc: WithId<ImageFileDocument>): ImageFileRecord => ({
  id: doc.id ?? doc._id,
  filename: doc.filename,
  filepath: doc.filepath,
  mimetype: doc.mimetype,
  size: doc.size,
  width: doc.width ?? null,
  height: doc.height ?? null,
  createdAt: doc.createdAt,
  updatedAt: doc.updatedAt,
});

export const mongoImageFileRepository: ImageFileRepository = {
  async createImageFile(data: ImageFileCreateInput) {
    const db = await getMongoDb();
    const now = new Date();
    const id = randomUUID();
    const doc: ImageFileDocument = {
      _id: id,
      id,
      filename: data.filename,
      filepath: data.filepath,
      mimetype: data.mimetype,
      size: data.size,
      width: data.width ?? null,
      height: data.height ?? null,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection<ImageFileDocument>(IMAGE_FILE_COLLECTION).insertOne(doc);
    return toRecord(doc as WithId<ImageFileDocument>);
  },

  async getImageFileById(id: string) {
    const db = await getMongoDb();
    const doc = await db
      .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
      .findOne({ $or: [{ _id: id }, { id }] });
    return doc ? toRecord({ ...doc, _id: doc._id }) : null;
  },

  async listImageFiles(filters?: ImageFileListFilters) {
    const db = await getMongoDb();
    const filename = filters?.filename?.trim();
    const query = filename
      ? { filename: { $regex: filename, $options: "i" } }
      : {};
    const docs = await db
      .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
      .find(query)
      .toArray();
    return docs.map((doc) => toRecord({ ...doc, _id: doc._id }));
  },

  async findImageFilesByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const db = await getMongoDb();
    const docs = await db
      .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
      .find({ $or: [{ _id: { $in: ids } }, { id: { $in: ids } }] })
      .toArray();
    return docs.map((doc) => toRecord({ ...doc, _id: doc._id }));
  },

  async updateImageFilePath(id: string, filepath: string) {
    const db = await getMongoDb();
    const result = await db
      .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
      .findOneAndUpdate(
        { $or: [{ _id: id }, { id }] },
        { $set: { filepath, updatedAt: new Date() } },
        { returnDocument: "after" }
      );
    if (!result) return null;
    return toRecord({ ...result, _id: result._id });
  },

  async deleteImageFile(id: string) {
    const db = await getMongoDb();
    const result = await db
      .collection<ImageFileDocument>(IMAGE_FILE_COLLECTION)
      .findOneAndDelete({ $or: [{ _id: id }, { id }] });
    if (!result) return null;
    return toRecord({ ...result, _id: result._id });
  },
};
