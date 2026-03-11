import fs from 'node:fs';
import path from 'node:path';

interface SourceRecoveryEntry {
  productId?: string;
  sku?: string;
  catalogId?: string | null;
  nameSegments?: {
    en?: string[];
    pl?: string[];
    de?: string[];
  };
  names?: {
    name_en?: string | null;
    name_pl?: string | null;
    name_de?: string | null;
  };
}

interface SourceRecoveryReport {
  entries?: SourceRecoveryEntry[];
}

interface ParsedArgs {
  reportPath: string;
}

const DEFAULT_REPORT_PATH = '/tmp/product-parameter-source-recovery-latest.json';
const LATEST_REPORT_PATH = '/tmp/product-parameter-source-recovery-summary-latest.json';

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const parseArgs = (): ParsedArgs => {
  const values = new Map<string, string>();

  for (const rawArg of process.argv.slice(2)) {
    if (!rawArg.startsWith('--')) continue;
    const normalized = rawArg.slice(2);
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex === -1) continue;
    values.set(normalized.slice(0, separatorIndex), normalized.slice(separatorIndex + 1));
  }

  return {
    reportPath: values.get('report') || DEFAULT_REPORT_PATH,
  };
};

const getSkuFamily = (sku: string): string => {
  const match = sku.match(/^[A-Z]+/);
  return match?.[0] || 'UNKNOWN';
};

const getSegmentShape = (entry: SourceRecoveryEntry): string => {
  const enCount = Array.isArray(entry.nameSegments?.en) ? entry.nameSegments?.en.length : 0;
  const plCount = Array.isArray(entry.nameSegments?.pl) ? entry.nameSegments?.pl.length : 0;
  const deCount = Array.isArray(entry.nameSegments?.de) ? entry.nameSegments?.de.length : 0;
  return `en:${enCount}|pl:${plCount}|de:${deCount}`;
};

const increment = (map: Map<string, number>, key: string): void => {
  map.set(key, (map.get(key) ?? 0) + 1);
};

const main = async (): Promise<void> => {
  const parsed = parseArgs();
  const report = JSON.parse(
    fs.readFileSync(path.resolve(parsed.reportPath), 'utf8')
  ) as SourceRecoveryReport;

  const entries = Array.isArray(report.entries) ? report.entries : [];

  const byFamily = new Map<
    string,
    {
      count: number;
      catalogIds: Set<string>;
      segmentShapes: Map<string, number>;
      sampleSkus: string[];
    }
  >();

  const byCatalog = new Map<
    string,
    {
      count: number;
      families: Map<string, number>;
      sampleSkus: string[];
    }
  >();

  for (const entry of entries) {
    const sku = toTrimmedString(entry.sku);
    const catalogId = toTrimmedString(entry.catalogId) || 'UNKNOWN';
    const family = getSkuFamily(sku);
    const segmentShape = getSegmentShape(entry);

    const familyBucket =
      byFamily.get(family) ??
      {
        count: 0,
        catalogIds: new Set<string>(),
        segmentShapes: new Map<string, number>(),
        sampleSkus: [],
      };
    familyBucket.count += 1;
    familyBucket.catalogIds.add(catalogId);
    increment(familyBucket.segmentShapes, segmentShape);
    if (sku && familyBucket.sampleSkus.length < 10) familyBucket.sampleSkus.push(sku);
    byFamily.set(family, familyBucket);

    const catalogBucket =
      byCatalog.get(catalogId) ??
      {
        count: 0,
        families: new Map<string, number>(),
        sampleSkus: [],
      };
    catalogBucket.count += 1;
    increment(catalogBucket.families, family);
    if (sku && catalogBucket.sampleSkus.length < 10) catalogBucket.sampleSkus.push(sku);
    byCatalog.set(catalogId, catalogBucket);
  }

  const output = {
    generatedAt: new Date().toISOString(),
    sourceReportPath: parsed.reportPath,
    totalEntries: entries.length,
    families: Object.fromEntries(
      [...byFamily.entries()]
        .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))
        .map(([family, bucket]) => [
          family,
          {
            count: bucket.count,
            catalogIds: [...bucket.catalogIds].sort(),
            segmentShapes: Object.fromEntries(
              [...bucket.segmentShapes.entries()].sort((left, right) => right[1] - left[1])
            ),
            sampleSkus: bucket.sampleSkus,
          },
        ])
    ),
    catalogs: Object.fromEntries(
      [...byCatalog.entries()]
        .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))
        .map(([catalogId, bucket]) => [
          catalogId,
          {
            count: bucket.count,
            families: Object.fromEntries(
              [...bucket.families.entries()].sort((left, right) => right[1] - left[1])
            ),
            sampleSkus: bucket.sampleSkus,
          },
        ])
    ),
  };

  const reportPath = `/tmp/product-parameter-source-recovery-summary-${Date.now()}.json`;
  const payload = {
    ...output,
    reportPath,
    latestReportPath: LATEST_REPORT_PATH,
  };
  const serializedPayload = `${JSON.stringify(payload, null, 2)}\n`;
  fs.writeFileSync(reportPath, serializedPayload, 'utf8');
  fs.writeFileSync(LATEST_REPORT_PATH, serializedPayload, 'utf8');
  console.log(JSON.stringify(payload, null, 2));
  process.exit(0);
};

void main().catch((error: unknown) => {
  console.error('[summarize-product-parameter-source-recovery] failed', error);
  process.exit(1);
});
