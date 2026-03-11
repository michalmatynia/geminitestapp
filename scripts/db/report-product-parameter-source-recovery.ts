import fs from 'node:fs';
import path from 'node:path';

interface AuditProductRow {
  id?: string;
  sku?: string;
}

interface AuditReport {
  products?: AuditProductRow[];
}

interface RestorePreviewRow {
  productId?: string;
}

interface RestoreReport {
  previews?: RestorePreviewRow[];
}

interface ClassificationReport {
  classifications?: Record<string, number>;
}

interface ParsedArgs {
  auditReportPath: string;
  classificationReportPath: string;
  restoreReportPaths: string[];
  apiBaseUrl: string;
}

const DEFAULT_AUDIT_REPORT_PATH = '/tmp/product-missing-parameters-audit-1773217463928.json';
const DEFAULT_CLASSIFICATION_REPORT_PATH =
  '/tmp/product-parameter-recovery-classification-1773221889673.json';
const DEFAULT_RESTORE_REPORT_PATHS = [
  '/tmp/product-parameter-name-restore-1773219321038.json',
  '/tmp/product-parameter-localized-restore-1773220722991.json',
  '/tmp/product-parameter-curated-apply-1773221853211.json',
];
const DEFAULT_API_BASE_URL = 'http://localhost:3000';

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const splitPipeSegments = (value: unknown): string[] =>
  toTrimmedString(value)
    .split('|')
    .map((segment: string) => segment.trim())
    .filter(Boolean);

const readJson = <T>(inputPath: string): T =>
  JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8')) as T;

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
    auditReportPath: values.get('audit-report') || DEFAULT_AUDIT_REPORT_PATH,
    classificationReportPath:
      values.get('classification-report') || DEFAULT_CLASSIFICATION_REPORT_PATH,
    restoreReportPaths: (values.get('restore-report') || DEFAULT_RESTORE_REPORT_PATHS.join(','))
      .split(',')
      .map((value: string) => value.trim())
      .filter(Boolean),
    apiBaseUrl: values.get('api-base-url') || DEFAULT_API_BASE_URL,
  };
};

const fetchJson = async <T>(url: string): Promise<T | null> => {
  const response = await fetch(url);
  if (!response.ok) return null;
  return (await response.json()) as T;
};

const main = async (): Promise<void> => {
  const parsed = parseArgs();
  const audit = readJson<AuditReport>(parsed.auditReportPath);
  const classification = readJson<ClassificationReport>(parsed.classificationReportPath);
  const restores = parsed.restoreReportPaths.map((restoreReportPath: string) =>
    readJson<RestoreReport>(restoreReportPath)
  );

  const patchedProductIds = new Set(
    restores.flatMap((restore: RestoreReport) =>
      Array.isArray(restore.previews)
        ? restore.previews
            .map((preview: RestorePreviewRow) => toTrimmedString(preview.productId))
            .filter(Boolean)
        : []
    )
  );

  const unresolvedAuditRows = Array.isArray(audit.products)
    ? audit.products.filter((row: AuditProductRow) => {
        const productId = toTrimmedString(row.id);
        return productId.length > 0 && !patchedProductIds.has(productId);
      })
    : [];

  const entries = [];

  for (const row of unresolvedAuditRows) {
    const productId = toTrimmedString(row.id);
    if (!productId) continue;

    const product = await fetchJson<Record<string, unknown>>(
      `${parsed.apiBaseUrl}/api/v2/products/${encodeURIComponent(productId)}`
    );
    if (!product) continue;

    const categoryId = toTrimmedString(product['categoryId']);
    const parameters = Array.isArray(product['parameters']) ? product['parameters'] : [];
    if (categoryId || parameters.length > 0) continue;

    entries.push({
      productId,
      sku: toTrimmedString(product['sku']) || toTrimmedString(row.sku),
      catalogId: toTrimmedString(product['catalogId']) || null,
      categoryId: null,
      names: {
        name_en: product['name_en'] ?? null,
        name_pl: product['name_pl'] ?? null,
        name_de: product['name_de'] ?? null,
      },
      nameSegments: {
        en: splitPipeSegments(product['name_en']),
        pl: splitPipeSegments(product['name_pl']),
        de: splitPipeSegments(product['name_de']),
      },
      imageCount: Array.isArray(product['images']) ? product['images'].length : 0,
      parameterCount: 0,
      recommendedAction:
        'Recover from source import or reconstruct manually. No category and no parameter rows remain.',
    });
  }

  const reportPath = `/tmp/product-parameter-source-recovery-${Date.now()}.json`;
  const report = {
    generatedAt: new Date().toISOString(),
    auditReportPath: parsed.auditReportPath,
    classificationReportPath: parsed.classificationReportPath,
    restoreReportPaths: parsed.restoreReportPaths,
    apiBaseUrl: parsed.apiBaseUrl,
    expectedUnresolvedNoRowsNoCategory:
      classification.classifications?.['no-rows-no-category'] ?? null,
    entryCount: entries.length,
    sampleSkus: entries.slice(0, 10).map((entry) => entry.sku),
    reportPath,
    entries,
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
};

void main().catch((error: unknown) => {
  console.error('[report-product-parameter-source-recovery] failed', error);
  process.exit(1);
});
