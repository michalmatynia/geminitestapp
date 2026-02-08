import { Prisma, ProductTag as PrismaProductTag } from '@prisma/client';

import type { 
  TagRepository, 
  TagFilters 
} from '@/features/products/types/services/tag-repository';
import prisma from '@/shared/lib/db/prisma';
import type { 
  ProductTag 
} from '@/shared/types/domain/products';

const toTagDomain = (tag: PrismaProductTag): ProductTag => ({
  id: tag.id,
  name: tag.name,
  color: tag.color ?? null,
  catalogId: tag.catalogId,
  createdAt: tag.createdAt.toISOString(),
  updatedAt: tag.updatedAt.toISOString(),
});

export const prismaTagRepository: TagRepository = {
  async listTags(filters: TagFilters): Promise<ProductTag[]> {
    const where: Prisma.ProductTagWhereInput = {};
    if (filters.catalogId) where.catalogId = filters.catalogId;
    if (filters.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    const tags = await prisma.productTag.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return tags.map(toTagDomain);
  },

  async getTagById(id: string): Promise<ProductTag | null> {
    const tag = await prisma.productTag.findUnique({
      where: { id },
    });
    return tag ? toTagDomain(tag) : null;
  },

  async createTag(data: { name: string; color?: string | null; catalogId: string }): Promise<ProductTag> {
    const tag = await prisma.productTag.create({
      data: {
        name: data.name,
        catalogId: data.catalogId,
        ...(data.color !== undefined && { color: data.color }),
      },
    });
    return toTagDomain(tag);
  },

  async updateTag(id: string, data: { name?: string; color?: string | null }): Promise<ProductTag> {
    const tag = await prisma.productTag.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.color !== undefined && { color: data.color }),
      },
    });
    return toTagDomain(tag);
  },

  async deleteTag(id: string): Promise<void> {
    await prisma.productTag.delete({
      where: { id },
    });
  },

  async findByName(catalogId: string, name: string): Promise<ProductTag | null> {
    const tag = await prisma.productTag.findFirst({
      where: {
        catalogId,
        name,
      },
    });
    return tag ? toTagDomain(tag) : null;
  },
};