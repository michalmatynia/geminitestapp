import { Prisma, ProductParameter as PrismaProductParameter } from '@prisma/client';

import type { 
  ParameterRepository, 
  ParameterFilters,
  ParameterCreateInput,
  ParameterUpdateInput,
} from '@/features/products/types/services/parameter-repository';
import prisma from '@/shared/lib/db/prisma';
import type { 
  ProductParameter 
} from '@/shared/types/domain/products';

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
