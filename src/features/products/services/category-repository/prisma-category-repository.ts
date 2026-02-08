import { Prisma, ProductCategory as PrismaProductCategory } from '@prisma/client';

import type { 
  CategoryRepository, 
  CategoryFilters 
} from '@/features/products/types/services/category-repository';
import type { 
  CreateProductCategoryDto, 
  UpdateProductCategoryDto 
} from '@/shared/dtos';
import prisma from '@/shared/lib/db/prisma';
import type { 
  ProductCategory, 
  ProductCategoryWithChildren 
} from '@/shared/types/domain/products';

type PrismaCategoryWithChildren = PrismaProductCategory & {
  children?: PrismaCategoryWithChildren[];
};

const toCategoryDomain = (category: PrismaProductCategory): ProductCategory => ({
  id: category.id,
  name: category.name,
  description: category.description ?? null,
  color: category.color ?? null,
  parentId: category.parentId ?? null,
  catalogId: category.catalogId,
  createdAt: category.createdAt.toISOString(),
  updatedAt: category.updatedAt.toISOString(),
});

const toCategoryWithChildrenDomain = (category: PrismaCategoryWithChildren): ProductCategoryWithChildren => ({
  ...toCategoryDomain(category),
  children: Array.isArray(category.children) 
    ? category.children.map(toCategoryWithChildrenDomain) 
    : [],
});

export const prismaCategoryRepository: CategoryRepository = {
  async listCategories(filters: CategoryFilters): Promise<ProductCategory[]> {
    const where: Prisma.ProductCategoryWhereInput = {};
    if (filters.catalogId) {
      where.catalogId = filters.catalogId;
    }
    if (filters.parentId !== undefined) {
      where.parentId = filters.parentId;
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const categories = await prisma.productCategory.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    return categories.map(toCategoryDomain);
  },

  async getCategoryTree(catalogId?: string): Promise<ProductCategoryWithChildren[]> {
    const where: Prisma.ProductCategoryWhereInput = {
      parentId: null,
    };
    if (catalogId) {
      where.catalogId = catalogId;
    }

    const categories = await prisma.productCategory.findMany({
      where,
      include: {
        children: {
          include: {
            children: {
              include: {
                children: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    }) as PrismaCategoryWithChildren[];

    return categories.map(toCategoryWithChildrenDomain);
  },

  async getCategoryById(id: string): Promise<ProductCategory | null> {
    const category = await prisma.productCategory.findUnique({
      where: { id },
    });
    return category ? toCategoryDomain(category) : null;
  },

  async getCategoryWithChildren(id: string): Promise<ProductCategoryWithChildren | null> {
    const category = await prisma.productCategory.findUnique({
      where: { id },
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
    }) as PrismaCategoryWithChildren | null;
    return category ? toCategoryWithChildrenDomain(category) : null;
  },

  async createCategory(data: CreateProductCategoryDto): Promise<ProductCategory> {
    const category = await prisma.productCategory.create({
      data: {
        name: data.name,
        catalogId: data.catalogId,
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
    });
    return toCategoryDomain(category);
  },

  async updateCategory(id: string, data: UpdateProductCategoryDto): Promise<ProductCategory> {
    const category = await prisma.productCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.color !== undefined && { color: data.color }),
        ...(data.parentId !== undefined && { parentId: data.parentId }),
      },
    });
    return toCategoryDomain(category);
  },

  async deleteCategory(id: string): Promise<void> {
    await prisma.productCategory.delete({
      where: { id },
    });
  },

  async findByName(catalogId: string, name: string, parentId: string | null = null): Promise<ProductCategory | null> {
    const category = await prisma.productCategory.findFirst({
      where: {
        catalogId,
        name,
        parentId,
      },
    });
    return category ? toCategoryDomain(category) : null;
  },

  async isDescendant(categoryId: string, targetId: string): Promise<boolean> {
    if (categoryId === targetId) return true;

    const children = (await prisma.productCategory.findMany({
      where: { parentId: categoryId },
      select: { id: true },
    })) as Array<{ id: string }>;

    for (const child of children) {
      if (await this.isDescendant(child.id, targetId)) {
        return true;
      }
    }

    return false;
  },
};