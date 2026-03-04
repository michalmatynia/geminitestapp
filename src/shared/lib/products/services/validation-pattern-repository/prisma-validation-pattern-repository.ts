import { Prisma, ProductValidationPattern as PrismaPattern } from '@prisma/client';

import {
  PRODUCT_FORMATTER_ENABLED_BY_DEFAULT_SETTING_KEY,
  PRODUCT_VALIDATION_REPLACEMENT_FIELDS,
  PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY,
  PRODUCT_VALIDATOR_INSTANCE_DENY_BEHAVIOR_SETTING_KEY,
} from '@/shared/lib/products/constants';
import {
  normalizeProductValidationPatternDenyBehaviorOverride,
  normalizeProductValidationLaunchScopeBehavior,
  normalizeProductValidationSkipNoopReplacementProposal,
  normalizeProductValidationPatternLaunchScopes,
  normalizeProductValidationPatternReplacementScopes,
  normalizeProductValidationPatternScopes,
  normalizeProductValidationInstanceDenyBehaviorMap,
} from '@/shared/lib/products/utils/validator-instance-behavior';
import type {
  CreateProductValidationPatternInput,
  ProductValidationPatternRepository,
  UpdateProductValidationPatternInput,
} from '@/shared/contracts/products';
import type {
  ProductValidationChainMode,
  ProductValidationInstanceDenyBehaviorMap,
  ProductValidationLaunchOperator,
  ProductValidationLaunchSourceMode,
  ProductValidationPostAcceptBehavior,
  ProductValidationPattern,
  ProductValidationRuntimeType,
  ProductValidationSeverity,
  ProductValidationTarget,
} from '@/shared/contracts/products';
import { conflictError, operationFailedError } from '@/shared/errors/app-error';
import prisma from '@/shared/lib/db/prisma';

const DEFAULT_ENABLED_BY_DEFAULT = true;
const DEFAULT_FORMATTER_ENABLED_BY_DEFAULT = false;
const MISSING_DELEGATE_MESSAGE =
  'ProductValidationPattern model is unavailable in Prisma Client. Run `npx prisma generate` and restart the app.';
const SCHEMA_MISMATCH_MESSAGE =
  'Product validation schema mismatch detected. Run `npx prisma db push` to sync the database schema.';

const isSchemaMismatchError = (error: unknown): boolean =>
  (error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === 'P2021' || error.code === 'P2022')) ||
  error instanceof Prisma.PrismaClientValidationError;

const schemaMismatchError = (error: unknown) => {
  const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
  return operationFailedError(SCHEMA_MISMATCH_MESSAGE, {
    prismaCode: code ?? null,
  });
};

const parseBooleanSetting = (
  value: string | null | undefined,
  fallback: boolean = DEFAULT_ENABLED_BY_DEFAULT
): boolean => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
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

const normalizeValidationDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

const normalizePostAcceptBehavior = (value: unknown): ProductValidationPostAcceptBehavior =>
  value === 'stop_after_accept' ? 'stop_after_accept' : 'revalidate';

const normalizeRuntimeType = (value: unknown): ProductValidationRuntimeType => {
  if (value === 'database_query' || value === 'ai_prompt') return value;
  return 'none';
};

const normalizeRuntimeConfig = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSequence = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.max(0, Math.floor(value));
};

const normalizeSequenceGroupId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSequenceGroupLabel = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeSequenceGroupDebounceMs = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(30_000, Math.max(0, Math.floor(value)));
};

const normalizeChainMode = (value: unknown): ProductValidationChainMode => {
  if (value === 'stop_on_match' || value === 'stop_on_replace') return value;
  return 'continue';
};

const normalizeMaxExecutions = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 1;
  return Math.min(20, Math.max(1, Math.floor(value)));
};

const normalizeLaunchSourceMode = (value: unknown): ProductValidationLaunchSourceMode => {
  if (value === 'form_field' || value === 'latest_product_field') return value;
  return 'current_field';
};

const normalizeLaunchOperator = (value: unknown): ProductValidationLaunchOperator => {
  switch (value) {
    case 'equals':
    case 'not_equals':
    case 'contains':
    case 'starts_with':
    case 'ends_with':
    case 'regex':
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte':
    case 'is_empty':
    case 'is_not_empty':
      return value;
    default:
      return 'equals';
  }
};

type ProductValidationPatternDelegate = {
  findMany: (args: Record<string, unknown>) => Promise<PrismaPattern[]>;
  findUnique: (args: { where: { id: string } }) => Promise<PrismaPattern | null>;
  create: (args: { data: Record<string, unknown> }) => Promise<PrismaPattern>;
  update: (args: {
    where: { id: string };
    data: Record<string, unknown>;
  }) => Promise<PrismaPattern>;
  updateMany: (args: {
    where: {
      id: string;
      updatedAt?: Date;
    };
    data: Record<string, unknown>;
  }) => Promise<{ count: number }>;
  delete: (args: { where: { id: string } }) => Promise<PrismaPattern>;
};

const getPatternDelegate = (): ProductValidationPatternDelegate | null => {
  const delegate = (
    prisma as unknown as { productValidationPattern?: ProductValidationPatternDelegate }
  ).productValidationPattern;
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

const toDomain = (pattern: PrismaPattern): ProductValidationPattern => {
  const patternAny = pattern as PrismaPattern & Record<string, unknown>;
  const appliesToScopesRaw = patternAny['appliesToScopes'];
  const replacementAppliesToScopesRaw = patternAny['replacementAppliesToScopes'];
  const launchAppliesToScopesRaw = patternAny['launchAppliesToScopes'];

  return {
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
    replacementAutoApply:
      typeof patternAny['replacementAutoApply'] === 'boolean'
        ? patternAny['replacementAutoApply']
        : false,
    skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(
      patternAny['skipNoopReplacementProposal']
    ),
    replacementValue: pattern.replacementValue ?? null,
    replacementFields: normalizeReplacementFields(pattern.replacementFields),
    replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
      replacementAppliesToScopesRaw
    ),
    runtimeEnabled:
      typeof patternAny['runtimeEnabled'] === 'boolean' ? patternAny['runtimeEnabled'] : false,
    runtimeType: normalizeRuntimeType(patternAny['runtimeType']),
    runtimeConfig: normalizeRuntimeConfig(patternAny['runtimeConfig']),
    postAcceptBehavior: normalizePostAcceptBehavior(patternAny['postAcceptBehavior']),
    denyBehaviorOverride: normalizeProductValidationPatternDenyBehaviorOverride(
      patternAny['denyBehaviorOverride']
    ),
    validationDebounceMs: normalizeValidationDebounceMs(patternAny['validationDebounceMs']),
    sequenceGroupId: normalizeSequenceGroupId(patternAny['sequenceGroupId']),
    sequenceGroupLabel: normalizeSequenceGroupLabel(patternAny['sequenceGroupLabel']),
    sequenceGroupDebounceMs: normalizeSequenceGroupDebounceMs(
      patternAny['sequenceGroupDebounceMs']
    ),
    sequence: normalizeSequence(patternAny['sequence']),
    chainMode: normalizeChainMode(patternAny['chainMode']),
    maxExecutions: normalizeMaxExecutions(patternAny['maxExecutions']),
    passOutputToNext:
      typeof patternAny['passOutputToNext'] === 'boolean' ? patternAny['passOutputToNext'] : true,
    launchEnabled:
      typeof patternAny['launchEnabled'] === 'boolean' ? patternAny['launchEnabled'] : false,
    launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
      launchAppliesToScopesRaw
    ),
    launchScopeBehavior: normalizeProductValidationLaunchScopeBehavior(
      patternAny['launchScopeBehavior']
    ),
    launchSourceMode: normalizeLaunchSourceMode(patternAny['launchSourceMode']),
    launchSourceField:
      typeof patternAny['launchSourceField'] === 'string' && patternAny['launchSourceField'].trim()
        ? patternAny['launchSourceField'].trim()
        : null,
    launchOperator: normalizeLaunchOperator(patternAny['launchOperator']),
    launchValue: typeof patternAny['launchValue'] === 'string' ? patternAny['launchValue'] : null,
    launchFlags:
      typeof patternAny['launchFlags'] === 'string' && patternAny['launchFlags'].trim()
        ? patternAny['launchFlags'].trim()
        : null,
    appliesToScopes: normalizeProductValidationPatternScopes(appliesToScopesRaw),
    createdAt: pattern.createdAt.toISOString(),
    updatedAt: pattern.updatedAt.toISOString(),
  };
};

export const prismaValidationPatternRepository: ProductValidationPatternRepository = {
  async listPatterns(): Promise<ProductValidationPattern[]> {
    const delegate = requirePatternDelegate();
    try {
      const rows = await delegate.findMany({
        orderBy: [{ sequence: 'asc' }, { target: 'asc' }, { label: 'asc' }],
      });
      return rows.map(toDomain);
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        throw schemaMismatchError(error);
      }
      throw error;
    }
  },

  async getPatternById(id: string): Promise<ProductValidationPattern | null> {
    const delegate = requirePatternDelegate();
    try {
      const row = await delegate.findUnique({
        where: { id },
      });
      return row ? toDomain(row) : null;
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        throw schemaMismatchError(error);
      }
      throw error;
    }
  },

  async createPattern(
    data: CreateProductValidationPatternInput
  ): Promise<ProductValidationPattern> {
    const delegate = requirePatternDelegate();
    let fallbackSequence: number;
    try {
      const maxSequenceRows = await delegate.findMany({
        select: { sequence: true },
        orderBy: [{ sequence: 'desc' }],
        take: 1,
      });
      const firstRow = Array.isArray(maxSequenceRows) ? maxSequenceRows[0] : null;
      const firstSequence =
        firstRow && typeof (firstRow as unknown as { sequence?: unknown }).sequence === 'number'
          ? Math.floor((firstRow as unknown as { sequence: number }).sequence)
          : null;
      fallbackSequence = firstSequence !== null ? firstSequence + 10 : 10;
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        throw schemaMismatchError(error);
      }
      throw error;
    }
    const createData: Record<string, unknown> = {
      label: data.label,
      target: data.target,
      locale: data.locale?.trim() || null,
      regex: data.regex,
      flags: data.flags ?? null,
      message: data.message,
      severity: data.severity ?? 'error',
      enabled: data.enabled ?? true,
      replacementEnabled: data.replacementEnabled ?? false,
      replacementAutoApply: data.replacementAutoApply ?? false,
      skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(
        data.skipNoopReplacementProposal
      ),
      replacementValue: data.replacementValue?.trim() || null,
      replacementFields: normalizeReplacementFields(data.replacementFields),
      replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
        data.replacementAppliesToScopes
      ),
      runtimeEnabled: data.runtimeEnabled ?? false,
      runtimeType: normalizeRuntimeType(data.runtimeType),
      runtimeConfig: normalizeRuntimeConfig(data.runtimeConfig),
      postAcceptBehavior: normalizePostAcceptBehavior(data.postAcceptBehavior),
      denyBehaviorOverride: normalizeProductValidationPatternDenyBehaviorOverride(
        data.denyBehaviorOverride
      ),
      validationDebounceMs: normalizeValidationDebounceMs(data.validationDebounceMs),
      sequenceGroupId: normalizeSequenceGroupId(data.sequenceGroupId),
      sequenceGroupLabel: normalizeSequenceGroupLabel(data.sequenceGroupLabel),
      sequenceGroupDebounceMs: normalizeSequenceGroupDebounceMs(data.sequenceGroupDebounceMs),
      sequence: normalizeSequence(data.sequence) ?? fallbackSequence,
      chainMode: normalizeChainMode(data.chainMode),
      maxExecutions: normalizeMaxExecutions(data.maxExecutions),
      passOutputToNext: data.passOutputToNext ?? true,
      launchEnabled: data.launchEnabled ?? false,
      launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
        data.launchAppliesToScopes
      ),
      launchScopeBehavior: normalizeProductValidationLaunchScopeBehavior(data.launchScopeBehavior),
      launchSourceMode: normalizeLaunchSourceMode(data.launchSourceMode),
      launchSourceField: data.launchSourceField?.trim() || null,
      launchOperator: normalizeLaunchOperator(data.launchOperator),
      launchValue: data.launchValue ?? null,
      launchFlags: data.launchFlags?.trim() || null,
      appliesToScopes: normalizeProductValidationPatternScopes(data.appliesToScopes),
    };
    try {
      const row = await delegate.create({
        data: createData,
      });
      return toDomain(row);
    } catch (error) {
      if (isSchemaMismatchError(error)) {
        throw schemaMismatchError(error);
      }
      throw error;
    }
  },

  async updatePattern(
    id: string,
    data: UpdateProductValidationPatternInput
  ): Promise<ProductValidationPattern> {
    const delegate = requirePatternDelegate();
    const expectedUpdatedAtRaw =
      typeof data.expectedUpdatedAt === 'string' && data.expectedUpdatedAt.trim()
        ? data.expectedUpdatedAt.trim()
        : null;
    const expectedUpdatedAt = expectedUpdatedAtRaw ? new Date(expectedUpdatedAtRaw) : null;
    if (expectedUpdatedAtRaw && Number.isNaN(expectedUpdatedAt?.getTime() ?? Number.NaN)) {
      throw operationFailedError('Invalid expectedUpdatedAt value.');
    }
    const baseUpdateData = {
      ...(data.label !== undefined && { label: data.label }),
      ...(data.target !== undefined && { target: data.target }),
      ...(data.locale !== undefined && { locale: data.locale?.trim() || null }),
      ...(data.regex !== undefined && { regex: data.regex }),
      ...(data.flags !== undefined && { flags: data.flags ?? null }),
      ...(data.message !== undefined && { message: data.message }),
      ...(data.severity !== undefined && { severity: data.severity }),
      ...(data.enabled !== undefined && { enabled: data.enabled }),
      ...(data.replacementEnabled !== undefined && { replacementEnabled: data.replacementEnabled }),
      ...(data.replacementAutoApply !== undefined && {
        replacementAutoApply: data.replacementAutoApply,
      }),
      ...(data.skipNoopReplacementProposal !== undefined && {
        skipNoopReplacementProposal: normalizeProductValidationSkipNoopReplacementProposal(
          data.skipNoopReplacementProposal
        ),
      }),
      ...(data.replacementValue !== undefined && {
        replacementValue: data.replacementValue?.trim() || null,
      }),
      ...(data.replacementFields !== undefined && {
        replacementFields: normalizeReplacementFields(data.replacementFields),
      }),
      ...(data.replacementAppliesToScopes !== undefined && {
        replacementAppliesToScopes: normalizeProductValidationPatternReplacementScopes(
          data.replacementAppliesToScopes
        ),
      }),
      ...(data.runtimeEnabled !== undefined && { runtimeEnabled: data.runtimeEnabled }),
      ...(data.runtimeType !== undefined && {
        runtimeType: normalizeRuntimeType(data.runtimeType),
      }),
      ...(data.runtimeConfig !== undefined && {
        runtimeConfig: normalizeRuntimeConfig(data.runtimeConfig),
      }),
      ...(data.postAcceptBehavior !== undefined && {
        postAcceptBehavior: normalizePostAcceptBehavior(data.postAcceptBehavior),
      }),
      ...(data.validationDebounceMs !== undefined && {
        validationDebounceMs: normalizeValidationDebounceMs(data.validationDebounceMs),
      }),
      ...(data.denyBehaviorOverride !== undefined && {
        denyBehaviorOverride: normalizeProductValidationPatternDenyBehaviorOverride(
          data.denyBehaviorOverride
        ),
      }),
      ...(data.sequenceGroupId !== undefined && {
        sequenceGroupId: normalizeSequenceGroupId(data.sequenceGroupId),
      }),
      ...(data.sequenceGroupLabel !== undefined && {
        sequenceGroupLabel: normalizeSequenceGroupLabel(data.sequenceGroupLabel),
      }),
      ...(data.sequenceGroupDebounceMs !== undefined && {
        sequenceGroupDebounceMs: normalizeSequenceGroupDebounceMs(data.sequenceGroupDebounceMs),
      }),
      ...(data.sequence !== undefined && {
        sequence: normalizeSequence(data.sequence),
      }),
      ...(data.chainMode !== undefined && {
        chainMode: normalizeChainMode(data.chainMode),
      }),
      ...(data.maxExecutions !== undefined && {
        maxExecutions: normalizeMaxExecutions(data.maxExecutions),
      }),
      ...(data.passOutputToNext !== undefined && {
        passOutputToNext: data.passOutputToNext,
      }),
      ...(data.launchEnabled !== undefined && {
        launchEnabled: data.launchEnabled,
      }),
      ...(data.launchAppliesToScopes !== undefined && {
        launchAppliesToScopes: normalizeProductValidationPatternLaunchScopes(
          data.launchAppliesToScopes
        ),
      }),
      ...(data.launchScopeBehavior !== undefined && {
        launchScopeBehavior: normalizeProductValidationLaunchScopeBehavior(
          data.launchScopeBehavior
        ),
      }),
      ...(data.launchSourceMode !== undefined && {
        launchSourceMode: normalizeLaunchSourceMode(data.launchSourceMode),
      }),
      ...(data.launchSourceField !== undefined && {
        launchSourceField: data.launchSourceField?.trim() || null,
      }),
      ...(data.launchOperator !== undefined && {
        launchOperator: normalizeLaunchOperator(data.launchOperator),
      }),
      ...(data.launchValue !== undefined && {
        launchValue: data.launchValue ?? null,
      }),
      ...(data.launchFlags !== undefined && {
        launchFlags: data.launchFlags?.trim() || null,
      }),
      ...(data.appliesToScopes !== undefined && {
        appliesToScopes: normalizeProductValidationPatternScopes(data.appliesToScopes),
      }),
    };
    try {
      if (expectedUpdatedAt) {
        const updateResult = await delegate.updateMany({
          where: { id, updatedAt: expectedUpdatedAt },
          data: baseUpdateData,
        });
        if (updateResult.count === 0) {
          const current = await delegate.findUnique({ where: { id } });
          if (!current) {
            throw operationFailedError('Validation pattern not found.');
          }
          throw conflictError('Validation pattern was modified by another request.', {
            patternId: id,
            expectedUpdatedAt: expectedUpdatedAtRaw,
            actualUpdatedAt: current.updatedAt.toISOString(),
          });
        }
        const row = await delegate.findUnique({ where: { id } });
        if (!row) {
          throw operationFailedError('Validation pattern not found.');
        }
        return toDomain(row);
      }
      const row = await delegate.update({ where: { id }, data: baseUpdateData });
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

  async getFormatterEnabledByDefault(): Promise<boolean> {
    const setting = await prisma.setting.findUnique({
      where: { key: PRODUCT_FORMATTER_ENABLED_BY_DEFAULT_SETTING_KEY },
      select: { value: true },
    });
    return parseBooleanSetting(setting?.value, DEFAULT_FORMATTER_ENABLED_BY_DEFAULT);
  },

  async setFormatterEnabledByDefault(enabled: boolean): Promise<boolean> {
    await prisma.setting.upsert({
      where: { key: PRODUCT_FORMATTER_ENABLED_BY_DEFAULT_SETTING_KEY },
      create: {
        key: PRODUCT_FORMATTER_ENABLED_BY_DEFAULT_SETTING_KEY,
        value: String(enabled),
      },
      update: {
        value: String(enabled),
      },
    });
    return enabled;
  },

  async getInstanceDenyBehavior(): Promise<ProductValidationInstanceDenyBehaviorMap> {
    const setting = await prisma.setting.findUnique({
      where: { key: PRODUCT_VALIDATOR_INSTANCE_DENY_BEHAVIOR_SETTING_KEY },
      select: { value: true },
    });
    if (!setting?.value) {
      return normalizeProductValidationInstanceDenyBehaviorMap(null);
    }
    try {
      return normalizeProductValidationInstanceDenyBehaviorMap(
        JSON.parse(setting.value) as unknown
      );
    } catch {
      return normalizeProductValidationInstanceDenyBehaviorMap(null);
    }
  },

  async setInstanceDenyBehavior(
    value: ProductValidationInstanceDenyBehaviorMap
  ): Promise<ProductValidationInstanceDenyBehaviorMap> {
    const normalized = normalizeProductValidationInstanceDenyBehaviorMap(value);
    await prisma.setting.upsert({
      where: { key: PRODUCT_VALIDATOR_INSTANCE_DENY_BEHAVIOR_SETTING_KEY },
      create: {
        key: PRODUCT_VALIDATOR_INSTANCE_DENY_BEHAVIOR_SETTING_KEY,
        value: JSON.stringify(normalized),
      },
      update: {
        value: JSON.stringify(normalized),
      },
    });
    return normalized;
  },
};
