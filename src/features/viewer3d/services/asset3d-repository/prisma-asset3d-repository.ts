import prisma from "@/shared/lib/db/prisma";
import { Prisma } from "@prisma/client";
import type {
  Asset3DCreateInput,
  Asset3DListFilters,
  Asset3DRecord,
  Asset3DRepository,
  Asset3DUpdateInput,
} from "@/features/viewer3d/types";

const toRecord = (asset: {
  id: string;
  name: string | null;
  description: string | null;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  tags: string[];
  category: string | null;
  metadata: unknown;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}): Asset3DRecord => ({
  id: asset.id,
  name: asset.name,
  description: asset.description,
  filename: asset.filename,
  filepath: asset.filepath,
  mimetype: asset.mimetype,
  size: asset.size,
  tags: asset.tags,
  category: asset.category,
  metadata: asset.metadata as Record<string, unknown> | null,
  isPublic: asset.isPublic,
  createdAt: asset.createdAt,
  updatedAt: asset.updatedAt,
});

export const prismaAsset3DRepository: Asset3DRepository = {
  async createAsset3D(data: Asset3DCreateInput) {
    const asset = await prisma.asset3D.create({
      data: {
        name: data.name ?? null,
        description: data.description ?? null,
        filename: data.filename,
        filepath: data.filepath,
        mimetype: data.mimetype,
        size: data.size,
        tags: data.tags ?? [],
        category: data.category ?? null,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        isPublic: data.isPublic ?? false,
      },
    });
    return toRecord(asset);
  },

  async getAsset3DById(id: string) {
    const asset = await prisma.asset3D.findUnique({ where: { id } });
    return asset ? toRecord(asset) : null;
  },

  async listAssets3D(filters?: Asset3DListFilters) {
    const where: Prisma.Asset3DWhereInput = {};

    if (filters?.filename?.trim()) {
      where.filename = {
        contains: filters.filename.trim(),
        mode: "insensitive",
      };
    }

    if (filters?.category) {
      where.category = filters.category;
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
        { name: { contains: searchTerm, mode: "insensitive" } },
        { description: { contains: searchTerm, mode: "insensitive" } },
        { filename: { contains: searchTerm, mode: "insensitive" } },
      ];
    }

    const assets = await prisma.asset3D.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
    return assets.map(toRecord);
  },

  async updateAsset3D(id: string, data: Asset3DUpdateInput) {
    try {
      const updateData: Prisma.Asset3DUpdateInput = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.metadata !== undefined) {
        updateData.metadata = data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull;
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

  async deleteAsset3D(id: string) {
    try {
      const asset = await prisma.asset3D.delete({ where: { id } });
      return toRecord(asset);
    } catch {
      return null;
    }
  },

  async getCategories() {
    const results = await prisma.asset3D.findMany({
      where: { category: { not: null } },
      select: { category: true },
      distinct: ["category"],
    });
    return results
      .map((r: { category: string | null }) => r.category)
      .filter((c: string | null): c is string => c !== null);
  },

  async getTags() {
    const assets = await prisma.asset3D.findMany({
      where: { tags: { isEmpty: false } },
      select: { tags: true },
    });
    const allTags = assets.flatMap((a: { tags: string[] }) => a.tags);
    return [...new Set(allTags)];
  },
};
