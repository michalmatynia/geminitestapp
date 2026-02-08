import { Prisma, ProductParameter as PrismaProductParameter } from '@prisma/client';

import type { 
  ParameterRepository, 
  ParameterFilters 
} from '@/features/products/types/services/parameter-repository';
import prisma from '@/shared/lib/db/prisma';
import type { 
  ProductParameter 
} from '@/shared/types/domain/products';

const toParameterDomain = (param: PrismaProductParameter): ProductParameter => ({
  id: param.id,
  name_en: param.name_en,
  name_pl: param.name_pl ?? null,
  name_de: param.name_de ?? null,
  catalogId: param.catalogId,
  createdAt: param.createdAt.toISOString(),
  updatedAt: param.updatedAt.toISOString(),
});

export const prismaParameterRepository: ParameterRepository = {
  async listParameters(filters: ParameterFilters): Promise<ProductParameter[]> {
    const where: Prisma.ProductParameterWhereInput = {};
    if (filters.catalogId) where.catalogId = filters.catalogId;
    if (filters.search) {
      where.OR = [
        { name_en: { contains: filters.search, mode: 'insensitive' } },
        { name_pl: { contains: filters.search, mode: 'insensitive' } },
        { name_de: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const params = await prisma.productParameter.findMany({
      where,
      orderBy: { name_en: 'asc' },
    });

    return params.map(toParameterDomain);
  },

  async getParameterById(id: string): Promise<ProductParameter | null> {
    const param = await prisma.productParameter.findUnique({
      where: { id },
    });
    return param ? toParameterDomain(param) : null;
  },

  async createParameter(data: { name_en: string; name_pl?: string | null; name_de?: string | null; catalogId: string }): Promise<ProductParameter> {
    const param = await prisma.productParameter.create({
      data: {
        name_en: data.name_en,
        catalogId: data.catalogId,
        ...(data.name_pl !== undefined && { name_pl: data.name_pl }),
        ...(data.name_de !== undefined && { name_de: data.name_de }),
      },
    });
    return toParameterDomain(param);
  },

  async updateParameter(id: string, data: { name_en?: string; name_pl?: string | null; name_de?: string | null }): Promise<ProductParameter> {
    const param = await prisma.productParameter.update({
      where: { id },
      data: {
        ...(data.name_en !== undefined && { name_en: data.name_en }),
        ...(data.name_pl !== undefined && { name_pl: data.name_pl }),
        ...(data.name_de !== undefined && { name_de: data.name_de }),
      },
    });
    return toParameterDomain(param);
  },

  async deleteParameter(id: string): Promise<void> {
    await prisma.productParameter.delete({
      where: { id },
    });
  },

  async findByName(catalogId: string, name_en: string): Promise<ProductParameter | null> {
    const param = await prisma.productParameter.findUnique({
      where: {
        catalogId_name_en: {
          catalogId,
          name_en,
        },
      },
    });
    return param ? toParameterDomain(param) : null;
  },
};