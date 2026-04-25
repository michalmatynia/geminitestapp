import 'dotenv/config';

import { ObjectId } from 'mongodb';

import { parseScopedCatalogParameterLinkMap } from '@/features/integrations/services/imports/parameter-import/link-map-preference';
import { getMongoClient, getMongoDb } from '@/shared/lib/db/mongo-client';

type CliOptions = {
  dryRun: boolean;
  limit: number | null;
};

type ProductParameterDoc = {
  _id: ObjectId | string;
  id?: string;
  name_en?: string;
  name_pl?: string | null;
  updatedAt?: Date;
};

type ProductParameterValueDoc = {
  parameterId?: string;
  value?: string | null;
  valuesByLanguage?: Record<string, unknown>;
};

type ProductWithParametersDoc = {
  _id: ObjectId | string;
  id?: string;
  parameters?: unknown[];
  updatedAt?: Date;
};

type ProductValueRepair = {
  collection: ProductParameterValueCollectionName;
  _id: ObjectId | string;
  id: string;
  parameterId: string;
  action: 'move_en_to_pl' | 'remove_duplicate_en';
  previousEn: string;
  previousPl: string | null;
  nextPl: string | null;
};

type SettingDocument = {
  key?: string;
  value?: string;
};

type ProductParameterValueCollectionName = 'products' | 'product_drafts';

const LINK_MAP_SETTINGS_KEY = 'base_import_parameter_link_map';
const PRODUCT_PARAMETER_VALUE_COLLECTIONS: ProductParameterValueCollectionName[] = [
  'products',
  'product_drafts',
];
const POLISH_PARAMETER_LABEL_PATTERN =
  /(?:[ąćęłńóśźż]|\b(?:cecha|cechy|długość|kolor|materiał|modelu|nazwa|numer|producent|rodzaj|rozmiar|szerokość|stan|waga|wysokość)\b)/i;

const printUsage = (): void => {
  console.log(
    [
      'Usage: NODE_OPTIONS=--conditions=react-server node --import tsx scripts/db/repair-base-polish-parameter-labels.ts [--write] [--limit=100]',
      '',
      'Dry-run by default. Moves likely Polish-only parameter labels from name_en to name_pl and removes copied English values for those parameters.',
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

const isLikelyPolishParameterLabel = (value: string): boolean =>
  POLISH_PARAMETER_LABEL_PATTERN.test(value.trim());

const formatIdLabel = (value: string): string | null => {
  const words = value
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-zA-Z0-9 ]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((part: string): boolean => part.length > 0);
  if (words.length === 0) return null;
  return words
    .map((word: string): string => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const loadBaseParameterIdByParameterId = async (): Promise<Map<string, string>> => {
  const mongo = await getMongoDb();
  const doc = await mongo.collection<SettingDocument>('settings').findOne(
    {
      $or: [{ key: LINK_MAP_SETTINGS_KEY }, { _id: LINK_MAP_SETTINGS_KEY }],
    },
    { projection: { value: 1 } }
  );
  const parsed = parseScopedCatalogParameterLinkMap(typeof doc?.value === 'string' ? doc.value : null);
  const result = new Map<string, string>();
  const collect = (linksByCatalog: Record<string, Record<string, string>>): void => {
    Object.values(linksByCatalog).forEach((links: Record<string, string>) => {
      Object.entries(links).forEach(([baseParameterId, parameterId]: [string, string]) => {
        const normalizedParameterId = parameterId.trim();
        const normalizedBaseParameterId = baseParameterId.trim();
        if (!normalizedParameterId || !normalizedBaseParameterId) return;
        if (!result.has(normalizedParameterId)) {
          result.set(normalizedParameterId, normalizedBaseParameterId);
        }
      });
    });
  };

  collect(parsed.defaultByCatalog);
  Object.values(parsed.byScope).forEach(collect);
  return result;
};

const resolveNeutralEnglishName = (
  parameter: ProductParameterDoc,
  baseParameterIdByParameterId: Map<string, string>
): string => {
  const parameterId = toTrimmedString(parameter.id);
  const baseParameterId = parameterId ? baseParameterIdByParameterId.get(parameterId) : null;
  const fromBaseId = baseParameterId ? formatIdLabel(baseParameterId) : null;
  if (fromBaseId) return fromBaseId;
  return 'Imported parameter';
};

const normalizeValuesByLanguage = (value: unknown): Record<string, string> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.entries(value as Record<string, unknown>).reduce(
    (acc: Record<string, string>, [languageCode, languageValue]: [string, unknown]) => {
      const normalizedLanguageCode = languageCode.trim().toLowerCase();
      const normalizedValue = toTrimmedString(languageValue);
      if (!normalizedLanguageCode || !normalizedValue) return acc;
      acc[normalizedLanguageCode] = normalizedValue;
      return acc;
    },
    {}
  );
};

const repairProductParameterValuesForDoc = (input: {
  collection: ProductParameterValueCollectionName;
  doc: ProductWithParametersDoc;
  repairedParameterIds: Set<string>;
}): {
  changed: boolean;
  nextParameters: unknown[];
  repairs: ProductValueRepair[];
} => {
  const parameters = Array.isArray(input.doc.parameters) ? input.doc.parameters : [];
  let changed = false;
  const repairs: ProductValueRepair[] = [];
  const nextParameters = parameters.map((entry: unknown): unknown => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return entry;

    const record = entry as ProductParameterValueDoc;
    const parameterId = toTrimmedString(record.parameterId);
    if (!parameterId || !input.repairedParameterIds.has(parameterId)) return entry;

    const valuesByLanguage = normalizeValuesByLanguage(record.valuesByLanguage);
    const previousEn = toTrimmedString(valuesByLanguage['en']);
    if (!previousEn) return entry;

    const previousPl = toTrimmedString(valuesByLanguage['pl']);
    const nextValuesByLanguage = { ...valuesByLanguage };
    let action: ProductValueRepair['action'] | null = null;

    if (!previousPl) {
      nextValuesByLanguage['pl'] = previousEn;
      delete nextValuesByLanguage['en'];
      action = 'move_en_to_pl';
    } else if (previousPl === previousEn) {
      delete nextValuesByLanguage['en'];
      action = 'remove_duplicate_en';
    }

    if (!action) return entry;

    changed = true;
    repairs.push({
      collection: input.collection,
      _id: input.doc._id,
      id: input.doc.id ?? String(input.doc._id),
      parameterId,
      action,
      previousEn,
      previousPl: previousPl || null,
      nextPl: nextValuesByLanguage['pl'] ?? null,
    });

    return {
      ...record,
      valuesByLanguage: nextValuesByLanguage,
    };
  });

  return {
    changed,
    nextParameters,
    repairs,
  };
};

const repairProductParameterValues = async (input: {
  repairedParameterIds: Set<string>;
  dryRun: boolean;
}): Promise<ProductValueRepair[]> => {
  if (input.repairedParameterIds.size === 0) return [];

  const mongo = await getMongoDb();
  const repairs: ProductValueRepair[] = [];
  const repairedIds = Array.from(input.repairedParameterIds);

  for (const collectionName of PRODUCT_PARAMETER_VALUE_COLLECTIONS) {
    const collection = mongo.collection<ProductWithParametersDoc>(collectionName);
    const docs = await collection
      .find({
        'parameters.parameterId': { $in: repairedIds },
        'parameters.valuesByLanguage.en': { $type: 'string' },
      })
      .toArray();

    for (const doc of docs) {
      const result = repairProductParameterValuesForDoc({
        collection: collectionName,
        doc,
        repairedParameterIds: input.repairedParameterIds,
      });
      repairs.push(...result.repairs);

      if (!input.dryRun && result.changed) {
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
  }

  return repairs;
};

export async function main(argv: string[] = process.argv.slice(2)): Promise<void> {
  const options = parseArgs(argv);
  if (!process.env['MONGODB_URI']) {
    throw new Error('MONGODB_URI is required.');
  }

  const mongo = await getMongoDb();
  const baseParameterIdByParameterId = await loadBaseParameterIdByParameterId();
  let cursor = mongo
    .collection<ProductParameterDoc>('product_parameters')
    .find({
      $and: [
        { name_en: { $type: 'string' } },
        {
          $or: [
            { name_pl: { $exists: false } },
            { name_pl: null },
            { name_pl: '' },
          ],
        },
      ],
    })
    .sort({ updatedAt: -1 });

  if (options.limit !== null) {
    cursor = cursor.limit(options.limit);
  }

  const candidates = (await cursor.toArray()).filter((parameter: ProductParameterDoc): boolean => {
    const englishName = toTrimmedString(parameter.name_en);
    return englishName.length > 0 && isLikelyPolishParameterLabel(englishName);
  });

  const repairs = candidates.map((parameter: ProductParameterDoc) => {
    const previousNameEn = toTrimmedString(parameter.name_en);
    return {
      _id: parameter._id,
      id: parameter.id ?? String(parameter._id),
      previousNameEn,
      nextNameEn: resolveNeutralEnglishName(parameter, baseParameterIdByParameterId),
      nextNamePl: previousNameEn,
    };
  });
  const repairedParameterIds = new Set(
    repairs
      .map((repair) => toTrimmedString(repair.id))
      .filter((id: string): boolean => id.length > 0)
  );
  const productValueRepairs = await repairProductParameterValues({
    repairedParameterIds,
    dryRun: options.dryRun,
  });

  if (!options.dryRun) {
    for (const repair of repairs) {
      await mongo.collection<ProductParameterDoc>('product_parameters').updateOne(
        { _id: repair._id },
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

  console.log(
    JSON.stringify(
      {
        mode: options.dryRun ? 'dry-run' : 'write',
        matched: repairs.length,
        repairs: repairs.slice(0, 25),
        truncated: repairs.length > 25,
        productValueRepairMatched: productValueRepairs.length,
        productValueRepairs: productValueRepairs.slice(0, 25),
        productValueRepairsTruncated: productValueRepairs.length > 25,
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
