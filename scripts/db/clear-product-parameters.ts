import 'dotenv/config';

import { ObjectId, type Document, type Filter, type UpdateResult } from 'mongodb';

import { getMongoDb } from '@/shared/lib/db/mongo-client';

type CliOptions = {
  dryRun: boolean;
  parameterIds: string[];
  parameterNames: string[];
};

type ParameterResolution = {
  requestedParameterIds: string[];
  requestedParameterNames: string[];
  resolvedParameterIds: string[];
  unresolvedParameterNames: string[];
  unresolvedParameterIds: string[];
};

type ClearResult = {
  collection: string;
  matched: number;
  modified: number;
};

type Summary = {
  mode: 'dry-run' | 'write';
  target: {
    parameterIds: string[];
    names: string[];
    requestedParameterIds: string[];
    requestedParameterNames: string[];
    unresolvedParameterNames: string[];
    unresolvedParameterIds: string[];
  };
  products: ClearResult;
  productDrafts: ClearResult;
  productParameters: ClearResult;
};

const COLLECTIONS = {
  PRODUCTS: 'products',
  PRODUCT_DRAFTS: 'product_drafts',
  PRODUCT_PARAMETERS: 'product_parameters',
} as const;

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const splitList = (value: string | undefined): string[] =>
  value
    ?.split(',')
    .map((entry: string): string => entry.trim())
    .filter((entry: string): boolean => entry.length > 0) ?? [];

const dedupeStrings = (values: string[]): string[] => {
  const unique = new Set<string>();
  return values
    .map((value: string): string => value.trim())
    .filter((value: string): boolean => {
      if (!value) return false;
      const lower = value.toLowerCase();
      if (unique.has(lower)) return false;
      unique.add(lower);
      return true;
    })
    .map((value) => value.trim());
};

const parseCliOptions = (): CliOptions => {
  const values = new Map<string, string>();
  let dryRun = true;

  for (const rawArg of process.argv.slice(2)) {
    if (rawArg === '--write') {
      dryRun = false;
      continue;
    }
    if (!rawArg.startsWith('--')) continue;

    const separatorIndex = rawArg.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = rawArg.slice(2, separatorIndex);
    const value = rawArg.slice(separatorIndex + 1);
    if (key) values.set(key, value);
  }

  return {
    dryRun,
    parameterIds: splitList(values.get('parameter-ids') ?? values.get('parameterIds')),
    parameterNames: splitList(values.get('parameter-names') ?? values.get('parameterNames')),
  };
};

const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildIdListFilter = (ids: string[]): Document => {
  const normalizedIds = dedupeStrings(ids)
    .map((id: string): string => id.trim())
    .filter((id: string): boolean => id.length > 0);

  if (normalizedIds.length === 0) {
    return { _id: { $in: [] } } as Document;
  }

  const objectIds = normalizedIds
    .filter((id: string): boolean => ObjectId.isValid(id))
    .map((id: string): ObjectId => new ObjectId(id));

  const filters: Array<Filter<Document>> = [
    { id: { $in: normalizedIds } } as Filter<Document>,
    { _id: { $in: normalizedIds } } as unknown as Filter<Document>,
  ];

  if (objectIds.length > 0) {
    filters.push({ _id: { $in: objectIds } } as Filter<Document>);
  }

  if (filters.length === 1) {
    return filters[0] as Document;
  }
  return { $or: filters } as Document;
};

const resolveParameterIds = async (input: {
  db: Awaited<ReturnType<typeof getMongoDb>>;
  ids: string[];
  names: string[];
}): Promise<ParameterResolution> => {
  const requestedParameterIds = dedupeStrings(input.ids);
  const requestedParameterNames = dedupeStrings(input.names);
  const parameterCollection = input.db.collection<Document>(COLLECTIONS.PRODUCT_PARAMETERS);

  if (requestedParameterNames.length === 0 && requestedParameterIds.length === 0) {
    return {
      requestedParameterIds,
      requestedParameterNames,
      resolvedParameterIds: [],
      unresolvedParameterIds: requestedParameterIds,
      unresolvedParameterNames: requestedParameterNames,
    };
  }

  const nameFilters = requestedParameterNames.map((rawName: string): Filter<Document> => {
    const escaped = escapeRegex(toTrimmedString(rawName));
    const regex = new RegExp(`^${escaped}$`, 'i');
    return {
      $or: [
        { name_en: regex },
        { name_pl: regex },
        { name_de: regex },
      ],
    } as Filter<Document>;
  });

  const combinedFilter: Filter<Document> = nameFilters.length
    ? ({ $or: nameFilters } as Filter<Document>)
    : ({ _id: { $exists: false } } as Filter<Document>);

  const nameResolvedParameterIds: string[] = [];
  const matchedNames = new Set<string>();
  if (requestedParameterNames.length > 0) {
    const docs = await parameterCollection.find(combinedFilter).toArray();
    docs.forEach((doc: Document): void => {
      const ids = toTrimmedString(doc['id'] ?? '');
      if (ids.length > 0) nameResolvedParameterIds.push(ids);
      if (typeof doc['_id'] !== 'undefined') nameResolvedParameterIds.push(String(doc['_id']));
      ['name_en', 'name_pl', 'name_de'].forEach((key: string) => {
        const value = toTrimmedString((doc as Record<string, unknown>)[key]);
        if (value.length > 0) matchedNames.add(value.toLowerCase());
      });
    });
  }

  const unresolvedParameterNames = requestedParameterNames.filter(
    (name: string) => !matchedNames.has(name.toLowerCase())
  );

  const allResolved = dedupeStrings([...requestedParameterIds, ...nameResolvedParameterIds]);

  const unresolvedParameterIds = requestedParameterIds.filter(
    (requestedId: string) => !allResolved.includes(requestedId)
  );

  return {
    requestedParameterIds,
    requestedParameterNames,
    resolvedParameterIds: allResolved,
    unresolvedParameterIds,
    unresolvedParameterNames,
  };
};

const clearProductParameters = async (input: {
  db: Awaited<ReturnType<typeof getMongoDb>>;
  collectionName: string;
  parameterIds: string[];
  dryRun: boolean;
}): Promise<ClearResult> => {
  const collection = input.db.collection<Document>(input.collectionName);
  const filter = {
    parameters: {
      $elemMatch: {
        parameterId: {
          $in: input.parameterIds,
        },
      },
    },
  } as Filter<Document>;

  const matched = await collection.countDocuments(filter);
  if (input.dryRun || matched === 0) {
    return { collection: input.collectionName, matched, modified: 0 };
  }

  const result: UpdateResult<Document> = await collection.updateMany(filter, {
    $pull: {
      parameters: {
        parameterId: {
          $in: input.parameterIds,
        },
      },
    },
  } as any);

  return { collection: input.collectionName, matched, modified: result.modifiedCount };
};

const clearProductParameterDefinitions = async (input: {
  db: Awaited<ReturnType<typeof getMongoDb>>;
  parameterIds: string[];
  dryRun: boolean;
}): Promise<ClearResult> => {
  const collection = input.db.collection<Document>(COLLECTIONS.PRODUCT_PARAMETERS);
  const filter = buildIdListFilter(input.parameterIds);
  const matched = await collection.countDocuments(filter);
  if (input.dryRun || matched === 0) {
    return { collection: COLLECTIONS.PRODUCT_PARAMETERS, matched, modified: 0 };
  }

  const deletion = await collection.deleteMany(filter);
  return {
    collection: COLLECTIONS.PRODUCT_PARAMETERS,
    matched,
    modified: deletion.deletedCount ?? 0,
  };
};

const ensureTargetParametersExist = (spec: ParameterResolution): void => {
  if (spec.resolvedParameterIds.length === 0) {
    console.error('No parameter IDs could be resolved from provided filters.');
    console.error(
      `Requested parameter IDs: ${spec.requestedParameterIds.length > 0 ? spec.requestedParameterIds.join(', ') : 'none'}`
    );
    console.error(
      `Requested parameter names: ${spec.requestedParameterNames.length > 0 ? spec.requestedParameterNames.join(', ') : 'none'}`
    );
    if (spec.unresolvedParameterNames.length > 0) {
      console.error(`Unresolved parameter names: ${spec.unresolvedParameterNames.join(', ')}`);
    }
    process.exit(1);
  }
};

async function main(): Promise<void> {
  const options = parseCliOptions();
  const db = await getMongoDb();
  const resolution = await resolveParameterIds({
    db,
    ids: options.parameterIds,
    names: options.parameterNames,
  });
  const resolvedIds = dedupeStrings(resolution.resolvedParameterIds);
  if (resolvedIds.length === 0) {
    ensureTargetParametersExist(resolution);
    return;
  }

  const products = await clearProductParameters({
    db,
    collectionName: COLLECTIONS.PRODUCTS,
    parameterIds: resolvedIds,
    dryRun: options.dryRun,
  });

  const productDrafts = await clearProductParameters({
    db,
    collectionName: COLLECTIONS.PRODUCT_DRAFTS,
    parameterIds: resolvedIds,
    dryRun: options.dryRun,
  });

  const productParameters = await clearProductParameterDefinitions({
    db,
    parameterIds: resolvedIds,
    dryRun: options.dryRun,
  });

  const summary: Summary = {
    mode: options.dryRun ? 'dry-run' : 'write',
    target: {
      parameterIds: resolvedIds,
      names: options.parameterNames,
      requestedParameterIds: options.parameterIds,
      requestedParameterNames: options.parameterNames,
      unresolvedParameterNames: resolution.unresolvedParameterNames,
      unresolvedParameterIds: resolution.unresolvedParameterIds,
    },
    products,
    productDrafts,
    productParameters,
  };

  console.log(JSON.stringify(summary, null, 2));
}

void main().catch((error: unknown) => {
  console.error('[clear-product-parameters] failed', error);
  process.exit(1);
});
