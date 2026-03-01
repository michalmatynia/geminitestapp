import 'dotenv/config';

import { execFile } from 'child_process';
import { writeFile } from 'fs/promises';
import { promisify } from 'util';

import { MongoClient, ObjectId, type AnyBulkWriteOperation, type Document } from 'mongodb';

const LOG_PREFIX = '[restore-product-descriptions-parameters]';
const DEFAULT_BACKUP_ARCHIVE = 'mongo/backups/app-backup-1772341787088.archive';
const DEFAULT_SOURCE_DB = process.env['MONGODB_DB']?.trim() || 'app';
const DEFAULT_LIVE_DB = process.env['MONGODB_DB']?.trim() || 'app';
const DEFAULT_SINCE_HOURS = 168;

const DESCRIPTION_FIELDS = ['description_en', 'description_pl', 'description_de'] as const;

type DescriptionField = (typeof DESCRIPTION_FIELDS)[number];

type ProductDoc = {
  _id: string | ObjectId;
  id?: string;
  description_en?: string | null;
  description_pl?: string | null;
  description_de?: string | null;
  parameters?: unknown;
};

type SystemLogDoc = {
  category?: string;
  createdAt?: Date | string;
  context?: {
    productId?: unknown;
  };
  productId?: unknown;
};

type ProductReport = {
  productId: string;
  liveFound: boolean;
  backupFound: boolean;
  missingInLive: string[];
  restoredFields: string[];
  unresolvedMissingFields: string[];
  wouldUpdate: boolean;
};

type RestoreArgs = {
  backupArchivePath: string;
  sourceDbName: string;
  liveDbName: string;
  stagingDbName: string;
  productIds: string[];
  sinceHours: number;
  apply: boolean;
  keepStaging: boolean;
};

type RestoreReport = {
  generatedAt: string;
  apply: boolean;
  backupArchivePath: string;
  sourceDbName: string;
  liveDbName: string;
  stagingDbName: string;
  sinceHours: number;
  candidateCount: number;
  scannedCount: number;
  patchableCount: number;
  patchedCount: number;
  unresolvedCount: number;
  unresolvedProductIds: string[];
  reportPath: string;
  products: ProductReport[];
};

const execFileAsync = promisify(execFile);

const toTrimmedString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeOptionalString = (value: unknown): string | null => {
  const trimmed = toTrimmedString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeProductId = (value: unknown): string => {
  if (value instanceof ObjectId) return value.toHexString();
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  return String(value).trim();
};

const parsePositiveInteger = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
};

const parseProductIds = (value: string | undefined): string[] => {
  if (!value) return [];
  return Array.from(
    new Set(
      value
        .split(',')
        .map((entry: string): string => entry.trim())
        .filter((entry: string): boolean => entry.length > 0)
    )
  );
};

const parseArgs = (): RestoreArgs => {
  const args = process.argv.slice(2);
  const values = new Map<string, string>();
  let apply = false;
  let keepStaging = false;

  for (const arg of args) {
    if (arg === '--apply') {
      apply = true;
      continue;
    }
    if (arg === '--keep-staging') {
      keepStaging = true;
      continue;
    }
    if (!arg.startsWith('--')) continue;
    const [key, value] = arg.slice(2).split('=');
    if (!key || value === undefined) continue;
    values.set(key, value);
  }

  const backupArchivePath = values.get('backup') || DEFAULT_BACKUP_ARCHIVE;
  const sourceDbName = values.get('source-db') || DEFAULT_SOURCE_DB;
  const liveDbName = values.get('live-db') || DEFAULT_LIVE_DB;
  const sinceHours = parsePositiveInteger(values.get('since-hours'), DEFAULT_SINCE_HOURS);
  const productIds = parseProductIds(values.get('product-ids'));
  const stagingDbName =
    values.get('staging-db') || `${liveDbName}_restore_desc_params_${Date.now()}`;

  return {
    backupArchivePath,
    sourceDbName,
    liveDbName,
    stagingDbName,
    productIds,
    sinceHours,
    apply,
    keepStaging,
  };
};

const requireMongoUri = (): string => {
  const uri = process.env['MONGODB_URI']?.trim();
  if (!uri) {
    throw new Error('MONGODB_URI is required.');
  }
  return uri;
};

const buildProductIdFilter = (id: string): Document => {
  const normalized = id.trim();
  if (!normalized) {
    return { _id: null };
  }
  const conditions: Document[] = [{ id: normalized }, { _id: normalized }];
  if (ObjectId.isValid(normalized)) {
    conditions.push({ _id: new ObjectId(normalized) });
  }
  return { $or: conditions };
};

const isDescriptionMissing = (value: unknown): boolean => normalizeOptionalString(value) === null;

const isNonEmptyParameterArray = (value: unknown): value is Record<string, unknown>[] => {
  return Array.isArray(value) && value.length > 0;
};

const restoreStagingProducts = async (input: {
  mongoUri: string;
  backupArchivePath: string;
  sourceDbName: string;
  stagingDbName: string;
}): Promise<void> => {
  const restoreCommand = process.env['MONGORESTORE_PATH']?.trim() || 'mongorestore';
  const args = [
    '--uri',
    input.mongoUri,
    `--archive=${input.backupArchivePath}`,
    '--gzip',
    '--drop',
    '--nsInclude',
    `${input.sourceDbName}.products`,
    '--nsFrom',
    `${input.sourceDbName}.products`,
    '--nsTo',
    `${input.stagingDbName}.products`,
  ];

  const { stdout, stderr } = await execFileAsync(restoreCommand, args, {
    maxBuffer: 1024 * 1024 * 32,
  });

  if (stdout.trim()) {
    console.log(`${LOG_PREFIX} mongorestore stdout:\n${stdout}`);
  }
  if (stderr.trim()) {
    console.log(`${LOG_PREFIX} mongorestore stderr:\n${stderr}`);
  }
};

const collectCandidateIds = async (input: {
  client: MongoClient;
  liveDbName: string;
  sinceHours: number;
  explicitProductIds: string[];
}): Promise<string[]> => {
  const liveDb = input.client.db(input.liveDbName);
  const cutoff = new Date(Date.now() - input.sinceHours * 60 * 60 * 1000);

  const logs = await liveDb
    .collection<SystemLogDoc>('system_logs')
    .find(
      {
        category: { $in: ['hydration-guard', 'form-guard'] },
        createdAt: { $gte: cutoff },
      },
      {
        projection: {
          category: 1,
          createdAt: 1,
          productId: 1,
          'context.productId': 1,
        },
      }
    )
    .toArray();

  const ids = new Set<string>();

  input.explicitProductIds.forEach((productId: string) => {
    const normalized = productId.trim();
    if (normalized) ids.add(normalized);
  });

  logs.forEach((entry: SystemLogDoc) => {
    const direct = normalizeProductId(entry.productId);
    if (direct) {
      ids.add(direct);
      return;
    }
    const fromContext = normalizeProductId(entry.context?.productId);
    if (fromContext) ids.add(fromContext);
  });

  return Array.from(ids);
};

const buildPatchSet = (input: {
  liveProduct: ProductDoc;
  backupProduct: ProductDoc;
}): {
  setDoc: Partial<Pick<ProductDoc, DescriptionField | 'parameters'>>;
  missingInLive: string[];
  restoredFields: string[];
  unresolvedMissingFields: string[];
} => {
  const setDoc: Partial<Pick<ProductDoc, DescriptionField | 'parameters'>> = {};
  const missingInLive: string[] = [];
  const restoredFields: string[] = [];
  const unresolvedMissingFields: string[] = [];

  DESCRIPTION_FIELDS.forEach((field: DescriptionField) => {
    const liveValue = input.liveProduct[field];
    const backupValue = input.backupProduct[field];
    if (!isDescriptionMissing(liveValue)) return;

    missingInLive.push(field);
    if (isDescriptionMissing(backupValue)) {
      unresolvedMissingFields.push(field);
      return;
    }

    setDoc[field] = backupValue;
    restoredFields.push(field);
  });

  const liveParameters = input.liveProduct.parameters;
  const backupParameters = input.backupProduct.parameters;
  const liveMissingParameters = !isNonEmptyParameterArray(liveParameters);
  const backupHasParameters = isNonEmptyParameterArray(backupParameters);

  if (liveMissingParameters) {
    missingInLive.push('parameters');
    if (!backupHasParameters) {
      unresolvedMissingFields.push('parameters');
    } else {
      setDoc['parameters'] = backupParameters;
      restoredFields.push('parameters');
    }
  }

  return {
    setDoc,
    missingInLive,
    restoredFields,
    unresolvedMissingFields,
  };
};

const run = async (): Promise<void> => {
  const parsed = parseArgs();
  const mongoUri = requireMongoUri();

  console.log(`${LOG_PREFIX} starting`, {
    backupArchivePath: parsed.backupArchivePath,
    sourceDbName: parsed.sourceDbName,
    liveDbName: parsed.liveDbName,
    stagingDbName: parsed.stagingDbName,
    sinceHours: parsed.sinceHours,
    explicitProductIds: parsed.productIds.length,
    mode: parsed.apply ? 'apply' : 'dry-run',
  });

  await restoreStagingProducts({
    mongoUri,
    backupArchivePath: parsed.backupArchivePath,
    sourceDbName: parsed.sourceDbName,
    stagingDbName: parsed.stagingDbName,
  });

  const client = new MongoClient(mongoUri, {
    serverSelectionTimeoutMS: 30_000,
    connectTimeoutMS: 30_000,
    socketTimeoutMS: 180_000,
  });

  await client.connect();

  const reportPath = `/tmp/product-description-parameter-restore-${Date.now()}.json`;

  try {
    const candidateIds = await collectCandidateIds({
      client,
      liveDbName: parsed.liveDbName,
      sinceHours: parsed.sinceHours,
      explicitProductIds: parsed.productIds,
    });

    const liveDb = client.db(parsed.liveDbName);
    const stagingDb = client.db(parsed.stagingDbName);
    const liveProducts = liveDb.collection<ProductDoc>('products');
    const stagingProducts = stagingDb.collection<ProductDoc>('products');

    const productReports: ProductReport[] = [];
    const operations: AnyBulkWriteOperation<ProductDoc>[] = [];

    for (const productId of candidateIds) {
      const liveProduct = await liveProducts.findOne(buildProductIdFilter(productId));
      if (!liveProduct) {
        productReports.push({
          productId,
          liveFound: false,
          backupFound: false,
          missingInLive: [],
          restoredFields: [],
          unresolvedMissingFields: ['live_product_not_found'],
          wouldUpdate: false,
        });
        continue;
      }

      const backupProduct = await stagingProducts.findOne(buildProductIdFilter(productId));
      if (!backupProduct) {
        const missingInLive: string[] = [];
        DESCRIPTION_FIELDS.forEach((field: DescriptionField) => {
          if (isDescriptionMissing(liveProduct[field])) missingInLive.push(field);
        });
        if (!isNonEmptyParameterArray(liveProduct.parameters)) {
          missingInLive.push('parameters');
        }

        productReports.push({
          productId,
          liveFound: true,
          backupFound: false,
          missingInLive,
          restoredFields: [],
          unresolvedMissingFields: missingInLive,
          wouldUpdate: false,
        });
        continue;
      }

      const { setDoc, missingInLive, restoredFields, unresolvedMissingFields } = buildPatchSet({
        liveProduct,
        backupProduct,
      });

      const wouldUpdate = Object.keys(setDoc).length > 0;
      if (wouldUpdate) {
        operations.push({
          updateOne: {
            filter: buildProductIdFilter(productId),
            update: { $set: setDoc },
          },
        });
      }

      productReports.push({
        productId,
        liveFound: true,
        backupFound: true,
        missingInLive,
        restoredFields,
        unresolvedMissingFields,
        wouldUpdate,
      });
    }

    let patchedCount = 0;
    if (parsed.apply && operations.length > 0) {
      const result = await liveProducts.bulkWrite(operations, { ordered: false });
      patchedCount = result.modifiedCount;
    } else if (!parsed.apply) {
      patchedCount = operations.length;
    }

    const unresolvedProductIds = productReports
      .filter((entry: ProductReport): boolean => entry.unresolvedMissingFields.length > 0)
      .map((entry: ProductReport): string => entry.productId);

    const report: RestoreReport = {
      generatedAt: new Date().toISOString(),
      apply: parsed.apply,
      backupArchivePath: parsed.backupArchivePath,
      sourceDbName: parsed.sourceDbName,
      liveDbName: parsed.liveDbName,
      stagingDbName: parsed.stagingDbName,
      sinceHours: parsed.sinceHours,
      candidateCount: candidateIds.length,
      scannedCount: productReports.filter((entry: ProductReport) => entry.liveFound).length,
      patchableCount: operations.length,
      patchedCount,
      unresolvedCount: unresolvedProductIds.length,
      unresolvedProductIds,
      reportPath,
      products: productReports,
    };

    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf-8');

    console.log(`${LOG_PREFIX} completed`, {
      candidateCount: report.candidateCount,
      scannedCount: report.scannedCount,
      patchableCount: report.patchableCount,
      patchedCount: report.patchedCount,
      unresolvedCount: report.unresolvedCount,
      reportPath,
      mode: parsed.apply ? 'apply' : 'dry-run',
    });
  } finally {
    if (!parsed.keepStaging) {
      try {
        await client.db(parsed.stagingDbName).dropDatabase();
        console.log(`${LOG_PREFIX} dropped staging database`, { stagingDbName: parsed.stagingDbName });
      } catch (error) {
        console.warn(`${LOG_PREFIX} failed to drop staging database`, {
          stagingDbName: parsed.stagingDbName,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
    await client.close();
  }
};

run().catch((error) => {
  console.error(`${LOG_PREFIX} failed`, error);
  process.exitCode = 1;
});
