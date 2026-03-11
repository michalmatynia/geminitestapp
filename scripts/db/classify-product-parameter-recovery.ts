import fs from 'node:fs';
import path from 'node:path';

interface AuditProductRow {
  id?: string;
  sku?: string;
  categoryId?: string | null;
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

type ClassificationKey =
  | 'no-rows-no-category'
  | 'no-rows-with-category'
  | 'malformed-composite-values-with-category'
  | 'malformed-composite-values-no-category'
  | 'partial-empty-rows-with-category'
  | 'partial-empty-rows-no-category'
  | 'non-empty-but-mismatched-with-category'
  | 'non-empty-but-mismatched-no-category';

interface ParsedArgs {
  auditReportPath: string;
  restoreReportPaths: string[];
  apiBaseUrl: string;
}

const DEFAULT_AUDIT_REPORT_PATH = '/tmp/product-missing-parameters-audit-1773217463928.json';
const DEFAULT_RESTORE_REPORT_PATH = '/tmp/product-parameter-name-restore-1773219321038.json';
const DEFAULT_API_BASE_URL = 'http://localhost:3000';

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
    auditReportPath: values.get('audit-report') || DEFAULT_AUDIT_REPORT_PATH,
    restoreReportPaths: (values.get('restore-report') || DEFAULT_RESTORE_REPORT_PATH)
      .split(',')
      .map((value: string) => value.trim())
      .filter(Boolean),
    apiBaseUrl: values.get('api-base-url') || DEFAULT_API_BASE_URL,
  };
};

const readJson = <T>(inputPath: string): T => {
  const resolvedPath = path.resolve(inputPath);
  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as T;
};

const hasPipe = (value: unknown): boolean => typeof value === 'string' && value.includes('|');

const classifyProduct = (
  unresolvedRow: AuditProductRow,
  product: Record<string, unknown> | null
): ClassificationKey => {
  const params = Array.isArray(product?.['parameters']) ? (product?.['parameters'] as unknown[]) : [];
  const hasCategory = toTrimmedString(unresolvedRow.categoryId).length > 0;

  if (params.length === 0) {
    return hasCategory ? 'no-rows-with-category' : 'no-rows-no-category';
  }

  const nonEmpty = params.filter((parameter: unknown) => {
    if (!parameter || typeof parameter !== 'object' || Array.isArray(parameter)) return false;
    const record = parameter as Record<string, unknown>;
    const value = toTrimmedString(record['value']);
    const valuesByLanguage =
      record['valuesByLanguage'] && typeof record['valuesByLanguage'] === 'object'
        ? Object.values(record['valuesByLanguage'] as Record<string, unknown>).filter(
            (entry: unknown) => toTrimmedString(entry).length > 0
          )
        : [];
    return value.length > 0 || valuesByLanguage.length > 0;
  });

  const pipeInParams = params.some((parameter: unknown) => {
    if (!parameter || typeof parameter !== 'object' || Array.isArray(parameter)) return false;
    const record = parameter as Record<string, unknown>;
    if (hasPipe(record['value'])) return true;
    if (!record['valuesByLanguage'] || typeof record['valuesByLanguage'] !== 'object') return false;
    return Object.values(record['valuesByLanguage'] as Record<string, unknown>).some(hasPipe);
  });

  if (pipeInParams) {
    return hasCategory
      ? 'malformed-composite-values-with-category'
      : 'malformed-composite-values-no-category';
  }

  if (nonEmpty.length < params.length) {
    return hasCategory ? 'partial-empty-rows-with-category' : 'partial-empty-rows-no-category';
  }

  return hasCategory
    ? 'non-empty-but-mismatched-with-category'
    : 'non-empty-but-mismatched-no-category';
};

const fetchProduct = async (
  apiBaseUrl: string,
  productId: string
): Promise<Record<string, unknown> | null> => {
  const response = await fetch(`${apiBaseUrl}/api/v2/products/${encodeURIComponent(productId)}`);
  if (!response.ok) return null;
  return (await response.json()) as Record<string, unknown>;
};

const main = async (): Promise<void> => {
  const parsed = parseArgs();
  const audit = readJson<AuditReport>(parsed.auditReportPath);
  const restores = parsed.restoreReportPaths.map((restoreReportPath: string) =>
    readJson<RestoreReport>(restoreReportPath)
  );

  const patched = new Set(
    restores.flatMap((restore: RestoreReport) =>
      Array.isArray(restore.previews)
        ? restore.previews
            .map((preview: RestorePreviewRow) => toTrimmedString(preview.productId))
            .filter(Boolean)
        : []
    )
  );

  const unresolved = Array.isArray(audit.products)
    ? audit.products.filter((row: AuditProductRow) => {
        const productId = toTrimmedString(row.id);
        return productId.length > 0 && !patched.has(productId);
      })
    : [];

  const counts = new Map<ClassificationKey, number>();
  const samples = new Map<ClassificationKey, string[]>();

  for (const row of unresolved) {
    const productId = toTrimmedString(row.id);
    if (!productId) continue;

    const product = await fetchProduct(parsed.apiBaseUrl, productId);
    const key = classifyProduct(row, product);
    counts.set(key, (counts.get(key) ?? 0) + 1);

    const bucket = samples.get(key) ?? [];
    if (bucket.length < 5) bucket.push(toTrimmedString(row.sku) || productId);
    samples.set(key, bucket);
  }

  const reportPath = `/tmp/product-parameter-recovery-classification-${Date.now()}.json`;
  const report = {
    generatedAt: new Date().toISOString(),
    auditReportPath: parsed.auditReportPath,
    restoreReportPaths: parsed.restoreReportPaths,
    apiBaseUrl: parsed.apiBaseUrl,
    unresolvedCount: unresolved.length,
    classifications: Object.fromEntries(
      [...counts.entries()].sort((left, right) => right[1] - left[1])
    ),
    sampleSkusByClassification: Object.fromEntries(samples.entries()),
    reportPath,
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
};

void main().catch((error: unknown) => {
  console.error('[classify-product-parameter-recovery] failed', error);
  process.exit(1);
});
