import fs from 'node:fs';
import path from 'node:path';

import { productService } from '@/shared/lib/products/services/productService';

type ProductRecord = Record<string, unknown>;

interface RestorePreviewRow {
  productId?: string;
}

interface RestoreReport {
  previews?: RestorePreviewRow[];
}

interface ClassificationReport {
  sampleSkusByClassification?: Record<string, string[]>;
}

interface ParsedArgs {
  apply: boolean;
  classificationReportPath: string;
  restoreReportPath: string;
}

interface RepairPreview {
  productId: string;
  sku: string;
  changedParameterCount: number;
  changedParameters: Array<{
    parameterId: string;
    before: string;
    after: string;
  }>;
}

const DEFAULT_CLASSIFICATION_REPORT_PATH =
  '/tmp/product-parameter-recovery-classification-1773220021198.json';
const DEFAULT_RESTORE_REPORT_PATH = '/tmp/product-parameter-name-restore-1773219321038.json';

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const parseArgs = (): ParsedArgs => {
  const values = new Map<string, string>();
  const flags = new Set<string>();

  for (const rawArg of process.argv.slice(2)) {
    if (!rawArg.startsWith('--')) continue;
    const normalized = rawArg.slice(2);
    const separatorIndex = normalized.indexOf('=');
    if (separatorIndex === -1) {
      flags.add(normalized);
      continue;
    }

    values.set(normalized.slice(0, separatorIndex), normalized.slice(separatorIndex + 1));
  }

  return {
    apply: flags.has('apply'),
    classificationReportPath:
      values.get('classification-report') || DEFAULT_CLASSIFICATION_REPORT_PATH,
    restoreReportPath: values.get('restore-report') || DEFAULT_RESTORE_REPORT_PATH,
  };
};

const readJson = <T>(inputPath: string): T => {
  const resolvedPath = path.resolve(inputPath);
  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as T;
};

const getLocalizedFallbackValue = (parameter: ProductRecord): string => {
  const valuesByLanguage = toRecord(parameter['valuesByLanguage']) ?? {};

  for (const locale of ['en', 'pl', 'de', 'default']) {
    const localized = toTrimmedString(valuesByLanguage[locale]);
    if (localized) return localized;
  }

  for (const locale of ['en', 'pl', 'de']) {
    const localized = toTrimmedString(parameter[`value_${locale}`]);
    if (localized) return localized;
  }

  return '';
};

const buildRepairPreview = (product: ProductRecord): RepairPreview | null => {
  const parameters = Array.isArray(product['parameters']) ? product['parameters'] : [];
  if (parameters.length === 0) return null;

  const changedParameters: RepairPreview['changedParameters'] = [];

  for (const parameter of parameters) {
    const parameterRecord = toRecord(parameter);
    if (!parameterRecord) continue;

    const currentValue = toTrimmedString(parameterRecord['value']);
    if (currentValue) continue;

    const fallbackValue = getLocalizedFallbackValue(parameterRecord);
    if (!fallbackValue) continue;

    changedParameters.push({
      parameterId: toTrimmedString(parameterRecord['parameterId']) || 'unknown',
      before: '',
      after: fallbackValue,
    });
    parameterRecord['value'] = fallbackValue;
  }

  if (changedParameters.length === 0) return null;

  return {
    productId: toTrimmedString(product['id']),
    sku: toTrimmedString(product['sku']),
    changedParameterCount: changedParameters.length,
    changedParameters,
  };
};

const loadTargetProductIds = (
  classificationReportPath: string,
  restoreReportPath: string
): string[] => {
  const classification = readJson<ClassificationReport>(classificationReportPath);
  const restore = readJson<RestoreReport>(restoreReportPath);

  const patchedProductIds = new Set(
    Array.isArray(restore.previews)
      ? restore.previews
          .map((preview: RestorePreviewRow) => toTrimmedString(preview.productId))
          .filter(Boolean)
      : []
  );

  const targetSkus = [
    ...(classification.sampleSkusByClassification?.['non-empty-but-mismatched-with-category'] ?? []),
    ...(classification.sampleSkusByClassification?.['malformed-composite-values-with-category'] ?? []),
    ...(classification.sampleSkusByClassification?.['no-rows-with-category'] ?? []),
  ]
    .map((value: string) => value.trim())
    .filter(Boolean);

  if (targetSkus.length === 0) return [];

  return targetSkus.filter((sku: string) => !patchedProductIds.has(sku));
};

const main = async (): Promise<void> => {
  const parsed = parseArgs();
  const targetSkus = loadTargetProductIds(
    parsed.classificationReportPath,
    parsed.restoreReportPath
  );

  const products = await productService.getProductsBySkus(targetSkus);
  const previews: RepairPreview[] = [];

  for (const product of products) {
    const preview = buildRepairPreview(product as ProductRecord);
    if (!preview) continue;
    previews.push(preview);

    if (parsed.apply) {
      await productService.updateProduct(preview.productId, {
        parameters: (product as ProductRecord)['parameters'],
      });
    }
  }

  const reportPath = `/tmp/product-parameter-localized-restore-${Date.now()}.json`;
  const report = {
    generatedAt: new Date().toISOString(),
    apply: parsed.apply,
    classificationReportPath: parsed.classificationReportPath,
    restoreReportPath: parsed.restoreReportPath,
    scannedCount: products.length,
    patchableCount: previews.length,
    patchedCount: parsed.apply ? previews.length : 0,
    reportPath,
    previews,
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `[restore-product-parameters-from-localized-values] completed ${JSON.stringify(
      {
        scannedCount: report.scannedCount,
        patchableCount: report.patchableCount,
        patchedCount: report.patchedCount,
        reportPath,
        mode: parsed.apply ? 'apply' : 'dry-run',
      },
      null,
      2,
    )}`,
  );
};

void main().catch((error: unknown) => {
  console.error('[restore-product-parameters-from-localized-values] failed', error);
  process.exit(1);
});
