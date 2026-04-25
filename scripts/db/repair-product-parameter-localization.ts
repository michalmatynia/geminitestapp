import 'dotenv/config';

import { ObjectId } from 'mongodb';

import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';

type CliOptions = {
  dryRun: boolean;
  limit: number | null;
};

type ProductParameterDoc = {
  _id: ObjectId | string;
  id?: string;
  catalogId?: string;
  name_en?: string | null;
  name_pl?: string | null;
  updatedAt?: Date;
};

type ProductParameterValueDoc = {
  parameterId?: string;
  value?: string | null;
  valuesByLanguage?: Record<string, unknown>;
};

type ProductDoc = {
  _id: ObjectId | string;
  id?: string;
  sku?: string | null;
  name_en?: string | null;
  parameters?: unknown[];
  updatedAt?: Date;
};

type CollectionName = 'products' | 'product_drafts';

type TargetParameters = {
  attributesId: string;
  tagsId: string;
  materialId: string;
  modelNameId: string;
  modelNumberId: string;
};

type CollectionStats = {
  collection: CollectionName;
  scanned: number;
  changedDocuments: number;
  legacyAttributesMigrated: number;
  legacyTagsMigrated: number;
  legacyMaterialRowsRemoved: number;
  canonicalAttributesMaterialRowsRemoved: number;
  attributesLocalized: number;
  tagsLocalized: number;
  modelNameLocalized: number;
  modelNumberLocalized: number;
  legacyModelNameMigrated: number;
  legacyModelNumberMigrated: number;
  materialValuesMerged: number;
  duplicateTargetRowsMerged: number;
  samples: Array<{
    id: string;
    sku: string | null;
    changes: string[];
  }>;
};

type OrderedParameterEntry =
  | {
      kind: 'passthrough';
      entry: ProductParameterValueDoc;
    }
  | {
      kind: 'target';
      parameterId: string;
    };

const COLLECTIONS: CollectionName[] = ['products', 'product_drafts'];

const CANONICAL_ATTRIBUTES_NAME_EN = 'Attributes unbranded (Amazon)';
const CANONICAL_ATTRIBUTES_NAME_PL = 'Atrybuty Niemarkowe (Amazon)';
const CANONICAL_TAGS_NAME_EN = 'Tags';
const CANONICAL_TAGS_NAME_PL = 'Tagi';
const CANONICAL_MATERIAL_NAME_EN = 'Material';
const CANONICAL_MATERIAL_NAME_PL = 'Materiał';
const CANONICAL_MODEL_NAME_NAME_EN = 'Model Name';
const CANONICAL_MODEL_NAME_NAME_PL = 'Nazwa modelu';
const CANONICAL_MODEL_NUMBER_NAME_EN = 'Model Number';
const CANONICAL_MODEL_NUMBER_NAME_PL = 'Numer modelu';

const LEGACY_ATTRIBUTES_IDS = new Set([
  'atrybuty niemarkowe (amazon)',
  'atrybuty niemarkowe amazon',
]);
const LEGACY_TAG_IDS = new Set(['tagi', 'tags']);
const LEGACY_MATERIAL_IDS = new Set(['material', 'materiał']);
const LEGACY_MODEL_NAME_IDS = new Set(['model name', 'nazwa modelu']);
const LEGACY_MODEL_NUMBER_IDS = new Set(['model number', 'numer modelu']);
const LEGACY_IMPORTED_IDS = new Set(['imported parameter']);

const MATERIAL_VALUE_TRANSLATIONS = new Map<string, string>([
  ['metal', 'Metal'],
  ['stop metali', 'Metal alloy'],
  ['stop cynkowy', 'Zinc alloy'],
  ['drewno', 'Wood'],
  ['wood', 'Wood'],
  ['wood leather', 'Wood Leather'],
  ['skora', 'Leather'],
  ['skóra', 'Leather'],
  ['eko skora', 'Eco Leather'],
  ['eko-skora', 'Eco Leather'],
  ['eko-skóra', 'Eco Leather'],
  ['skora ekologiczna', 'Eco Leather'],
  ['skóra ekologiczna', 'Eco Leather'],
  ['sztuczna skora', 'Faux Leather'],
  ['sztuczna skóra', 'Faux Leather'],
  ['leather', 'Leather'],
  ['foam', 'Foam'],
  ['pianka', 'Foam'],
  ['zywica', 'Resin'],
  ['żywica', 'Resin'],
  ['resin', 'Resin'],
  ['akryl', 'Acrylic'],
  ['acrylic', 'Acrylic'],
  ['papier', 'Paper'],
  ['paper', 'Paper'],
  ['plastik', 'Plastic'],
  ['plastic', 'Plastic'],
  ['tworzywo sztuczne', 'Plastic'],
  ['srebro', 'Silver'],
  ['silver', 'Silver'],
  ['stal', 'Steel'],
  ['steel', 'Steel'],
  ['plusz', 'Plush'],
  ['plush', 'Plush'],
  ['guma', 'Rubber'],
  ['rubber', 'Rubber'],
  ['szklo', 'Glass'],
  ['szkło', 'Glass'],
  ['glass', 'Glass'],
]);

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/repair-product-parameter-localization.ts [--write] [--limit=100]',
      '',
      'Dry-run by default. Migrates legacy Tags, Model, and Amazon unbranded attributes rows to canonical parameters, copies English values to Polish values, and removes/merges material-like Imported parameter rows.',
    ].join('\n')
  );
};

const parseArgs = (argv: string[]): CliOptions => {
  const options: CliOptions = {
    dryRun: true,
    limit: null,
  };

  argv.forEach((arg: string): void => {
    if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
    if (arg === '--write') {
      options.dryRun = false;
      return;
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
      return;
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number(arg.slice('--limit='.length));
      options.limit = Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
    }
  });

  return options;
};

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeKey = (value: unknown): string =>
  toTrimmedString(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const normalizeValuesByLanguage = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce(
    (acc: Record<string, string>, [languageCode, rawValue]: [string, unknown]) => {
      const normalizedLanguageCode = normalizeKey(languageCode);
      const normalizedValue = toTrimmedString(rawValue);
      if (!normalizedLanguageCode || !normalizedValue) return acc;
      acc[normalizedLanguageCode] = normalizedValue;
      return acc;
    },
    {}
  );
};

const extractEntryValue = (entry: ProductParameterValueDoc): string => {
  const valuesByLanguage = normalizeValuesByLanguage(entry.valuesByLanguage);
  return (
    toTrimmedString(valuesByLanguage['en']) ||
    toTrimmedString(entry.value) ||
    toTrimmedString(valuesByLanguage['default']) ||
    toTrimmedString(valuesByLanguage['pl']) ||
    Object.values(valuesByLanguage).find((value: string): boolean => value.trim().length > 0) ||
    ''
  );
};

const splitValueTokens = (value: string): string[] =>
  value
    .split(/[|,;/]+/)
    .map((token: string): string => normalizeKey(token))
    .filter((token: string): boolean => token.length > 0);

const isMaterialLikeValue = (value: string): boolean => {
  const tokens = splitValueTokens(value);
  if (tokens.length === 0) return false;
  return tokens.every((token: string): boolean => MATERIAL_VALUE_TRANSLATIONS.has(token));
};

const translateMaterialValueToEnglish = (value: string): string => {
  const rawTokens = value
    .split(/[|,;/]+/)
    .map((token: string): string => token.trim())
    .filter((token: string): boolean => token.length > 0);
  if (rawTokens.length === 0) return value;

  const translated = rawTokens.map((token: string): string => {
    const normalized = normalizeKey(token);
    return MATERIAL_VALUE_TRANSLATIONS.get(normalized) ?? token;
  });

  return translated.join(' | ');
};

const hasAnyValue = (entry: ProductParameterValueDoc | undefined): boolean => {
  if (!entry) return false;
  if (toTrimmedString(entry.value)) return true;
  return Object.values(normalizeValuesByLanguage(entry.valuesByLanguage)).some(
    (value: string): boolean => value.trim().length > 0
  );
};

const mergeDelimitedValues = (...values: string[]): string => {
  const seen = new Set<string>();
  const result: string[] = [];
  values.forEach((value: string): void => {
    value
      .split('|')
      .map((part: string): string => part.trim())
      .filter((part: string): boolean => part.length > 0)
      .forEach((part: string): void => {
        const key = part.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        result.push(part);
      });
  });
  return result.join('|');
};

const mergeLocalizedEnglishToPolish = (
  existing: ProductParameterValueDoc | undefined,
  parameterId: string,
  rawValue: string
): ProductParameterValueDoc => {
  const nextValuesByLanguage = normalizeValuesByLanguage(existing?.valuesByLanguage);
  const existingEnglish = toTrimmedString(nextValuesByLanguage['en']);
  const existingScalar = toTrimmedString(existing?.value);
  const nextEnglish = mergeDelimitedValues(existingEnglish || existingScalar, rawValue);

  if (nextEnglish) {
    nextValuesByLanguage['en'] = nextEnglish;
    nextValuesByLanguage['pl'] = nextEnglish;
  }

  return {
    ...(existing ?? {}),
    parameterId,
    value: nextEnglish,
    ...(Object.keys(nextValuesByLanguage).length > 0
      ? { valuesByLanguage: nextValuesByLanguage }
      : {}),
  };
};

const mergeMaterialValue = (
  existing: ProductParameterValueDoc | undefined,
  parameterId: string,
  rawValue: string
): ProductParameterValueDoc => {
  if (hasAnyValue(existing)) return { ...(existing as ProductParameterValueDoc), parameterId };

  const englishValue = translateMaterialValueToEnglish(rawValue);
  return {
    ...(existing ?? {}),
    parameterId,
    value: englishValue,
    valuesByLanguage: {
      en: englishValue,
      pl: rawValue,
    },
  };
};

const isObjectRecord = (value: unknown): value is ProductParameterValueDoc =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const resolveCanonicalParameter = (
  docs: ProductParameterDoc[],
  nameEn: string,
  namePl: string
): ProductParameterDoc => {
  const exact = docs.find(
    (doc: ProductParameterDoc): boolean =>
      toTrimmedString(doc.name_en) === nameEn && toTrimmedString(doc.name_pl) === namePl
  );
  if (exact?.id) return exact;

  const byEnglish = docs.find(
    (doc: ProductParameterDoc): boolean => toTrimmedString(doc.name_en) === nameEn
  );
  if (byEnglish?.id) return byEnglish;

  throw new Error(`Missing canonical product parameter: ${nameEn}`);
};

const loadTargetParameters = async (): Promise<{
  targets: TargetParameters;
  definitionRepairs: Array<{
    id: string;
    previousNameEn: string | null;
    previousNamePl: string | null;
    nextNameEn: string;
    nextNamePl: string;
  }>;
}> => {
  const mongo = await getMongoDb();
  const docs = await mongo
    .collection<ProductParameterDoc>('product_parameters')
    .find({
      $or: [
        {
          name_en: {
            $in: [
              CANONICAL_ATTRIBUTES_NAME_EN,
              CANONICAL_TAGS_NAME_EN,
              CANONICAL_MATERIAL_NAME_EN,
            ],
          },
        },
        {
          name_pl: {
            $in: [
              CANONICAL_ATTRIBUTES_NAME_PL,
              CANONICAL_TAGS_NAME_PL,
              CANONICAL_MATERIAL_NAME_PL,
            ],
          },
        },
        { name_en: { $in: [CANONICAL_MODEL_NAME_NAME_EN, CANONICAL_MODEL_NUMBER_NAME_EN] } },
        { name_pl: { $in: [CANONICAL_MODEL_NAME_NAME_PL, CANONICAL_MODEL_NUMBER_NAME_PL] } },
      ],
    })
    .toArray();

  const attributes = resolveCanonicalParameter(
    docs,
    CANONICAL_ATTRIBUTES_NAME_EN,
    'Atrybuty niemarkowe (Amazon)'
  );
  const tags = resolveCanonicalParameter(docs, CANONICAL_TAGS_NAME_EN, CANONICAL_TAGS_NAME_PL);
  const material = resolveCanonicalParameter(
    docs,
    CANONICAL_MATERIAL_NAME_EN,
    CANONICAL_MATERIAL_NAME_PL
  );
  const modelName = resolveCanonicalParameter(
    docs,
    CANONICAL_MODEL_NAME_NAME_EN,
    CANONICAL_MODEL_NAME_NAME_PL
  );
  const modelNumber = resolveCanonicalParameter(
    docs,
    CANONICAL_MODEL_NUMBER_NAME_EN,
    CANONICAL_MODEL_NUMBER_NAME_PL
  );

  const expectedDefinitions = [
    {
      doc: attributes,
      nextNameEn: CANONICAL_ATTRIBUTES_NAME_EN,
      nextNamePl: CANONICAL_ATTRIBUTES_NAME_PL,
    },
    { doc: tags, nextNameEn: CANONICAL_TAGS_NAME_EN, nextNamePl: CANONICAL_TAGS_NAME_PL },
    {
      doc: material,
      nextNameEn: CANONICAL_MATERIAL_NAME_EN,
      nextNamePl: CANONICAL_MATERIAL_NAME_PL,
    },
    {
      doc: modelName,
      nextNameEn: CANONICAL_MODEL_NAME_NAME_EN,
      nextNamePl: CANONICAL_MODEL_NAME_NAME_PL,
    },
    {
      doc: modelNumber,
      nextNameEn: CANONICAL_MODEL_NUMBER_NAME_EN,
      nextNamePl: CANONICAL_MODEL_NUMBER_NAME_PL,
    },
  ];

  const definitionRepairs = expectedDefinitions
    .filter(
      ({ doc, nextNameEn, nextNamePl }): boolean =>
        toTrimmedString(doc.name_en) !== nextNameEn || toTrimmedString(doc.name_pl) !== nextNamePl
    )
    .map(({ doc, nextNameEn, nextNamePl }) => ({
      id: doc.id ?? String(doc._id),
      previousNameEn: toTrimmedString(doc.name_en) || null,
      previousNamePl: toTrimmedString(doc.name_pl) || null,
      nextNameEn,
      nextNamePl,
    }));

  return {
    targets: {
      attributesId: attributes.id as string,
      tagsId: tags.id as string,
      materialId: material.id as string,
      modelNameId: modelName.id as string,
      modelNumberId: modelNumber.id as string,
    },
    definitionRepairs,
  };
};

const repairParametersForDoc = (
  doc: ProductDoc,
  targets: TargetParameters
): {
  changed: boolean;
  nextParameters: ProductParameterValueDoc[];
  stats: Omit<CollectionStats, 'collection' | 'scanned' | 'changedDocuments' | 'samples'>;
  changes: string[];
} => {
  const stats = {
    legacyAttributesMigrated: 0,
    legacyTagsMigrated: 0,
    legacyMaterialRowsRemoved: 0,
    canonicalAttributesMaterialRowsRemoved: 0,
    attributesLocalized: 0,
    tagsLocalized: 0,
    modelNameLocalized: 0,
    modelNumberLocalized: 0,
    legacyModelNameMigrated: 0,
    legacyModelNumberMigrated: 0,
    materialValuesMerged: 0,
    duplicateTargetRowsMerged: 0,
  };
  const changes: string[] = [];
  const targetEntries = new Map<string, ProductParameterValueDoc>();
  const outputEntries: OrderedParameterEntry[] = [];
  const outputTargetIds = new Set<string>();
  let changed = false;

  const queueTargetOutputEntry = (targetId: string): void => {
    if (outputTargetIds.has(targetId)) return;
    outputTargetIds.add(targetId);
    outputEntries.push({ kind: 'target', parameterId: targetId });
  };

  const mergeTarget = (
    targetId: string,
    rawValue: string,
    mode: 'copy_en_to_pl' | 'material'
  ): void => {
    const existing = targetEntries.get(targetId);
    if (existing) {
      stats.duplicateTargetRowsMerged += 1;
    }
    queueTargetOutputEntry(targetId);
    const merged =
      mode === 'copy_en_to_pl'
        ? mergeLocalizedEnglishToPolish(existing, targetId, rawValue)
        : mergeMaterialValue(existing, targetId, rawValue);
    targetEntries.set(targetId, merged);
  };

  const ensureLocalizedTarget = (
    entry: ProductParameterValueDoc,
    targetId: string,
    statsKey:
      | 'attributesLocalized'
      | 'tagsLocalized'
      | 'modelNameLocalized'
      | 'modelNumberLocalized'
  ): void => {
    const rawValue = extractEntryValue(entry);
    const existing = targetEntries.get(targetId);
    const merged = mergeLocalizedEnglishToPolish(existing ?? entry, targetId, rawValue);
    if (JSON.stringify(merged) !== JSON.stringify(entry)) {
      stats[statsKey] += 1;
      changed = true;
      changes.push(`${targetId}: copied English value to Polish`);
    }
    queueTargetOutputEntry(targetId);
    targetEntries.set(targetId, merged);
  };

  (Array.isArray(doc.parameters) ? doc.parameters : []).forEach((entry: unknown): void => {
    if (!isObjectRecord(entry)) {
      changed = true;
      return;
    }

    const parameterId = toTrimmedString(entry.parameterId);
    const normalizedParameterId = normalizeKey(parameterId);
    const rawValue = extractEntryValue(entry);
    const materialLikeValue = rawValue.length > 0 && isMaterialLikeValue(rawValue);

    if (parameterId === targets.attributesId) {
      if (materialLikeValue) {
        mergeTarget(targets.materialId, rawValue, 'material');
        stats.canonicalAttributesMaterialRowsRemoved += 1;
        stats.materialValuesMerged += 1;
        changed = true;
        changes.push(`removed material-like value from Attributes: ${rawValue}`);
        return;
      }
      ensureLocalizedTarget(entry, targets.attributesId, 'attributesLocalized');
      return;
    }

    if (parameterId === targets.tagsId) {
      ensureLocalizedTarget(entry, targets.tagsId, 'tagsLocalized');
      return;
    }

    if (parameterId === targets.modelNameId) {
      ensureLocalizedTarget(entry, targets.modelNameId, 'modelNameLocalized');
      return;
    }

    if (parameterId === targets.modelNumberId) {
      ensureLocalizedTarget(entry, targets.modelNumberId, 'modelNumberLocalized');
      return;
    }

    if (parameterId === targets.materialId) {
      const existing = targetEntries.get(targets.materialId);
      if (existing) {
        stats.duplicateTargetRowsMerged += 1;
      }
      queueTargetOutputEntry(targets.materialId);
      targetEntries.set(targets.materialId, { ...entry, parameterId: targets.materialId });
      return;
    }

    if (LEGACY_ATTRIBUTES_IDS.has(normalizedParameterId)) {
      if (materialLikeValue) {
        mergeTarget(targets.materialId, rawValue, 'material');
        stats.legacyMaterialRowsRemoved += 1;
        stats.materialValuesMerged += 1;
        changes.push(`removed legacy Attributes material value: ${rawValue}`);
      } else {
        mergeTarget(targets.attributesId, rawValue, 'copy_en_to_pl');
        stats.legacyAttributesMigrated += 1;
        changes.push(`migrated legacy Attributes value: ${rawValue || '<empty>'}`);
      }
      changed = true;
      return;
    }

    if (LEGACY_TAG_IDS.has(normalizedParameterId)) {
      mergeTarget(targets.tagsId, rawValue, 'copy_en_to_pl');
      stats.legacyTagsMigrated += 1;
      changed = true;
      changes.push(`migrated legacy Tags value: ${rawValue || '<empty>'}`);
      return;
    }

    if (LEGACY_MODEL_NAME_IDS.has(normalizedParameterId)) {
      mergeTarget(targets.modelNameId, rawValue, 'copy_en_to_pl');
      stats.legacyModelNameMigrated += 1;
      changed = true;
      changes.push(`migrated legacy Model Name value: ${rawValue || '<empty>'}`);
      return;
    }

    if (LEGACY_MODEL_NUMBER_IDS.has(normalizedParameterId)) {
      mergeTarget(targets.modelNumberId, rawValue, 'copy_en_to_pl');
      stats.legacyModelNumberMigrated += 1;
      changed = true;
      changes.push(`migrated legacy Model Number value: ${rawValue || '<empty>'}`);
      return;
    }

    if (LEGACY_MATERIAL_IDS.has(normalizedParameterId)) {
      if (rawValue) {
        mergeTarget(targets.materialId, rawValue, 'material');
        stats.materialValuesMerged += 1;
      }
      stats.legacyMaterialRowsRemoved += 1;
      changed = true;
      changes.push(`removed legacy Material row: ${rawValue || '<empty>'}`);
      return;
    }

    if (LEGACY_IMPORTED_IDS.has(normalizedParameterId) && materialLikeValue) {
      mergeTarget(targets.materialId, rawValue, 'material');
      stats.legacyMaterialRowsRemoved += 1;
      stats.materialValuesMerged += 1;
      changed = true;
      changes.push(`removed Imported parameter material value: ${rawValue}`);
      return;
    }

    outputEntries.push({ kind: 'passthrough', entry });
  });

  const nextParameters = outputEntries.flatMap(
    (entry: OrderedParameterEntry): ProductParameterValueDoc[] => {
      if (entry.kind === 'passthrough') return [entry.entry];
      const targetEntry = targetEntries.get(entry.parameterId);
      return hasAnyValue(targetEntry) ? [targetEntry as ProductParameterValueDoc] : [];
    }
  );
  if (!changed && JSON.stringify(nextParameters) !== JSON.stringify(doc.parameters ?? [])) {
    changed = true;
  }

  return {
    changed,
    nextParameters,
    stats,
    changes,
  };
};

const repairCollection = async (
  collectionName: CollectionName,
  targets: TargetParameters,
  options: CliOptions
): Promise<CollectionStats> => {
  const mongo = await getMongoDb();
  const collection = mongo.collection<ProductDoc>(collectionName);
  const stats: CollectionStats = {
    collection: collectionName,
    scanned: 0,
    changedDocuments: 0,
    legacyAttributesMigrated: 0,
    legacyTagsMigrated: 0,
    legacyMaterialRowsRemoved: 0,
    canonicalAttributesMaterialRowsRemoved: 0,
    attributesLocalized: 0,
    tagsLocalized: 0,
    modelNameLocalized: 0,
    modelNumberLocalized: 0,
    legacyModelNameMigrated: 0,
    legacyModelNumberMigrated: 0,
    materialValuesMerged: 0,
    duplicateTargetRowsMerged: 0,
    samples: [],
  };

  const query = {
    parameters: { $exists: true, $ne: [] },
  };
  let cursor = collection.find(query).project<ProductDoc>({
    _id: 1,
    id: 1,
    sku: 1,
    name_en: 1,
    parameters: 1,
  });
  if (options.limit !== null) {
    cursor = cursor.limit(options.limit);
  }

  for await (const doc of cursor) {
    stats.scanned += 1;
    const result = repairParametersForDoc(doc, targets);
    Object.entries(result.stats).forEach(([key, value]: [string, number]) => {
      (stats as unknown as Record<string, number>)[key] += value;
    });

    if (!result.changed) continue;
    stats.changedDocuments += 1;
    if (stats.samples.length < 20) {
      stats.samples.push({
        id: doc.id ?? String(doc._id),
        sku: toTrimmedString(doc.sku) || null,
        changes: result.changes.slice(0, 10),
      });
    }

    if (!options.dryRun) {
      await collection.updateOne(
        { _id: doc._id },
        {
          $set: {
            parameters: result.nextParameters,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  return stats;
};

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  const mongo = await getMongoDb();
  const { targets, definitionRepairs } = await loadTargetParameters();

  if (!options.dryRun) {
    for (const repair of definitionRepairs) {
      await mongo.collection<ProductParameterDoc>('product_parameters').updateOne(
        { id: repair.id },
        {
          $set: {
            name_en: repair.nextNameEn,
            name_pl: repair.nextNamePl,
            updatedAt: new Date(),
          },
        }
      );
    }
  }

  const collectionStats = [];
  for (const collectionName of COLLECTIONS) {
    collectionStats.push(await repairCollection(collectionName, targets, options));
  }

  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? 'dry-run' : 'write',
        targets,
        definitionRepairCount: definitionRepairs.length,
        definitionRepairs,
        collections: collectionStats,
      },
      null,
      2
    )
  );
}

void main().finally(async () => {
  try {
    const client = await getMongoClient();
    await client.close();
  } catch {
    // best-effort shutdown
  }
});
