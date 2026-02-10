import { Prisma, ProductValidationPattern as PrismaPattern } from '@prisma/client';

import {
  PRODUCT_VALIDATION_REPLACEMENT_FIELDS,
  PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY,
} from '@/features/products/constants';
import type {
  CreateProductValidationPatternInput,
  ProductValidationPatternRepository,
  UpdateProductValidationPatternInput,
} from '@/features/products/types/services/validation-pattern-repository';
import { operationFailedError } from '@/shared/errors/app-error';
import { ErrorSystem } from '@/features/observability/server';
import prisma from '@/shared/lib/db/prisma';
import type {
  ProductValidationPattern,
  ProductValidationSeverity,
  ProductValidationTarget,
} from '@/shared/types/domain/products';

const DEFAULT_ENABLED_BY_DEFAULT = true;
const MISSING_DELEGATE_MESSAGE =
  'ProductValidationPattern model is unavailable in Prisma Client. Run `npx prisma generate` and restart the app.';
const SCHEMA_MISMATCH_MESSAGE =
  'Product validation schema mismatch detected. Run `npx prisma db push` to sync the database schema.';

const isSchemaMismatchError = (
  error: unknown
): error is Prisma.PrismaClientKnownRequestError =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  (error.code === 'P2021' || error.code === 'P2022');

const schemaMismatchError = (error: unknown) => {
  const code =
    error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
  return operationFailedError(SCHEMA_MISMATCH_MESSAGE, {
    prismaCode: code ?? null,
  });
};

const parseBooleanSetting = (value: string | null | undefined): boolean => {
  if (typeof value !== 'string') return DEFAULT_ENABLED_BY_DEFAULT;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return DEFAULT_ENABLED_BY_DEFAULT;
  if (normalized === 'false' || normalized === '0' || normalized === 'off' || normalized === 'no') {
    return false;
  }
  return true;
};

const ALLOWED_REPLACEMENT_FIELDS = new Set<string>(PRODUCT_VALIDATION_REPLACEMENT_FIELDS);

const normalizeReplacementFields = (fields: string[] | null | undefined): string[] => {
  if (!Array.isArray(fields) || fields.length === 0) return [];
  const unique = new Set<string>();
  for (const field of fields) {
    if (!field || !ALLOWED_REPLACEMENT_FIELDS.has(field)) continue;
    unique.add(field);
  }
  return [...unique];
};

type ProductValidationPatternDelegate = {
  findMany: (args: {
    orderBy: Array<{ target: 'asc' | 'desc' } | { label: 'asc' | 'desc' }>;
  }) => Promise<PrismaPattern[]>;
  findUnique: (args: { where: { id: string } }) => Promise<PrismaPattern | null>;
  create: (args: {
    data: {
      label: string;
      target: string;
      locale: string | null;
      regex: string;
      flags: string | null;
      message: string;
      severity: string;
      enabled: boolean;
      replacementEnabled: boolean;
      replacementValue: string | null;
      replacementFields: string[];
    };
  }) => Promise<PrismaPattern>;
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<PrismaPattern>;
  delete: (args: { where: { id: string } }) => Promise<PrismaPattern>;
};

const getPatternDelegate = (): ProductValidationPatternDelegate | null => {
  const delegate = (prisma as unknown as { productValidationPattern?: ProductValidationPatternDelegate })
    .productValidationPattern;
  if (!delegate || typeof delegate.findMany !== 'function') {
    return null;
  }
  return delegate;
};

const requirePatternDelegate = (): ProductValidationPatternDelegate => {
  const delegate = getPatternDelegate();
  if (delegate) {
    return delegate;
  }
  throw operationFailedError(MISSING_DELEGATE_MESSAGE);
};

const toDomain = (pattern: PrismaPattern): ProductValidationPattern => ({
  id: pattern.id,
  label: pattern.label,
  target: pattern.target as ProductValidationTarget,
  locale: pattern.locale ?? null,
  regex: pattern.regex,
  flags: pattern.flags ?? null,
  message: pattern.message,
  severity: (pattern.severity as ProductValidationSeverity) ?? 'error',
  enabled: pattern.enabled,
  replacementEnabled: pattern.replacementEnabled ?? false,
  replacementValue: pattern.replacementValue ?? null,
  replacementFields: normalizeReplacementFields(pattern.replacementFields),
  createdAt: pattern.createdAt.toISOString(),
  updatedAt: pattern.updatedAt.toISOString(),
});

export const prismaValidationPatternRepository: ProductValidationPatternRepository = {
  async listPatterns(): Promise<ProductValidationPattern[]> {
    const delegate = getPatternDelegate();
    if (!delegate) {
      return [];
    }
    try {
      const rows = await delegate.findMany({
        orderBy: [{ target: 'asc' }, { label: 'asc' }],
      });
      return rows.map(toDomain);
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        void ErrorSystem.logWarning('Prisma schema mismatch while listing patterns; returning empty set.', { source: 'validation-pattern-repository', code: error.code });
        return [];
      }
      throw error;
    }
  },

  async getPatternById(id: string): Promise<ProductValidationPattern | null> {
    const delegate = getPatternDelegate();
    if (!delegate) {
      return null;
    }
    try {
      const row = await delegate.findUnique({
        where: { id },
      });
      return row ? toDomain(row) : null;
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        void ErrorSystem.logWarning('Prisma schema mismatch while reading pattern by id; returning null.', { source: 'validation-pattern-repository', code: error.code, id });
        return null;
      }
      throw error;
    }
  },

  async createPattern(data: CreateProductValidationPatternInput): Promise<ProductValidationPattern> {
    const delegate = requirePatternDelegate();
    try {
      const row = await delegate.create({
        data: {
          label: data.label,
          target: data.target,
          locale: data.locale?.trim() || null,
          regex: data.regex,
          flags: data.flags ?? null,
          message: data.message,
          severity: data.severity ?? 'error',
          enabled: data.enabled ?? true,
          replacementEnabled: data.replacementEnabled ?? false,
          replacementValue: data.replacementValue?.trim() || null,
          replacementFields: normalizeReplacementFields(data.replacementFields),
        },
      });
      return toDomain(row);
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        throw schemaMismatchError(error);
      }
      throw error;
    }
  },

  async updatePattern(id: string, data: UpdateProductValidationPatternInput): Promise<ProductValidationPattern> {
    const delegate = requirePatternDelegate();
    try {
      const row = await delegate.update({
        where: { id },
        data: {
          ...(data.label !== undefined && { label: data.label }),
          ...(data.target !== undefined && { target: data.target }),
          ...(data.locale !== undefined && { locale: data.locale?.trim() || null }),
          ...(data.regex !== undefined && { regex: data.regex }),
          ...(data.flags !== undefined && { flags: data.flags ?? null }),
          ...(data.message !== undefined && { message: data.message }),
          ...(data.severity !== undefined && { severity: data.severity }),
          ...(data.enabled !== undefined && { enabled: data.enabled }),
          ...(data.replacementEnabled !== undefined && { replacementEnabled: data.replacementEnabled }),
          ...(data.replacementValue !== undefined && { replacementValue: data.replacementValue?.trim() || null }),
          ...(data.replacementFields !== undefined && {
            replacementFields: normalizeReplacementFields(data.replacementFields),
          }),
        },
      });
      return toDomain(row);
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        throw schemaMismatchError(error);
      }
      throw error;
    }
  },

  async deletePattern(id: string): Promise<void> {
    const delegate = requirePatternDelegate();
    try {
      await delegate.delete({
        where: { id },
      });
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        throw schemaMismatchError(error);
      }
      throw error;
    }
  },

  async getEnabledByDefault(): Promise<boolean> {
    const setting = await prisma.setting.findUnique({
      where: { key: PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY },
      select: { value: true },
    });
    return parseBooleanSetting(setting?.value);
  },

  async setEnabledByDefault(enabled: boolean): Promise<boolean> {
    await prisma.setting.upsert({
      where: { key: PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY },
      create: {
        key: PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY,
        value: String(enabled),
      },
      update: {
        value: String(enabled),
      },
    });
    return enabled;
  },
};
