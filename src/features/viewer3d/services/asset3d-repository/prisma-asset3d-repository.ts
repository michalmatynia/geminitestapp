
import type {
  Asset3DCreateInput,
  Asset3DListFilters,
  Asset3DRecord,
  Asset3DRepository,
  Asset3DUpdateInput,
} from '@/shared/contracts/viewer3d';
import prisma from '@/shared/lib/db/prisma';
import { Prisma } from '@/shared/lib/db/prisma-client';

type PrismaAsset3D = {
  id: string;
  name: string | null;
  description: string | null;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  tags: string[];
  category: string | null;
  metadata: Prisma.JsonValue;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const toRecord = (asset: PrismaAsset3D): Asset3DRecord => ({
  id: asset.id,
  name: asset.name ?? '',
  description: asset.description,
  filename: asset.filename,
  filepath: asset.filepath,
  mimetype: asset.mimetype,
  size: asset.size,
  fileUrl: '', // Will be updated by service if needed
  thumbnailUrl: null,
  fileSize: asset.size,
  format: asset.mimetype.split('/').pop() || '',
  tags: asset.tags,
  categoryId: asset.category,
  metadata: (asset.metadata as Record<string, unknown>) || {},
  isPublic: asset.isPublic,
  createdAt: asset.createdAt.toISOString(),
  updatedAt: asset.updatedAt ? asset.updatedAt.toISOString() : null,
});

export const prismaAsset3DRepository: Asset3DRepository = {
  async createAsset3D(data: Asset3DCreateInput): Promise<Asset3DRecord> {
    const asset = await prisma.asset3D.create({
      data: {
        name: data.name ?? null,
        description: data.description ?? null,
        filename: data.filename || 'unnamed',
        filepath: data.filepath || '',
        mimetype: data.mimetype || 'application/octet-stream',
        size: data.size || 0,
        tags: data.tags ?? [],
        category: data.categoryId ?? null,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        isPublic: data.isPublic ?? false,
      },
    });
    return toRecord(asset);
  },

  async createAsset(data: Asset3DCreateInput): Promise<Asset3DRecord> {
    return this.createAsset3D(data);
  },

  async getAsset3DById(id: string): Promise<Asset3DRecord | null> {
    const asset = await prisma.asset3D.findUnique({ where: { id } });
    return asset ? toRecord(asset) : null;
  },

  async getAssetById(id: string): Promise<Asset3DRecord | null> {
    return this.getAsset3DById(id);
  },

  async listAssets3D(filters?: Asset3DListFilters): Promise<Asset3DRecord[]> {
    const where: Prisma.Asset3DWhereInput = {};

    if (filters?.filename?.trim()) {
      where.filename = {
        contains: filters.filename.trim(),
        mode: 'insensitive',
      };
    }

    if (filters?.categoryId) {
      where.category = filters.categoryId;
    }

    if (filters?.isPublic !== undefined) {
      where.isPublic = filters.isPublic;
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    if (filters?.search?.trim()) {
      const searchTerm = filters.search.trim();
      where.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { filename: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    const assets = await prisma.asset3D.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    return assets.map(toRecord);
  },

  async listAssets(filters?: Asset3DListFilters): Promise<Asset3DRecord[]> {
    return this.listAssets3D(filters);
  },

  async updateAsset3D(id: string, data: Asset3DUpdateInput): Promise<Asset3DRecord | null> {
    try {
      const updateData: Prisma.Asset3DUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.categoryId !== undefined) updateData.category = data.categoryId;
      if (data.metadata !== undefined) {
        updateData.metadata = data.metadata
          ? (data.metadata as Prisma.InputJsonValue)
          : Prisma.JsonNull;
      }
      if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;

      const asset = await prisma.asset3D.update({
        where: { id },
        data: updateData,
      });
      return toRecord(asset);
    } catch {
      return null;
    }
  },

  async updateAsset(id: string, data: Asset3DUpdateInput): Promise<Asset3DRecord | null> {
    return this.updateAsset3D(id, data);
  },

  async deleteAsset3D(id: string): Promise<Asset3DRecord | null> {
    try {
      const asset = await prisma.asset3D.delete({ where: { id } });
      return toRecord(asset);
    } catch {
      return null;
    }
  },

  async deleteAsset(id: string): Promise<Asset3DRecord | null> {
    return this.deleteAsset3D(id);
  },

  async getCategories(): Promise<string[]> {
    const results = await prisma.asset3D.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    });
    return results
      .map((r: { category: string | null }) => r.category)
      .filter((c: string | null): c is string => c !== null);
  },

  async getTags(): Promise<string[]> {
    const assets = await prisma.asset3D.findMany({
      where: { tags: { isEmpty: false } },
      select: { tags: true },
    });
    const allTags = assets.flatMap((a: { tags: string[] }) => a.tags);
    return Array.from(new Set(allTags));
  },
};
