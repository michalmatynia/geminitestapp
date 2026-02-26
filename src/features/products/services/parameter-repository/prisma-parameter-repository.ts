import { Prisma, ProductParameter as PrismaProductParameter } from '@prisma/client';

import type { 
  ParameterRepository, 
  ParameterFilters,
  ParameterCreateInput,
  ParameterUpdateInput,
} from '@/shared/contracts/products';
import type { 
  ProductParameter 
} from '@/shared/contracts/products';
import prisma from '@/shared/lib/db/prisma';

const ALLOWED_SELECTOR_TYPES = new Set<ProductParameter['selectorType']>([
  'text',
  'textarea',
  'radio',
  'select',
  'dropdown',
  'checkbox',
  'checklist',
]);

const normalizeSelectorType = (value: unknown): ProductParameter['selectorType'] => {
  if (typeof value !== 'string') return 'text';
  const normalized = value.trim().toLowerCase();
  return ALLOWED_SELECTOR_TYPES.has(normalized as ProductParameter['selectorType'])
    ? (normalized as ProductParameter['selectorType'])
    : 'text';
};

const normalizeOptionLabels = (input: unknown): string[] => {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const labels: string[] = [];
  input.forEach((entry: unknown) => {
    if (typeof entry !== 'string') return;
    const normalized = entry.trim();
    if (!normalized || seen.has(normalized.toLowerCase())) return;
    seen.add(normalized.toLowerCase());
    labels.push(normalized);
  });
  return labels;
};

const toParameterDomain = (param: PrismaProductParameter): ProductParameter => ({
  id: param.id,
  name: param.name_en,
  name_en: param.name_en,
  name_pl: param.name_pl ?? null,
  name_de: param.name_de ?? null,
  catalogId: param.catalogId,
  selectorType: normalizeSelectorType((param as unknown as Record<string, unknown>)['selectorType']),
  optionLabels: normalizeOptionLabels((param as unknown as Record<string, unknown>)['optionLabels']),
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

  async createParameter(data: ParameterCreateInput): Promise<ProductParameter> {
    const selectorType = normalizeSelectorType(data.selectorType);
    const optionLabels = normalizeOptionLabels(data.optionLabels ?? []);
    const param = await prisma.productParameter.create({
      data: {
        name_en: data.name_en,
        catalog: { connect: { id: data.catalogId } },
        ...(data.name_pl !== undefined && { name_pl: data.name_pl }),
        ...(data.name_de !== undefined && { name_de: data.name_de }),
        selectorType,
        optionLabels,
      } as Prisma.ProductParameterCreateInput,
    });
    return toParameterDomain(param);
  },

  async bulkCreateParameters(data: ParameterCreateInput[]): Promise<ProductParameter[]> {
    if (data.length === 0) return [];

    // Prisma createMany doesn't return the created records with their IDs easily,
    // so we use a transaction with multiple create calls for this specific repository
    // since parameters often need their generated IDs for immediate linking.
    const results = await prisma.$transaction(
      data.map((item) => {
        const selectorType = normalizeSelectorType(item.selectorType);
        const optionLabels = normalizeOptionLabels(item.optionLabels ?? []);
        return prisma.productParameter.create({
          data: {
            name_en: item.name_en,
            catalog: { connect: { id: item.catalogId } },
            ...(item.name_pl !== undefined && { name_pl: item.name_pl }),
            ...(item.name_de !== undefined && { name_de: item.name_de }),
            selectorType,
            optionLabels,
          } as Prisma.ProductParameterCreateInput,
        });
      })
    );

    return results.map(toParameterDomain);
  },

  async updateParameter(id: string, data: ParameterUpdateInput): Promise<ProductParameter> {
    const updateData = {
      ...(data.name_en !== undefined && { name_en: data.name_en }),
      ...(data.name_pl !== undefined && { name_pl: data.name_pl }),
      ...(data.name_de !== undefined && { name_de: data.name_de }),
      ...(data.selectorType !== undefined && {
        selectorType: normalizeSelectorType(data.selectorType),
      }),
      ...(data.optionLabels !== undefined && {
        optionLabels: normalizeOptionLabels(data.optionLabels),
      }),
    } as Prisma.ProductParameterUpdateInput;
    const param = await prisma.productParameter.update({
      where: { id },
      data: updateData,
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
