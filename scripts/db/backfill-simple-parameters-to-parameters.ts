import 'dotenv/config';

import { PrismaClient, type Prisma } from '@prisma/client';
import { MongoClient } from 'mongodb';

const SIMPLE_PARAMETER_SETTING_KEY = 'product_simple_parameters';
const SIMPLE_PARAMETER_PREFIX = 'sp:';

type Provider = 'prisma' | 'mongodb';

type CliOptions = {
  provider?: Provider;
  dryRun: boolean;
  clearSimpleParameterSetting: boolean;
};

type SimpleParameterDefinition = {
  id: string;
  catalogId: string;
  name_en: string;
  name_pl: string | null;
  name_de: string | null;
};

type ParameterValueRecord = {
  parameterId: string;
  value: string;
  valuesByLanguage?: Record<string, string>;
};

type MongoProductParameterDocument = {
  _id?: unknown;
  catalogId: string;
  name_en: string;
  name_pl?: string | null;
  name_de?: string | null;
  selectorType?: string;
  optionLabels?: string[];
  createdAt?: Date;
  updatedAt?: Date;
};

type ReplacementSummary = {
  changed: boolean;
  entriesRemapped: number;
  entriesDropped: number;
  duplicateEntriesMerged: number;
  valueFillCount: number;
  next: ParameterValueRecord[];
};

type BackfillSummary = {
  provider: Provider;
  mode: 'dry-run' | 'write';
  simpleDefinitionsFound: number;
  mappedDefinitions: number;
  createdDefinitions: number;
  productsScanned: number;
  productsUpdated: number;
  productEntriesRemapped: number;
  productEntriesDropped: number;
  productDuplicatesMerged: number;
  productValueFills: number;
  draftsScanned: number;
  draftsUpdated: number;
  draftEntriesRemapped: number;
  draftEntriesDropped: number;
  draftDuplicatesMerged: number;
  draftValueFills: number;
  settingCleared: boolean;
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const toNullableTrimmedString = (value: unknown): string | null => {
  const normalized = toTrimmedString(value);
  return normalized ? normalized : null;
};

const normalizeNameKey = (catalogId: string, nameEn: string): string =>
  `${catalogId.trim()}::${nameEn.trim().toLowerCase()}`;

const parseOptions = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    clearSimpleParameterSetting: false,
  };

  argv.forEach((arg) => {
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--clear-setting') {
      options.clearSimpleParameterSetting = true;
      return;
    }
    if (arg.startsWith('--provider=')) {
      const value = arg.slice('--provider='.length).trim().toLowerCase();
      if (value === 'prisma' || value === 'mongodb') {
        options.provider = value;
      }
    }
  });

  return options;
};

const resolveProvider = (options: CliOptions): Provider => {
  if (options.provider) return options.provider;

  const envProvider = toTrimmedString(process.env['PRODUCT_DB_PROVIDER'] ?? '').toLowerCase();
  if (envProvider === 'prisma' || envProvider === 'mongodb') {
    return envProvider;
  }

  const hasPrisma = Boolean(process.env['DATABASE_URL']);
  const hasMongo = Boolean(process.env['MONGODB_URI']);
  if (hasPrisma && !hasMongo) return 'prisma';
  if (hasMongo && !hasPrisma) return 'mongodb';
  if (hasPrisma) return 'prisma';
  if (hasMongo) return 'mongodb';

  throw new Error(
    'Cannot determine provider. Set DATABASE_URL or MONGODB_URI, or pass --provider=prisma|mongodb.'
  );
};

const parseSimpleParameterDefinitions = (
  raw: string | null | undefined
): SimpleParameterDefinition[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    const byId = new Map<string, SimpleParameterDefinition>();
    parsed.forEach((entry: unknown) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return;
      const record = entry as Record<string, unknown>;
      const id = toTrimmedString(record['id']);
      const catalogId = toTrimmedString(record['catalogId']);
      const name_en = toTrimmedString(record['name_en']);
      if (!id || !catalogId || !name_en) return;
      if (byId.has(id)) return;
      byId.set(id, {
        id,
        catalogId,
        name_en,
        name_pl: toNullableTrimmedString(record['name_pl']),
        name_de: toNullableTrimmedString(record['name_de']),
      });
    });
    return Array.from(byId.values());
  } catch {
    return [];
  }
};

const normalizeValuesByLanguage = (input: unknown): Record<string, string> | undefined => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return undefined;
  }

  const normalized = Object.entries(input as Record<string, unknown>).reduce(
    (acc: Record<string, string>, [key, value]: [string, unknown]) => {
      const language = toTrimmedString(key).toLowerCase();
      if (!language) return acc;
      acc[language] = typeof value === 'string' ? value : '';
      return acc;
    },
    {}
  );

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const mergeValuesByLanguage = (
  base: Record<string, string> | undefined,
  incoming: Record<string, string> | undefined
): { next: Record<string, string> | undefined; changed: boolean } => {
  if (!base && !incoming) return { next: undefined, changed: false };
  if (!base && incoming) return { next: { ...incoming }, changed: true };
  if (base && !incoming) return { next: { ...base }, changed: false };

  const next: Record<string, string> = { ...(base as Record<string, string>) };
  let changed = false;
  Object.entries(incoming as Record<string, string>).forEach(
    ([language, value]: [string, string]) => {
      const current = next[language];
      if ((current ?? '').trim()) return;
      if (!value.trim()) return;
      next[language] = value;
      changed = true;
    }
  );
  return { next, changed };
};

const resolveMappedParameterId = (args: {
  parameterId: string;
  mappingBySimpleId: Map<string, string>;
  realParameterIds: Set<string>;
}): { id: string; remapped: boolean } => {
  const parameterId = toTrimmedString(args.parameterId);
  if (!parameterId) return { id: '', remapped: false };

  if (parameterId.startsWith(SIMPLE_PARAMETER_PREFIX)) {
    const simpleId = parameterId.slice(SIMPLE_PARAMETER_PREFIX.length).trim();
    const mapped = args.mappingBySimpleId.get(simpleId);
    if (!mapped) return { id: parameterId, remapped: false };
    return { id: mapped, remapped: mapped !== parameterId };
  }

  // Drafts historically stored simple parameter IDs without prefix.
  if (!args.realParameterIds.has(parameterId)) {
    const mapped = args.mappingBySimpleId.get(parameterId);
    if (mapped) {
      return { id: mapped, remapped: mapped !== parameterId };
    }
  }

  return { id: parameterId, remapped: false };
};

const replaceLegacyParameterIds = (args: {
  input: unknown;
  mappingBySimpleId: Map<string, string>;
  realParameterIds: Set<string>;
}): ReplacementSummary => {
  if (!Array.isArray(args.input)) {
    return {
      changed: false,
      entriesRemapped: 0,
      entriesDropped: 0,
      duplicateEntriesMerged: 0,
      valueFillCount: 0,
      next: [],
    };
  }

  const byParameterId = new Map<string, ParameterValueRecord>();
  const order: string[] = [];
  let changed = false;
  let entriesRemapped = 0;
  let entriesDropped = 0;
  let duplicateEntriesMerged = 0;
  let valueFillCount = 0;

  args.input.forEach((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      entriesDropped += 1;
      changed = true;
      return;
    }

    const record = entry as Record<string, unknown>;
    const originalId = toTrimmedString(record['parameterId']);
    const { id: mappedId, remapped } = resolveMappedParameterId({
      parameterId: originalId,
      mappingBySimpleId: args.mappingBySimpleId,
      realParameterIds: args.realParameterIds,
    });
    if (!mappedId) {
      entriesDropped += 1;
      changed = true;
      return;
    }
    if (remapped) {
      entriesRemapped += 1;
      changed = true;
    }

    const normalized: ParameterValueRecord = {
      parameterId: mappedId,
      value: typeof record['value'] === 'string' ? record['value'] : '',
    };
    const valuesByLanguage = normalizeValuesByLanguage(record['valuesByLanguage']);
    if (valuesByLanguage) {
      normalized.valuesByLanguage = valuesByLanguage;
    }

    const existing = byParameterId.get(mappedId);
    if (!existing) {
      byParameterId.set(mappedId, normalized);
      order.push(mappedId);
      return;
    }

    duplicateEntriesMerged += 1;
    changed = true;
    const existingValue = toTrimmedString(existing.value);
    const incomingValue = toTrimmedString(normalized.value);
    if (!existingValue && incomingValue) {
      existing.value = normalized.value;
      valueFillCount += 1;
    }

    const mergedLanguage = mergeValuesByLanguage(
      existing.valuesByLanguage,
      normalized.valuesByLanguage
    );
    if (mergedLanguage.changed) {
      if (mergedLanguage.next) {
        existing.valuesByLanguage = mergedLanguage.next;
      } else {
        delete existing.valuesByLanguage;
      }
      valueFillCount += 1;
    } else if (!existing.valuesByLanguage && mergedLanguage.next) {
      existing.valuesByLanguage = mergedLanguage.next;
    }
  });

  const next = order
    .map((parameterId) => byParameterId.get(parameterId))
    .filter((entry): entry is ParameterValueRecord => Boolean(entry))
    .map((entry) => {
      const valuesByLanguage =
        entry.valuesByLanguage && Object.keys(entry.valuesByLanguage).length > 0
          ? entry.valuesByLanguage
          : undefined;
      return {
        parameterId: entry.parameterId,
        value: entry.value,
        ...(valuesByLanguage ? { valuesByLanguage } : {}),
      };
    });

  if (!changed && Array.isArray(args.input) && args.input.length !== next.length) {
    changed = true;
  }

  return {
    changed,
    entriesRemapped,
    entriesDropped,
    duplicateEntriesMerged,
    valueFillCount,
    next,
  };
};

const runPrismaBackfill = async (options: CliOptions): Promise<BackfillSummary> => {
  const prisma = new PrismaClient();
  const summary: BackfillSummary = {
    provider: 'prisma',
    mode: options.dryRun ? 'dry-run' : 'write',
    simpleDefinitionsFound: 0,
    mappedDefinitions: 0,
    createdDefinitions: 0,
    productsScanned: 0,
    productsUpdated: 0,
    productEntriesRemapped: 0,
    productEntriesDropped: 0,
    productDuplicatesMerged: 0,
    productValueFills: 0,
    draftsScanned: 0,
    draftsUpdated: 0,
    draftEntriesRemapped: 0,
    draftEntriesDropped: 0,
    draftDuplicatesMerged: 0,
    draftValueFills: 0,
    settingCleared: false,
  };

  try {
    const simpleSetting = await prisma.setting.findUnique({
      where: { key: SIMPLE_PARAMETER_SETTING_KEY },
      select: { value: true },
    });
    const definitions = parseSimpleParameterDefinitions(simpleSetting?.value ?? null);
    summary.simpleDefinitionsFound = definitions.length;

    if (definitions.length === 0) {
      return summary;
    }

    const catalogIds = Array.from(new Set(definitions.map((definition) => definition.catalogId)));

    const existingParameters = await prisma.productParameter.findMany({
      where: { catalogId: { in: catalogIds } },
      select: { id: true, catalogId: true, name_en: true },
    });
    const mappingBySimpleId = new Map<string, string>();
    const existingByName = new Map<string, string>();
    const realParameterIds = new Set<string>(existingParameters.map((parameter) => parameter.id));
    existingParameters.forEach((parameter) => {
      existingByName.set(normalizeNameKey(parameter.catalogId, parameter.name_en), parameter.id);
    });

    for (const definition of definitions) {
      const key = normalizeNameKey(definition.catalogId, definition.name_en);
      const existingId = existingByName.get(key);
      if (existingId) {
        mappingBySimpleId.set(definition.id, existingId);
        summary.mappedDefinitions += 1;
        continue;
      }

      summary.createdDefinitions += 1;
      if (options.dryRun) continue;

      const created = await prisma.productParameter.create({
        data: {
          catalogId: definition.catalogId,
          name_en: definition.name_en,
          name_pl: definition.name_pl,
          name_de: definition.name_de,
          selectorType: 'text',
          optionLabels: [],
        },
        select: { id: true },
      });
      mappingBySimpleId.set(definition.id, created.id);
      existingByName.set(key, created.id);
      realParameterIds.add(created.id);
      summary.mappedDefinitions += 1;
    }

    if (options.dryRun) {
      definitions.forEach((definition) => {
        const key = normalizeNameKey(definition.catalogId, definition.name_en);
        const mappedId = existingByName.get(key);
        if (mappedId) mappingBySimpleId.set(definition.id, mappedId);
      });
      summary.mappedDefinitions = mappingBySimpleId.size;
    }

    const products = await prisma.product.findMany({
      select: { id: true, parameters: true },
    });
    summary.productsScanned = products.length;
    for (const product of products) {
      const replacement = replaceLegacyParameterIds({
        input: product.parameters,
        mappingBySimpleId,
        realParameterIds,
      });
      summary.productEntriesRemapped += replacement.entriesRemapped;
      summary.productEntriesDropped += replacement.entriesDropped;
      summary.productDuplicatesMerged += replacement.duplicateEntriesMerged;
      summary.productValueFills += replacement.valueFillCount;

      if (!replacement.changed) continue;
      summary.productsUpdated += 1;
      if (options.dryRun) continue;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          parameters: replacement.next as unknown as Prisma.InputJsonValue,
        },
      });
    }

    const drafts = await prisma.productDraft.findMany({
      select: { id: true, parameters: true },
    });
    summary.draftsScanned = drafts.length;
    for (const draft of drafts) {
      const replacement = replaceLegacyParameterIds({
        input: draft.parameters,
        mappingBySimpleId,
        realParameterIds,
      });
      summary.draftEntriesRemapped += replacement.entriesRemapped;
      summary.draftEntriesDropped += replacement.entriesDropped;
      summary.draftDuplicatesMerged += replacement.duplicateEntriesMerged;
      summary.draftValueFills += replacement.valueFillCount;

      if (!replacement.changed) continue;
      summary.draftsUpdated += 1;
      if (options.dryRun) continue;

      await prisma.productDraft.update({
        where: { id: draft.id },
        data: {
          parameters: replacement.next as unknown as Prisma.InputJsonValue,
        },
      });
    }

    if (!options.dryRun && options.clearSimpleParameterSetting && simpleSetting?.value) {
      await prisma.setting.update({
        where: { key: SIMPLE_PARAMETER_SETTING_KEY },
        data: { value: '[]' },
      });
      summary.settingCleared = true;
    }

    return summary;
  } finally {
    await prisma.$disconnect();
  }
};

const runMongoBackfill = async (options: CliOptions): Promise<BackfillSummary> => {
  const uri = process.env['MONGODB_URI'];
  if (!uri) {
    throw new Error('MONGODB_URI is required for MongoDB backfill.');
  }
  const dbName = process.env['MONGODB_DB'] || 'app';
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  const summary: BackfillSummary = {
    provider: 'mongodb',
    mode: options.dryRun ? 'dry-run' : 'write',
    simpleDefinitionsFound: 0,
    mappedDefinitions: 0,
    createdDefinitions: 0,
    productsScanned: 0,
    productsUpdated: 0,
    productEntriesRemapped: 0,
    productEntriesDropped: 0,
    productDuplicatesMerged: 0,
    productValueFills: 0,
    draftsScanned: 0,
    draftsUpdated: 0,
    draftEntriesRemapped: 0,
    draftEntriesDropped: 0,
    draftDuplicatesMerged: 0,
    draftValueFills: 0,
    settingCleared: false,
  };

  try {
    const settingsCollection = db.collection<{
      _id?: string;
      key?: string;
      value?: string;
    }>('settings');

    const simpleSetting = await settingsCollection.findOne({
      $or: [{ _id: SIMPLE_PARAMETER_SETTING_KEY }, { key: SIMPLE_PARAMETER_SETTING_KEY }],
    });
    const definitions = parseSimpleParameterDefinitions(simpleSetting?.value ?? null);
    summary.simpleDefinitionsFound = definitions.length;

    if (definitions.length === 0) {
      return summary;
    }

    const catalogIds = Array.from(new Set(definitions.map((definition) => definition.catalogId)));
    const parameterCollection = db.collection<MongoProductParameterDocument>('product_parameters');
    const existingParameters = await parameterCollection
      .find({ catalogId: { $in: catalogIds } })
      .toArray();
    const mappingBySimpleId = new Map<string, string>();
    const existingByName = new Map<string, string>();
    const realParameterIds = new Set<string>();

    existingParameters.forEach((parameter) => {
      const id = String(parameter._id);
      realParameterIds.add(id);
      existingByName.set(normalizeNameKey(parameter.catalogId, parameter.name_en), id);
    });

    for (const definition of definitions) {
      const key = normalizeNameKey(definition.catalogId, definition.name_en);
      const existingId = existingByName.get(key);
      if (existingId) {
        mappingBySimpleId.set(definition.id, existingId);
        summary.mappedDefinitions += 1;
        continue;
      }

      summary.createdDefinitions += 1;
      if (options.dryRun) continue;

      const now = new Date();
      const insertResult = await parameterCollection.insertOne({
        catalogId: definition.catalogId,
        name_en: definition.name_en,
        name_pl: definition.name_pl,
        name_de: definition.name_de,
        selectorType: 'text',
        optionLabels: [],
        createdAt: now,
        updatedAt: now,
      });
      const createdId = String(insertResult.insertedId);
      mappingBySimpleId.set(definition.id, createdId);
      existingByName.set(key, createdId);
      realParameterIds.add(createdId);
      summary.mappedDefinitions += 1;
    }

    if (options.dryRun) {
      definitions.forEach((definition) => {
        const key = normalizeNameKey(definition.catalogId, definition.name_en);
        const mappedId = existingByName.get(key);
        if (mappedId) mappingBySimpleId.set(definition.id, mappedId);
      });
      summary.mappedDefinitions = mappingBySimpleId.size;
    }

    const productsCollection = db.collection<{
      _id: unknown;
      parameters?: unknown;
    }>('products');
    const products = await productsCollection
      .find({}, { projection: { _id: 1, parameters: 1 } })
      .toArray();
    summary.productsScanned = products.length;

    for (const product of products) {
      const replacement = replaceLegacyParameterIds({
        input: product.parameters,
        mappingBySimpleId,
        realParameterIds,
      });
      summary.productEntriesRemapped += replacement.entriesRemapped;
      summary.productEntriesDropped += replacement.entriesDropped;
      summary.productDuplicatesMerged += replacement.duplicateEntriesMerged;
      summary.productValueFills += replacement.valueFillCount;
      if (!replacement.changed) continue;
      summary.productsUpdated += 1;
      if (options.dryRun) continue;
      await productsCollection.updateOne(
        { _id: product._id },
        { $set: { parameters: replacement.next, updatedAt: new Date() } }
      );
    }

    const draftsCollection = db.collection<{
      _id: unknown;
      parameters?: unknown;
    }>('product_drafts');
    const drafts = await draftsCollection
      .find({}, { projection: { _id: 1, parameters: 1 } })
      .toArray();
    summary.draftsScanned = drafts.length;

    for (const draft of drafts) {
      const replacement = replaceLegacyParameterIds({
        input: draft.parameters,
        mappingBySimpleId,
        realParameterIds,
      });
      summary.draftEntriesRemapped += replacement.entriesRemapped;
      summary.draftEntriesDropped += replacement.entriesDropped;
      summary.draftDuplicatesMerged += replacement.duplicateEntriesMerged;
      summary.draftValueFills += replacement.valueFillCount;
      if (!replacement.changed) continue;
      summary.draftsUpdated += 1;
      if (options.dryRun) continue;
      await draftsCollection.updateOne(
        { _id: draft._id },
        { $set: { parameters: replacement.next, updatedAt: new Date() } }
      );
    }

    if (!options.dryRun && options.clearSimpleParameterSetting && simpleSetting) {
      await settingsCollection.updateOne(
        { $or: [{ _id: SIMPLE_PARAMETER_SETTING_KEY }, { key: SIMPLE_PARAMETER_SETTING_KEY }] },
        {
          $set: {
            key: SIMPLE_PARAMETER_SETTING_KEY,
            value: '[]',
            updatedAt: new Date(),
          },
        }
      );
      summary.settingCleared = true;
    }

    return summary;
  } finally {
    await client.close();
  }
};

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const provider = resolveProvider(options);
  const summary =
    provider === 'prisma' ? await runPrismaBackfill(options) : await runMongoBackfill(options);

  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((error: unknown) => {
  console.error('Failed to backfill legacy simple parameters into product parameters:', error);
  process.exit(1);
});
