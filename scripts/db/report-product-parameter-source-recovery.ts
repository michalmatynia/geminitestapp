import 'dotenv/config';

import fs from 'node:fs';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

import { productService } from '@/shared/lib/products/services/productService';

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
}

const DEFAULT_AUDIT_REPORT_PATH = '/tmp/product-missing-parameters-audit-latest.json';
const DEFAULT_CLASSIFICATION_REPORT_PATH =
  '/tmp/product-parameter-recovery-classification-latest.json';
const DEFAULT_RESTORE_REPORT_PATHS: string[] = [];
const LATEST_REPORT_PATH = '/tmp/product-parameter-source-recovery-latest.json';
const MAX_PRODUCT_FETCH_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;
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
  };
};

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isRetryableMongoError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  return (
    message.includes('mongonetworktimeouterror') ||
    message.includes('connect timed out') ||
    message.includes('socket') ||
    message.includes('timed out')
  );
};

const getProductWithRetry = async (productId: string) => {
  let lastError: unknown = null;

  for (let attempt = 1; attempt <= MAX_PRODUCT_FETCH_ATTEMPTS; attempt += 1) {
    try {
      return await productService.getProductById(productId);
    } catch (error: unknown) {
      lastError = error;
      if (!isRetryableMongoError(error) || attempt === MAX_PRODUCT_FETCH_ATTEMPTS) {
        throw error;
      }
      process.stderr.write(
        `[report-product-parameter-source-recovery] retrying product ${productId} after transient error (${attempt}/${MAX_PRODUCT_FETCH_ATTEMPTS}): ${getErrorMessage(error)}\n`,
      );
      await delay(RETRY_DELAY_MS * attempt);
    }
  }

  throw lastError;
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

    const product = await getProductWithRetry(productId);
    if (!product) continue;

    const categoryId = toTrimmedString(product.categoryId);
    const parameters = Array.isArray(product.parameters) ? product.parameters : [];
    if (categoryId || parameters.length > 0) continue;

    entries.push({
      productId,
      sku: toTrimmedString(product.sku) || toTrimmedString(row.sku),
      catalogId: toTrimmedString(product.catalogId) || null,
      categoryId: null,
      names: {
        name_en: product.name_en ?? null,
        name_pl: product.name_pl ?? null,
        name_de: product.name_de ?? null,
      },
      nameSegments: {
        en: splitPipeSegments(product.name_en),
        pl: splitPipeSegments(product.name_pl),
        de: splitPipeSegments(product.name_de),
      },
      imageCount: Array.isArray(product.images) ? product.images.length : 0,
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
    expectedUnresolvedNoRowsNoCategory:
      classification.classifications?.['no-rows-no-category'] ?? null,
    entryCount: entries.length,
    sampleSkus: entries.slice(0, 10).map((entry) => entry.sku),
    reportPath,
    latestReportPath: LATEST_REPORT_PATH,
    entries,
  };

  const serializedReport = `${JSON.stringify(report, null, 2)}\n`;
  fs.writeFileSync(reportPath, serializedReport, 'utf8');
  fs.writeFileSync(LATEST_REPORT_PATH, serializedReport, 'utf8');
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
};

void main().catch((error: unknown) => {
  console.error('[report-product-parameter-source-recovery] failed', error);
  process.exit(1);
});
