import fs from 'node:fs';
import path from 'node:path';

import { productService } from '@/shared/lib/products/services/productService';

type ProductRecord = Record<string, unknown>;

interface ParsedArgs {
  apply: boolean;
  auditReportPath?: string;
  explicitProductIds: string[];
  limit?: number;
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

const DEFAULT_AUDIT_REPORT_PATH = '/tmp/product-missing-parameters-audit-1773217463928.json';

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const splitNameSegments = (value: unknown): string[] =>
  toTrimmedString(value)
    .split('|')
    .map((segment: string) => segment.trim())
    .filter(Boolean);

const getLocalizedNameSegments = (product: ProductRecord, key: 'en' | 'pl' | 'de'): string[] => {
  const direct = splitNameSegments(product[`name_${key}`]);
  if (direct.length > 0) return direct;
  return splitNameSegments(toRecord(product['name'])?.[key]);
};

const getParameterDisplayValue = (parameter: ProductRecord): string => {
  const direct = toTrimmedString(parameter['value']);
  if (direct) return direct;

  const valuesByLanguage = toRecord(parameter['valuesByLanguage']) ?? {};
  for (const locale of ['en', 'pl', 'de', 'default']) {
    const localized = toTrimmedString(valuesByLanguage[locale]);
    if (localized) return localized;
  }

  for (const locale of ['en', 'pl', 'de']) {
    const legacy = toTrimmedString(parameter[`value_${locale}`]);
    if (legacy) return legacy;
  }

  return '';
};

const isEmptyParameter = (parameter: ProductRecord): boolean => getParameterDisplayValue(parameter) === '';

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

  const explicitProductIds = (values.get('product-ids') ?? '')
    .split(',')
    .map((value: string) => value.trim())
    .filter(Boolean);

  const limitRaw = Number.parseInt(values.get('limit') ?? '', 10);
  const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : undefined;

  return {
    apply: flags.has('apply'),
    auditReportPath: values.get('audit-report') || undefined,
    explicitProductIds,
    limit,
  };
};

const loadAuditProductIds = (auditReportPath: string): string[] => {
  const resolvedPath = path.resolve(auditReportPath);
  const report = JSON.parse(fs.readFileSync(resolvedPath, 'utf8')) as {
    products?: Array<{ id?: string }>;
  };

  return Array.isArray(report.products)
    ? report.products.map((product) => toTrimmedString(product?.id)).filter(Boolean)
    : [];
};

const buildParameterRepair = (product: ProductRecord): RepairPreview | null => {
  const parameters = Array.isArray(product['parameters']) ? product['parameters'] : [];
  if (parameters.length === 0) return null;

  const localizedSegments = {
    en: getLocalizedNameSegments(product, 'en').slice(1),
    pl: getLocalizedNameSegments(product, 'pl').slice(1),
    de: getLocalizedNameSegments(product, 'de').slice(1),
  };

  const maxSegmentCount = Math.max(
    localizedSegments.en.length,
    localizedSegments.pl.length,
    localizedSegments.de.length,
  );

  if (maxSegmentCount === 0) return null;

  const changedParameters: RepairPreview['changedParameters'] = [];
  let segmentIndex = 0;

  for (const parameter of parameters) {
    const parameterRecord = toRecord(parameter);
    if (!parameterRecord || !isEmptyParameter(parameterRecord)) continue;
    if (segmentIndex >= maxSegmentCount) break;

    const preferredValue =
      localizedSegments.en[segmentIndex] ||
      localizedSegments.pl[segmentIndex] ||
      localizedSegments.de[segmentIndex] ||
      '';

    if (!preferredValue) {
      segmentIndex += 1;
      continue;
    }

    changedParameters.push({
      parameterId: toTrimmedString(parameterRecord['parameterId']) || `index:${segmentIndex}`,
      before: '',
      after: preferredValue,
    });

    parameterRecord['value'] = preferredValue;
    const nextValuesByLanguage = {
      ...(toRecord(parameterRecord['valuesByLanguage']) ?? {}),
    };

    if (localizedSegments.en[segmentIndex]) nextValuesByLanguage['en'] = localizedSegments.en[segmentIndex];
    if (localizedSegments.pl[segmentIndex]) nextValuesByLanguage['pl'] = localizedSegments.pl[segmentIndex];
    if (localizedSegments.de[segmentIndex]) nextValuesByLanguage['de'] = localizedSegments.de[segmentIndex];

    if (Object.keys(nextValuesByLanguage).length > 0) {
      parameterRecord['valuesByLanguage'] = nextValuesByLanguage;
    }

    segmentIndex += 1;
  }

  if (changedParameters.length === 0) return null;

  return {
    productId: toTrimmedString(product['id']),
    sku: toTrimmedString(product['sku']),
    changedParameterCount: changedParameters.length,
    changedParameters,
  };
};

const main = async (): Promise<void> => {
  const parsed = parseArgs();
  const auditReportPath = parsed.auditReportPath ?? DEFAULT_AUDIT_REPORT_PATH;
  const productIds =
    parsed.explicitProductIds.length > 0 ? parsed.explicitProductIds : loadAuditProductIds(auditReportPath);
  const limitedProductIds = parsed.limit ? productIds.slice(0, parsed.limit) : productIds;

  const previews: RepairPreview[] = [];

  for (const productId of limitedProductIds) {
    const product = (await productService.getProductById(productId)) as ProductRecord | null;
    if (!product) continue;

    const preview = buildParameterRepair(product);
    if (!preview) continue;
    previews.push(preview);

    if (parsed.apply) {
      await productService.updateProduct(productId, {
        parameters: product['parameters'],
      });
    }
  }

  const reportPath = `/tmp/product-parameter-name-restore-${Date.now()}.json`;
  const report = {
    generatedAt: new Date().toISOString(),
    apply: parsed.apply,
    auditReportPath,
    scannedCount: limitedProductIds.length,
    patchableCount: previews.length,
    patchedCount: parsed.apply ? previews.length : 0,
    reportPath,
    previews,
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(
    `[restore-product-parameters-from-names] completed ${JSON.stringify(
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
  console.error('[restore-product-parameters-from-names] failed', error);
  process.exit(1);
});
