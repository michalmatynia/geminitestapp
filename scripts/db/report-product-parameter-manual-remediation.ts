import fs from 'node:fs';
import path from 'node:path';

interface ClassificationReport {
  sampleSkusByClassification?: Record<string, string[]>;
}

interface ParsedArgs {
  classificationReportPath: string;
  apiBaseUrl: string;
}

type RemediationClass =
  | 'malformed-composite-values-with-category'
  | 'non-empty-but-mismatched-with-category'
  | 'no-rows-with-category';

const DEFAULT_CLASSIFICATION_REPORT_PATH =
  '/tmp/product-parameter-recovery-classification-1773220901738.json';
const DEFAULT_API_BASE_URL = 'http://localhost:3000';

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
    classificationReportPath:
      values.get('classification-report') || DEFAULT_CLASSIFICATION_REPORT_PATH,
    apiBaseUrl: values.get('api-base-url') || DEFAULT_API_BASE_URL,
  };
};

const readJson = <T>(inputPath: string): T =>
  JSON.parse(fs.readFileSync(path.resolve(inputPath), 'utf8')) as T;

const toTrimmedString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const splitPipeSegments = (value: unknown): string[] =>
  toTrimmedString(value)
    .split('|')
    .map((segment: string) => segment.trim())
    .filter(Boolean);

const remediationNoteByClass: Record<RemediationClass, string> = {
  'malformed-composite-values-with-category':
    'Split composite parameter rows and reassign the values to the existing parameter slots manually.',
  'non-empty-but-mismatched-with-category':
    'Review the current parameter rows against the pipe-delimited name segments and remap semantically incorrect values.',
  'no-rows-with-category':
    'Reconstruct parameter rows from a known good peer product in the same category before assigning localized values.',
};

const fetchJson = async <T>(url: string): Promise<T | null> => {
  const response = await fetch(url);
  if (!response.ok) return null;
  return (await response.json()) as T;
};

const main = async (): Promise<void> => {
  const parsed = parseArgs();
  const classification = readJson<ClassificationReport>(parsed.classificationReportPath);

  const classes: RemediationClass[] = [
    'malformed-composite-values-with-category',
    'non-empty-but-mismatched-with-category',
    'no-rows-with-category',
  ];

  const targets = classes.flatMap((classificationKey: RemediationClass) =>
    (classification.sampleSkusByClassification?.[classificationKey] ?? []).map((sku: string) => ({
      classification: classificationKey,
      sku,
    }))
  );

  const entries = [];

  for (const target of targets) {
    const paged = await fetchJson<{
      products?: Array<Record<string, unknown>>;
    }>(
      `${parsed.apiBaseUrl}/api/v2/products/paged?page=1&pageSize=5&fresh=true&sku=${encodeURIComponent(
        target.sku
      )}`
    );
    const product =
      paged?.products?.find(
        (entry: Record<string, unknown>) => toTrimmedString(entry['sku']) === target.sku
      ) ?? null;
    if (!product) continue;

    const categoryId = toTrimmedString(product['categoryId']);
    const category =
      categoryId.length > 0
        ? await fetchJson<Record<string, unknown>>(
            `${parsed.apiBaseUrl}/api/v2/products/categories/${encodeURIComponent(categoryId)}`
          )
        : null;

    const parameters = Array.isArray(product['parameters']) ? product['parameters'] : [];
    const suspectRows = parameters
      .filter((parameter: unknown) => {
        if (!parameter || typeof parameter !== 'object' || Array.isArray(parameter)) return false;
        const record = parameter as Record<string, unknown>;
        if (splitPipeSegments(record['value']).length > 1) return true;
        const valuesByLanguage = record['valuesByLanguage'];
        if (!valuesByLanguage || typeof valuesByLanguage !== 'object' || Array.isArray(valuesByLanguage)) {
          return false;
        }
        return Object.values(valuesByLanguage).some((entry: unknown) => splitPipeSegments(entry).length > 1);
      })
      .map((parameter: unknown) => {
        const record = parameter as Record<string, unknown>;
        return {
          parameterId: toTrimmedString(record['parameterId']),
          value: record['value'],
          valuesByLanguage: record['valuesByLanguage'],
        };
      });

    entries.push({
      sku: target.sku,
      classification: target.classification,
      recommendedAction: remediationNoteByClass[target.classification],
      category: {
        id: categoryId || null,
        name: toTrimmedString(category?.['name_en']) || toTrimmedString(category?.['name']) || null,
      },
      product: {
        id: toTrimmedString(product['id']),
        catalogId: toTrimmedString(product['catalogId']) || null,
        name_en: product['name_en'] ?? null,
        name_pl: product['name_pl'] ?? null,
        nameSegments: {
          en: splitPipeSegments(product['name_en']),
          pl: splitPipeSegments(product['name_pl']),
        },
        parameters,
      },
      suspectRows,
    });
  }

  const reportPath = `/tmp/product-parameter-manual-remediation-${Date.now()}.json`;
  const report = {
    generatedAt: new Date().toISOString(),
    classificationReportPath: parsed.classificationReportPath,
    apiBaseUrl: parsed.apiBaseUrl,
    entryCount: entries.length,
    reportPath,
    entries,
  };

  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify(report, null, 2));
};

void main().catch((error: unknown) => {
  console.error('[report-product-parameter-manual-remediation] failed', error);
  process.exit(1);
});
