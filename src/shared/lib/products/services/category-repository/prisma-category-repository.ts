import { Prisma, ProductCategory as PrismaProductCategory } from '@prisma/client';

import type { CategoryRepository, CategoryFilters } from '@/shared/contracts/products';
import type {
  CreateProductCategoryDto,
  UpdateProductCategoryDto,
} from '@/shared/contracts/products';
import type { ProductCategory, ProductCategoryWithChildren } from '@/shared/contracts/products';
import { notFoundError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';

type PrismaCategoryWithChildren = PrismaProductCategory & {
  children?: PrismaCategoryWithChildren[];
};

const compareBySortIndexThenName = (
  a: { sortIndex: number | null; name: string },
  b: { sortIndex: number | null; name: string }
): number => {
  const aIndex = a.sortIndex ?? 0;
  const bIndex = b.sortIndex ?? 0;
  if (aIndex !== bIndex) return aIndex - bIndex;
  return a.name.localeCompare(b.name);
};

const normalizeSiblingOrder = async (
  tx: Prisma.TransactionClient,
  catalogId: string,
  parentId: string | null
): Promise<void> => {
  const siblings = await tx.productCategory.findMany({
    where: { catalogId, parentId },
    orderBy: [{ sortIndex: 'asc' }, { name: 'asc' }],
    select: { id: true, sortIndex: true },
  });

  for (let index = 0; index < siblings.length; index += 1) {
    const sibling = siblings[index];
    if (!sibling || sibling.sortIndex === index) continue;
    await tx.productCategory.update({
      where: { id: sibling.id },
      data: { sortIndex: index },
    });
  }
};

const reorderSiblingsForCategory = async (
  tx: Prisma.TransactionClient,
  categoryId: string,
  catalogId: string,
  parentId: string | null,
  targetIndex?: number
): Promise<void> => {
  const siblings = await tx.productCategory.findMany({
    where: { catalogId, parentId },
    orderBy: [{ sortIndex: 'asc' }, { name: 'asc' }],
    select: { id: true },
  });

  const ids = siblings
    .map((entry: { id: string }): string => entry.id)
    .filter((id: string): boolean => id !== categoryId);

  if (targetIndex === undefined) {
    ids.push(categoryId);
  } else {
    const clampedIndex = Math.max(0, Math.min(targetIndex, ids.length));
    ids.splice(clampedIndex, 0, categoryId);
  }

  for (let index = 0; index < ids.length; index += 1) {
    const siblingId = ids[index];
    if (!siblingId) continue;
    await tx.productCategory.update({
      where: { id: siblingId },
      data: { sortIndex: index },
    });
  }
};

const toOptionalTrimmedString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toCategoryDomain = (category: PrismaProductCategory): ProductCategory => ({
  // Prisma category storage is currently EN-only; keep localized keys populated for UI fallback logic.
  name_en: toOptionalTrimmedString(category.name),
  name_pl: null,
  name_de: null,
  id: category.id,
  name: toOptionalTrimmedString(category.name) ?? category.name,
  description: category.description ?? null,
  color: category.color ?? null,
  parentId: category.parentId ?? null,
  catalogId: category.catalogId,
  sortIndex: category.sortIndex,
  createdAt: category.createdAt.toISOString(),
  updatedAt: category.updatedAt.toISOString(),
});

const toCategoryWithChildrenDomain = (
  category: PrismaCategoryWithChildren
): ProductCategoryWithChildren => ({
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
      orderBy: [{ sortIndex: 'asc' }, { name: 'asc' }],
    });

    return categories.map(toCategoryDomain);
  },

  async getCategoryTree(catalogId?: string): Promise<ProductCategoryWithChildren[]> {
    const categories = await prisma.productCategory.findMany({
      ...(catalogId ? { where: { catalogId } } : {}),
      orderBy: [{ sortIndex: 'asc' }, { name: 'asc' }],
    });

    const byId = new Map<string, ProductCategoryWithChildren>();
    categories.forEach((category: PrismaProductCategory): void => {
      byId.set(category.id, { ...toCategoryDomain(category), children: [] });
    });

    const roots: ProductCategoryWithChildren[] = [];
    byId.forEach((category: ProductCategoryWithChildren): void => {
      if (category.parentId && byId.has(category.parentId)) {
        byId.get(category.parentId)!.children.push(category);
      } else {
        roots.push(category);
      }
    });

    const sortTree = (nodes: ProductCategoryWithChildren[]): ProductCategoryWithChildren[] =>
      nodes
        .sort((a: ProductCategoryWithChildren, b: ProductCategoryWithChildren): number =>
          compareBySortIndexThenName(
            { sortIndex: a.sortIndex ?? 0, name: a.name },
            { sortIndex: b.sortIndex ?? 0, name: b.name }
          )
        )
        .map(
          (node: ProductCategoryWithChildren): ProductCategoryWithChildren => ({
            ...node,
            children: sortTree(node.children),
          })
        );

    return sortTree(roots);
  },

  async getCategoryById(id: string): Promise<ProductCategory | null> {
    const category = await prisma.productCategory.findUnique({
      where: { id },
    });
    return category ? toCategoryDomain(category) : null;
  },

  async getCategoryWithChildren(id: string): Promise<ProductCategoryWithChildren | null> {
    const category = (await prisma.productCategory.findUnique({
      where: { id },
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
    })) as PrismaCategoryWithChildren | null;
    return category ? toCategoryWithChildrenDomain(category) : null;
  },

  async createCategory(data: CreateProductCategoryDto): Promise<ProductCategory> {
    const parentId = data.parentId ?? null;
    return prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<ProductCategory> => {
      const category = await tx.productCategory.create({
        data: {
          name: data.name,
          catalogId: data.catalogId,
          parentId,
          ...(data.description !== undefined && { description: data.description }),
          ...(data.color !== undefined && { color: data.color }),
          sortIndex: data.sortIndex ?? 0,
        },
      });

      await reorderSiblingsForCategory(
        tx,
        category.id,
        category.catalogId,
        category.parentId ?? null,
        data.sortIndex ?? undefined
      );
      return toCategoryDomain(category);
    });
  },

  async updateCategory(id: string, data: UpdateProductCategoryDto): Promise<ProductCategory> {
    return prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<ProductCategory> => {
      const current = await tx.productCategory.findUnique({
        where: { id },
        select: { id: true, catalogId: true, parentId: true },
      });
      if (!current) {
        throw notFoundError('Category not found', { categoryId: id });
      }

      const nextCatalogId = data.catalogId ?? current.catalogId;
      const nextParentId = data.parentId !== undefined ? data.parentId : (current.parentId ?? null);
      const movedBucket =
        nextCatalogId !== current.catalogId || nextParentId !== (current.parentId ?? null);

      const category = await tx.productCategory.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.color !== undefined && { color: data.color }),
          ...(data.parentId !== undefined && data.parentId !== null && { parentId: data.parentId }),
          ...(data.catalogId !== undefined && { catalogId: data.catalogId }),
          ...(data.sortIndex !== undefined && data.sortIndex !== null
            ? { sortIndex: data.sortIndex }
            : {}),
        },
      });

      if (movedBucket) {
        await normalizeSiblingOrder(tx, current.catalogId, current.parentId ?? null);
      }

      if (data.sortIndex !== undefined || movedBucket) {
        await reorderSiblingsForCategory(
          tx,
          category.id,
          nextCatalogId,
          nextParentId,
          data.sortIndex ?? undefined
        );
      }

      return toCategoryDomain(category);
    });
  },

  async deleteCategory(id: string): Promise<void> {
    await prisma.$transaction(async (tx: Prisma.TransactionClient): Promise<void> => {
      const current = await tx.productCategory.findUnique({
        where: { id },
        select: { catalogId: true, parentId: true },
      });
      if (!current) return;

      await tx.productCategory.delete({
        where: { id },
      });

      await normalizeSiblingOrder(tx, current.catalogId, current.parentId ?? null);
    });
  },

  async findByName(
    catalogId: string,
    name: string,
    parentId: string | null = null
  ): Promise<ProductCategory | null> {
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
