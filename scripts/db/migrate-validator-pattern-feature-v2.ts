import 'dotenv/config';

import {
  type ProductValidationPattern,
  type UpdateProductValidationPatternInput,
} from '@/shared/contracts/products';
import {
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_PATTERN_LISTS_VERSION,
  buildDefaultValidatorPatternLists,
  buildValidatorPatternListsPayload,
  normalizeValidatorListRecord,
  normalizeValidatorPatternLists,
  type ValidatorPatternList,
} from '@/shared/contracts/validator';
import { getAppDbProvider, type AppDbProvider } from '@/shared/lib/db/app-db-provider';
import { getMongoDb } from '@/shared/lib/db/mongo-client';
import prisma from '@/shared/lib/db/prisma';
import { getValidationPatternRepository } from '@/shared/lib/products/services/validation-pattern-repository';
import {
  getProductDataProvider,
  type ProductDbProvider,
} from '@/shared/lib/products/services/product-provider';
import { invalidateValidationPatternRuntimeCache } from '@/shared/lib/products/services/validation-pattern-runtime-cache';
import { parseDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

type CliOptions = {
  dryRun: boolean;
  limit: number | null;
  target: 'all' | 'patterns' | 'lists';
  rewriteAllPatterns: boolean;
};

type PatternMigrationSummary = {
  mode: 'dry-run' | 'write';
  provider: ProductDbProvider;
  scanned: number;
  staleDimensionPatterns: number;
  interleavedDimensionPatterns: number;
  rewriteAllPatterns: boolean;
  plannedUpdates: number;
  attemptedUpdates: number;
  appliedUpdates: number;
  failedUpdates: number;
  failures: Array<{ patternId: string; message: string }>;
};

type ListMigrationSummary = {
  mode: 'dry-run' | 'write';
  preferredProvider: AppDbProvider;
  valueFoundInProvider: AppDbProvider | null;
  availableProviders: AppDbProvider[];
  readRawLength: number;
  changed: boolean;
  writesAttempted: number;
  writesApplied: number;
  writesFailed: number;
  writeFailures: Array<{ provider: AppDbProvider; message: string }>;
};

type SettingDocument = {
  _id?: string;
  key?: unknown;
  value?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

const SETTINGS_COLLECTION = 'settings';
const DEFAULT_SEQUENCE_STEP = 10;

const parseCliOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    limit: null,
    target: 'all',
    rewriteAllPatterns: true,
  };

  for (const arg of argv) {
    if (arg === '--write') {
      options.dryRun = false;
      continue;
    }
    if (arg === '--compat-only') {
      options.rewriteAllPatterns = false;
      continue;
    }
    if (arg.startsWith('--limit=')) {
      const raw = Number.parseInt(arg.slice('--limit='.length), 10);
      if (Number.isFinite(raw) && raw > 0) {
        options.limit = raw;
      }
      continue;
    }
    if (arg.startsWith('--target=')) {
      const raw = arg.slice('--target='.length).trim().toLowerCase();
      if (raw === 'all' || raw === 'patterns' || raw === 'lists') {
        options.target = raw;
      }
    }
  }

  return options;
};

const getPatternSequence = (
  pattern: { sequence?: number | null | undefined },
  fallbackIndex: number
): number => {
  if (typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)) {
    return Math.max(0, Math.floor(pattern.sequence));
  }
  return (fallbackIndex + 1) * DEFAULT_SEQUENCE_STEP;
};

const isNameSecondSegmentDimensionPattern = (pattern: {
  target: string;
  replacementEnabled: boolean;
  replacementValue: string | null;
}): boolean => {
  if (pattern.target !== 'size_length' && pattern.target !== 'length') return false;
  if (!pattern.replacementEnabled || !pattern.replacementValue) return false;
  const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
  if (!recipe) return false;
  return (
    recipe.sourceMode === 'form_field' &&
    recipe.sourceField === 'name_en' &&
    recipe.targetApply === 'replace_whole_field'
  );
};

const buildCanonicalPatternPatch = (
  pattern: ProductValidationPattern
): UpdateProductValidationPatternInput => ({
  label: pattern.label,
  target: pattern.target,
  locale: pattern.locale,
  regex: pattern.regex,
  flags: pattern.flags,
  message: pattern.message,
  severity: pattern.severity,
  enabled: pattern.enabled,
  replacementEnabled: pattern.replacementEnabled,
  replacementAutoApply: pattern.replacementAutoApply,
  skipNoopReplacementProposal: pattern.skipNoopReplacementProposal,
  replacementValue: pattern.replacementValue,
  replacementFields: pattern.replacementFields,
  replacementAppliesToScopes: pattern.replacementAppliesToScopes ?? pattern.appliesToScopes,
  runtimeEnabled: pattern.runtimeEnabled,
  runtimeType: pattern.runtimeType,
  runtimeConfig: pattern.runtimeConfig,
  postAcceptBehavior: pattern.postAcceptBehavior,
  denyBehaviorOverride: pattern.denyBehaviorOverride,
  validationDebounceMs: pattern.validationDebounceMs,
  sequenceGroupId: pattern.sequenceGroupId,
  sequenceGroupLabel: pattern.sequenceGroupLabel,
  sequenceGroupDebounceMs: pattern.sequenceGroupDebounceMs,
  sequence: pattern.sequence,
  chainMode: pattern.chainMode,
  maxExecutions: pattern.maxExecutions,
  passOutputToNext: pattern.passOutputToNext,
  launchEnabled: pattern.launchEnabled,
  launchAppliesToScopes: pattern.launchAppliesToScopes ?? pattern.appliesToScopes,
  launchScopeBehavior: pattern.launchScopeBehavior,
  launchSourceMode: pattern.launchSourceMode,
  launchSourceField: pattern.launchSourceField,
  launchOperator: pattern.launchOperator,
  launchValue: pattern.launchValue,
  launchFlags: pattern.launchFlags,
  appliesToScopes: pattern.appliesToScopes,
});

const migrateProductValidatorPatterns = async (
  options: CliOptions
): Promise<PatternMigrationSummary> => {
  const repository = await getValidationPatternRepository();
  const patterns = await repository.listPatterns();
  const indexedPatterns = patterns.map((pattern, index) => ({ pattern, index }));
  const updates = new Map<string, UpdateProductValidationPatternInput>();

  if (options.rewriteAllPatterns) {
    for (const pattern of patterns) {
      updates.set(pattern.id, buildCanonicalPatternPatch(pattern));
    }
  }

  const dimensionEntries = indexedPatterns.filter(({ pattern }) =>
    isNameSecondSegmentDimensionPattern(pattern)
  );
  const staleDimensionEntries = dimensionEntries.filter(
    ({ pattern }) =>
      Boolean(pattern.sequenceGroupId?.trim()) ||
      Boolean(pattern.sequenceGroupLabel?.trim()) ||
      (pattern.sequenceGroupDebounceMs ?? 0) !== 0
  );

  const mirrorEntries = indexedPatterns.filter(({ pattern }) => {
    const label = pattern.sequenceGroupLabel?.trim().toLowerCase() ?? '';
    return label === 'name en -> pl mirror';
  });
  const mirrorWindow =
    mirrorEntries.length > 1
      ? {
          min: Math.min(
            ...mirrorEntries.map(({ pattern, index }) => getPatternSequence(pattern, index))
          ),
          max: Math.max(
            ...mirrorEntries.map(({ pattern, index }) => getPatternSequence(pattern, index))
          ),
        }
      : null;

  const interleavedDimensionEntries = mirrorWindow
    ? dimensionEntries.filter(({ pattern, index }) => {
        const sequence = getPatternSequence(pattern, index);
        return sequence > mirrorWindow.min && sequence < mirrorWindow.max;
      })
    : [];

  for (const { pattern } of staleDimensionEntries) {
    const existing = updates.get(pattern.id) ?? {};
    updates.set(pattern.id, {
      ...existing,
      sequenceGroupId: null,
      sequenceGroupLabel: null,
      sequenceGroupDebounceMs: 0,
    });
  }

  if (interleavedDimensionEntries.length > 0) {
    const maxSequence = indexedPatterns.reduce(
      (max, { pattern, index }) => Math.max(max, getPatternSequence(pattern, index)),
      0
    );
    let nextSequence = maxSequence + DEFAULT_SEQUENCE_STEP;
    const sortedInterleaved = [...interleavedDimensionEntries].sort(
      (left, right) =>
        getPatternSequence(left.pattern, left.index) -
        getPatternSequence(right.pattern, right.index)
    );
    for (const { pattern } of sortedInterleaved) {
      const existing = updates.get(pattern.id) ?? {};
      updates.set(pattern.id, {
        ...existing,
        sequenceGroupId: null,
        sequenceGroupLabel: null,
        sequenceGroupDebounceMs: 0,
        sequence: nextSequence,
      });
      nextSequence += DEFAULT_SEQUENCE_STEP;
    }
  }

  const plannedUpdates = Array.from(updates.entries()).map(([patternId, patch]) => ({
    patternId,
    patch,
  }));
  const limitedUpdates =
    options.limit === null ? plannedUpdates : plannedUpdates.slice(0, options.limit);

  const failures: Array<{ patternId: string; message: string }> = [];
  let appliedUpdates = 0;

  if (!options.dryRun) {
    for (const update of limitedUpdates) {
      try {
        await repository.updatePattern(update.patternId, update.patch);
        appliedUpdates += 1;
      } catch (error) {
        failures.push({
          patternId: update.patternId,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    if (appliedUpdates > 0) {
      invalidateValidationPatternRuntimeCache();
    }
  }

  const activeProvider = await getProductDataProvider();

  return {
    mode: options.dryRun ? 'dry-run' : 'write',
    provider: activeProvider,
    scanned: patterns.length,
    staleDimensionPatterns: staleDimensionEntries.length,
    interleavedDimensionPatterns: interleavedDimensionEntries.length,
    rewriteAllPatterns: options.rewriteAllPatterns,
    plannedUpdates: plannedUpdates.length,
    attemptedUpdates: limitedUpdates.length,
    appliedUpdates,
    failedUpdates: failures.length,
    failures,
  };
};

const parseJson = (value: string): unknown | null => {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
};

const extractLegacyLists = (payload: unknown): unknown[] | null => {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const record = payload as Record<string, unknown>;
  return Array.isArray(record['lists']) ? record['lists'] : null;
};

const parseLegacyValidatorPatternLists = (raw: string | null): ValidatorPatternList[] => {
  if (typeof raw !== 'string' || raw.trim().length === 0) {
    return buildDefaultValidatorPatternLists();
  }
  const parsed = parseJson(raw);
  const rawLists = extractLegacyLists(parsed);
  if (!rawLists) return buildDefaultValidatorPatternLists();
  const defaults = buildDefaultValidatorPatternLists();
  return normalizeValidatorPatternLists(
    rawLists.map((entry: unknown, index: number) =>
      normalizeValidatorListRecord(entry, defaults[index] ?? defaults[0]!)
    )
  );
};

const parseCanonicalValidatorPatternLists = (raw: string | null): ValidatorPatternList[] | null => {
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const parsed = parseJson(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const record = parsed as Record<string, unknown>;
  if (record['version'] !== VALIDATOR_PATTERN_LISTS_VERSION) return null;
  if (!Array.isArray(record['lists'])) return null;
  const defaults = buildDefaultValidatorPatternLists();
  return normalizeValidatorPatternLists(
    record['lists'].map((entry: unknown, index: number) =>
      normalizeValidatorListRecord(entry, defaults[index] ?? defaults[0]!)
    )
  );
};

const readSettingFromMongo = async (key: string): Promise<string | null> => {
  if (!process.env['MONGODB_URI']) return null;
  const db = await getMongoDb();
  const doc = await db.collection<SettingDocument>(SETTINGS_COLLECTION).findOne({
    $or: [{ key }, { _id: key }],
  });
  return typeof doc?.value === 'string' ? doc.value : null;
};

const readSettingFromPrisma = async (key: string): Promise<string | null> => {
  if (!process.env['DATABASE_URL']) return null;
  const setting = await prisma.setting.findUnique({
    where: { key },
    select: { value: true },
  });
  return setting?.value ?? null;
};

const writeSettingToMongo = async (key: string, value: string): Promise<void> => {
  if (!process.env['MONGODB_URI']) return;
  const db = await getMongoDb();
  const now = new Date();
  await db.collection<SettingDocument>(SETTINGS_COLLECTION).updateOne(
    {
      $or: [{ key }, { _id: key }],
    },
    {
      $set: {
        key,
        value,
        updatedAt: now,
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
    { upsert: true }
  );
};

const writeSettingToPrisma = async (key: string, value: string): Promise<void> => {
  if (!process.env['DATABASE_URL']) return;
  await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
};

const resolvePreferredAppProvider = async (): Promise<AppDbProvider> => {
  try {
    return await getAppDbProvider();
  } catch {
    if (process.env['MONGODB_URI']) return 'mongodb';
    return 'prisma';
  }
};

const migrateValidatorPatternListsSetting = async (
  options: CliOptions
): Promise<ListMigrationSummary> => {
  const preferredProvider = await resolvePreferredAppProvider();
  const availableProviders: AppDbProvider[] = [];
  if (process.env['DATABASE_URL']) {
    availableProviders.push('prisma');
  }
  if (process.env['MONGODB_URI']) {
    availableProviders.push('mongodb');
  }

  const readOrder: AppDbProvider[] = [
    preferredProvider,
    ...availableProviders.filter((provider) => provider !== preferredProvider),
  ];

  let rawValue: string | null = null;
  let valueFoundInProvider: AppDbProvider | null = null;
  for (const provider of readOrder) {
    const value =
      provider === 'mongodb'
        ? await readSettingFromMongo(VALIDATOR_PATTERN_LISTS_KEY)
        : await readSettingFromPrisma(VALIDATOR_PATTERN_LISTS_KEY);
    if (typeof value === 'string') {
      rawValue = value;
      valueFoundInProvider = provider;
      break;
    }
  }

  const canonicalCurrentLists = parseCanonicalValidatorPatternLists(rawValue);
  const nextLists = parseLegacyValidatorPatternLists(rawValue);
  const nextSerialized = JSON.stringify(buildValidatorPatternListsPayload(nextLists));
  const currentSerialized = canonicalCurrentLists
    ? JSON.stringify(buildValidatorPatternListsPayload(canonicalCurrentLists))
    : null;
  const changed = currentSerialized !== nextSerialized;

  const writeFailures: Array<{ provider: AppDbProvider; message: string }> = [];
  let writesApplied = 0;

  if (!options.dryRun && changed) {
    for (const provider of availableProviders) {
      try {
        if (provider === 'mongodb') {
          await writeSettingToMongo(VALIDATOR_PATTERN_LISTS_KEY, nextSerialized);
        } else {
          await writeSettingToPrisma(VALIDATOR_PATTERN_LISTS_KEY, nextSerialized);
        }
        writesApplied += 1;
      } catch (error) {
        writeFailures.push({
          provider,
          message: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  return {
    mode: options.dryRun ? 'dry-run' : 'write',
    preferredProvider,
    valueFoundInProvider,
    availableProviders,
    readRawLength: typeof rawValue === 'string' ? rawValue.length : 0,
    changed,
    writesAttempted: !options.dryRun && changed ? availableProviders.length : 0,
    writesApplied,
    writesFailed: writeFailures.length,
    writeFailures,
  };
};

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  if (!process.env['DATABASE_URL'] && !process.env['MONGODB_URI']) {
    throw new Error('No database provider configured. Set DATABASE_URL or MONGODB_URI.');
  }

  const output: Record<string, unknown> = {
    mode: options.dryRun ? 'dry-run' : 'write',
    options: {
      target: options.target,
      limit: options.limit,
      rewriteAllPatterns: options.rewriteAllPatterns,
    },
  };

  if (options.target === 'all' || options.target === 'patterns') {
    output['patterns'] = await migrateProductValidatorPatterns(options);
  }

  if (options.target === 'all' || options.target === 'lists') {
    output['lists'] = await migrateValidatorPatternListsSetting(options);
  }

  output['metadata'] = {
    validatorPatternListsKey: VALIDATOR_PATTERN_LISTS_KEY,
    validatorPatternListsVersion: VALIDATOR_PATTERN_LISTS_VERSION,
  };

  console.log(JSON.stringify(output, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to migrate validator pattern feature to v2:', error);
    process.exit(1);
  });
