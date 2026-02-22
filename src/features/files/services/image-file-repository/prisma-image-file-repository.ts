import type {
  ImageFileCreateInput,
  ImageFileListFilters,
  ImageFileRecord,
  ImageFileRepository,
} from '@/shared/contracts/files';
import prisma from '@/shared/lib/db/prisma';

const toRecord = (imageFile: {
  id: string;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  width: number | null;
  height: number | null;
  tags: string[] | null;
  createdAt: Date;
  updatedAt: Date;
}): ImageFileRecord => ({
  id: imageFile.id,
  filename: imageFile.filename,
  filepath: imageFile.filepath,
  mimetype: imageFile.mimetype,
  size: imageFile.size,
  width: imageFile.width ?? null,
  height: imageFile.height ?? null,
  tags: imageFile.tags ?? [],
  createdAt: imageFile.createdAt.toISOString(),
  updatedAt: imageFile.updatedAt.toISOString(),
});

export const prismaImageFileRepository: ImageFileRepository = {
  async createImageFile(data: ImageFileCreateInput) {
    const imageFile = await prisma.imageFile.create({
      data: {
        filename: data.filename,
        filepath: data.filepath,
        mimetype: data.mimetype,
        size: data.size,
        width: data.width ?? null,
        height: data.height ?? null,
        tags: data.tags ?? [],
      },
    });
    return toRecord(imageFile);
  },

  async getImageFileById(id: string) {
    const imageFile = await prisma.imageFile.findUnique({ where: { id } });
    return imageFile ? toRecord(imageFile) : null;
  },

  async listImageFiles(filters?: ImageFileListFilters) {
    const filename = filters?.filename?.trim();
    const tags = (filters?.tags ?? []).filter(Boolean);
    const where: Record<string, unknown> = {};
    if (filename) {
      where['filename'] = { contains: filename, mode: 'insensitive' };
    }
    if (tags.length > 0) {
      where['tags'] = { hasSome: tags };
    }
    const files = await prisma.imageFile.findMany({ where });
    return files.map(toRecord);
  },

  async findImageFilesByIds(ids: string[]) {
    if (ids.length === 0) return [];
    const files = await prisma.imageFile.findMany({
      where: { id: { in: ids } },
    });
    return files.map(toRecord);
  },

  async updateImageFilePath(id: string, filepath: string) {
    const imageFile = await prisma.imageFile.update({
      where: { id },
      data: { filepath },
    });
    return imageFile ? toRecord(imageFile) : null;
  },

  async updateImageFileTags(id: string, tags: string[]) {
    const imageFile = await prisma.imageFile.update({
      where: { id },
      data: { tags },
    });
    return imageFile ? toRecord(imageFile) : null;
  },

  async updateImageFile(id: string, data: any) {
    const imageFile = await prisma.imageFile.update({
      where: { id },
      data,
    });
    return imageFile ? toRecord(imageFile) : null;
  },

  async deleteImageFile(id: string) {
    const imageFile = await prisma.imageFile.delete({ where: { id } });
    return imageFile ? toRecord(imageFile) : null;
  },
};
