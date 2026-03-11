import fs from 'node:fs';
import path from 'node:path';

interface ManualRemediationEntry {
  sku?: string;
  classification?: string;
  recommendedAction?: string;
  product?: {
    id?: string;
    catalogId?: string | null;
    parameters?: Array<Record<string, unknown>>;
    name_en?: string | null;
    name_pl?: string | null;
    nameSegments?: {
      en?: string[];
      pl?: string[];
    };
  };
}

interface ManualRemediationReport {
  entries?: ManualRemediationEntry[];
}

interface ParsedArgs {
  reportPath: string;
  outputPath?: string;
}

const DEFAULT_REPORT_PATH = '/tmp/product-parameter-manual-remediation-1773221093430.json';

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
    outputPath: values.get('output') || undefined,
  };
};

const main = async (): Promise<void> => {
  const parsed = parseArgs();
  const report = JSON.parse(
    fs.readFileSync(path.resolve(parsed.reportPath), 'utf8')
  ) as ManualRemediationReport;

  const overrides = (report.entries ?? []).map((entry: ManualRemediationEntry) => ({
    sku: toTrimmedString(entry.sku),
    productId: toTrimmedString(entry.product?.id),
    classification: toTrimmedString(entry.classification),
    recommendedAction: toTrimmedString(entry.recommendedAction),
    currentNames: {
      name_en: entry.product?.name_en ?? null,
      name_pl: entry.product?.name_pl ?? null,
      segments_en: entry.product?.nameSegments?.en ?? [],
      segments_pl: entry.product?.nameSegments?.pl ?? [],
    },
    currentParameters: entry.product?.parameters ?? [],
    proposedParameters: [],
    notes: [],
  }));

  const outputPath =
    parsed.outputPath ||
    `/tmp/product-parameter-curated-overrides-${Date.now()}.json`;

  fs.writeFileSync(
    outputPath,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceReportPath: parsed.reportPath,
        entryCount: overrides.length,
        overrides,
      },
      null,
      2
    )}\n`,
    'utf8'
  );

  console.log(
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        sourceReportPath: parsed.reportPath,
        entryCount: overrides.length,
        outputPath,
      },
      null,
      2
    )
  );
};

void main().catch((error: unknown) => {
  console.error('[generate-product-parameter-curated-overrides] failed', error);
  process.exit(1);
});
